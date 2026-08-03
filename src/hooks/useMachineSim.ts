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

// Mirrors NZP360 QueryMachineState's extra PartList/PartItem breakdown, which
// RB1500's QueryMachineState doesn't have.
export type MachinePart = {
  partName?: string
  partId?: string
  partState?: string
  partMessage?: string
}

// Mirrors MachineService.getMachineStatusFromRB1500/getMachineStatusFromNZP360's
// response shape — parts is only ever populated for NZP360.
export type MachineStateResult = {
  ok: boolean
  message: string
  machineState?: string
  machineMessage?: string
  parts?: MachinePart[]
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

  // Builds the exact SOAP body eliminatePrescription would transmit,
  // without sending it — lets the UI show a confirmation preview before the
  // real machine call.
  const previewEliminatePrescription = async (
    prescriptionhisid: string,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/machine/eliminate-prescription/preview', { prescriptionhisid })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
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

  // Builds the exact SOAP body confirmDispensingComplete would transmit,
  // without sending it — lets the UI show a confirmation preview before the
  // real machine call.
  const previewConfirmDispensingComplete = async (
    prescriptionhisid: string,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/machine/update-ready-state/preview', { prescriptionhisid })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  // Tells the machine the pharmacist has recheck-verified this prescription
  // as fully dispensed (UpdateReadyPrescriptionState — see
  // MachineService.updateReadyPrescriptionStateOnRB1500) — expected to clear
  // it out of the machine's own "ready for pickup" queue. This is Machine
  // Sim's machine-only test action: no database write on either side. The
  // Pharmacist Recheck page's "Confirm Dispensing" action calls the same
  // SOAP operation via a *different* endpoint (/machine/confirm-recheck)
  // that also marks pre_state = 1 — see useConfirmRecheck.
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

  // Asks the machine for its own health/online status (QueryMachineState) —
  // read-only, no database write on either side, same as
  // queryReadyPrescriptions. machine defaults to RB1500's original endpoint;
  // pass 'NZP360' to hit its parallel /machine/status-nzp360 endpoint (same
  // shape, plus an NZP360-only parts breakdown — see
  // MachineService.getMachineStatusFromNZP360).
  const queryMachineState = async (machineId: number, machine: 'RB1500' | 'NZP360' = 'RB1500'): Promise<MachineStateResult> => {
    const endpoint = machine === 'NZP360' ? '/machine/status-nzp360' : '/machine/status'
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        machineState?: string
        machineMessage?: string
        parts?: MachinePart[]
        queriedAt?: string
      }>(`${endpoint}?machineId=${machineId}`)

      return {
        ok: result.ok,
        message: result.message || (result.ok ? 'Fetched machine status' : 'Machine rejected the request'),
        machineState: result.machineState,
        machineMessage: result.machineMessage,
        parts: result.parts,
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

  return {
    advanceState,
    eliminatePrescription,
    previewEliminatePrescription,
    confirmDispensingComplete,
    previewConfirmDispensingComplete,
    queryReadyPrescriptions,
    queryMachineState,
  }
}
