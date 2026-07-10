import { Table, Tag } from 'antd'
import type { PrescriptionDetail } from '../hooks/usePrescriptions'
import { getDispenseTypeColor } from '../lib/dispenseType'

type PrescriptionDetailsProps = {
  details: PrescriptionDetail[]
}

const columns = [
  {
    title: 'Medicine',
    key: 'medicine',
    render: (_: unknown, detail: PrescriptionDetail) => (
      <div>
        <div>{detail.medicinenamech}</div>
        <div className="medicine-list__subtext">{detail.medfactoryname}</div>
      </div>
    ),
  },
  { title: 'Unit', dataIndex: 'medunit', key: 'medunit' },
  { title: 'Qty', dataIndex: 'medicinenum', key: 'medicinenum', align: 'right' as const },
  {
    title: 'Type',
    key: 'type',
    render: (_: unknown, detail: PrescriptionDetail) =>
      detail.typeunit ? (
        <div>
          <div>{detail.typeunit}</div>
          {detail.hpmtypeunit ? <div className="medicine-list__subtext">{detail.hpmtypeunit}</div> : null}
        </div>
      ) : (
        '—'
      ),
  },
  {
    title: 'Dispense Station',
    dataIndex: 'dispense_type',
    key: 'dispense_type',
    render: (value: string | null) => (value ? <Tag color={getDispenseTypeColor(value)}>{value}</Tag> : '—'),
  },
]

export default function PrescriptionDetails({ details }: PrescriptionDetailsProps) {
  return (
    <div className="prescription-details">
      <div className="prescription-details__row">
        <span>Items</span>
        <strong>{details.length}</strong>
      </div>
      <Table
        size="small"
        rowKey="id"
        dataSource={details}
        columns={columns}
        pagination={false}
        locale={{ emptyText: 'No medicines' }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}
