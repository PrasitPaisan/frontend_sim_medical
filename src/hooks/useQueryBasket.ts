import { api } from '../lib/api'

// Mirrors MachineService.queryBasketFromRB1500's response shape. DataTable's
// fields mirror prescription_header columns almost 1:1 — see the backend
// comment for the real error-case capture this was confirmed against.
export type QueryBasketResult = {
  ok: boolean
  message: string
  resultCode?: string
  patientName?: string
  fetchWindow?: string
  deleteFlag?: string
  basketId?: string
  finishTime?: string
  queriedAt: string
}

export function useQueryBasket() {
  // Builds the exact SOAP body queryBasket would transmit, without sending
  // it — lets the UI show a confirmation preview before the real machine call.
  const previewQueryBasket = async (
    str: string,
    type: string,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.get<{ xml: string }>(
        `/machine/query-basket/preview?str=${encodeURIComponent(str)}&type=${encodeURIComponent(type)}`,
      )
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  // type doubles as a lighting command (1 blue, 2 green, 3 red, anything
  // else = plain query, no lighting) — see MachineService.queryBasketFromRB1500.
  const queryBasket = async (str: string, type: string): Promise<QueryBasketResult> => {
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        resultCode?: string
        patientName?: string
        fetchWindow?: string
        deleteFlag?: string
        basketId?: string
        finishTime?: string
        queriedAt?: string
      }>(`/machine/query-basket?str=${encodeURIComponent(str)}&type=${encodeURIComponent(type)}`)

      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Queried basket for ${str}` : 'Machine rejected the request'),
        resultCode: result.resultCode,
        patientName: result.patientName,
        fetchWindow: result.fetchWindow,
        deleteFlag: result.deleteFlag,
        basketId: result.basketId,
        finishTime: result.finishTime,
        queriedAt: result.queriedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to reach dispensing machine',
        queriedAt: new Date().toISOString(),
      }
    }
  }

  return { previewQueryBasket, queryBasket }
}
