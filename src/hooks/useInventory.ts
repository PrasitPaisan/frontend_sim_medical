import { api } from '../lib/api'

// Mirrors MachineService.InventoryItem's response shape. isShortage stays
// the raw '0'/'1' string from the machine — see lib/inventory.ts for how
// it's turned into a status Tag.
export type InventoryItem = {
  locationCode?: string
  medHisId?: string
  medName?: string
  medSpecs?: string
  medFactory?: string
  medUnit?: string
  currentQuantity?: string
  maximumQuantity?: string
  shortagePercentage?: string
  isShortage?: string
}

export type QueryInventoryResult = {
  ok: boolean
  message: string
  items: InventoryItem[]
  queriedAt: string
}

export type InventoryMachine = 'RB1500' | 'NZP360'

// RB1500's endpoint is the original `/machine/query-inventory`; NZP360's is
// the parallel `/machine/query-inventory-nzp360` added alongside it — same
// field shapes on both sides (see MachineService.queryInventoryFromNZP360),
// so one hook covers both rather than duplicating it per machine.
function endpointFor(machine: InventoryMachine) {
  return machine === 'NZP360' ? '/machine/query-inventory-nzp360' : '/machine/query-inventory'
}

export function useInventory() {
  // Builds the exact SOAP body queryInventory would transmit, without
  // sending it — lets the UI show a confirmation preview before the real
  // machine call.
  const previewQueryInventory = async (
    machineId: number,
    operation: number,
    machine: InventoryMachine = 'RB1500',
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.get<{ xml: string }>(`${endpointFor(machine)}/preview?machineId=${machineId}&operation=${operation}`)
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  // operation: 1 query shortage inventory, 2 query inventory summary, 3
  // query inventory details — read-only, no database write on either side
  // (see MachineService.queryInventoryFromRB1500/queryInventoryFromNZP360).
  const queryInventory = async (
    machineId: number,
    operation: number,
    machine: InventoryMachine = 'RB1500',
  ): Promise<QueryInventoryResult> => {
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        items?: InventoryItem[]
        queriedAt?: string
      }>(`${endpointFor(machine)}?machineId=${machineId}&operation=${operation}`)

      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Fetched inventory for ${result.items?.length ?? 0} medicine(s)` : 'Machine rejected the request'),
        items: result.items ?? [],
        queriedAt: result.queriedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to reach dispensing machine',
        items: [],
        queriedAt: new Date().toISOString(),
      }
    }
  }

  return { previewQueryInventory, queryInventory }
}
