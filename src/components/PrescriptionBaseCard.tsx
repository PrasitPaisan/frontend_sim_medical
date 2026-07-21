import type { ReactNode } from 'react'
import { Tag } from 'antd'
import type { PrescriptionItem } from '../hooks/usePrescriptions'
import { getPrescriptionPriority, getPriorityColor, getPriorityLabel } from '../lib/priority'

type PrescriptionBaseCardProps = {
  item: PrescriptionItem
  active?: boolean
  onClick?: () => void
  /** Rendered top-right of the header, e.g. a selection checkbox. */
  headerStart?: ReactNode
  /** Rendered top-right of the card, e.g. a state badge. */
  headerEnd?: ReactNode
  children?: ReactNode
  className?: string
  /** Shows the prescription's overall priority (highest among its medicines) as a tag next to the patient name. */
  showPriorityTag?: boolean
}

export default function PrescriptionBaseCard({
  item,
  active = false,
  onClick,
  headerStart,
  headerEnd,
  children,
  className = '',
  showPriorityTag = false,
}: PrescriptionBaseCardProps) {
  const priority = getPrescriptionPriority(item.details)

  return (
    <div
      className={`prescription-card ${active ? 'prescription-card--active' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      <div className="prescription-card__header">
        <div className="prescription-card__title-wrap">
          {headerStart}
          <div>
            <h4 className="prescription-card__title">
              {item.patientname}
              {showPriorityTag ? (
                <Tag className="prescription-card__priority-tag" color={getPriorityColor(priority)}>
                  {getPriorityLabel(priority)}
                </Tag>
              ) : null}
            </h4>
            <div className="prescription-card__meta">
              <span className="prescription-card__badge">#{item.mzno}</span>
              <span>Age : {item.patientage}</span>
              <span>Sex : {item.patientsex === 1 ? 'Male' : 'Female'}</span>
              <span>PrehisId : {item.prescriptionhisid}</span>
            </div>
          </div>
        </div>
        {headerEnd}
      </div>

      <div className="prescription-card__meta">
        <span>Doctor: {item.prescriptiondoctorname || '—'}</span>
        <span>Dept: {item.departmentname || '—'}</span>
        <span>Fetch window: {item.fetchwindow}</span>
      </div>

      {children}
    </div>
  )
}
