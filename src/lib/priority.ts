// prescription_detail.priority — the stored value is an ID, not an urgency
// rank (the numbers don't sort by urgency). See URGENCY_ORDER below for the
// actual most-to-least-urgent ordering.
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

// Most urgent first. Drives getPrescriptionPriority below — deliberately
// separate from PRIORITY_OPTIONS' value order since the two don't match
// (e.g. Discharge=5 outranks Continue order=4 in urgency despite the lower
// number order implying otherwise).
const URGENCY_ORDER = [2, 3, 5, 4, 1]

function getUrgencyRank(priority: number | null | undefined): number {
  if (priority == null) return URGENCY_ORDER.length
  const index = URGENCY_ORDER.indexOf(priority)
  return index === -1 ? URGENCY_ORDER.length : index
}

export function getPriorityLabel(priority: number | null | undefined): string {
  if (priority == null) return '—'
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? String(priority)
}

export function getPriorityColor(priority: number | null | undefined): string {
  if (priority == null) return 'default'
  return PRIORITY_COLORS[priority] ?? 'default'
}

// A prescription's overall priority is its most urgent medicine line item —
// e.g. one Stat order line among otherwise Vending machine lines makes the
// whole prescription Stat. Ranked via URGENCY_ORDER, not by raw value.
export function getPrescriptionPriority(details: Array<{ priority?: number | null }>): number {
  if (details.length === 0) return 1

  return details.reduce((mostUrgent, detail) =>
    getUrgencyRank(detail.priority) < getUrgencyRank(mostUrgent) ? (detail.priority ?? 1) : mostUrgent
  , details[0]?.priority ?? 1)
}
