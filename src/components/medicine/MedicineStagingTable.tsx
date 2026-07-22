import { Button, Table, Tag } from 'antd'
import type { MedicineFormValues } from '../../hooks/useMedicines'
import { getDispenseTypeColor } from '../../lib/dispenseType'

export type StagedMedicine = MedicineFormValues & { _key: string }

type MedicineStagingTableProps = {
  medicines: StagedMedicine[]
  onRemove: (key: string) => void
}

const columns = (onRemove: (key: string) => void) => [
  { title: 'HIS ID', dataIndex: 'medicinehisid', key: 'medicinehisid' },
  {
    title: 'Name',
    key: 'name',
    render: (_: unknown, record: StagedMedicine) => (
      <div>
        <div>{record.medicinenamech}</div>
        {record.medicinenameen ? <div className="medicine-list__subtext">{record.medicinenameen}</div> : null}
      </div>
    ),
  },
  { title: 'Unit', dataIndex: 'medicineunit', key: 'medicineunit' },
  { title: 'Factory', dataIndex: 'medfactoryname', key: 'medfactoryname' },
  {
    title: 'Dispense Station',
    dataIndex: 'dispense_type',
    key: 'dispense_type',
    render: (value: string | undefined) => (value ? <Tag color={getDispenseTypeColor(value)}>{value}</Tag> : '—'),
  },
  {
    title: '',
    key: 'actions',
    render: (_: unknown, record: StagedMedicine) => (
      <Button danger size="small" onClick={() => onRemove(record._key)}>
        Remove
      </Button>
    ),
  },
]

type DetailRow = { label: string; value: string | number | undefined }

function renderDetailGroup(title: string, rows: DetailRow[]) {
  return (
    <div className="medicine-staging__details-group" key={title}>
      <h6 className="medicine-staging__details-group-title">{title}</h6>
      <div className="medicine-staging__details">
        {rows.map((row) => (
          <div key={row.label} className="medicine-staging__details-row">
            <span className="medicine-staging__details-label">{row.label}</span>
            <span>{row.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderDetails(record: StagedMedicine) {
  const common: DetailRow[] = [
    { label: 'State', value: record.medicinestate === 1 ? 'Active' : 'Inactive' },
    { label: 'Factory ID', value: record.medfactoryid },
    { label: 'Type Unit', value: record.typeunit },
    { label: 'Num Code', value: record.numcode },
    { label: 'PY Code', value: record.pycode },
    { label: 'Box Max Num', value: record.boxmaxnum },
  ]

  const rb1500Only: DetailRow[] = [
    { label: 'HPM Type Unit', value: record.hpmtypeunit },
    { label: 'Position', value: record.medposition },
    { label: 'Batch', value: record.med_batch },
    { label: 'Expiry', value: record.validate_time },
  ]

  const nzp360Only: DetailRow[] = [{ label: 'Unit Capacity', value: record.med_unit_capacity }]

  return (
    <>
      {renderDetailGroup('Common', common)}
      {renderDetailGroup('RB-1500 Only', rb1500Only)}
      {renderDetailGroup('NZP-360 Only', nzp360Only)}
    </>
  )
}

export default function MedicineStagingTable({ medicines, onRemove }: MedicineStagingTableProps) {
  return (
    <Table
      rowKey="_key"
      dataSource={medicines}
      columns={columns(onRemove)}
      pagination={false}
      locale={{ emptyText: 'No medicines added yet — use the form above to add one or more' }}
      scroll={{ x: 'max-content' }}
      expandable={{
        expandedRowRender: renderDetails,
        rowExpandable: () => true,
      }}
    />
  )
}
