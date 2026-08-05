import { useCallback, useRef, useState } from 'react'
import { Modal, Alert } from 'antd'
import QrScanner from 'qr-scanner'

type QrScanModalProps = {
  open: boolean
  title: string
  onClose: () => void
  onScan: (rawText: string) => void
}

// Camera-based QR scan modal, shared by any card that needs to read a drug
// bag's 2D code (Nursing/NursingCode today) — opens the device camera via
// qr-scanner (BarcodeDetector where available, worker-based jsQR fallback
// otherwise) and reports back the raw decoded text, letting the caller
// decide how to parse it (see lib/medbag2DCode.ts). Manual text entry stays
// available alongside this on every card — scanning is additive, not a
// replacement.
//
// Scanner setup deliberately happens in afterOpenChange, not a useEffect
// keyed on `open`: antd's Modal mounts its children (the <video> element)
// only after its entrance animation finishes, so a useEffect firing on the
// same render `open` flips true would still find videoRef.current null.
// afterOpenChange(true) is antd's own signal that the video is now in the DOM.
export default function QrScanModal({ open, title, onClose, onScan }: QrScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState<string | null>(null)

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop()
    scannerRef.current?.destroy()
    scannerRef.current = null
  }, [])

  const handleAfterOpenChange = useCallback((visible: boolean) => {
    if (!visible) {
      stopScanner()
      setError(null)
      return
    }

    setError(null)
    const video = videoRef.current
    if (!video) return

    const scanner = new QrScanner(video, (result) => onScanRef.current(result.data), {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      preferredCamera: 'environment',
    })
    scannerRef.current = scanner

    scanner.start().catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to access camera')
    })
  }, [stopScanner])

  return (
    <Modal title={title} open={open} onCancel={onClose} afterOpenChange={handleAfterOpenChange} footer={null} destroyOnClose width={480}>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Camera unavailable"
          description={`${error} — check browser camera permissions, or use the text input instead.`}
        />
      ) : (
        <video ref={videoRef} style={{ width: '100%', borderRadius: 12, background: '#000' }} muted playsInline />
      )}
    </Modal>
  )
}
