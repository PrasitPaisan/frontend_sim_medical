// RB1500's own Position numbering from QueryBasketPosition — deliberately
// NOT the same scale as basket.station_status (they diverge at 2/3/4; see
// lib/stations.ts), so this is kept as its own separate lookup rather than
// merged into PIPELINE_STATIONS. This is "what the real machine says right
// now", shown alongside (not instead of) the simulated station stepper.
const BASKET_POSITION_LABELS: Record<number, string> = {
  0: 'Idle',
  1: 'Binding card position',
  2: 'Manual replenishment position',
  3: 'NZP360 dispensing position',
  4: 'T type exit',
  5: 'COBOT dispensing position',
  6: 'End',
}

export function getBasketPositionLabel(position: number | undefined): string {
  if (position == null) return 'Unknown position'
  return BASKET_POSITION_LABELS[position] ?? `Position ${position}`
}

// Best-effort mapping from RB1500's real Position to our simulated
// station_status, used to auto-advance the stepper after a live fetch —
// deliberately partial: Position 4 (T type exit) has no station_status
// equivalent, so it stays display-only (see PIPELINE_STATIONS in
// lib/stations.ts). Position 6 (End) maps to 'recheck-arrived' (6), NOT
// 'pharmacist-recheck' (7) — reaching the recheck area physically isn't the
// same as the pharmacist having actually verified it, so it must not
// trigger completion on its own.
const POSITION_TO_STATION_STATUS: Record<number, number> = {
  0: 2, // Idle -> Box Dispensing Machine
  1: 2, // Binding card position -> Box Dispensing Machine
  2: 3, // Manual replenishment position -> Manual Dispensing Point
  3: 4, // NZP360 dispensing position -> Loose Tablet Dispensing Machine
  5: 5, // COBOT dispensing position -> COBOT
  6: 6, // End -> Arrived at Recheck Point
}

export function mapPositionToStationStatus(position: number | undefined): number | null {
  if (position == null) return null
  return POSITION_TO_STATION_STATUS[position] ?? null
}
