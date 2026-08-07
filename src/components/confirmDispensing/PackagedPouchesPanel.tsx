import { useState } from 'react'
import { Button, Checkbox, Modal, message } from 'antd'
import { CheckCircleOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import { usePackagedPouches, type PackagedPouch } from '../../hooks/usePackagedPouches'

export default function PackagedPouchesPanel() {
  const { previewQueryPackagedInfo, queryPackagedInfo, previewUpdatePackagedInfo, updatePackagedInfo } = usePackagedPouches()

  const [fetching, setFetching] = useState(false)
  const [pouches, setPouches] = useState<PackagedPouch[]>([])
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [fetchRequestXml, setFetchRequestXml] = useState<string | null>(null)
  const [showFetchRequestXml, setShowFetchRequestXml] = useState(false)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const handleFetch = async () => {
    setFetching(true)
    setSelectedIds([])
    try {
      // Capture the exact QueryPackagedInfo request body sent for this fetch
      // (read-only, so no confirm step needed — just for visibility/debugging).
      const preview = await previewQueryPackagedInfo()
      setFetchRequestXml(preview.ok ? preview.xml : null)

      const result = await queryPackagedInfo()
      if (!result.ok) {
        message.error(result.message)
        return
      }
      setPouches(result.pouches)
      setLastFetchedAt(result.queriedAt)
      if (result.pouches.length === 0) {
        message.info('No packaged pouches on the machine right now')
      }
    } finally {
      setFetching(false)
    }
  }

  const toggleSelected = (packId: string, checked: boolean) => {
    setSelectedIds((current) => (checked ? [...current, packId] : current.filter((id) => id !== packId)))
  }

  const handleOpenPreview = async () => {
    if (selectedIds.length === 0) return
    setPreviewLoading(true)
    try {
      const result = await previewUpdatePackagedInfo(selectedIds)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      setPreviewXml(result.xml)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreviewXml(null)
  }

  const handleConfirm = async () => {
    const packIds = selectedIds
    setPreviewXml(null)
    setConfirming(true)
    try {
      const result = await updatePackagedInfo(packIds)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      message.success(result.message)
      setPouches((current) => current.filter((pouch) => !packIds.includes(pouch.packId ?? '')))
      setSelectedIds([])
    } finally {
      setConfirming(false)
    }
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  return (
    <>
      <div className="machine-sim-card machine-sim-card--wide">
        <div className="machine-sim-card__header">
          <span className="prescription-card__badge">Machine-only</span>
          <h4>
            <CloudDownloadOutlined /> Packaged Pouches
          </h4>
          <p>เรียก QueryPackagedInfo ไปที่เครื่อง NZP360 เพื่อดูว่าถุงยาไหนบรรจุเสร็จแล้วบ้าง</p>
        </div>

        <div className="machine-sim-card__query-toolbar">
          <Button icon={<CloudDownloadOutlined />} onClick={() => void handleFetch()} loading={fetching}>
            Fetch from machine
          </Button>
          {lastFetchedAt ? (
            <span className="machine-sim-card__query-meta">Last fetched {new Date(lastFetchedAt).toLocaleTimeString()} — {pouches.length} pouch(es)</span>
          ) : null}
          {fetchRequestXml ? (
            <Button size="small" onClick={() => setShowFetchRequestXml(true)}>
              View request body
            </Button>
          ) : null}
        </div>

        {pouches.length === 0 ? (
          <div className="machine-sim-card__query-empty">
            {lastFetchedAt ? 'No packaged pouches on the machine right now.' : 'Press "Fetch from machine" to load the list.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pouches.map((pouch) => (
              <div key={pouch.packId} className="cobot-task-box">
                <div className="cobot-task-box__row">
                  <Checkbox
                    checked={selectedIds.includes(pouch.packId ?? '')}
                    onChange={(e) => toggleSelected(pouch.packId ?? '', e.target.checked)}
                  >
                    <strong>Pouch {pouch.packId}</strong>
                  </Checkbox>
                </div>
                <div className="cobot-task-box__row">
                  <span className="cobot-task-box__label">Order</span>
                  <span>{pouch.orderPre ?? pouch.orderNo ?? '—'}</span>
                </div>
                <div className="cobot-task-box__row">
                  <span className="cobot-task-box__label">Patient</span>
                  <span>{pouch.patId ?? '—'}</span>
                </div>
                <div className="cobot-task-box__row">
                  <span className="cobot-task-box__label">Exec time</span>
                  <span>{pouch.exeTime ?? '—'}</span>
                </div>
                <div className="cobot-task-box__row">
                  <span className="cobot-task-box__label">Medicines</span>
                  <span>{pouch.medList.map((med) => med.medCode).filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {pouches.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={selectedIds.length === 0}
              loading={previewLoading}
              onClick={() => void handleOpenPreview()}
            >
              Filter Selected ({selectedIds.length})
            </Button>
          </div>
        ) : null}
      </div>

      <Modal
        title="SOAP request body — QueryPackagedInfo"
        open={showFetchRequestXml}
        onCancel={() => setShowFetchRequestXml(false)}
        width={720}
        footer={[
          <Button
            key="copy"
            onClick={() => {
              if (!fetchRequestXml) return
              void navigator.clipboard.writeText(fetchRequestXml).then(
                () => message.success('SOAP body copied to clipboard'),
                () => message.error('Failed to copy to clipboard'),
              )
            }}
          >
            Copy
          </Button>,
          <Button key="close" type="primary" onClick={() => setShowFetchRequestXml(false)}>
            Close
          </Button>,
        ]}
      >
        <p>This is the exact body sent for the last "Fetch from machine" call (read-only, already executed).</p>
        <pre className="medicine-preview__xml">{fetchRequestXml}</pre>
      </Modal>

      <Modal
        title={`Confirm SOAP payload — UpdatePackagedInfo (${selectedIds.length} pouch(es))`}
        open={previewXml !== null}
        onCancel={confirming ? undefined : handleCancelPreview}
        closable={!confirming}
        maskClosable={!confirming}
        width={720}
        footer={[
          <Button key="cancel" disabled={confirming} onClick={handleCancelPreview}>
            Cancel
          </Button>,
          <Button key="send" type="primary" loading={confirming} onClick={() => void handleConfirm()}>
            Confirm &amp; Send
          </Button>,
        ]}
      >
        <p>This calls the real machine's SOAP endpoint directly.</p>
        <pre className="medicine-preview__xml">{previewXml}</pre>
        <Button size="small" onClick={handleCopyPreview}>
          Copy
        </Button>
      </Modal>
    </>
  )
}
