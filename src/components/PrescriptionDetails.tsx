import type { PrescriptionDetail } from '../hooks/usePrescriptions'

type PrescriptionDetailsProps = {
  details: PrescriptionDetail[]
}

export default function PrescriptionDetails({ details }: PrescriptionDetailsProps) {
  return (
    <div className="prescription-details">
      <div className="prescription-details__row">
        <span>Items</span>
        <strong>{details.length}</strong>
      </div>
      <div>
        <strong>Medicines</strong>
        <ul style={{ margin: '8px 0 0 18px', padding: 0, textAlign: 'left' }}>
          {details.map((detail) => (
            <li key={detail.id}>
              {detail.medicinenamech} · {detail.medunit} · {detail.medicinenum} · {detail.medfactoryname}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
