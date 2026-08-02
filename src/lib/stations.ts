// Every station a basket passes through once bound to a prescription, in
// sequence. basket.station_status is a single counter — a station is
// "reached" once station_status >= its `state` threshold. This list is the
// single source of truth for both the Process Tracking stepper and the
// Machine Sim action cards.
//
// prescription_header.pre_state is a separate, much simpler concept now:
// -1 received, 0 in progress, 1 complete. Station-level progress lives here,
// on the basket, not on the prescription.
export type StationStatus = 'done' | 'active' | 'pending'

export type Station = {
  key: string
  state: number
  labelEn: string
  labelTh: string
  // Matches medicine_dictionary.dispense_type. Undefined means the station
  // always applies regardless of what's in the prescription (sending to the
  // machine and the final pharmacist recheck happen for every prescription).
  // Present means only prescriptions containing a medicine with this
  // dispense_type actually pass through that station.
  dispenseType?: string
}

export const PIPELINE_STATIONS: Station[] = [
  { key: 'send-to-machine', state: 1, labelEn: 'Send to Machine', labelTh: 'ส่งข้อมูลไปเครื่อง' },
  { key: 'box-dispensing', state: 2, labelEn: 'Box Dispensing Machine', labelTh: 'เครื่องจัดยากล่อง', dispenseType: 'rb1500' },
  { key: 'manual-dispensing', state: 3, labelEn: 'Manual Dispensing Point', labelTh: 'จุดจัดยา manual', dispenseType: 'manual' },
  {
    key: 'naked-pill-dispensing',
    state: 4,
    labelEn: 'Loose Tablet Dispensing Machine',
    labelTh: 'เครื่องจัดยาเม็ดเปลือย',
    dispenseType: 'nzp360',
  },
  { key: 'cobot', state: 5, labelEn: 'COBOT', labelTh: 'COBOT', dispenseType: 'cobot' },
  // Distinct from 'pharmacist-recheck' below: this is the basket physically
  // arriving at the recheck point (mapped from RB1500's real QueryBasketPosition
  // Position=6 "End" — see lib/basketPosition.ts), NOT the pharmacist having
  // actually verified it yet. Only 'pharmacist-recheck' triggers completion
  // (RECHECK_STATION_STATUS in baskets.service.ts) — arriving here must not.
  { key: 'recheck-arrived', state: 6, labelEn: 'Arrived at Recheck Point', labelTh: 'มาถึงจุดตรวจสอบ' },
  { key: 'pharmacist-recheck', state: 7, labelEn: 'Pharmacist Recheck', labelTh: 'เภสัชกรตรวจสอบซ้ำ' },
  { key: 'call-patient', state: 8, labelEn: 'Call Patient for Pickup', labelTh: 'เรียกผู้ป่วยมารับยา' },
  { key: 'patient-received', state: 9, labelEn: 'Patient Received Medicine', labelTh: 'ผู้ป่วยรับยาเสร็จสิ้น' },
]

// Process Tracking only cares about the internal dispensing pipeline, up
// through pharmacist recheck (station 7) — that's where it treats a
// prescription as "Completed". Call-patient (8) and patient-received (9) are
// patient-facing states meant for the Monitor Queue display instead, so they
// are deliberately excluded here even though they exist in PIPELINE_STATIONS.
const TRACKING_FINAL_INDEX = PIPELINE_STATIONS.findIndex((station) => station.key === 'pharmacist-recheck')
const TRACKING_PIPELINE_STATIONS = PIPELINE_STATIONS.slice(0, TRACKING_FINAL_INDEX + 1)

// Process Tracking shows a "Pending" status for station_status = 1 (basket
// just bound and sent to machine, not yet picked up by any dispensing
// station) followed by the dispensing stations themselves, and reaching the
// final recheck step reads better as "Completed" than as a station name.
export const STATIONS: Station[] = [
  { key: 'pending', state: TRACKING_PIPELINE_STATIONS[0].state, labelEn: 'Pending', labelTh: 'รอดำเนินการ' },
  ...TRACKING_PIPELINE_STATIONS.slice(1, -1),
  {
    key: 'completed',
    state: TRACKING_PIPELINE_STATIONS[TRACKING_PIPELINE_STATIONS.length - 1].state,
    labelEn: 'Completed',
    labelTh: 'จ่ายยาเสร็จสิ้น',
  },
]

export type StationProgress = Station & { status: StationStatus }

// Not every prescription visits every station — a prescription with only
// manual-dispensed medicines never touches the box or loose-tablet machines.
// Filters STATIONS down to the ones this prescription's medicines actually
// require, based on the dispense_type of each medicine line item, while
// always keeping the two universal steps (Pending, Completed).
export function getRelevantStations(dispenseTypes: Array<string | null | undefined>): Station[] {
  const relevantSet = new Set(dispenseTypes.filter((value): value is string => Boolean(value)))
  return STATIONS.filter((station) => !station.dispenseType || relevantSet.has(station.dispenseType))
}

export function getStationProgress(stationStatus: number, dispenseTypes: Array<string | null | undefined> = []): StationProgress[] {
  const relevantStations = getRelevantStations(dispenseTypes)
  const lastIndex = relevantStations.length - 1

  return relevantStations.map((station, index) => {
    let status: StationStatus = 'pending'
    // The final "Completed" node has nothing after it — treat it as done as
    // soon as it's reached instead of leaving it stuck on "active".
    if (stationStatus > station.state || (index === lastIndex && stationStatus >= station.state)) {
      status = 'done'
    } else if (stationStatus === station.state) {
      status = 'active'
    }
    return { ...station, status }
  })
}
