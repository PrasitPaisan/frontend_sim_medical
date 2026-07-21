import { Checkbox } from 'antd'
import type { PrescriptionItem } from '../hooks/usePrescriptions'
import PrescriptionBaseCard from './PrescriptionBaseCard'
import PrescriptionDetails from './PrescriptionDetails'

type PrescriptionCardProps = {
  item: PrescriptionItem
  isActive: boolean
  onSelect: (id: number) => void
  isSelectedForSend: boolean
  onToggleSelection: (id: number) => void
}

export default function PrescriptionCard({ item, isActive, onSelect, isSelectedForSend, onToggleSelection }: PrescriptionCardProps) {
  return (
    <PrescriptionBaseCard
      item={item}
      active={isActive}
      onClick={() => onSelect(item.id)}
      showPriorityTag
      headerStart={
        <Checkbox
          checked={isSelectedForSend}
          onChange={() => onToggleSelection(item.id)}
          onClick={(event) => event.stopPropagation()}
        />
      }
      headerEnd={<span className="prescription-card__badge">Received</span>}
    >
      {isActive ? (
        <div className="prescription-details">
          <div className="prescription-details__row">
            <span>Created</span>
            <strong>{new Date(item.created_at).toLocaleString()}</strong>
          </div>
          <div className="prescription-details__row">
            <span>Updated</span>
            <strong>{new Date(item.updated_at).toLocaleString()}</strong>
          </div>
          <PrescriptionDetails details={item.details} />
        </div>
      ) : null}
    </PrescriptionBaseCard>
  )
}
