import { Button, message, Popconfirm, Tag } from 'antd'
import { ReloadOutlined, WarningFilled, CheckCircleOutlined, MedicineBoxOutlined, ScheduleOutlined } from '@ant-design/icons'
import PageShell from '../components/PageShell'
import StationActionCard from '../components/machinesim/StationActionCard'
import MachineActionCard from '../components/machinesim/MachineActionCard'
import MachineStatusCard from '../components/machinesim/MachineStatusCard'
import QueryReadyPrescriptionsCard from '../components/machinesim/QueryReadyPrescriptionsCard'
import NursingQueryCard from '../components/machinesim/NursingQueryCard'
import { useMachineSim } from '../hooks/useMachineSim'
import { useBaskets } from '../hooks/useBaskets'
import { PIPELINE_STATIONS } from '../lib/stations'

export default function MachineSimPage() {
  const {
    advanceState,
    eliminatePrescription,
    previewEliminatePrescription,
    confirmDispensingComplete,
    previewConfirmDispensingComplete,
    queryReadyPrescriptions,
    previewNursing,
    queryNursing,
    previewNursingCode,
    queryNursingCode,
  } = useMachineSim()
  const { baskets, loadBaskets, resetAll } = useBaskets()

  const handlePass = async (hisId: string, station: number) => {
    const result = await advanceState(hisId, station)
    if (result.ok) {
      void loadBaskets()
    }
    return result
  }

  const handleReset = async () => {
    try {
      const { basketsReset, prescriptionsReset } = await resetAll()
      message.success(`Reset ${prescriptionsReset} prescription(s) and freed ${basketsReset} basket(s)`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to reset simulation')
    }
  }

  return (
    <PageShell title="Machine Sim" subtitle="Simulate each station reporting dispensing progress by HIS id">
      <div className="machine-sim-toolbar">
        <Popconfirm
          title="Reset simulation?"
          description="Unbinds every basket and sets every prescription back to Received (-1). This is a simulation-only action."
          okText="Reset"
          okButtonProps={{ danger: true }}
          onConfirm={() => void handleReset()}
        >
          <Button icon={<ReloadOutlined />} danger>
            Reset Simulation
          </Button>
        </Popconfirm>
      </div>

      <div className="machine-sim-section">
        <h5 className="machine-sim-section__title">Machine Status</h5>
        <div className="machine-sim-grid">
          <MachineStatusCard machine="RB1500" />
          <MachineStatusCard machine="NZP360" />
        </div>
      </div>

      <div className="machine-sim-section">
        <h5 className="machine-sim-section__title">Real Machine Actions</h5>
        <div className="machine-sim-grid">
          <QueryReadyPrescriptionsCard onQuery={queryReadyPrescriptions} />
          <MachineActionCard
            icon={<WarningFilled />}
            title="Eliminate Prescription"
            description="เรียก ExecEliminatePrescription ไปที่เครื่อง RB1500 โดยตรง — สำเร็จแล้วจะปล่อยตะกร้ากลับ pool ให้ใช้ใหม่ได้"
            actionLabel="Eliminate"
            confirmTitle="Eliminate this prescription on the machine?"
            confirmDescription="This calls the real machine's SOAP endpoint directly and cannot be undone."
            variant="danger"
            onPreview={previewEliminatePrescription}
            onSubmit={eliminatePrescription}
          />
          <MachineActionCard
            icon={<CheckCircleOutlined />}
            title="Confirm Dispensing Complete"
            description="เรียก UpdateReadyPrescriptionState บอกเครื่อง RB1500 ว่าเภสัชกรตรวจสอบแล้วจ่ายยาเสร็จสิ้น (ไม่มีผลกับ database)"
            actionLabel="Confirm"
            confirmTitle="Confirm this prescription as dispensed on the machine?"
            confirmDescription="This calls the real machine's SOAP endpoint directly to clear it from the machine's ready queue."
            variant="positive"
            onPreview={previewConfirmDispensingComplete}
            onSubmit={confirmDispensingComplete}
          />
        </div>
      </div>

      <div className="machine-sim-section">
        <h5 className="machine-sim-section__title">NZP360 Nursing Interface (Untested)</h5>
        <div className="machine-sim-grid">
          <NursingQueryCard
            icon={<MedicineBoxOutlined />}
            title="Nursing"
            description="เรียก Nursing ไปที่เครื่อง NZP360 เพื่อดูรายการยาของถุงยาตามโค้ด 2 มิติ (RCPreId) — ยังไม่ได้ทดสอบกับเครื่องจริง"
            inputPlaceholder="RCPreId (e.g. 1000117420)"
            onPreview={previewNursing}
            onQuery={queryNursing}
            renderResult={(result) =>
              result.medications.length > 0 ? (
                <ul className="machine-sim-card__basket-list">
                  {result.medications.map((med, index) => (
                    <li key={`${med.orderCode}-${index}`}>
                      {med.orderText} — {med.orderUnit} × {med.medNum} {med.typeUnit} ({med.patientName}, {med.deptName})
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="machine-sim-card__query-empty">No medicine lines found for this code.</div>
              )
            }
          />
          <NursingQueryCard
            icon={<ScheduleOutlined />}
            title="Nursing Code"
            description="เรียก NursingCode ไปที่เครื่อง NZP360 เพื่อดูรหัส nursing code ที่ HIS กำหนดไว้สำหรับถุงยานี้ — ยังไม่ได้ทดสอบกับเครื่องจริง"
            inputPlaceholder="RCPreId (e.g. 1694)"
            onPreview={previewNursingCode}
            onQuery={queryNursingCode}
            renderResult={(result) =>
              result.nursingCodes.length > 0 ? (
                <ul className="machine-sim-card__ready-list">
                  {result.nursingCodes.map((code, index) => (
                    <li key={`${code}-${index}`}>
                      <Tag color="purple">{code}</Tag>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="machine-sim-card__query-empty">No nursing codes found for this code.</div>
              )
            }
          />
        </div>
      </div>

      <div className="machine-sim-section">
        <h5 className="machine-sim-section__title">Pipeline Stations (Simulation)</h5>
        <div className="machine-sim-grid">
          {PIPELINE_STATIONS.map((station, index) => (
            <StationActionCard
              key={station.key}
              station={station}
              isFinal={index === PIPELINE_STATIONS.length - 1}
              onPass={handlePass}
              baskets={baskets.filter((basket) => basket.station_status === station.state)}
            />
          ))}
        </div>
      </div>
    </PageShell>
  )
}
