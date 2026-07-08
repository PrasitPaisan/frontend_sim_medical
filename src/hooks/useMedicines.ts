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
}

export type TargetMachine = 'RB1500' | 'NZP360'

export type SendMedicineResult = {
  ok: boolean
  message: string
  medicine?: Medicine
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

  // Only lands in the list once the machine has actually accepted it — the
  // backend skips the DB write entirely when the machine call fails.
  // targetMachine picks which machine's SOAP endpoint the backend calls —
  // purely a routing choice for this test page, independent of the medicine's
  // own dispense_type field (which is what actually gets saved to the DB).
  const sendMedicine = async (values: MedicineFormValues, targetMachine: TargetMachine): Promise<SendMedicineResult> => {
    try {
      const result = await api.post<SendMedicineResult>('/medicines/send', { medicine: values, targetMachine })
      if (result.ok && result.medicine) {
        const saved = result.medicine
        setMedicines((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      }
      return result
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to send medicine' }
    }
  }

  return { medicines, loading, error, loadMedicines, sendMedicine }
}
