import { Button, Checkbox, Tag } from 'antd'
import type { PrescriptionItem } from '../hooks/usePrescriptions'
import PrescriptionBaseCard from './PrescriptionBaseCard'
import PrescriptionDetails from './PrescriptionDetails'

type PrescriptionCardProps = {
  item: PrescriptionItem
  isActive: boolean
  onSelect: (id: number) => void
  isSelectedForSend: boolean
  onToggleSelection: (id: number) => void
  /** Opens the single-prescription preview-and-confirm flow for RB1500 only. */
  onSendRb1500: (item: PrescriptionItem) => void
  /** Opens the single-prescription preview-and-confirm flow for NZP360 only. */
  onSendNzp360: (item: PrescriptionItem) => void
  /** Which split-send action (if any) is currently in flight for this card. */
  pendingAction: 'rb1500' | 'nzp360' | null
}

export default function PrescriptionCard({
  item,
  isActive,
  onSelect,
  isSelectedForSend,
  onToggleSelection,
  onSendRb1500,
  onSendNzp360,
  pendingAction,
}: PrescriptionCardProps) {
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
      headerEnd={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {item.nzp360_sent_at ? <Tag color="green">Sent to NZP360</Tag> : null}
          <span className="prescription-card__badge">Received</span>
        </div>
      }
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

          {/* Split-send: lets a pharmacist send NZP360 (loose-tablet prep) and
              RB1500 (conveyor dispatch) independently, in either order, instead
              of only the combined "Send" toolbar action. */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={(event) => event.stopPropagation()}>
            <Button
              size="small"
              loading={pendingAction === 'nzp360'}
              disabled={pendingAction !== null || Boolean(item.nzp360_sent_at)}
              onClick={() => onSendNzp360(item)}
            >
              {item.nzp360_sent_at ? 'NZP360 Sent' : 'Send NZP360 only'}
            </Button>
            <Button
              size="small"
              loading={pendingAction === 'rb1500'}
              disabled={pendingAction !== null}
              onClick={() => onSendRb1500(item)}
            >
              Send RB1500 only
            </Button>
          </div>
        </div>
      ) : null}
    </PrescriptionBaseCard>
  )
}
