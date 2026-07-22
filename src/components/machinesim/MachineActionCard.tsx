import { useState, type ReactNode } from 'react'
import { Button, Input, Modal, message } from 'antd'
import type { MachineCallResult } from '../../hooks/useMachineSim'

type MachineActionCardProps = {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  confirmTitle: string
  confirmDescription: string
  variant: 'danger' | 'positive'
  onPreview: (hisId: string) => Promise<{ ok: true; xml: string } | { ok: false; message: string }>
  onSubmit: (hisId: string) => Promise<MachineCallResult>
}

// Shared shell for the machine-only action cards on this page (Eliminate
// Prescription, Confirm Dispensing Complete, …) — unlike the pipeline
// station cards, these are not simulation: each fires a real SOAP call
// straight at RB1500 with no database read/write on either end. Clicking
// the action button previews the exact SOAP body first (no machine call)
// before the user confirms in the modal.
export default function MachineActionCard({
  icon,
  title,
  description,
  actionLabel,
  confirmTitle,
  confirmDescription,
  variant,
  onPreview,
  onSubmit,
}: MachineActionCardProps) {
  const [hisId, setHisId] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<MachineCallResult | null>(null)

  const handleOpenPreview = async () => {
    const trimmedId = hisId.trim()
    if (!trimmedId) {
      message.warning('Enter a HIS id first')
      return
    }

    setPreviewLoading(true)
    try {
      const result = await onPreview(trimmedId)
      if (result.ok) {
        setPreviewXml(result.xml)
      } else {
        message.error(result.message)
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirmSend = async () => {
    const trimmedId = hisId.trim()
    setPreviewXml(null)
    setSubmitting(true)
    const result = await onSubmit(trimmedId)
    setSubmitting(false)
    setLastResult(result)

    if (result.ok) {
      message.success(result.message)
      setHisId('')
    } else {
      message.error(result.message)
    }
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  return (
    <div className={`machine-sim-card ${variant === 'danger' ? 'machine-sim-card--danger' : 'machine-sim-card--positive'}`}>
      <div className="machine-sim-card__header">
        <span className="prescription-card__badge">Machine-only</span>
        <h4>
          {icon} {title}
        </h4>
        <p>{description}</p>
      </div>

      <div className="machine-sim-card__controls">
        <Input
          placeholder="Prescription HIS id"
          value={hisId}
          onChange={(event) => setHisId(event.target.value)}
          onPressEnter={() => void handleOpenPreview()}
          disabled={submitting}
        />
        <Button
          danger={variant === 'danger'}
          type="primary"
          loading={previewLoading}
          disabled={!hisId.trim()}
          onClick={() => void handleOpenPreview()}
        >
          {actionLabel}
        </Button>
      </div>

      <Modal
        title={confirmTitle}
        open={previewXml !== null}
        onCancel={() => setPreviewXml(null)}
        width={720}
        footer={[
          <Button key="cancel" onClick={() => setPreviewXml(null)}>
            Cancel
          </Button>,
          <Button key="copy" onClick={handleCopyPreview}>
            Copy
          </Button>,
          <Button
            key="send"
            danger={variant === 'danger'}
            type="primary"
            loading={submitting}
            onClick={() => void handleConfirmSend()}
          >
            Confirm &amp; {actionLabel}
          </Button>,
        ]}
      >
        <p>{confirmDescription}</p>
        <pre className="medicine-preview__xml">{previewXml}</pre>
      </Modal>

      {lastResult ? (
        <div className={lastResult.ok ? 'machine-sim-card__complete' : 'machine-sim-card__error'}>
          {lastResult.message}
        </div>
      ) : null}
    </div>
  )
}
