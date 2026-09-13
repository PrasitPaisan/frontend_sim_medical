import { useState } from 'react'
import { Tag } from 'antd'
import type { TrackedPrescriptionItem } from '../../hooks/useTrackedPrescriptions'
import type { BasketPositionItem } from '../../hooks/useBasketPosition'
import { getStationProgress } from '../../lib/stations'
import { getBasketPositionLabel } from '../../lib/basketPosition'
import PrescriptionBaseCard from '../PrescriptionBaseCard'
import PrescriptionDetails from '../PrescriptionDetails'

type TrackingCardProps = {
  item: TrackedPrescriptionItem
  /** Result of the last "Fetch live position" call, matched by prescriptionhisid — absent until fetched, or if RB1500 has no data for this basket. */
  livePosition?: BasketPositionItem
}

// Compact stand-in for the old StationStepper — just names the single
// station the basket is at right now, rather than drawing the full pipeline.
function getCurrentStationTag(stations: ReturnType<typeof getStationProgress>, isComplete: boolean) {
  if (isComplete) return { label: 'Completed', color: 'green' }
  const active = stations.find((s) => s.status === 'active')
  if (active) return { label: active.labelEn, color: 'blue' }
  return { label: 'Pending', color: 'default' }
}

export default function TrackingCard({ item, livePosition }: TrackingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const dispenseTypes = item.details.map((detail) => detail.dispense_type)
  const stations = getStationProgress(item.station_status, dispenseTypes)
  const isComplete = item.pre_state === 1
  const currentStation = getCurrentStationTag(stations, isComplete)

  // The header badge should show the machine's own reported basket number
  // once we have one (from a "Fetch live position" call) — that's the real
  // physical basket, whereas item.basket_id is only this backend's internal
  // assumption of which basket it bound. Fall back to the internal id until
  // a live fetch has actually confirmed one.
  const displayBasketId = livePosition?.basketId || item.basket_id

  return (
    <PrescriptionBaseCard
      item={item}
      active={expanded}
      onClick={() => setExpanded((value) => !value)}
      className={isComplete ? 'prescription-card--complete' : ''}
      showPriorityTag
      headerEnd={
        <span className={`prescription-card__badge ${isComplete ? 'prescription-card__badge--complete' : ''}`}>
          {isComplete ? 'Complete' : `Basket ${displayBasketId} `}
        </span>
      }
    >
      <Tag color={currentStation.color} style={{ marginBottom: 8 }}>
        {currentStation.label}
      </Tag>
      {/* From RB1500's QueryBasketPosition — a bulk live fetch matched to
          this card by prescriptionhisid/PreNo. Position label is still shown
          as plain text (kept separate from the station Tag above, since
          RB1500's own Position numbering doesn't share a scale with
          station_status — see lib/basketPosition.ts), but the basket id
          itself is now surfaced in the header badge instead of repeated
          here. */}
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
