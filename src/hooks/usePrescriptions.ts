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
  // From medicine_dictionary, joined by medhisid/medunit/medfactoryname — null
  // if this medicine hasn't been added to the machine's catalog yet.
  typeunit: string | null
  hpmtypeunit: string | null
  dispense_type: string | null
  priority: number
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

type PrescriptionListResponse = {
  items: PrescriptionItem[]
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 50

export function usePrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextFetchInSeconds, setNextFetchInSeconds] = useState(120)
  const nextFetchAtRef = useRef<number>(Date.now() + 120_000)
  const pageRef = useRef(page)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  const resetTimer = () => {
    nextFetchAtRef.current = Date.now() + 120_000
    setNextFetchInSeconds(120)
  }

  const loadPrescriptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.get<PrescriptionListResponse>(
        `/prescriptions?page=${pageRef.current}&pageSize=${PAGE_SIZE}`,
      )

      setPrescriptions(data.items)
      setTotal(data.total)
      if (!selectedId && data.items.length > 0) {
        setSelectedId(data.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prescriptions')
    } finally {
      setLoading(false)
      resetTimer()
    }
  }

  // Bulk-select support: fetches just the ids of the first `limit`
  // prescriptions (same Stat-first/newest ordering as the list itself) so
  // the toolbar's "select first N" can select across pages without pulling
  // every prescription's full medicine details.
  const fetchPrescriptionIds = async (limit: number): Promise<number[]> => {
    try {
      return await api.get<number[]>(`/prescriptions/ids?limit=${limit}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prescription ids')
      return []
    }
  }

  // Runs once on mount to start the auto-refresh interval — page changes are
  // handled by the effect below instead, so this doesn't also trigger a load.
  useEffect(() => {
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

  // Covers the initial load (fires on mount too) and reloads whenever the
  // pharmacist changes page.
  useEffect(() => {
    void loadPrescriptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const selectedPrescription = useMemo(
    () => prescriptions.find((item) => item.id === selectedId) ?? null,
    [prescriptions, selectedId],
  )

  const removePrescriptions = (ids: number[]) => {
    setPrescriptions((current) => current.filter((item) => !ids.includes(item.id)))
    setTotal((current) => Math.max(0, current - ids.length))
    setSelectedId((current) => (current !== null && ids.includes(current) ? null : current))
  }

  return {
    prescriptions,
    total,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    selectedId,
    setSelectedId,
    selectedPrescription,
    loading,
    error,
    loadPrescriptions,
    removePrescriptions,
    fetchPrescriptionIds,
    nextFetchInSeconds,
  }
}

export type { PrescriptionItem, PrescriptionDetail }
