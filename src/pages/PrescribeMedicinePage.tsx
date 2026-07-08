import { useState } from 'react'
import PageShell from '../components/PageShell'
import PrescriptionOrderForm from '../components/prescribe/PrescriptionOrderForm'
import { useMedicines } from '../hooks/useMedicines'
import { useDepartments } from '../hooks/useDepartments'
import { usePrescribeOrder } from '../hooks/usePrescribeOrder'

export default function PrescribeMedicinePage() {
  const { medicines, loading } = useMedicines()
  const { departments, loading: loadingDepartments } = useDepartments()
  const { submitOrder } = usePrescribeOrder()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (order: Parameters<typeof submitOrder>[0]) => {
    setSubmitting(true)
    try {
      return await submitOrder(order)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Prescribe Medicine"
      subtitle="Simulate a pharmacist placing a prescription order — writes straight into the same intake the real HIS uses"
    >
      <div className="placeholder-card">
        {loading && medicines.length === 0 ? (
          <p>Loading medicine dictionary…</p>
        ) : (
          <PrescriptionOrderForm
            medicines={medicines}
            departments={departments}
            departmentsLoading={loadingDepartments}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </PageShell>
  )
}
