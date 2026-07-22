import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export type Department = {
  id: number
  dept_code: string
  dept_name: string
  dept_py: string
  created_at: string
  updated_at: string
  /** 'pending' = saved locally only, not yet confirmed by the real machine; 'synced' = machine accepted it. */
  sync_status: 'pending' | 'synced'
}

export type DepartmentFormValues = {
  deptcode: string
  deptname: string
  deptpy: string
}

export type SendDepartmentsResult = {
  ok: boolean
  message?: string
  departments?: Department[]
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

  const mergeSaved = (saved: Department[]) => {
    const savedIds = new Set(saved.map((item) => item.id))
    setDepartments((current) => [...saved, ...current.filter((item) => !savedIds.has(item.id))])
  }

  // Only lands in the list once the machine has actually accepted the whole
  // batch — the backend skips the DB write entirely when the machine call
  // fails (all-or-nothing, so a rejected batch can be retried/edited as-is).
  const sendDepartments = async (values: DepartmentFormValues[]): Promise<SendDepartmentsResult> => {
    try {
      const result = await api.post<SendDepartmentsResult>('/departments', { departments: values })
      if (result.ok && result.departments) mergeSaved(result.departments)
      return result
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to send departments' }
    }
  }

  // Persists straight to department_dictionary with no machine call — lets
  // departments be prepared ahead of time (sync_status = 'pending') and
  // dispatched later by reselecting them from the Departments list.
  const saveDepartments = async (values: DepartmentFormValues[]): Promise<SendDepartmentsResult> => {
    try {
      const result = await api.post<SendDepartmentsResult>('/departments/save', { departments: values })
      if (result.ok && result.departments) mergeSaved(result.departments)
      return result
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to save departments' }
    }
  }

  // Builds the exact SOAP body sendDepartments would transmit, without
  // sending it — lets the UI show a confirmation preview before the real
  // machine call.
  const previewDepartments = async (
    values: DepartmentFormValues[],
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/departments/preview', { departments: values })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  return { departments, loading, error, loadDepartments, sendDepartments, saveDepartments, previewDepartments }
}
