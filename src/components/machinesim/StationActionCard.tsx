import { useState } from 'react'
import { Button, Input, message } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'
import type { Station } from '../../lib/stations'
import type { AdvanceStateResult } from '../../hooks/useMachineSim'

type StationActionCardProps = {
  station: Station
  isFinal: boolean
  onPass: (hisId: string, state: number) => Promise<AdvanceStateResult>
}

export default function StationActionCard({ station, isFinal, onPass }: StationActionCardProps) {
  const [hisId, setHisId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastPassedId, setLastPassedId] = useState<string | null>(null)

  const handlePass = async () => {
    const trimmedId = hisId.trim()
    if (!trimmedId) {
      message.warning('Enter a HIS id first')
      return
    }

    setSubmitting(true)
    const result = await onPass(trimmedId, station.state)
    setSubmitting(false)

    if (result.ok) {
      message.success(isFinal ? `${trimmedId} complete` : result.message)
      setLastPassedId(trimmedId)
      setHisId('')
    } else {
      message.error(result.message)
    }
  }

  return (
    <div className="machine-sim-card">
      <div className="machine-sim-card__header">
        <span className="prescription-card__badge">State {station.state}</span>
        <h4>{station.labelEn}</h4>
        <p>{station.labelTh}</p>
      </div>

      <div className="machine-sim-card__controls">
        <Input
          placeholder="HIS id"
          value={hisId}
          onChange={(event) => setHisId(event.target.value)}
          onPressEnter={() => void handlePass()}
          disabled={submitting}
        />
        <Button type="primary" onClick={() => void handlePass()} loading={submitting}>
          Pass
        </Button>
      </div>

      {lastPassedId ? (
        <div className="machine-sim-card__complete">
          <CheckCircleFilled /> {isFinal ? `${lastPassedId} complete` : `${lastPassedId} passed`}
        </div>
      ) : null}
    </div>
  )
}
