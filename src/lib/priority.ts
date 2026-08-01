// prescription_detail.priority — a per-medicine field, the stored value is
// an ID not an urgency rank. Distinct from prescription_header.priority (the
// header-level RB1500 order-type field — see lib/orderPriority.ts), which is
// now the sole source for a prescription's overall priority Tag/sort.
export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Vending machine' },
  { value: 2, label: 'Stat order' },
  { value: 3, label: 'New order' },
  { value: 4, label: 'Continue order' },
  { value: 5, label: 'Discharge' },
]

const PRIORITY_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'red',
  3: 'orange',
  4: 'green',
  5: 'gold',
}

export function getPriorityLabel(priority: number | null | undefined): string {
  if (priority == null) return '—'
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? String(priority)
}

export function getPriorityColor(priority: number | null | undefined): string {
  if (priority == null) return 'default'
  return PRIORITY_COLORS[priority] ?? 'default'
}
