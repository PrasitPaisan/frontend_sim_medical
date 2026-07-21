import { api } from '../lib/api'

export type AdvanceStateResult = {
  ok: boolean
  message: string
}

// Shared shape for the direct machine-only calls below (MachineService in
// backend-sim/src/machine/machine.service.ts) — raw is kept around for
// inspecting what the machine actually said.
export type MachineCallResult = {
  ok: boolean
  message: string
  raw?: string
}

export type EliminatePrescriptionResult = MachineCallResult

// Mirrors MachineService.queryReadyPrescriptionsFromRB1500's response shape.
export type QueryReadyResult = {
  ok: boolean
  message: string
  readyPrescriptionHisIds: string[]
  queriedAt: string
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

  // Fires the real ExecEliminatePrescription SOAP call at RB1500. Once the
  // machine confirms, the backend also releases whatever basket was bound
  // to this prescription back to the pool and marks it eliminated
  // (pre_state = 2) — see MachineController.eliminatePrescription.
  const eliminatePrescription = async (prescriptionhisid: string): Promise<MachineCallResult> => {
    try {
      const result = await api.post<{ ok: boolean; message?: string; raw?: string }>(
        '/machine/eliminate-prescription',
        { prescriptionhisid },
      )
      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Eliminated ${prescriptionhisid} on the machine` : 'Machine rejected the request'),
        raw: result.raw,
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to reach dispensing machine' }
    }
  }

  // Tells the machine the pharmacist has recheck-verified this prescription
  // as fully dispensed (UpdateReadyPrescriptionState — see
  // MachineService.updateReadyPrescriptionStateOnRB1500) — expected to clear
  // it out of the machine's own "ready for pickup" queue. No database write
  // on either side, same as eliminatePrescription above.
  const confirmDispensingComplete = async (prescriptionhisid: string): Promise<MachineCallResult> => {
    try {
      const result = await api.post<{ ok: boolean; message?: string; raw?: string }>(
        '/machine/update-ready-state',
        { prescriptionhisid },
      )
      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Confirmed ${prescriptionhisid} as recheck-complete on the machine` : 'Machine rejected the request'),
        raw: result.raw,
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to reach dispensing machine' }
    }
  }

  // Asks RB1500 which prescriptions it has already finished dispensing
  // (ready for pharmacist pickup/recheck) — read-only, no database write on
  // either side (see MachineService.queryReadyPrescriptionsFromRB1500).
  const queryReadyPrescriptions = async (): Promise<QueryReadyResult> => {
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        readyPrescriptionHisIds?: string[]
        queriedAt?: string
      }>('/machine/query-ready')

      return {
        ok: result.ok,
        message: result.message || (result.ok ? 'Fetched ready prescriptions from machine' : 'Machine rejected the request'),
        readyPrescriptionHisIds: result.readyPrescriptionHisIds ?? [],
        queriedAt: result.queriedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to reach dispensing machine',
        readyPrescriptionHisIds: [],
        queriedAt: new Date().toISOString(),
      }
    }
  }

  return { advanceState, eliminatePrescription, confirmDispensingComplete, queryReadyPrescriptions }
}
