import { useState } from 'react'
import { Button, Collapse, Modal, Tag, message, Spin } from 'antd'
import PageShell from '../components/PageShell'
import PrescriptionCard from '../components/PrescriptionCard'
import PrescriptionToolbar from '../components/PrescriptionToolbar'
import { usePrescriptions, type PrescriptionItem } from '../hooks/usePrescriptions'
import { api } from '../lib/api'

type PrescriptionPreview = {
  id?: number
  mzno?: string
  prescriptionhisid?: string
  rb1500Xml: string
  nzp360Xml?: string
}

export default function PrescriptionPage() {
  const {
    prescriptions,
    total,
    page,
    pageSize,
    setPage,
    selectedId,
    setSelectedId,
    loading,
    error,
    loadPrescriptions,
    removePrescriptions,
    fetchPrescriptionIds,
    nextFetchInSeconds,
  } = usePrescriptions()
  const [selectedForSend, setSelectedForSend] = useState<number[]>([])
  const [sendingBatch, setSendingBatch] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previews, setPreviews] = useState<PrescriptionPreview[] | null>(null)
  const [pendingPrescriptions, setPendingPrescriptions] = useState<PrescriptionItem[] | null>(null)

  const toggleSelection = (id: number) => {
    setSelectedForSend((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleSelectFirstN = async (n: number) => {
    setSelecting(true)
    try {
      const ids = await fetchPrescriptionIds(n)
      setSelectedForSend(ids)
    } finally {
      setSelecting(false)
    }
  }

  const handleClearSelection = () => setSelectedForSend([])

  const resolveSelectedPrescriptions = async (): Promise<PrescriptionItem[]> => {
    // Bulk-selected ids can span pages that aren't loaded in the browser
    // (see PrescriptionToolbar's "select first N") — backfill those via
    // /prescriptions/by-ids before building the payload, since the machine
    // call needs each prescription's full medicine list.
    const loadedIds = new Set(prescriptions.map((item) => item.id))
    const missingIds = selectedForSend.filter((id) => !loadedIds.has(id))
    const backfilled = missingIds.length > 0
      ? await api.post<PrescriptionItem[]>('/prescriptions/by-ids', { ids: missingIds })
      : []

    return [
      ...prescriptions.filter((item) => selectedForSend.includes(item.id)),
      ...backfilled,
    ]
  }

  const handleOpenPreview = async () => {
    if (selectedForSend.length === 0) {
      message.info('Select at least one prescription to send')
      return
    }

    setPreviewLoading(true)
    try {
      const selectedPrescriptions = await resolveSelectedPrescriptions()
      const response = await api.post<{ previews: PrescriptionPreview[] }>('/prescriptions/preview-send', {
        prescriptions: selectedPrescriptions,
      })
      setPendingPrescriptions(selectedPrescriptions)
      setPreviews(response.previews)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Unable to build preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviews(null)
    setPendingPrescriptions(null)
  }

  const handleCopyPreview = (xml: string) => {
    void navigator.clipboard.writeText(xml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  const handleConfirmSend = async () => {
    if (!pendingPrescriptions) return
    setPreviews(null)
    setSendingBatch(true)

    try {
      const response = await api.post<{ ok?: boolean; message?: string; updatedIds?: number[] }>(
        '/prescriptions/send-batch',
        { prescriptions: pendingPrescriptions },
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
      setPendingPrescriptions(null)
    }
  }

  return (
    <PageShell title="Prescription Managements" subtitle="Review prescription batches from the connected backend">
      <PrescriptionToolbar
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        loading={loading}
        onRefresh={() => void loadPrescriptions()}
        nextFetchInSeconds={nextFetchInSeconds}
        selectedCount={selectedForSend.length}
        onSendSelected={() => void handleOpenPreview()}
        sendingBatch={previewLoading}
        onSelectFirstN={(n) => void handleSelectFirstN(n)}
        onClearSelection={handleClearSelection}
        selecting={selecting}
      />

      <Modal
        title={`Confirm SOAP payload (${previews?.length ?? 0} prescription(s))`}
        open={previews !== null}
        onCancel={handleCancelPreview}
        width={840}
        footer={[
          <Button key="cancel" onClick={handleCancelPreview}>
            Cancel
          </Button>,
          <Button key="send" type="primary" loading={sendingBatch} onClick={() => void handleConfirmSend()}>
            Confirm &amp; Send
          </Button>,
        ]}
      >
        <Collapse
          items={(previews ?? []).map((preview, index) => ({
            key: preview.id ?? index,
            label: (
              <span>
                {preview.mzno || preview.prescriptionhisid || `Prescription ${index + 1}`}
                {preview.nzp360Xml ? <Tag color="blue" style={{ marginLeft: 8 }}>RB1500 + NZP360</Tag> : <Tag style={{ marginLeft: 8 }}>RB1500</Tag>}
              </span>
            ),
            children: (
              <>
                <div className="medicine-staging__details-group-title" style={{ marginBottom: 4 }}>RB1500</div>
                <pre className="medicine-preview__xml">{preview.rb1500Xml}</pre>
                <Button size="small" onClick={() => handleCopyPreview(preview.rb1500Xml)} style={{ marginBottom: preview.nzp360Xml ? 16 : 0 }}>
                  Copy RB1500 XML
                </Button>
                {preview.nzp360Xml ? (
                  <>
                    <div className="medicine-staging__details-group-title" style={{ marginBottom: 4 }}>NZP-360</div>
                    <pre className="medicine-preview__xml">{preview.nzp360Xml}</pre>
                    <Button size="small" onClick={() => handleCopyPreview(preview.nzp360Xml!)}>
                      Copy NZP360 XML
                    </Button>
                  </>
                ) : null}
              </>
            ),
          }))}
        />
      </Modal>

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
