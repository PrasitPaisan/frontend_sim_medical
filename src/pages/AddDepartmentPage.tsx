import { useState } from 'react'
import PageShell from '../components/PageShell'
import DepartmentForm from '../components/department/DepartmentForm'
import DepartmentList from '../components/department/DepartmentList'
import { useDepartments } from '../hooks/useDepartments'

export default function AddDepartmentPage() {
  const { departments, loading, addDepartment } = useDepartments()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: Parameters<typeof addDepartment>[0]) => {
    setSubmitting(true)
    try {
      return await addDepartment(values)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Add Department" subtitle="Manage the department dictionary used by NZP360's SendDeptInfo and prescription forms">
      <div className="placeholder-card">
        <h4>Department details</h4>
        <DepartmentForm submitting={submitting} onSubmit={handleSubmit} />
      </div>

      <div className="placeholder-card">
        <h4>Departments</h4>
        <DepartmentList departments={departments} loading={loading} />
      </div>
    </PageShell>
  )
}
