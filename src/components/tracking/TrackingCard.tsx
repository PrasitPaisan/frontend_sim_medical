import { useState } from 'react'
import type { TrackedPrescriptionItem } from '../../hooks/useTrackedPrescriptions'
import { getStationProgress } from '../../lib/stations'
import PrescriptionBaseCard from '../PrescriptionBaseCard'
import PrescriptionDetails from '../PrescriptionDetails'
import StationStepper from './StationStepper'

type TrackingCardProps = {
  item: TrackedPrescriptionItem
}

export default function TrackingCard({ item }: TrackingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const dispenseTypes = item.details.map((detail) => detail.dispense_type)
  const stations = getStationProgress(item.station_status, dispenseTypes)
  const isComplete = item.pre_state === 1

  return (
    <PrescriptionBaseCard
      item={item}
      active={expanded}
      onClick={() => setExpanded((value) => !value)}
      className={isComplete ? 'prescription-card--complete' : ''}
      headerEnd={
        <span className={`prescription-card__badge ${isComplete ? 'prescription-card__badge--complete' : ''}`}>
          {isComplete ? 'Complete' : `Basket ${item.basket_id} `}
        </span>
      }
    >
      <StationStepper stations={stations} />
      {expanded ? <PrescriptionDetails details={item.details} /> : null}
    </PrescriptionBaseCard>
  )
}
