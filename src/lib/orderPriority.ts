// prescription_header.priority — RB1500 SendPrescription's header-level
// <priority> field (0-9, only 0-4 defined so far). One code per prescription,
// distinct from prescription_detail.priority (a separate per-medicine field
// with its own 1-5 scheme — see lib/priority.ts). This is the sole source
// for "top priority" list sort/Tag on Prescription Managements.
export const ORDER_PRIORITY_OPTIONS = [
  { value: 0, label: 'Vending machine' },
  { value: 1, label: 'Stat order' },
  { value: 2, label: 'New order' },
  { value: 3, label: 'Discharge order' },
  { value: 4, label: 'Continue order' },
]

const ORDER_PRIORITY_COLORS: Record<number, string> = {
  0: 'blue',
  1: 'red',
  2: 'orange',
  3: 'gold',
  4: 'green',
}

export function getOrderPriorityLabel(priority: number | null | undefined): string {
  if (priority == null) return '—'
  return ORDER_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? String(priority)
}

export function getOrderPriorityColor(priority: number | null | undefined): string {
  if (priority == null) return 'default'
  return ORDER_PRIORITY_COLORS[priority] ?? 'default'
}
