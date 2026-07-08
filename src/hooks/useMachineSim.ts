import { api } from '../lib/api'

export type AdvanceStateResult = {
  ok: boolean
  message: string
}

export function useMachineSim() {
  const advanceState = async (prescriptionhisid: string, station: number): Promise<AdvanceStateResult> => {
    try {
      await api.post('/prescriptions/advance-station', { prescriptionhisid, station })
      return { ok: true, message: `${prescriptionhisid} advanced to station ${station}` }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to advance station' }
    }
  }

  return { advanceState }
}
