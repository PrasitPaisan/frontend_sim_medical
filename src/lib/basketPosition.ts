// RB1500's own Position numbering from QueryBasketPosition — deliberately
// NOT the same scale as basket.station_status (they diverge at 2/3/4; see
// lib/stations.ts), so this is kept as its own separate lookup rather than
// merged into PIPELINE_STATIONS. This is "what the real machine says right
// now", shown alongside (not instead of) the simulated station stepper.
// Confirmed range is 1-5 only — the machine does not report Idle (0) or
// End (6) at all, so neither is a real Position value to expect back.
const BASKET_POSITION_LABELS: Record<number, string> = {
  1: 'Binding card position',
  2: 'Manual replenishment position',
  3: 'NZP360 dispensing position',
  4: 'T type exit',
  5: 'COBOT dispensing position',
}

export function getBasketPositionLabel(position: number | undefined): string {
  if (position == null) return 'Unknown position'
  return BASKET_POSITION_LABELS[position] ?? `Position ${position}`
}

// Best-effort mapping from RB1500's real Position to our simulated
// station_status, used to auto-advance the stepper after a live fetch —
// deliberately partial: Position 4 (T type exit) has no station_status
// equivalent, so it stays display-only (see PIPELINE_STATIONS in
// lib/stations.ts). Now that Position 6 (End) is confirmed not to exist on
// the real machine, there is no live signal left that maps to
// 'recheck-arrived' (6) or beyond — reaching/verifying the recheck point
// still has to be advanced manually (Machine Sim) or via the Confirm
// Dispensing flow, not from a live basket-position fetch.
const POSITION_TO_STATION_STATUS: Record<number, number> = {
  1: 2, // Binding card position -> Box Dispensing Machine
  2: 3, // Manual replenishment position -> Manual Dispensing Point
  3: 4, // NZP360 dispensing position -> Loose Tablet Dispensing Machine
  5: 5, // COBOT dispensing position -> COBOT
}

export function mapPositionToStationStatus(position: number | undefined): number | null {
  if (position == null) return null
  return POSITION_TO_STATION_STATUS[position] ?? null
}
