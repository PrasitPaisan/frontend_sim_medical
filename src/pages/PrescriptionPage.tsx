import { useState } from 'react'
import { Button, Collapse, Modal, Segmented, Tag, message, Spin } from 'antd'
import PageShell from '../components/PageShell'
import PrescriptionCard from '../components/PrescriptionCard'
import PrescriptionToolbar from '../components/PrescriptionToolbar'
import { usePrescriptions, type PrescriptionItem } from '../hooks/usePrescriptions'
import { api } from '../lib/api'

// Both RB1500's and NZP360's SendPrescription batch multiple prescriptions
// into one SOAP call (up to 50 at a time — see MAX_MACHINE_BATCH_SIZE in
// prescriptions.service.ts), so the preview is split into batches for each
// machine rather than one entry per prescription — otherwise a 50-item
// selection would show the same giant XML duplicated in every panel.
// NZP360 batches only cover the nzp360-eligible subset within each RB1500
// chunk (mirroring sendBatchToMachines exactly), so its batch count/grouping
// can differ from RB1500's.
type MachineBatchPreview = {
  prescriptionIds: Array<number | undefined>
  mznos: Array<string | undefined>
  prescriptionHisIds: Array<string | undefined>
  // Aligned index-for-index with the arrays above — which prescriptions in
  // this dispatch order need COBOT (see interleaveCobotPrescriptions on the
  // backend). Absent on nzp360Batches, since COBOT is an RB1500-only concern.
  cobotFlags?: boolean[]
  xml: string
}

type PrescriptionPreviewItem = {
  id?: number
  mzno?: string
  prescriptionhisid?: string
}

// Unified preview shape the confirm modal renders from, regardless of which
// target was picked — for a single-machine target the other machine's batch
// list is just empty, so the same Collapse sections work for all 3 cases.
type PreviewResponse = {
  rb1500Batches: MachineBatchPreview[]
  nzp360Batches: MachineBatchPreview[]
  items: PrescriptionPreviewItem[]
}

type SplitPreviewResponse = {
  batches: MachineBatchPreview[]
  items: PrescriptionPreviewItem[]
}

type SendTarget = 'both' | 'rb1500' | 'nzp360'

type SendResultItem = {
  id?: number
  mzno?: string
  ok: boolean
  error?: string
}

type SendResult = {
  ok?: boolean
  message?: string
  updatedIds?: number[]
  sentIds?: number[]
  results?: SendResultItem[]
}

