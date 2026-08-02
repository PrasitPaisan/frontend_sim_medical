import { api } from '../lib/api'

// Mirrors MachineService.BasketPositionItem's response shape.
export type BasketPositionItem = {
  basketId?: string
  preNo?: string
  splitNo?: string
  position?: number
  lastTime?: string
}

export type QueryBasketPositionResult = {
  ok: boolean
  message: string
  items: BasketPositionItem[]
  queriedAt: string
}

// Default matches RB1500's own recommendation (5 minutes) — see
// MachineService.queryBasketPositionFromRB1500.
const DEFAULT_WITHIN_TIME_SECONDS = 300

export function useBasketPosition() {
  // Bulk query — every basket RB1500 has moved within withinTimeSeconds, not
  // just one prescription's. Read-only, no database write on either side
  // (see MachineService.queryBasketPositionFromRB1500). Deliberately not
  // polled automatically — fired once per "Fetch live position" click from
  // Process Tracking, since this is a dev/test environment and shouldn't
  // hammer the real machine on a timer.
  const queryBasketPosition = async (
    withinTimeSeconds: number = DEFAULT_WITHIN_TIME_SECONDS,
  ): Promise<QueryBasketPositionResult> => {
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        items?: BasketPositionItem[]
        queriedAt?: string
      }>(`/machine/query-basket-position?withinTime=${withinTimeSeconds}`)

      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Fetched position for ${result.items?.length ?? 0} basket(s)` : 'Machine rejected the request'),
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

  return { queryBasketPosition }
}
