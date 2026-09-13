// prescription_header.priority — RB1500 SendPrescription's header-level
// <priority> field (0-9, only 0-4 defined so far). One code per prescription,
// distinct from prescription_detail.priority (a separate per-medicine field
// with its own 1-5 scheme — see lib/priority.ts). This is the sole source
// for "top priority" list sort/Tag on Prescription Managements.
// Confirmed 2026-08-08: RB1500 reversed this code mapping from an earlier
// build — it now runs Continue(0)..Vending(4) instead of Vending(0)..
// Continue(4). Existing prescription_header.priority values in the DB were
// migrated (`priority = 4 - priority`) to preserve their real-world meaning
// across the flip — don't re-apply that migration if this file is touched
// again later, it's a one-time historical correction.
export const ORDER_PRIORITY_OPTIONS = [
  { value: 0, label: 'Continue order' },
  { value: 1, label: 'Discharge order' },
  { value: 2, label: 'New order' },
  { value: 3, label: 'Stat order' },
  { value: 4, label: 'Vending machine' },
]

const ORDER_PRIORITY_COLORS: Record<number, string> = {
  0: 'green',
  1: 'gold',
  2: 'orange',
  3: 'red',
  4: 'blue',
}

export function getOrderPriorityLabel(priority: number | null | undefined): string {
  if (priority == null) return '—'
  return ORDER_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? String(priority)
}

export function getOrderPriorityColor(priority: number | null | undefined): string {
  if (priority == null) return 'default'
  return ORDER_PRIORITY_COLORS[priority] ?? 'default'
}
