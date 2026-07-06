import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'

type PrescriptionDetail = {
  id: number
  medhisid: string
  medunit: string
  medicinenum: number
  medicineheteromorphism: number
  medicinenamech: string
  medfactoryname: string
}

type PrescriptionItem = {
  id: number
  mzno: string
  patientname: string
  patientage: number
  patientsex: number
  prescriptionhisid: string
  prescriptiondoctorname?: string
  departmentname?: string
  fetchwindow: number
  pre_state: number
  created_at: string
  updated_at: string
  details: PrescriptionDetail[]
}

export function usePrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextFetchInSeconds, setNextFetchInSeconds] = useState(120)
  const nextFetchAtRef = useRef<number>(Date.now() + 120_000)

  const resetTimer = () => {
    nextFetchAtRef.current = Date.now() + 120_000
    setNextFetchInSeconds(120)
  }

  const loadPrescriptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.get<PrescriptionItem[]>('/prescriptions?limit=50')

      setPrescriptions(data)
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prescriptions')
    } finally {
      setLoading(false)
      resetTimer()
    }
  }

  useEffect(() => {
    void loadPrescriptions()

    const timerId = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextFetchAtRef.current - Date.now()) / 1000))
      setNextFetchInSeconds(remaining)
      if (remaining === 0) {
        void loadPrescriptions()
      }
    }, 1000)

    return () => window.clearInterval(timerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedPrescription = useMemo(
    () => prescriptions.find((item) => item.id === selectedId) ?? null,
    [prescriptions, selectedId],
  )

  const removePrescriptions = (ids: number[]) => {
    setPrescriptions((current) => current.filter((item) => !ids.includes(item.id)))
    setSelectedId((current) => (current !== null && ids.includes(current) ? null : current))
  }

  return {
    prescriptions,
    selectedId,
    setSelectedId,
    selectedPrescription,
    loading,
    error,
    loadPrescriptions,
    removePrescriptions,
    nextFetchInSeconds,
  }
}

export type { PrescriptionItem, PrescriptionDetail }
