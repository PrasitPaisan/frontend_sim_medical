import { CheckOutlined } from '@ant-design/icons'
import type { StationProgress } from '../../lib/stations'

type StationStepperProps = {
  stations: StationProgress[]
}

export default function StationStepper({ stations }: StationStepperProps) {
  return (
    <div className="station-stepper">
      {stations.map((station, index) => {
        const isFirst = index === 0
        const isLast = index === stations.length - 1
        const prevDone = !isFirst && stations[index - 1].status === 'done'

        return (
          <div className="station-stepper__step" key={station.key}>
            {/* Connectors are split left/right of the node so the circle stays
                centered above its label regardless of neighboring segments. */}
            <div className="station-stepper__node-row">
              <div
                className={`station-stepper__connector ${isFirst ? 'station-stepper__connector--hidden' : ''} ${
                  prevDone ? 'station-stepper__connector--done' : ''
                }`}
              />
              <div className={`station-stepper__node station-stepper__node--${station.status}`}>
                {station.status === 'done' ? <CheckOutlined /> : station.state}
              </div>
              <div
                className={`station-stepper__connector ${isLast ? 'station-stepper__connector--hidden' : ''} ${
                  station.status === 'done' ? 'station-stepper__connector--done' : ''
                }`}
              />
            </div>
            <div className="station-stepper__label">
              <strong>{isLast ? station.labelEn : `Station ${station.state}: ${station.labelEn}`}</strong>
              <span>{station.labelTh}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
