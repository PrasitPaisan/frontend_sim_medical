import { useState } from 'react'
import { Button, Spin, message } from 'antd'
import { CloudDownloadOutlined } from '@ant-design/icons'
import PageShell from '../components/PageShell'
import TrackingCard from '../components/tracking/TrackingCard'
import { useTrackedPrescriptions } from '../hooks/useTrackedPrescriptions'
import { useBasketPosition, type BasketPositionItem } from '../hooks/useBasketPosition'
import { useMachineSim } from '../hooks/useMachineSim'
import { mapPositionToStationStatus } from '../lib/basketPosition'

export default function ProcessTrackingPage() {
  const { prescriptions, loading, error, loadTrackedPrescriptions } = useTrackedPrescriptions()
  const { queryBasketPosition } = useBasketPosition()
  const { advanceState } = useMachineSim()

  const [fetchingLive, setFetchingLive] = useState(false)
  // Keyed by prescriptionhisid (BasketItem.preNo) — a bulk fetch, matched
  // against each already-loaded tracked prescription client-side rather than
  // this page trying to reconcile RB1500's Position numbering with our own
  // simulated station_status (they deliberately don't share a scale).
  const [livePositions, setLivePositions] = useState<Record<string, BasketPositionItem>>({})
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)

  const handleFetchLive = async () => {
    setFetchingLive(true)
    try {
      const result = await queryBasketPosition()
      if (!result.ok) {
        message.error(result.message)
        return
      }

      const byPreNo: Record<string, BasketPositionItem> = {}
      for (const item of result.items) {
        if (item.preNo) byPreNo[item.preNo] = item
      }
      setLivePositions(byPreNo)
      setLastFetchedAt(result.queriedAt)

      // Auto-advance the simulated stepper for any matched prescription whose
      // mapped target station is further along than where it currently sits
      // — forward-only (advance-station itself rejects anything else), and
      // silently skipped when there's no mapping (e.g. Position 4 "T type
      // exit" — see lib/basketPosition.ts) or the target isn't ahead yet.
      let advancedCount = 0
      for (const prescription of prescriptions) {
        const live = byPreNo[prescription.prescriptionhisid]
        if (!live) continue
        const target = mapPositionToStationStatus(live.position)
        if (target === null || target <= prescription.station_status) continue
        const advanceResult = await advanceState(prescription.prescriptionhisid, target)
        if (advanceResult.ok) advancedCount += 1
      }

      if (advancedCount > 0) {
        message.success(`${result.message} — advanced ${advancedCount} prescription(s) to match`)
        void loadTrackedPrescriptions()
      } else {
        message.success(result.message)
      }
    } finally {
      setFetchingLive(false)
    }
  }

  return (
    <PageShell title="Process Tracking" subtitle="Track prescriptions across dispensing stations, including completed ones">
      <div className="machine-sim-card__query-toolbar" style={{ marginBottom: 16 }}>
        <Button icon={<CloudDownloadOutlined />} onClick={() => void handleFetchLive()} loading={fetchingLive}>
          Fetch live position
        </Button>
        {lastFetchedAt ? (
          <span className="machine-sim-card__query-meta">Last fetched from RB1500 {new Date(lastFetchedAt).toLocaleTimeString()}</span>
        ) : null}
      </div>

      {error && (
        <div className="placeholder-card" style={{ marginBottom: 12 }}>
          <strong>Unable to load tracked prescriptions:</strong> {error}
        </div>
      )}

      {loading && prescriptions.length === 0 ? (
        <div className="placeholder-card" style={{ display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      ) : null}

      {!loading && prescriptions.length === 0 && !error ? (
        <div className="prescription-empty">No ordered prescriptions to track yet.</div>
      ) : null}

      <div className="prescription-list">
        {prescriptions.map((item) => (
          <TrackingCard key={item.id} item={item} livePosition={livePositions[item.prescriptionhisid]} />
        ))}
      </div>
    </PageShell>
  )
}
