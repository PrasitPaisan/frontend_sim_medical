import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export type Department = {
  id: number
  dept_code: string
  dept_name: string
  dept_py: string
  created_at: string
  updated_at: string
}

export type DepartmentFormValues = {
  deptcode: string
  deptname: string
  deptpy: string
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDepartments = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Department[]>('/departments?limit=200')
      setDepartments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDepartments()
  }, [])

  const addDepartment = async (values: DepartmentFormValues): Promise<{ ok: boolean; message?: string }> => {
    try {
      const saved = await api.post<Department>('/departments', values)
      setDepartments((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to add department' }
    }
  }

  return { departments, loading, error, loadDepartments, addDepartment }
}
