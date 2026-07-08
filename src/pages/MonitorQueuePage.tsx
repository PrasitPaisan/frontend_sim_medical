import { Spin } from 'antd'
import PageShell from '../components/PageShell'
import { useMonitorQueue } from '../hooks/useMonitorQueue'

export default function MonitorQueuePage() {
  const { queue, loading, error } = useMonitorQueue()

  return (
    <PageShell title="Monitor Queue" subtitle="เรียกผู้ป่วยมารับยา — โปรดสังเกตช่องรับยาของท่าน">
      {error && (
        <div className="placeholder-card" style={{ marginBottom: 12 }}>
          <strong>Unable to load monitor queue:</strong> {error}
        </div>
      )}

      {loading && queue.length === 0 ? (
        <div className="placeholder-card" style={{ display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      ) : null}

      {!loading && queue.length === 0 && !error ? (
        <div className="prescription-empty">ยังไม่มีผู้ป่วยที่ถูกเรียกให้มารับยาในขณะนี้</div>
      ) : null}

      {queue.length > 0 ? (
        <div className="monitor-queue-grid">
          {queue.map((item, index) => (
            <div className={`monitor-queue-card ${index === 0 ? 'monitor-queue-card--next' : ''}`} key={item.prescriptionhisid}>
              <div className="monitor-queue-card__window">
                <span className="monitor-queue-card__window-label">ช่องรับยา</span>
                <span className="monitor-queue-card__window-number">{item.fetchwindow}</span>
              </div>
              <div className="monitor-queue-card__patient">
                <strong>{item.patientname}</strong>
                <span>{item.mzno}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </PageShell>
  )
}
