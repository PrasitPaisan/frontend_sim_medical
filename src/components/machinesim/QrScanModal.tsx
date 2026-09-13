import { useCallback, useRef, useState } from 'react'
import { Modal, Alert } from 'antd'
import QrScanner from 'qr-scanner'

type QrScanModalProps = {
  open: boolean
  title: string
  onClose: () => void
  onScan: (rawText: string) => void
}

// Formats we'd like to read — a drug bag's code could be either a QR code or
// a 1D barcode depending on how it was printed. Filtered down to whatever
// the browser's native detector actually reports as supported before use
// (see BARCODE_FORMATS below), since listing an unsupported format isn't an
// error but also never matches anything.
const BARCODE_FORMATS = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar']

// Camera-based scan modal, shared by any card that needs to read a drug
// bag's code (Nursing/NursingCode today) — reports back the raw decoded
// text, letting the caller decide how to parse it (see lib/medbag2DCode.ts).
// Manual text entry stays available alongside this on every card — scanning
// is additive, not a replacement.
//
// Prefers the native Barcode Detection API (reads both QR codes and common
// 1D barcodes) when the browser supports it, since the `qr-scanner` npm
// package this used to rely on exclusively is QR-only by design (it
// hardcodes `formats: ['qr_code']` internally even when it delegates to the
// same native API under the hood — there's no way to widen that from the
// outside). Falls back to `qr-scanner` (QR-only, with its own worker-based
// jsQR fallback for browsers lacking BarcodeDetector entirely) so scanning
// still works everywhere — just without barcode support in that fallback.
//
// Scanner setup deliberately happens in afterOpenChange, not a useEffect
// keyed on `open`: antd's Modal mounts its children (the <video> element)
// only after its entrance animation finishes, so a useEffect firing on the
// same render `open` flips true would still find videoRef.current null.
// afterOpenChange(true) is antd's own signal that the video is now in the DOM.
export default function QrScanModal({ open, title, onClose, onScan }: QrScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const scannedRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState<string | null>(null)
  const [barcodeSupported, setBarcodeSupported] = useState(true)

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop()
    scannerRef.current?.destroy()
    scannerRef.current = null

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const startNativeDetector = useCallback(async (video: HTMLVideoElement) => {
    const supported = await window.BarcodeDetector!.getSupportedFormats()
    const formats = BARCODE_FORMATS.filter((format) => supported.includes(format))
    const detector = new window.BarcodeDetector!({ formats: formats.length > 0 ? formats : undefined })

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    streamRef.current = stream
    video.srcObject = stream
    await video.play()

    const tick = () => {
      if (scannedRef.current) return
      void detector.detect(video).then((results) => {
        if (results.length > 0 && !scannedRef.current) {
          scannedRef.current = true
          onScanRef.current(results[0].rawValue)
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      })
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startQrOnlyFallback = useCallback((video: HTMLVideoElement) => {
    const scanner = new QrScanner(video, (result) => onScanRef.current(result.data), {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      preferredCamera: 'environment',
    })
    scannerRef.current = scanner
    return scanner.start()
  }, [])

  const handleAfterOpenChange = useCallback(
    (visible: boolean) => {
      if (!visible) {
        stopScanner()
        setError(null)
        return
      }

      setError(null)
      scannedRef.current = false
      const video = videoRef.current
      if (!video) return

      const hasNativeDetector = typeof window.BarcodeDetector !== 'undefined'
      setBarcodeSupported(hasNativeDetector)

      const startPromise = hasNativeDetector ? startNativeDetector(video) : Promise.resolve(startQrOnlyFallback(video))

      startPromise.catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to access camera')
      })
    },
    [stopScanner, startNativeDetector, startQrOnlyFallback],
  )

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
        <>
          <video ref={videoRef} style={{ width: '100%', borderRadius: 12, background: '#000' }} muted playsInline />
          {!barcodeSupported ? (
            <Alert
              style={{ marginTop: 8 }}
              type="info"
              showIcon
              message="This browser only supports scanning QR codes here — barcode scanning needs a browser with the native Barcode Detection API (e.g. recent Chrome/Edge)."
            />
          ) : null}
        </>
      )}
    </Modal>
  )
}
