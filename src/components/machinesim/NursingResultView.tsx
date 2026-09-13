import { Descriptions, Table, Tag } from 'antd'
import type { NursingMedicineItem } from '../../hooks/useMachineSim'

type NursingResultViewProps = {
  medications: NursingMedicineItem[]
}

const columns = [
  {
    title: 'Drug',
    key: 'drug',
    render: (_: unknown, med: NursingMedicineItem) => (
      <div>
        <div>{med.drugText || '—'}</div>
        {med.firmName ? <div className="medicine-list__subtext">{med.firmName}</div> : null}
      </div>
    ),
  },
  {
    title: 'Spec / Qty',
    key: 'qty',
    render: (_: unknown, med: NursingMedicineItem) => (
      <div>
        <div>{med.orderUnit || '—'}</div>
        <div className="medicine-list__subtext">
          × {med.medNum ?? '—'} {med.typeUnit ?? ''}
        </div>
      </div>
    ),
  },
  {
    title: 'Schedule',
    key: 'schedule',
    render: (_: unknown, med: NursingMedicineItem) => (
      <div>
        <div>{med.preAdministration || '—'}</div>
        {med.finishTime ? <div className="medicine-list__subtext">Finish: {med.finishTime}</div> : null}
      </div>
    ),
  },
  {
    title: 'Nursing Code',
    key: 'nursingCode',
    render: (_: unknown, med: NursingMedicineItem) =>
      med.nursingCode ? <Tag color="purple">{med.nursingCode}</Tag> : '—',
  },
]

// Every <PrescriptionMedicine> line in a Nursing response repeats the same
// patient/order info (see MachineService.nursingFromNZP360) — shown once as
// a Descriptions block up top (from the first line) rather than duplicated
// per drug row, with the drug lines themselves as a table underneath.
export default function NursingResultView({ medications }: NursingResultViewProps) {
  if (medications.length === 0) {
    return <div className="machine-sim-card__query-empty">No medicine lines found for this code.</div>
  }

  const patient = medications[0]

  return (
    <div className="nursing-result">
      <Descriptions size="small" bordered column={2} className="nursing-result__patient">
        <Descriptions.Item label="Order No">{patient.orderNo || '—'}</Descriptions.Item>
        <Descriptions.Item label="HIS Main ID">{patient.hisMainId || '—'}</Descriptions.Item>
        <Descriptions.Item label="Patient">
          {patient.patientName || '—'} ({patient.patientAge ?? '—'})
        </Descriptions.Item>
        <Descriptions.Item label="Patient ID (HN)">{patient.patientId || '—'}</Descriptions.Item>
        <Descriptions.Item label="Bed">{patient.patientBed || '—'}</Descriptions.Item>
        <Descriptions.Item label="Department">
          {patient.deptName || '—'} {patient.deptCode ? `(${patient.deptCode})` : ''}
        </Descriptions.Item>
        <Descriptions.Item label="Doctor">{patient.doctor || patient.doctorName || '—'}</Descriptions.Item>
        <Descriptions.Item label="Visit ID">{patient.visitId || '—'}</Descriptions.Item>
      </Descriptions>

      <Table
        size="small"
        rowKey={(med, index) => `${med.drugCode}-${index}`}
        dataSource={medications}
        columns={columns}
        pagination={false}
        locale={{ emptyText: 'No medicine lines' }}
        scroll={{ x: 'max-content' }}
        className="nursing-result__drugs"
      />
    </div>
  )
}
