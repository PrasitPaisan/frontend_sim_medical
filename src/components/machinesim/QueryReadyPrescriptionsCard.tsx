import { useState } from 'react'
import { Button, Tag, message } from 'antd'
import { CloudDownloadOutlined } from '@ant-design/icons'
import type { QueryReadyResult } from '../../hooks/useMachineSim'

type QueryReadyPrescriptionsCardProps = {
  onQuery: () => Promise<QueryReadyResult>
}

// Bigger than the other machine-sim cards since it displays a list rather
// than taking a single HIS id — read-only against the real machine (see
// MachineService.queryReadyPrescriptionsFromRB1500), no database write on
// either side.
export default function QueryReadyPrescriptionsCard({ onQuery }: QueryReadyPrescriptionsCardProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryReadyResult | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    const queryResult = await onQuery()
    setLoading(false)
    setResult(queryResult)

    if (!queryResult.ok) {
      message.error(queryResult.message)
    }
  }

  return (
    <div className="machine-sim-card machine-sim-card--wide">
      <div className="machine-sim-card__header">
        <span className="prescription-card__badge">Machine-only</span>
        <h4>
          <CloudDownloadOutlined /> Query Ready Prescriptions
        </h4>
        <p>เรียก QueryReadyPrescription ไปที่เครื่อง RB1500 เพื่อดูรายการใบสั่งยาที่จ่ายยาเสร็จแล้ว รอเภสัชกรตรวจสอบซ้ำ</p>
      </div>

      <div className="machine-sim-card__query-toolbar">
        <Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => void handleFetch()} loading={loading}>
          Fetch from machine
        </Button>
        {result ? (
          <span className="machine-sim-card__query-meta">
            Last fetched {new Date(result.queriedAt).toLocaleTimeString()} — {result.readyPrescriptionHisIds.length} prescription(s)
          </span>
        ) : null}
      </div>

      {result && !result.ok ? (
        <div className="machine-sim-card__error">{result.message}</div>
      ) : null}

      {result && result.ok ? (
        result.readyPrescriptionHisIds.length > 0 ? (
          <ul className="machine-sim-card__ready-list">
            {result.readyPrescriptionHisIds.map((hisId) => (
              <li key={hisId}>
                <Tag color="blue">{hisId}</Tag>
              </li>
            ))}
          </ul>
        ) : (
          <div className="machine-sim-card__query-empty">No prescriptions ready on the machine right now.</div>
        )
      ) : null}

      {!result ? (
        <div className="machine-sim-card__query-empty">Press "Fetch from machine" to load the list.</div>
      ) : null}
    </div>
  )
}
