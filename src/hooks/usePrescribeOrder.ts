import { api } from '../lib/api'

export type PrescribeDetailInput = {
  medhisid: string
  medunit: string
  medicinenum: number
  medicineheteromorphism?: number
  medicinehint?: string
  medfactoryid?: string
  medfactoryname: string
  medicinenamech: string
  // NZP360-only — RB1500's SendPrescription never reads these, but they still
  // get stored so a later NZP360 send has real data instead of empty strings.
  drugspec?: string
  drugpycode?: string
  dosage?: string
  dosageunit?: string
  dosageperunit?: string
  dispensingtime?: string
  performtime?: string
  performfreqdetail?: string
  performfreq?: string
  performfreqprint?: string
  nursingcode?: string
  // Higher value = more urgent. See lib/priority.ts for the label mapping.
  priority?: number
}

export type PrescribeOrderInput = {
  mzno: string
  patientname: string
  patientage: number
  patientsex: number
  prescriptionhisid: string
  prescriptiondoctorname?: string
  prescriptionhint?: string
  departmentname?: string
  fetchwindow: number
  // NZP360-only header fields — same rationale as above. No patienthisid
  // here: mzno IS the patient identifier, NZP360 just calls it PATIENT_ID.
  patientbirthday?: string
  patientvisitid?: string
  patientbed?: string
  doctorid?: string
  administration?: string
  repeatindicator?: string
  deptcode?: string
  // RB1500 SendPrescription's header-level priority (0 Vending, 1 Stat, 2
  // New, 3 Discharge, 4 Continue) — see lib/orderPriority.ts. Distinct from
  // each detail row's own priority above.
  priority?: number
  details: PrescribeDetailInput[]
}

export type PrescribeOrderResult = {
  ok: boolean
  received: number
  inserted: number
  skipped: number
  message?: string
}

export function usePrescribeOrder() {
  // Posts to the same /prescriptions/receive endpoint the real HIS uses —
  // this page is a stand-in for that HIS integration, so a submission here
  // is indistinguishable downstream from a real incoming prescription.
  const submitOrder = async (order: PrescribeOrderInput): Promise<PrescribeOrderResult> => {
    try {
      const result = await api.post<{ ok: boolean; received: number; inserted: number; skipped: number }>(
        '/prescriptions/receive',
        { prescriptions: [order] },
      )

      if (result.inserted === 0 && result.skipped > 0) {
        return { ...result, message: `Prescription ID "${order.prescriptionhisid}" already exists — skipped` }
      }

      return { ...result, message: 'Prescription order recorded' }
    } catch (err) {
      return {
        ok: false,
        received: 0,
        inserted: 0,
        skipped: 0,
        message: err instanceof Error ? err.message : 'Failed to submit prescription order',
      }
    }
  }

  return { submitOrder }
}
