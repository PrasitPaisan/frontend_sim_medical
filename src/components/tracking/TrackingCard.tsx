import { useState } from 'react'
import type { TrackedPrescriptionItem } from '../../hooks/useTrackedPrescriptions'
import type { BasketPositionItem } from '../../hooks/useBasketPosition'
import { getStationProgress } from '../../lib/stations'
import { getBasketPositionLabel } from '../../lib/basketPosition'
import PrescriptionBaseCard from '../PrescriptionBaseCard'
import PrescriptionDetails from '../PrescriptionDetails'
import StationStepper from './StationStepper'

type TrackingCardProps = {
  item: TrackedPrescriptionItem
  /** Result of the last "Fetch live position" call, matched by prescriptionhisid — absent until fetched, or if RB1500 has no data for this basket. */
  livePosition?: BasketPositionItem
}

export default function TrackingCard({ item, livePosition }: TrackingCardProps) {
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
      {/* From RB1500's QueryBasketPosition, not the simulated stepper above —
          intentionally shown as plain text rather than forced into the
          stepper, since RB1500's Position numbering doesn't share a scale
          with station_status (see lib/basketPosition.ts). */}
      {livePosition ? (
        <div className="tracking-card__live-position">
          Live from machine: <strong>{getBasketPositionLabel(livePosition.position)}</strong>
          {livePosition.lastTime ? ` (as of ${livePosition.lastTime})` : ''}
        </div>
      ) : null}
      {expanded ? <PrescriptionDetails details={item.details} /> : null}
    </PrescriptionBaseCard>
  )
}
