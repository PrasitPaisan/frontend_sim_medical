import { useEffect, useState } from 'react'
import { Button, Modal, Progress, Tag, message } from 'antd'
import { CheckCircleOutlined, CloudDownloadOutlined, WarningFilled } from '@ant-design/icons'
import { useMachineSim } from '../../hooks/useMachineSim'
import { usePharmacistRecheck } from '../../hooks/usePharmacistRecheck'
import { useTrackedPrescriptions } from '../../hooks/useTrackedPrescriptions'

// Which real machine action(s) the confirm modal is about to fire —
// 'both' runs Confirm Dispensing then Eliminate in sequence, one HTTP call
// after another, to stand in for the real end-to-end pharmacist workflow
// (see CLAUDE.md's Pharmacist Recheck section) in a single click, while the
// two solo actions stay available for testing each SOAP call independently.
// Applied per-prescription across every selected id, one at a time.
type RecheckAction = 'confirm' | 'eliminate' | 'both'

const ACTION_LABELS: Record<RecheckAction, string> = {
  confirm: 'Confirm Dispensing',
  eliminate: 'Eliminate (Release Basket)',
  both: 'Confirm + Eliminate (Full Process)',
}

export default function PharmacistRecheckPanel() {
  const { queryReadyPrescriptions, previewEliminatePrescription, eliminatePrescription } = useMachineSim()
  const { previewConfirmRecheck, confirmRecheck, fetchConfirmedPendingIds } = usePharmacistRecheck()
  const { prescriptions: tracked, loadTrackedPrescriptions } = useTrackedPrescriptions()

  const [fetching, setFetching] = useState(false)
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Ids that got "Confirm Dispensing" (UpdateReadyPrescriptionState) but not
  // Eliminate yet — the basket is still bound. Backed by
  // prescription_header.recheck_confirmed_at (see
  // BasketsService.findRecheckConfirmedPendingIds) rather than client-only
  // state, so it survives a page reload. It's unconfirmed whether the real
  // RB1500 keeps reporting an acknowledged prescription in its own
  // QueryReadyPrescription queue, so this list is merged into whatever the
  // live fetch returns, keeping a confirmed prescription selectable for
  // Eliminate even if the machine stops reporting it.
  const [confirmedIds, setConfirmedIds] = useState<string[]>([])

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewAction, setPreviewAction] = useState<RecheckAction | null>(null)
  const [previewXmls, setPreviewXmls] = useState<Array<{ hisId: string; label: string; xml: string }> | null>(null)
  const [confirming, setConfirming] = useState(false)
  // How many of the selected prescriptions have finished (success or
  // failure) out of the total, while a multi-prescription Confirm/Eliminate
  // is running — drives the progress bar in the confirm modal.
  const [confirmProgress, setConfirmProgress] = useState<{ done: number; total: number } | null>(null)

  // Populate any already-confirmed-but-not-eliminated prescriptions on
  // mount, so they're visible/selectable even before the first live fetch
  // (and survive a page reload, unlike pure client state).
  useEffect(() => {
    void fetchConfirmedPendingIds().then((ids) => {
      if (ids.length === 0) return
      setConfirmedIds(ids)
      setReadyIds((current) => [...current, ...ids.filter((id) => !current.includes(id))])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFetch = async () => {
    setFetching(true)
    setSelectedIds([])
    try {
      const [result, pendingIds] = await Promise.all([queryReadyPrescriptions(), fetchConfirmedPendingIds()])
      if (!result.ok) {
        message.error(result.message)
        return
      }
      // Keep any previously-confirmed-but-not-eliminated ids visible even if
      // this fetch no longer reports them — see confirmedIds above.
      setConfirmedIds(pendingIds)
      const merged = [
        ...result.readyPrescriptionHisIds,
        ...pendingIds.filter((id) => !result.readyPrescriptionHisIds.includes(id)),
      ]
      setReadyIds(merged)
      setLastFetchedAt(result.queriedAt)
      if (merged.length === 0) {
        message.info('No prescriptions ready on the machine right now')
      }
    } finally {
      setFetching(false)
    }
  }

  const toggleSelected = (hisId: string) => {
    setSelectedIds((current) => (current.includes(hisId) ? current.filter((id) => id !== hisId) : [...current, hisId]))
  }

  const allSelected = readyIds.length > 0 && selectedIds.length === readyIds.length
  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : [...readyIds])
  }

  const handleOpenPreview = async (action: RecheckAction) => {
    if (selectedIds.length === 0) return
    setPreviewLoading(true)
    try {
      const xmls: Array<{ hisId: string; label: string; xml: string }> = []

      // Build every selected prescription's preview body(ies) up front so
      // the confirm modal shows the exact full batch before anything is
      // actually sent — same preview-before-send guarantee as a single id,
      // just repeated per prescription.
      for (const hisId of selectedIds) {
        if (action === 'confirm' || action === 'both') {
          const result = await previewConfirmRecheck(hisId)
          if (!result.ok) {
            message.error(`${hisId}: ${result.message}`)
            return
          }
          xmls.push({ hisId, label: 'UpdateReadyPrescriptionState', xml: result.xml })
        }

        if (action === 'eliminate' || action === 'both') {
          const result = await previewEliminatePrescription(hisId)
          if (!result.ok) {
            message.error(`${hisId}: ${result.message}`)
            return
          }
          xmls.push({ hisId, label: 'ExecEliminatePrescription', xml: result.xml })
        }
      }

      setPreviewXmls(xmls)
      setPreviewAction(action)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviewXmls(null)
    setPreviewAction(null)
  }

  const handleConfirm = async () => {
    if (selectedIds.length === 0 || !previewAction) return
    const action = previewAction
    const hisIds = selectedIds
    // Deliberately keep the modal open (previewXmls stays non-null) so the
    // progress bar below has somewhere to render — clearing it here would
    // close the modal instantly and the progress bar would never be seen.
    setConfirming(true)

    // Partial failures are normal here — one prescription failing (e.g. the
    // machine already dropped it from its ready queue) shouldn't block the
    // rest of the batch, same as this app's other batch-send flows.
    const succeeded: string[] = []
    const failed: string[] = []
    setConfirmProgress({ done: 0, total: hisIds.length })

    try {
      for (let i = 0; i < hisIds.length; i += 1) {
        const hisId = hisIds[i]
        try {
          let ok = true
          if (action === 'confirm' || action === 'both') {
            ok = (await confirmRecheck(hisId)).ok
          }
          if (ok && (action === 'eliminate' || action === 'both')) {
            ok = (await eliminatePrescription(hisId)).ok
          }
          if (ok) succeeded.push(hisId)
          else failed.push(hisId)
        } catch {
          failed.push(hisId)
        } finally {
          setConfirmProgress({ done: i + 1, total: hisIds.length })
        }
      }

      if (succeeded.length > 0) {
        message.success(`${ACTION_LABELS[action]}: ${succeeded.length} succeeded${failed.length > 0 ? `, ${failed.length} failed` : ''}`)
      }
      if (failed.length > 0) {
        message.error(`Failed for: ${failed.join(', ')}`)
      }

      if (action === 'confirm') {
        // Only acked so far — basket is still bound, still needs Eliminate.
        // Keep succeeded ids visible/selectable (remember in confirmedIds)
        // instead of dropping them like a fully-resolved action would.
        setConfirmedIds((current) => [...current, ...succeeded.filter((id) => !current.includes(id))])
      } else {
        // 'eliminate'/'both' fully resolve succeeded ids — drop from both
        // lists and refresh Process Tracking's data so the rest of the app
        // reflects the new state without a manual page reload.
        setConfirmedIds((current) => current.filter((id) => !succeeded.includes(id)))
        setReadyIds((current) => current.filter((id) => !succeeded.includes(id)))
        if (succeeded.length > 0) void loadTrackedPrescriptions()
      }
      // Leave failed ids selected so the pharmacist can retry just those.
      setSelectedIds(failed)
    } finally {
      setConfirming(false)
      setConfirmProgress(null)
      // Now safe to close the modal — the batch is done.
      setPreviewXmls(null)
      setPreviewAction(null)
    }
  }

  const handleCopyPreview = (xml: string) => {
    void navigator.clipboard.writeText(xml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  return (
    <>
      <div className="machine-sim-card machine-sim-card--wide">
        <div className="machine-sim-card__header">
          <span className="prescription-card__badge">Machine-only</span>
          <h4>
            <CloudDownloadOutlined /> Ready Prescriptions
          </h4>
          <p>เรียก QueryReadyPrescription ไปที่เครื่อง RB1500 เพื่อดูใบสั่งที่จ่ายยาเสร็จแล้ว รอเภสัชกรตรวจสอบซ้ำ — เลือกได้หลายใบพร้อมกัน</p>
        </div>

        <div className="machine-sim-card__query-toolbar">
          <Button icon={<CloudDownloadOutlined />} onClick={() => void handleFetch()} loading={fetching}>
            Fetch from machine
          </Button>
          {readyIds.length > 0 ? (
            <Button onClick={handleToggleSelectAll}>{allSelected ? 'Deselect All' : `Select All (${readyIds.length})`}</Button>
          ) : null}
          {lastFetchedAt ? (
            <span className="machine-sim-card__query-meta">Last fetched {new Date(lastFetchedAt).toLocaleTimeString()} — {readyIds.length} prescription(s)</span>
          ) : null}
        </div>

        {readyIds.length === 0 ? (
          <div className="machine-sim-card__query-empty">
            {lastFetchedAt ? 'No prescriptions ready on the machine right now.' : 'Press "Fetch from machine" to load the list.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {readyIds.map((hisId) => {
              const match = tracked.find((item) => item.prescriptionhisid === hisId)
              const isConfirmedPending = confirmedIds.includes(hisId)
              const isSelected = selectedIds.includes(hisId)
              return (
                <Tag
                  key={hisId}
                  color={isSelected ? 'orange' : isConfirmedPending ? 'green' : 'blue'}
                  style={{ cursor: 'pointer', padding: '6px 10px' }}
                  onClick={() => toggleSelected(hisId)}
                  title={isConfirmedPending ? 'Already confirmed — still needs Eliminate to release the basket' : undefined}
                >
                  {match?.mzno ?? hisId} {match ? `(${hisId})` : ''}
                  {isConfirmedPending ? ' — confirmed' : ''}
                </Tag>
              )
            })}
          </div>
        )}

        {selectedIds.length > 0 ? (
          <div className="cobot-task-box cobot-task-box--selected">
            <div className="cobot-task-box__row">
              <span className="cobot-task-box__label">Selected</span>
              <strong>{selectedIds.length} prescription(s)</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {selectedIds.map((hisId) => {
                const match = tracked.find((item) => item.prescriptionhisid === hisId)
                return (
                  <div key={hisId} className="cobot-task-box__row">
                    <span>{match?.patientname ?? hisId}</span>
                    <span className="cobot-task-box__label">{hisId}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <Button icon={<CheckCircleOutlined />} loading={previewLoading} onClick={() => void handleOpenPreview('confirm')}>
                Confirm Dispensing
              </Button>
              <Button danger icon={<WarningFilled />} loading={previewLoading} onClick={() => void handleOpenPreview('eliminate')}>
                Eliminate (Release Basket)
              </Button>
              <Button type="primary" loading={previewLoading} onClick={() => void handleOpenPreview('both')}>
                Confirm + Eliminate (Full Process)
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        title={`Confirm SOAP payload — ${previewAction ? ACTION_LABELS[previewAction] : ''} (${selectedIds.length} prescription(s))`}
        open={previewXmls !== null}
        onCancel={confirming ? undefined : handleCancelPreview}
        closable={!confirming}
        maskClosable={!confirming}
        width={720}
        footer={[
          <Button key="cancel" disabled={confirming} onClick={handleCancelPreview}>
            Cancel
          </Button>,
          <Button key="send" type="primary" loading={confirming} onClick={() => void handleConfirm()}>
            Confirm &amp; Send
          </Button>,
        ]}
      >
        <p>This calls the real machine's SOAP endpoint directly, once per selected prescription{previewAction === 'both' ? ' (both calls fire in sequence for each one)' : ''}.</p>
        {confirmProgress ? (
          <Progress
            style={{ marginBottom: 16 }}
            percent={Math.round((confirmProgress.done / confirmProgress.total) * 100)}
            status={confirmProgress.done === confirmProgress.total ? 'success' : 'active'}
            format={() => `${confirmProgress.done} / ${confirmProgress.total}`}
          />
        ) : null}
        {/* Hide the (potentially long) XML list once sending has started so
            the progress bar above is what's visible while the batch runs. */}
        {!confirming
          ? (previewXmls ?? []).map((entry, index) => (
              <div key={`${entry.hisId}-${entry.label}-${index}`} style={{ marginBottom: 16 }}>
                <div className="medicine-staging__details-group-title" style={{ marginBottom: 8 }}>
                  {entry.hisId} — {entry.label}
                </div>
                <pre className="medicine-preview__xml">{entry.xml}</pre>
                <Button size="small" onClick={() => handleCopyPreview(entry.xml)}>
                  Copy
                </Button>
              </div>
            ))
          : null}
      </Modal>
    </>
  )
}
