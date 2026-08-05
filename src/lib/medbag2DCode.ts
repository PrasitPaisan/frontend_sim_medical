// Drug bag 2D code format per ATDPS doc §3.4.2.1: KF[MZNO]_[RCPreId], e.g.
// "KF259446_1000117420" — the Nursing/NursingCode interfaces only want the
// RCPreId part. A scanned QR code carries the full bag code, but someone
// typing the value in by hand might paste either the full code or just the
// RCPreId — this accepts both so callers don't need to care which one they got.
export function extractRCPreId(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^KF[^_]*_(.+)$/i)
  return match ? match[1].trim() : trimmed
}
