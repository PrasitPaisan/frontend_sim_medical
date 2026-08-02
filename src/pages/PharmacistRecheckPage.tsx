import { useState } from 'react'
import { Button, Modal, Tag, message } from 'antd'
import { CheckCircleOutlined, CloudDownloadOutlined, WarningFilled } from '@ant-design/icons'
import PageShell from '../components/PageShell'
import { useMachineSim } from '../hooks/useMachineSim'
import { usePharmacistRecheck } from '../hooks/usePharmacistRecheck'
import { useTrackedPrescriptions } from '../hooks/useTrackedPrescriptions'

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

export default function PharmacistRecheckPage() {
  const { queryReadyPrescriptions, previewEliminatePrescription, eliminatePrescription } = useMachineSim()
  const { previewConfirmRecheck, confirmRecheck } = usePharmacistRecheck()
  const { prescriptions: tracked, loadTrackedPrescriptions } = useTrackedPrescriptions()

  const [fetching, setFetching] = useState(false)
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewAction, setPreviewAction] = useState<RecheckAction | null>(null)
  const [previewXmls, setPreviewXmls] = useState<Array<{ label: string; xml: string }> | null>(null)
  const [confirming, setConfirming] = useState(false)

  const handleFetch = async () => {
    setFetching(true)
    setSelectedId(null)
    try {
      const result = await queryReadyPrescriptions()
      if (!result.ok) {
        message.error(result.message)
        return
      }
      setReadyIds(result.readyPrescriptionHisIds)
      setLastFetchedAt(result.queriedAt)
      if (result.readyPrescriptionHisIds.length === 0) {
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

      // Both actions change pre_state on the backend — drop it from the
      // ready list and refresh Process Tracking's data so the rest of the
      // app reflects the new state without a manual page reload.
      setReadyIds((current) => current.filter((id) => id !== hisId))
      setSelectedId(null)
      void loadTrackedPrescriptions()
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
    <PageShell title="Pharmacist Recheck" subtitle="Confirm dispensing is complete and release the basket, per the real RB1500 workflow">
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
              return (
                <Tag
                  key={hisId}
                  color={selectedId === hisId ? 'orange' : 'blue'}
                  style={{ cursor: 'pointer', padding: '6px 10px' }}
                  onClick={() => setSelectedId(hisId)}
                >
                  {match?.mzno ?? hisId} {match ? `(${hisId})` : ''}
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
    </PageShell>
  )
}
