import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const POLL_INTERVAL_MS = 10_000

// Patients currently called for pickup (basket station_status = 8) — this is
// a public-facing board, so it polls faster than the internal tracking pages.
export type CalledPrescription = {
  prescriptionhisid: string
  mzno: string
  patientname: string
  fetchwindow: number
  basket_id: string
  called_at: string
}

export function useMonitorQueue() {
  const [queue, setQueue] = useState<CalledPrescription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | undefined>(undefined)

  const loadQueue = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.get<CalledPrescription[]>('/prescriptions/monitor-queue')
      setQueue(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitor queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQueue()
    pollRef.current = window.setInterval(() => void loadQueue(), POLL_INTERVAL_MS)
    return () => window.clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { queue, loading, error, loadQueue }
}
