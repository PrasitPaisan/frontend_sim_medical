import { useState } from 'react'
import PageShell from '../components/PageShell'
import MedicineForm from '../components/medicine/MedicineForm'
import MedicineList from '../components/medicine/MedicineList'
import { useMedicines } from '../hooks/useMedicines'

export default function AddMedicinePage() {
  const { medicines, loading, sendMedicine } = useMedicines()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: Parameters<typeof sendMedicine>[0], targetMachine: Parameters<typeof sendMedicine>[1]) => {
    setSubmitting(true)
    try {
      return await sendMedicine(values, targetMachine)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Add Medicine to Machine" subtitle="Enter one medicine at a time and send it to the dispensing machine">
      <div className="placeholder-card">
        <h4>Medicine details</h4>
        <MedicineForm submitting={submitting} onSubmit={handleSubmit} />
      </div>

      <div className="placeholder-card">
        <h4>Medicines on the machine</h4>
        <MedicineList medicines={medicines} loading={loading} />
      </div>
    </PageShell>
  )
}
