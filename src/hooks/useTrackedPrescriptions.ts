import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { ORDERED_STATE } from '../lib/stations'
import type { PrescriptionItem } from './usePrescriptions'

const POLL_INTERVAL_MS = 15_000

export function useTrackedPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | undefined>(undefined)

  const loadTrackedPrescriptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.get<PrescriptionItem[]>(`/prescriptions?limit=50&minState=${ORDERED_STATE}`)
      setPrescriptions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracked prescriptions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTrackedPrescriptions()
    pollRef.current = window.setInterval(() => void loadTrackedPrescriptions(), POLL_INTERVAL_MS)
    return () => window.clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { prescriptions, loading, error, loadTrackedPrescriptions }
}
