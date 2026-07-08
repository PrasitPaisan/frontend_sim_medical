import { Button, message, Popconfirm } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import PageShell from '../components/PageShell'
import StationActionCard from '../components/machinesim/StationActionCard'
import { useMachineSim } from '../hooks/useMachineSim'
import { useBaskets } from '../hooks/useBaskets'
import { PIPELINE_STATIONS } from '../lib/stations'

export default function MachineSimPage() {
  const { advanceState } = useMachineSim()
  const { baskets, loadBaskets, resetAll } = useBaskets()

  const handlePass = async (hisId: string, station: number) => {
    const result = await advanceState(hisId, station)
    if (result.ok) {
      void loadBaskets()
    }
    return result
  }

  const handleReset = async () => {
    try {
      const { basketsReset, prescriptionsReset } = await resetAll()
      message.success(`Reset ${prescriptionsReset} prescription(s) and freed ${basketsReset} basket(s)`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to reset simulation')
    }
  }

  return (
    <PageShell title="Machine Sim" subtitle="Simulate each station reporting dispensing progress by HIS id">
      <div className="machine-sim-toolbar">
        <Popconfirm
          title="Reset simulation?"
          description="Unbinds every basket and sets every prescription back to Received (-1). This is a simulation-only action."
          okText="Reset"
          okButtonProps={{ danger: true }}
          onConfirm={() => void handleReset()}
        >
          <Button icon={<ReloadOutlined />} danger>
            Reset Simulation
          </Button>
        </Popconfirm>
      </div>

      <div className="machine-sim-grid">
        {PIPELINE_STATIONS.map((station, index) => (
          <StationActionCard
            key={station.key}
            station={station}
            isFinal={index === PIPELINE_STATIONS.length - 1}
            onPass={handlePass}
            baskets={baskets.filter((basket) => basket.station_status === station.state)}
          />
        ))}
      </div>
    </PageShell>
  )
}
