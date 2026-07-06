import { useState } from 'react'
import { message, Spin } from 'antd'
import PageShell from '../components/PageShell'
import PrescriptionCard from '../components/PrescriptionCard'
import PrescriptionToolbar from '../components/PrescriptionToolbar'
import { usePrescriptions } from '../hooks/usePrescriptions'
import { api } from '../lib/api'

export default function PrescriptionPage() {
  const {
    prescriptions,
    selectedId,
    setSelectedId,
    loading,
    error,
    loadPrescriptions,
    removePrescriptions,
    nextFetchInSeconds,
  } = usePrescriptions()
  const [selectedForSend, setSelectedForSend] = useState<number[]>([])
  const [sendingBatch, setSendingBatch] = useState(false)

  const toggleSelection = (id: number) => {
    setSelectedForSend((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleSendSelected = async () => {
    if (selectedForSend.length === 0) {
      message.info('Select at least one prescription to send')
      return
    }

    setSendingBatch(true)

    try {
      const selectedPrescriptions = prescriptions.filter((item) => selectedForSend.includes(item.id))
      const response = await api.post<{ ok?: boolean; message?: string; updatedIds?: number[] }>(
        '/prescriptions/send-batch',
        { prescriptions: selectedPrescriptions },
      )

      // The backend only flips a prescription to Ordered once the machine replies 200 OK,
      // so only ids in updatedIds actually left the queue — everything else stays for retry.
      const updatedIds = response.updatedIds ?? []

      if (response.ok === false) {
        message.warning(response.message || 'Some prescriptions could not be sent to the dispensing machine')
      } else {
        message.success(response.message || `Sent ${updatedIds.length} prescription(s)`)
      }

      if (updatedIds.length > 0) {
        removePrescriptions(updatedIds)
      }
      setSelectedForSend((current) => current.filter((id) => !updatedIds.includes(id)))
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Unable to send prescriptions')
    } finally {
      setSendingBatch(false)
    }
  }

  return (
    <PageShell title="Prescription Managements" subtitle="Review prescription batches from the connected backend">
      <PrescriptionToolbar
        count={prescriptions.length}
        loading={loading}
        onRefresh={() => void loadPrescriptions()}
        nextFetchInSeconds={nextFetchInSeconds}
        selectedCount={selectedForSend.length}
        onSendSelected={() => void handleSendSelected()}
        sendingBatch={sendingBatch}
      />

      {error && (
        <div className="placeholder-card" style={{ marginBottom: 12 }}>
          <strong>Unable to load prescriptions:</strong> {error}
        </div>
      )}

      {loading && prescriptions.length === 0 ? (
        <div className="placeholder-card" style={{ display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      ) : null}

      {!loading && prescriptions.length === 0 && !error ? (
        <div className="prescription-empty">No prescriptions found.</div>
      ) : null}

      <div className="prescription-list">
        {prescriptions.map((item) => (
          <PrescriptionCard
            key={item.id}
            item={item}
            isActive={item.id === selectedId}
            onSelect={setSelectedId}
            isSelectedForSend={selectedForSend.includes(item.id)}
            onToggleSelection={toggleSelection}
          />
        ))}
      </div>
    </PageShell>
  )
}
