import { useEffect, useState } from 'react'
import { Button, Modal, Tag, message } from 'antd'
import { CheckCircleOutlined, CloudDownloadOutlined, WarningFilled } from '@ant-design/icons'
import { useMachineSim } from '../../hooks/useMachineSim'
import { usePharmacistRecheck } from '../../hooks/usePharmacistRecheck'
import { useTrackedPrescriptions } from '../../hooks/useTrackedPrescriptions'

// Which real machine action(s) the confirm modal is about to fire —
// 'both' runs Confirm Dispensing then Eliminate in sequence, one HTTP call
// after another, to stand in for the real end-to-end pharmacist workflow
// (see CLAUDE.md's Pharmacist Recheck section) in a single click, while the
// two solo actions stay available for testing each SOAP call independently.
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const [previewXmls, setPreviewXmls] = useState<Array<{ label: string; xml: string }> | null>(null)
  const [confirming, setConfirming] = useState(false)

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
    setSelectedId(null)
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

  const handleOpenPreview = async (action: RecheckAction) => {
    if (!selectedId) return
    setPreviewLoading(true)
    try {
      const xmls: Array<{ label: string; xml: string }> = []

      if (action === 'confirm' || action === 'both') {
        const result = await previewConfirmRecheck(selectedId)
        if (!result.ok) {
          message.error(result.message)
          return
        }
        xmls.push({ label: 'UpdateReadyPrescriptionState', xml: result.xml })
      }

      if (action === 'eliminate' || action === 'both') {
        const result = await previewEliminatePrescription(selectedId)
        if (!result.ok) {
          message.error(result.message)
          return
        }
        xmls.push({ label: 'ExecEliminatePrescription', xml: result.xml })
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
    if (!selectedId || !previewAction) return
    const action = previewAction
    const hisId = selectedId
    setPreviewXmls(null)
    setPreviewAction(null)
    setConfirming(true)

    try {
      if (action === 'confirm' || action === 'both') {
        const result = await confirmRecheck(hisId)
        if (!result.ok) {
          message.error(result.message)
          return
        }
        if (action === 'confirm') message.success(result.message)
      }

      if (action === 'eliminate' || action === 'both') {
        const result = await eliminatePrescription(hisId)
        if (!result.ok) {
          message.error(result.message)
          return
        }
        message.success(result.message)
      }

      if (action === 'both') {
        message.success(`${hisId}: dispensing confirmed and basket released`)
      }

      if (action === 'confirm') {
        // Only acked so far — basket is still bound, still needs Eliminate.
        // Keep it visible/selectable (remember it in confirmedIds) instead
        // of dropping it like a fully-resolved action would.
        setConfirmedIds((current) => (current.includes(hisId) ? current : [...current, hisId]))
      } else {
        // 'eliminate'/'both' fully resolve it — drop from both lists and
        // refresh Process Tracking's data so the rest of the app reflects
        // the new state without a manual page reload.
        setConfirmedIds((current) => current.filter((id) => id !== hisId))
        setReadyIds((current) => current.filter((id) => id !== hisId))
        void loadTrackedPrescriptions()
      }
      setSelectedId(null)
    } finally {
      setConfirming(false)
    }
  }

  const handleCopyPreview = (xml: string) => {
    void navigator.clipboard.writeText(xml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  const selectedTracked = selectedId ? tracked.find((item) => item.prescriptionhisid === selectedId) : undefined

  return (
    <>
      <div className="machine-sim-card machine-sim-card--wide">
        <div className="machine-sim-card__header">
          <span className="prescription-card__badge">Machine-only</span>
          <h4>
            <CloudDownloadOutlined /> Ready Prescriptions
          </h4>
          <p>เรียก QueryReadyPrescription ไปที่เครื่อง RB1500 เพื่อดูใบสั่งที่จ่ายยาเสร็จแล้ว รอเภสัชกรตรวจสอบซ้ำ</p>
        </div>

        <div className="machine-sim-card__query-toolbar">
          <Button icon={<CloudDownloadOutlined />} onClick={() => void handleFetch()} loading={fetching}>
            Fetch from machine
          </Button>
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
              return (
                <Tag
                  key={hisId}
                  color={selectedId === hisId ? 'orange' : isConfirmedPending ? 'green' : 'blue'}
                  style={{ cursor: 'pointer', padding: '6px 10px' }}
                  onClick={() => setSelectedId(hisId)}
                  title={isConfirmedPending ? 'Already confirmed — still needs Eliminate to release the basket' : undefined}
                >
                  {match?.mzno ?? hisId} {match ? `(${hisId})` : ''}
                  {isConfirmedPending ? ' — confirmed' : ''}
                </Tag>
              )
            })}
          </div>
        )}

        {selectedId ? (
          <div className="cobot-task-box cobot-task-box--selected">
            <div className="cobot-task-box__row">
              <span className="cobot-task-box__label">Selected</span>
              <strong>{selectedTracked?.patientname ?? selectedId}</strong>
            </div>
            <div className="cobot-task-box__row">
              <span className="cobot-task-box__label">PrehisId</span>
              <span>{selectedId}</span>
            </div>
            {selectedTracked ? (
              <div className="cobot-task-box__row">
                <span className="cobot-task-box__label">Current pre_state</span>
                <span>{selectedTracked.pre_state === 1 ? 'Complete' : 'In progress'}</span>
              </div>
            ) : null}

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
        title={`Confirm SOAP payload — ${previewAction ? ACTION_LABELS[previewAction] : ''} (${selectedId ?? ''})`}
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
        <p>This calls the real machine's SOAP endpoint directly{previewAction === 'both' ? ' — both calls fire in sequence, one after another' : ''}.</p>
        {(previewXmls ?? []).map((entry) => (
          <div key={entry.label} style={{ marginBottom: 16 }}>
            <div className="medicine-staging__details-group-title" style={{ marginBottom: 8 }}>
              {entry.label}
            </div>
            <pre className="medicine-preview__xml">{entry.xml}</pre>
            <Button size="small" onClick={() => handleCopyPreview(entry.xml)}>
              Copy
            </Button>
          </div>
        ))}
      </Modal>
    </>
  )
}
