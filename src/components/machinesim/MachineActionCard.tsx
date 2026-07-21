import { useState, type ReactNode } from 'react'
import { Button, Input, Popconfirm, message } from 'antd'
import type { MachineCallResult } from '../../hooks/useMachineSim'

type MachineActionCardProps = {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  confirmTitle: string
  confirmDescription: string
  variant: 'danger' | 'positive'
  onSubmit: (hisId: string) => Promise<MachineCallResult>
}

// Shared shell for the machine-only action cards on this page (Eliminate
// Prescription, Confirm Dispensing Complete, …) — unlike the pipeline
// station cards, these are not simulation: each fires a real SOAP call
// straight at RB1500 with no database read/write on either end.
export default function MachineActionCard({
  icon,
  title,
  description,
  actionLabel,
  confirmTitle,
  confirmDescription,
  variant,
  onSubmit,
}: MachineActionCardProps) {
  const [hisId, setHisId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<MachineCallResult | null>(null)

  const handleSubmit = async () => {
    const trimmedId = hisId.trim()
    if (!trimmedId) {
      message.warning('Enter a HIS id first')
      return
    }

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
          onPressEnter={() => void handleSubmit()}
          disabled={submitting}
        />
        <Popconfirm
          title={confirmTitle}
          description={confirmDescription}
          okText={actionLabel}
          okButtonProps={{ danger: variant === 'danger' }}
          onConfirm={() => void handleSubmit()}
          disabled={!hisId.trim()}
        >
          <Button danger={variant === 'danger'} type="primary" loading={submitting} disabled={!hisId.trim()}>
            {actionLabel}
          </Button>
        </Popconfirm>
      </div>

      {lastResult ? (
        <div className={lastResult.ok ? 'machine-sim-card__complete' : 'machine-sim-card__error'}>
          {lastResult.message}
        </div>
      ) : null}
    </div>
  )
}
