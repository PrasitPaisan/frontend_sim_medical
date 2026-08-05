import { useCallback, useState, type ReactNode } from 'react'
import { Button, Input, Modal, message } from 'antd'
import { CloudDownloadOutlined, QrcodeOutlined } from '@ant-design/icons'
import QrScanModal from './QrScanModal'
import { extractRCPreId } from '../../lib/medbag2DCode'

type NursingQueryResultBase = {
  ok: boolean
  message: string
  queriedAt: string
}

type NursingQueryCardProps<T extends NursingQueryResultBase> = {
  icon: ReactNode
  title: string
  description: string
  inputPlaceholder: string
  onPreview: (medbag2DCodeParam1: string) => Promise<{ ok: true; xml: string } | { ok: false; message: string }>
  onQuery: (medbag2DCodeParam1: string) => Promise<T>
  renderResult: (result: T) => ReactNode
}

// Shared shell for the two Nursing Interface query cards (Nursing /
// NursingCode, ATDPS doc §3.4) — unlike the other machine-sim action cards,
// these key off a drug bag's 2D code (RCPreId part of KF[MZNO]_[RCPreId])
// rather than a prescription HIS id, so there's nothing to pick from an
// existing list. Still read-only against the machine (no database write on
// either side, see MachineService.nursingFromNZP360/nursingCodeFromNZP360),
// but follows the app's usual preview-before-send pattern anyway (fetch the
// SOAP body first, show it in a confirm modal, only "Confirm & Fetch" hits
// the machine) so a pharmacist can see exactly what would be sent before an
// as-yet-unconfirmed operation goes out over the wire.
export default function NursingQueryCard<T extends NursingQueryResultBase>({
  icon,
  title,
  description,
  inputPlaceholder,
  onPreview,
  onQuery,
  renderResult,
}: NursingQueryCardProps<T>) {
  const [codeInput, setCodeInput] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<T | null>(null)
  const [scanOpen, setScanOpen] = useState(false)

  const handleOpenPreview = async () => {
    const code = codeInput.trim()
    if (!code) {
      message.warning('Enter a drug bag 2D code (RCPreId part)')
      return
    }

    setPreviewLoading(true)
    const previewResult = await onPreview(code)
    setPreviewLoading(false)

    if (!previewResult.ok) {
      message.error(previewResult.message)
      return
    }
    setPreviewXml(previewResult.xml)
  }

  const handleConfirmFetch = async () => {
    const code = codeInput.trim()
    setLoading(true)
    const queryResult = await onQuery(code)
    setLoading(false)
    setPreviewXml(null)
    setResult(queryResult)

    if (!queryResult.ok) {
      message.error(queryResult.message)
    }
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  // Scanned QR carries the drug bag's full 2D code (KF[MZNO]_[RCPreId]) —
  // extractRCPreId pulls out just the part the Nursing/NursingCode
  // interfaces want, same as if the RCPreId had been typed in directly.
  const handleScan = useCallback((rawText: string) => {
    setCodeInput(extractRCPreId(rawText))
    setScanOpen(false)
    message.success('QR code scanned')
  }, [])

  return (
    <div className="machine-sim-card machine-sim-card--wide">
      <div className="machine-sim-card__header">
        <span className="prescription-card__badge">Machine-only</span>
        <h4>
          {icon} {title}
        </h4>
        <p>{description}</p>
      </div>

      <div className="machine-sim-card__controls">
        <Input
          placeholder={inputPlaceholder}
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value)}
          onPressEnter={() => void handleOpenPreview()}
          disabled={loading}
        />
        <Button icon={<QrcodeOutlined />} onClick={() => setScanOpen(true)} disabled={loading}>
          Scan
        </Button>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          loading={previewLoading}
          disabled={!codeInput.trim()}
          onClick={() => void handleOpenPreview()}
        >
          Fetch
        </Button>
      </div>

      <QrScanModal open={scanOpen} title={`Scan drug bag code — ${title}`} onClose={() => setScanOpen(false)} onScan={handleScan} />

      <Modal
        title={`Confirm ${title} request`}
        open={previewXml !== null || loading}
        onCancel={loading ? undefined : () => setPreviewXml(null)}
        closable={!loading}
        maskClosable={!loading}
        width={640}
        footer={
          loading
            ? null
            : [
                <Button key="cancel" onClick={() => setPreviewXml(null)}>
                  Cancel
                </Button>,
                <Button key="copy" onClick={handleCopyPreview}>
                  Copy
                </Button>,
                <Button key="fetch" type="primary" onClick={() => void handleConfirmFetch()}>
                  Confirm &amp; Fetch
                </Button>,
              ]
        }
      >
        {loading ? (
          <p>Sending request to the machine…</p>
        ) : (
          <>
            <p>This is the exact SOAP body that will be sent to the real machine.</p>
            <pre className="medicine-preview__xml">{previewXml}</pre>
          </>
        )}
      </Modal>

      {result ? (
        <span className="machine-sim-card__query-meta">Last fetched {new Date(result.queriedAt).toLocaleTimeString()}</span>
      ) : null}

      {result && !result.ok ? <div className="machine-sim-card__error">{result.message}</div> : null}

      {result && result.ok ? renderResult(result) : null}

      {!result ? <div className="machine-sim-card__query-empty">Enter a drug bag code and press "Fetch" to load.</div> : null}
    </div>
  )
}
