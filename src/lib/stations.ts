// Every pre_state a prescription passes through once ordered, in sequence.
// pre_state is a single counter on prescription_header — a station is "reached"
// once pre_state >= its `state` threshold. There is no dedicated per-station
// column in the schema today, so this list is the single source of truth for
// both the Process Tracking stepper and the Machine Sim action cards.
export type StationStatus = 'done' | 'active' | 'pending'

export type Station = {
  key: string
  state: number
  labelEn: string
  labelTh: string
}

export const PIPELINE_STATIONS: Station[] = [
  { key: 'send-to-machine', state: 1, labelEn: 'Send to Machine', labelTh: 'ส่งข้อมูลไปเครื่อง' },
  { key: 'box-dispensing', state: 2, labelEn: 'Box Dispensing Machine', labelTh: 'เครื่องจัดยากล่อง' },
  { key: 'manual-dispensing', state: 3, labelEn: 'Manual Dispensing Point', labelTh: 'จุดจัดยา manual' },
  { key: 'naked-pill-dispensing', state: 4, labelEn: 'Loose Tablet Dispensing Machine', labelTh: 'เครื่องจัดยาเม็ดเปลือย' },
  { key: 'cobot', state: 5, labelEn: 'COBOT', labelTh: 'COBOT' },
  { key: 'pharmacist-recheck', state: 6, labelEn: 'Pharmacist Recheck', labelTh: 'เภสัชกรตรวจสอบซ้ำ' },
]

export const ORDERED_STATE = PIPELINE_STATIONS[0].state

// Process Tracking shows only the dispensing stations — "sent to machine" is
// what gets a prescription onto that page in the first place, and reaching
// the final recheck step reads better as "Completed" than as a station name.
export const STATIONS: Station[] = [
  ...PIPELINE_STATIONS.slice(1, -1),
  { key: 'completed', state: PIPELINE_STATIONS[PIPELINE_STATIONS.length - 1].state, labelEn: 'Completed', labelTh: 'จ่ายยาเสร็จสิ้น' },
]

const LAST_STATION_INDEX = STATIONS.length - 1

export type StationProgress = Station & { status: StationStatus }

export function getStationProgress(preState: number): StationProgress[] {
  return STATIONS.map((station, index) => {
    let status: StationStatus = 'pending'
    // The final "Completed" node has nothing after it — treat it as done as
    // soon as it's reached instead of leaving it stuck on "active".
    if (preState > station.state || (index === LAST_STATION_INDEX && preState >= station.state)) {
      status = 'done'
    } else if (preState === station.state) {
      status = 'active'
    }
    return { ...station, status }
  })
}
