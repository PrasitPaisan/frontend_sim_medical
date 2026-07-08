import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { PrescriptionItem } from './usePrescriptions'

const POLL_INTERVAL_MS = 15_000

// Prescriptions in progress (pre_state = 0) or already complete (pre_state =
// 1), each joined with the station_status of the basket bound to it — a
// completed prescription's basket has been released back to the pool, so
// basket_id is null and station_status reads as the final station.
export type TrackedPrescriptionItem = PrescriptionItem & {
  basket_id: string | null
  station_status: number
}

export function useTrackedPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<TrackedPrescriptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | undefined>(undefined)

  const loadTrackedPrescriptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.get<TrackedPrescriptionItem[]>('/prescriptions/tracking?limit=50')
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
