import { useState } from 'react'
import type { PrescriptionItem } from '../../hooks/usePrescriptions'
import { getStationProgress } from '../../lib/stations'
import PrescriptionBaseCard from '../PrescriptionBaseCard'
import PrescriptionDetails from '../PrescriptionDetails'
import StationStepper from './StationStepper'

type TrackingCardProps = {
  item: PrescriptionItem
}

export default function TrackingCard({ item }: TrackingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const stations = getStationProgress(item.pre_state)

  return (
    <PrescriptionBaseCard
      item={item}
      active={expanded}
      onClick={() => setExpanded((value) => !value)}
      headerEnd={<span className="prescription-card__badge">State {item.pre_state}</span>}
    >
      <StationStepper stations={stations} />
      {expanded ? <PrescriptionDetails details={item.details} /> : null}
    </PrescriptionBaseCard>
  )
}
