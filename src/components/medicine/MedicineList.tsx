import { Input, Table, Tag } from 'antd'
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import type { Medicine } from '../../hooks/useMedicines'
import { getDispenseTypeColor } from '../../lib/dispenseType'

type MedicineListProps = {
  medicines: Medicine[]
  loading: boolean
  selectedRowKeys?: Key[]
  onSelectionChange?: (keys: Key[], rows: Medicine[]) => void
}

const columns = [
  { title: 'HIS ID', dataIndex: 'medicinehisid', key: 'medicinehisid' },
  {
    title: 'Name',
    key: 'name',
    render: (_: unknown, record: Medicine) => (
      <div>
        <div>{record.medicinenamech}</div>
        {record.medicinenameen ? <div className="medicine-list__subtext">{record.medicinenameen}</div> : null}
      </div>
    ),
  },
  { title: 'Unit', dataIndex: 'medicineunit', key: 'medicineunit' },
  {
    title: 'Type',
    key: 'type',
    render: (_: unknown, record: Medicine) => (
      <div>
        <div>{record.typeunit}</div>
        <div className="medicine-list__subtext">{record.hpmtypeunit}</div>
      </div>
    ),
  },
  { title: 'Factory', dataIndex: 'medfactoryname', key: 'medfactoryname' },
  {
    title: 'Status',
    dataIndex: 'sync_status',
    key: 'sync_status',
    render: (value: 'pending' | 'synced') => (
      <Tag color={value === 'synced' ? 'green' : 'orange'}>{value === 'synced' ? 'Sent to Machine' : 'Pending'}</Tag>
    ),
  },
  {
    title: 'Dispense Station',
    dataIndex: 'dispense_type',
    key: 'dispense_type',
    render: (value: string) => <Tag color={getDispenseTypeColor(value)}>{value}</Tag>,
  },
  { title: 'Batch', dataIndex: 'med_batch', key: 'med_batch', render: (value: string | null) => value || '—' },
  {
    title: 'Expiry',
    dataIndex: 'validate_time',
    key: 'validate_time',
    render: (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—'),
  },
  {
    title: 'State',
    dataIndex: 'medicinestate',
    key: 'medicinestate',
    render: (value: number) => <Tag color={value === 1 ? 'green' : 'default'}>{value === 1 ? 'Active' : 'Inactive'}</Tag>,
  },
  {
    title: 'Added',
    dataIndex: 'updated_at',
    key: 'updated_at',
    render: (value: string) => new Date(value).toLocaleString(),
  },
]

export default function MedicineList({ medicines, loading, selectedRowKeys, onSelectionChange }: MedicineListProps) {
  const [searchText, setSearchText] = useState('')

  const filteredMedicines = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) return medicines
    return medicines.filter((medicine) =>
      [
        medicine.medicinehisid,
        medicine.medicinenamech,
        medicine.medicinenameen,
        medicine.pycode,
        medicine.medfactoryname,
        medicine.med_batch,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    )
  }, [medicines, searchText])

  return (
    <>
      <Input.Search
        allowClear
        placeholder="Search by name, HIS ID, factory, pycode, or batch"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 12, maxWidth: 420 }}
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={filteredMedicines}
        columns={columns}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: searchText ? 'No medicines match your search' : 'No medicines added to the machine yet' }}
        scroll={{ x: 'max-content' }}
        rowSelection={
          onSelectionChange
            ? {
                selectedRowKeys,
                onChange: (keys, rows) => onSelectionChange(keys, rows),
              }
            : undefined
        }
      />
    </>
  )
}
