import { useEffect, useState } from 'react'
import { Button } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import { useMachineSim, type MachinePart } from '../../hooks/useMachineSim'

const DEFAULT_MACHINE_ID = 1

// Checks the real machine's own health/online status (QueryMachineState) —
// queries once on mount rather than polling continuously, to avoid
// hammering the physical machine; refresh is manual. machineState's meaning
// beyond '0' (seen as "初始化"/initializing) isn't confirmed yet, so this
// shows the machine's own message verbatim instead of guessing a semantic
// label. Shared by both RB1500 and NZP360 — NZP360's response additionally
// carries a per-part breakdown (parts), which RB1500's doesn't have.
export default function MachineStatusCard({ machine = 'RB1500' }: { machine?: 'RB1500' | 'NZP360' }) {
  const { queryMachineState } = useMachineSim()
  const [loading, setLoading] = useState(false)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [parts, setParts] = useState<MachinePart[]>([])

  const handleCheck = async () => {
    setLoading(true)
    try {
      const result = await queryMachineState(DEFAULT_MACHINE_ID, machine)
      setOk(result.ok)
      setDetail(
        result.ok
          ? `State ${result.machineState ?? '?'}: ${result.machineMessage ?? '—'}`
          : result.message,
      )
      setParts(result.parts ?? [])
      setCheckedAt(new Date().toLocaleTimeString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void handleCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const variantClass = ok === null ? '' : ok ? 'machine-sim-card--positive' : 'machine-sim-card--danger'

  return (
    <div className={`machine-sim-card ${variantClass}`}>
      <div className="machine-sim-card__header">
        <span className="prescription-card__badge">Machine-only</span>
        <h4>
          <ApiOutlined /> Machine Status ({machine})
        </h4>
        <p>เรียก QueryMachineState ไปที่เครื่อง {machine} เพื่อเช็คว่าเครื่องออนไลน์/พร้อมทำงานอยู่หรือไม่</p>
      </div>

      <div className="machine-sim-card__controls">
        <Button icon={<ApiOutlined />} loading={loading} onClick={() => void handleCheck()}>
          Recheck
        </Button>
      </div>

      {ok === null ? null : (
        <div className={ok ? 'machine-sim-card__complete' : 'machine-sim-card__error'}>
          {detail}
          {checkedAt ? <span className="medicine-list__subtext"> — Last checked {checkedAt}</span> : null}
        </div>
      )}

      {parts.length > 0 ? (
        <ul className="medicine-list__subtext" style={{ marginTop: 8 }}>
          {parts.map((part, index) => (
            <li key={part.partId ?? index}>
              {part.partName || '—'} ({part.partId || '—'}): {part.partMessage || '—'}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
