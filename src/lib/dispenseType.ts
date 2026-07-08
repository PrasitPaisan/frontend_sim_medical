// Known dispense_type values seen in medicine_dictionary today. New machine
// model codes can still be entered freely (see MedicineForm) — this list is
// just what's suggested in the dropdown and colored consistently everywhere
// dispense_type is shown as a tag.
export const DISPENSE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'cobot', label: 'COBOT' },
  { value: 'rb1500', label: 'RB-1500 (box)' },
  { value: 'nzp360', label: 'NZP-360 (loose tablet)' },
]

const DISPENSE_TYPE_COLORS: Record<string, string> = {
  manual: 'default',
  cobot: 'purple',
  nzp360: 'blue',
  rb1500: 'gold',
}

export function getDispenseTypeColor(dispenseType: string | null | undefined): string {
  if (!dispenseType) return 'default'
  return DISPENSE_TYPE_COLORS[dispenseType] ?? 'cyan'
}
