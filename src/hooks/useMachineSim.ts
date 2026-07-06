import { api } from '../lib/api'

export type AdvanceStateResult = {
  ok: boolean
  message: string
}

export function useMachineSim() {
  const advanceState = async (prescriptionhisid: string, state: number): Promise<AdvanceStateResult> => {
    try {
      await api.post('/prescriptions/advance-state', { prescriptionhisid, state })
      return { ok: true, message: `${prescriptionhisid} updated to state ${state}` }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to update state' }
    }
  }

  return { advanceState }
}
