import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export type Medicine = {
  id: number
  medicinehisid: string
  medicinenamech: string
  medicinenameen: string | null
  medicineunit: string
  medicinestate: number
  medfactoryid: string | null
  medfactoryname: string
  typeunit: string
  hpmtypeunit: string
  numcode: string | null
  pycode: string
  boxmaxnum: number
  medposition: string | null
  med_batch: string | null
  validate_time: string | null
  created_at: string
  updated_at: string
  dispense_type: string
  med_unit_capacity: number | null
  /** 'pending' = saved locally only, not yet confirmed by the real machine; 'synced' = machine accepted it. */
  sync_status: 'pending' | 'synced'
  /** RB1500 SendMedicine's desc_code: electronic medication tracking code(s), each 7 digits, multiple codes joined with '|'. */
  desc_code: string | null
}

export type MedicineFormValues = {
  medicinehisid: string
  medicinenamech: string
  medicinenameen?: string
  medicineunit: string
  medicinestate?: number
  medfactoryid?: string
  medfactoryname: string
  typeunit: string
  hpmtypeunit: string
  numcode?: string
  pycode: string
  boxmaxnum?: number
  medposition?: string
  med_batch?: string
  validate_time?: string
  dispense_type?: string
  /** NZP360-only field (med_unit_capacity in its DataTable) — ignored by RB1500's SendMedicine contract. */
  med_unit_capacity?: number
  /** RB1500-only field: electronic medication tracking code(s), each 7 digits, multiple codes joined with '|'. */
  desc_code?: string
}

export type TargetMachine = 'RB1500' | 'NZP360'

export type SendMedicineResult = {
  ok: boolean
  message: string
  medicines?: Medicine[]
}

export function useMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMedicines = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Medicine[]>('/medicines?limit=100')
      setMedicines(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMedicines()
  }, [])

  // Only lands in the list once the machine has actually accepted the whole
  // batch — the backend skips the DB write entirely when the machine call
  // fails (all-or-nothing, so a rejected batch can be retried/edited as-is).
  // targetMachine picks which machine's SOAP endpoint the backend calls —
  // purely a routing choice for this test page, independent of each
  // medicine's own dispense_type field (which is what actually gets saved to the DB).
  const sendMedicines = async (values: MedicineFormValues[], targetMachine: TargetMachine): Promise<SendMedicineResult> => {
    try {
      const result = await api.post<SendMedicineResult>('/medicines/send', { medicines: values, targetMachine })
      if (result.ok && result.medicines) {
        const savedIds = new Set(result.medicines.map((item) => item.id))
        setMedicines((current) => [...result.medicines!, ...current.filter((item) => !savedIds.has(item.id))])
      }
      return result
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to send medicines' }
    }
  }

  // Persists straight to medicine_dictionary with no machine call — lets
  // medicines be prepared ahead of time (sync_status = 'pending') and
  // dispatched later by reselecting them from this same list into the
  // staging table (see AddMedicinePage's "Add Selected to List").
  const saveMedicines = async (values: MedicineFormValues[]): Promise<SendMedicineResult> => {
    try {
      const result = await api.post<SendMedicineResult>('/medicines/save', { medicines: values })
      if (result.ok && result.medicines) {
        const savedIds = new Set(result.medicines.map((item) => item.id))
        setMedicines((current) => [...result.medicines!, ...current.filter((item) => !savedIds.has(item.id))])
      }
      return result
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to save medicines' }
    }
  }

  // Builds the exact SOAP body /send would transmit, without sending it —
  // lets the UI show a confirmation preview before the real machine call.
  const previewSendMedicines = async (
    values: MedicineFormValues[],
    targetMachine: TargetMachine,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/medicines/preview', { medicines: values, targetMachine })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  return { medicines, loading, error, loadMedicines, sendMedicines, saveMedicines, previewSendMedicines }
}
