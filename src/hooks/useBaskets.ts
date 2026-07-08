import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const POLL_INTERVAL_MS = 10_000

export type Basket = {
  id: number
  basket_id: string
  prescription_id: number | null
  machine_id: number | null
  is_lit: number
  station_status: number
  updated_at: string
  prescriptionhisid: string | null
  patientname: string | null
}

export function useBaskets() {
  const [baskets, setBaskets] = useState<Basket[]>([])
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<number | undefined>(undefined)

  const loadBaskets = async () => {
    setLoading(true)
    try {
      const data = await api.get<Basket[]>('/baskets')
      setBaskets(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBaskets()
    pollRef.current = window.setInterval(() => void loadBaskets(), POLL_INTERVAL_MS)
    return () => window.clearInterval(pollRef.current)
  }, [])

  // Simulation-only: unbinds every basket and resets every prescription back
  // to "received" (-1) so testers can re-run a scenario from scratch.
  const resetAll = async (): Promise<{ basketsReset: number; prescriptionsReset: number }> => {
    const result = await api.post<{ basketsReset: number; prescriptionsReset: number }>('/baskets/reset')
    await loadBaskets()
    return result
  }

  return { baskets, loading, loadBaskets, resetAll }
}
