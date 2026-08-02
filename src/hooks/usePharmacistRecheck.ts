import { api } from '../lib/api'
import type { MachineCallResult } from './useMachineSim'

// Pharmacist Recheck's "Confirm Dispensing" action — fires the same
// UpdateReadyPrescriptionState SOAP call as Machine Sim's "Confirm Dispensing
// Complete" card, but through a separate endpoint (/machine/confirm-recheck)
// that also marks the prescription pre_state = 1 (complete) once the machine
// confirms, without releasing the basket — see
// BasketsService.confirmRecheckByPrescriptionHisId on the backend for why
// this is deliberately not folded into Machine Sim's machine-only action.
export function usePharmacistRecheck() {
  const previewConfirmRecheck = async (
    prescriptionhisid: string,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/machine/confirm-recheck/preview', { prescriptionhisid })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  const confirmRecheck = async (prescriptionhisid: string): Promise<MachineCallResult> => {
    try {
      const result = await api.post<{ ok: boolean; message?: string; raw?: string }>('/machine/confirm-recheck', {
        prescriptionhisid,
      })
      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Confirmed ${prescriptionhisid} as dispensed and complete` : 'Machine rejected the request'),
        raw: result.raw,
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to reach dispensing machine' }
    }
  }

  return { previewConfirmRecheck, confirmRecheck }
}
