import PageShell from '../components/PageShell'
import StationActionCard from '../components/machinesim/StationActionCard'
import { useMachineSim } from '../hooks/useMachineSim'
import { PIPELINE_STATIONS } from '../lib/stations'

export default function MachineSimPage() {
  const { advanceState } = useMachineSim()

  return (
    <PageShell title="Machine Sim" subtitle="Simulate each station reporting dispensing progress by HIS id">
      <div className="machine-sim-grid">
        {PIPELINE_STATIONS.map((station, index) => (
          <StationActionCard
            key={station.key}
            station={station}
            isFinal={index === PIPELINE_STATIONS.length - 1}
            onPass={advanceState}
          />
        ))}
      </div>
    </PageShell>
  )
}
