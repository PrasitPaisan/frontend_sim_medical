import { Spin } from 'antd'
import PageShell from '../components/PageShell'
import TrackingCard from '../components/tracking/TrackingCard'
import { useTrackedPrescriptions } from '../hooks/useTrackedPrescriptions'

export default function ProcessTrackingPage() {
  const { prescriptions, loading, error } = useTrackedPrescriptions()

  return (
    <PageShell title="Process Tracking" subtitle="Track ordered prescriptions across dispensing stations">
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
          <TrackingCard key={item.id} item={item} />
        ))}
      </div>
    </PageShell>
  )
}
