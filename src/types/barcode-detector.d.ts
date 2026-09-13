// Minimal ambient typing for the native Barcode Detection API — not yet part
// of TypeScript's bundled lib.dom.d.ts. Only covers what QrScanModal.tsx
// actually uses (construction, getSupportedFormats, detect). See
// https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API
interface DetectedBarcode {
  rawValue: string
  format: string
}

interface BarcodeDetectorOptions {
  formats?: string[]
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  static getSupportedFormats(): Promise<string[]>
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}