export default function PrescriptionPage() {
  const {
    prescriptions,
    total,
    page,
    pageSize,
    setPage,
    nzp360SentOnly,
    setNzp360SentOnly,
    selectedId,
    setSelectedId,
    loading,
    error,
    loadPrescriptions,
    removePrescriptions,
    markNzp360Sent,
    fetchPrescriptionIds,
    nextFetchInSeconds,
  } = usePrescriptions()
  const [selectedForSend, setSelectedForSend] = useState<number[]>([])
  const [sendingBatch, setSendingBatch] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [pendingPrescriptions, setPendingPrescriptions] = useState<PrescriptionItem[] | null>(null)
  // Which machine(s) to send to — chosen inside the confirm modal itself
  // rather than via separate toolbar/card buttons, so a pharmacist can send
  // NZP360 now and RB1500 later (or both together) from one place.
  const [sendTarget, setSendTarget] = useState<SendTarget>('both')
  // Only set when the modal was opened from a single card's "Send NZP360
  // only"/"Send RB1500 only" button — drives that card's button spinner.
  const [cardBusy, setCardBusy] = useState<{ itemId: number; kind: 'rb1500' | 'nzp360' } | null>(null)

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

  // Fetches the preview for whichever target is currently selected, reusing
  // the single-machine preview endpoints (and reshaping their response into
  // the same rb1500Batches/nzp360Batches shape the combined preview uses) so
  // the modal below never needs to know which endpoint answered.
  const fetchPreviewForTarget = async (
    target: SendTarget,
    items: PrescriptionItem[],
  ): Promise<PreviewResponse> => {
    if (target === 'both') {
      return api.post<PreviewResponse>('/prescriptions/preview-send', { prescriptions: items })
    }

    const endpoint = target === 'rb1500' ? '/prescriptions/preview-send-rb1500' : '/prescriptions/preview-send-nzp360'
    const response = await api.post<SplitPreviewResponse>(endpoint, { prescriptions: items })

    return target === 'rb1500'
      ? { rb1500Batches: response.batches, nzp360Batches: [], items: response.items }
      : { rb1500Batches: [], nzp360Batches: response.batches, items: response.items }
  }

  const openPreview = async (items: PrescriptionItem[], initialTarget: SendTarget) => {
    if (items.length === 0) {
      message.info('Select at least one prescription to send')
      return
    }

    setPreviewLoading(true)
    try {
      const response = await fetchPreviewForTarget(initialTarget, items)
      setPendingPrescriptions(items)
      setSendTarget(initialTarget)
      setPreview(response)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Unable to build preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleOpenPreview = async () => {
    const selectedPrescriptions = await resolveSelectedPrescriptions()
    await openPreview(selectedPrescriptions, 'both')
  }

  const handleOpenCardPreview = async (kind: 'rb1500' | 'nzp360', item: PrescriptionItem) => {
    setCardBusy({ itemId: item.id, kind })
    await openPreview([item], kind)
  }

  // Switching the target inside the modal re-fetches its preview against the
  // same pendingPrescriptions — no need to re-resolve the selection.
  const handleTargetChange = async (target: SendTarget) => {
    if (!pendingPrescriptions) return
    setSendTarget(target)
    setPreviewLoading(true)
    try {
      const response = await fetchPreviewForTarget(target, pendingPrescriptions)
      setPreview(response)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Unable to build preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreview(null)
    setPendingPrescriptions(null)
    setCardBusy(null)
  }

  // Send success/failure is the one outcome a pharmacist really needs to
  // notice — a corner toast is too easy to miss, so this uses a centered
  // Modal instead, with the per-prescription failure reasons spelled out
  // rather than just a summary count.
  const showSendResultModal = (
    kind: 'success' | 'warning' | 'error',
    title: string,
    resultMessage: string | undefined,
    failedItems: SendResultItem[],
  ) => {
    const modalFn = kind === 'success' ? Modal.success : kind === 'warning' ? Modal.warning : Modal.error
    modalFn({
      title,
      width: 480,
      centered: true,
      content: (
        <div>
          <p style={{ fontSize: 16 }}>{resultMessage}</p>
          {failedItems.length > 0 ? (
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {failedItems.map((item, index) => (
                <li key={item.id ?? index}>
                  {item.mzno || `#${item.id ?? '?'}`}: {item.error || 'Unknown error'}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ),
    })
  }

  const handleCopyPreview = (xml: string) => {
    void navigator.clipboard.writeText(xml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  const handleConfirmSend = async () => {
    if (!pendingPrescriptions) return
    const target = sendTarget
    const prescriptionsToSend = pendingPrescriptions
    setPreview(null)
    setSendingBatch(true)

    try {
      const endpoint =
        target === 'both' ? '/prescriptions/send-batch' : target === 'rb1500' ? '/prescriptions/send-rb1500' : '/prescriptions/send-nzp360'
      const response = await api.post<SendResult>(endpoint, { prescriptions: prescriptionsToSend })

      const failedItems = (response.results ?? []).filter((item) => !item.ok)

      if (target === 'nzp360') {
        // NZP360 alone never touches pre_state/basket — prescriptions stay in
        // this list, just flagged as sent, instead of leaving the queue.
        const sentIds = response.sentIds ?? []
        if (response.ok === false) {
          showSendResultModal('warning', 'Sent to NZP360 — some failed', response.message, failedItems)
        } else {
          showSendResultModal('success', 'Sent to NZP360', response.message || `Sent ${sentIds.length} prescription(s) to NZP360`, [])
        }
        if (sentIds.length > 0) markNzp360Sent(sentIds)
      } else {
        // send-batch / send-rb1500 both flip pre_state to 0 on success, so
        // those ids leave Prescription Managements; everything else stays for retry.
        const updatedIds = response.updatedIds ?? []
        if (response.ok === false) {
          showSendResultModal('warning', 'Sent to the dispensing machine — some failed', response.message, failedItems)
        } else {
          showSendResultModal('success', 'Sent to the dispensing machine', response.message || `Sent ${updatedIds.length} prescription(s)`, [])
        }
        if (updatedIds.length > 0) {
          removePrescriptions(updatedIds)
          setSelectedForSend((current) => current.filter((id) => !updatedIds.includes(id)))
        }
      }
    } catch (err) {
      showSendResultModal('error', 'Unable to send prescriptions', err instanceof Error ? err.message : 'Unknown error', [])
    } finally {
      setSendingBatch(false)
      setPendingPrescriptions(null)
      setCardBusy(null)
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
        nzp360SentOnly={nzp360SentOnly}
        onToggleNzp360SentOnly={setNzp360SentOnly}
      />

      <Modal
        title={`Confirm SOAP payload (${preview?.items.length ?? 0} prescription(s))`}
        open={preview !== null || (previewLoading && pendingPrescriptions !== null)}
        onCancel={handleCancelPreview}
        width={840}
        footer={[
          <Button key="cancel" onClick={handleCancelPreview}>
            Cancel
          </Button>,
          <Button key="send" type="primary" loading={sendingBatch} disabled={previewLoading} onClick={() => void handleConfirmSend()}>
            Confirm &amp; Send
          </Button>,
        ]}
      >
        <Segmented
          style={{ marginBottom: 16 }}
          value={sendTarget}
          disabled={previewLoading}
          onChange={(value) => void handleTargetChange(value as SendTarget)}
          options={[
            { label: 'Both (RB1500 + NZP360)', value: 'both' },
            { label: 'RB1500 only', value: 'rb1500' },
            { label: 'NZP360 only', value: 'nzp360' },
          ]}
        />

        {previewLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : (
          <>
            {sendTarget !== 'nzp360' ? (
              <>
                <div className="medicine-staging__details-group-title" style={{ marginBottom: 8 }}>
                  RB1500 — {preview?.rb1500Batches.length ?? 0} batch call(s)
                </div>
                <Collapse
                  style={{ marginBottom: 16 }}
                  items={(preview?.rb1500Batches ?? []).map((batch, index) => ({
                    key: index,
                    label: (
                      <span>
                        Batch {index + 1} — {batch.prescriptionIds.length} prescription(s)
                        <Tag style={{ marginLeft: 8 }}>
                          {batch.mznos.filter(Boolean).join(', ') || batch.prescriptionHisIds.filter(Boolean).join(', ')}
                        </Tag>
                        {(batch.cobotFlags?.filter(Boolean).length ?? 0) > 0 ? (
                          <Tag color="purple">{batch.cobotFlags!.filter(Boolean).length} COBOT</Tag>
                        ) : null}
                      </span>
                    ),
                    children: (
                      <>
                        {/* Dispatch order for this batch, numbered — COBOT
                            prescriptions are highlighted so it's clear at a
                            glance where interleaveCobotPrescriptions placed
                            them, without having to read the raw XML. */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {batch.prescriptionIds.map((id, i) => {
                            const isCobot = batch.cobotFlags?.[i] ?? false
                            const label = batch.mznos[i] ?? batch.prescriptionHisIds[i] ?? id
                            return (
                              <Tag key={id ?? i} color={isCobot ? 'purple' : 'default'}>
                                #{i + 1} {label}
                                {isCobot ? ' · COBOT' : ''}
                              </Tag>
                            )
                          })}
                        </div>
                        <pre className="medicine-preview__xml">{batch.xml}</pre>
                        <Button size="small" onClick={() => handleCopyPreview(batch.xml)}>
                          Copy RB1500 batch XML
                        </Button>
                      </>
                    ),
                  }))}
                />
              </>
            ) : null}

            {sendTarget !== 'rb1500' ? (
              (preview?.nzp360Batches.length ?? 0) > 0 ? (
                <>
                  <div className="medicine-staging__details-group-title" style={{ marginBottom: 8 }}>
                    NZP-360 — {preview?.nzp360Batches.length ?? 0} batch call(s)
                  </div>
                  <Collapse
                    items={(preview?.nzp360Batches ?? []).map((batch, index) => ({
                      key: index,
                      label: (
                        <span>
                          Batch {index + 1} — {batch.prescriptionIds.length} prescription(s)
                          <Tag style={{ marginLeft: 8 }}>
                            {batch.mznos.filter(Boolean).join(', ') || batch.prescriptionHisIds.filter(Boolean).join(', ')}
                          </Tag>
                        </span>
                      ),
                      children: (
                        <>
                          <pre className="medicine-preview__xml">{batch.xml}</pre>
                          <Button size="small" onClick={() => handleCopyPreview(batch.xml)}>
                            Copy NZP360 batch XML
                          </Button>
                        </>
                      ),
                    }))}
                  />
                </>
              ) : (
                <p>No NZP360-eligible medicines in this selection (already sent, or no nzp360-dispensed medicines).</p>
              )
            ) : null}
          </>
        )}
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
            onSendRb1500={(target) => void handleOpenCardPreview('rb1500', target)}
            onSendNzp360={(target) => void handleOpenCardPreview('nzp360', target)}
            pendingAction={cardBusy?.itemId === item.id ? cardBusy.kind : null}
          />
        ))}
      </div>
    </PageShell>
  )
}
