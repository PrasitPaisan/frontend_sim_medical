import { Table, Tag } from 'antd'
import type { Key } from 'react'
import type { Department } from '../../hooks/useDepartments'

type DepartmentListProps = {
  departments: Department[]
  loading: boolean
  selectedRowKeys?: Key[]
  onSelectionChange?: (keys: Key[], rows: Department[]) => void
}

const columns = [
  { title: 'Code', dataIndex: 'dept_code', key: 'dept_code' },
  { title: 'Name', dataIndex: 'dept_name', key: 'dept_name' },
  { title: 'PY Code', dataIndex: 'dept_py', key: 'dept_py' },
  {
    title: 'Status',
    dataIndex: 'sync_status',
    key: 'sync_status',
    render: (value: 'pending' | 'synced') => (
      <Tag color={value === 'synced' ? 'green' : 'orange'}>{value === 'synced' ? 'Sent to Machine' : 'Pending'}</Tag>
    ),
  },
  {
    title: 'Added',
    dataIndex: 'updated_at',
    key: 'updated_at',
    render: (value: string) => new Date(value).toLocaleString(),
  },
]

export default function DepartmentList({ departments, loading, selectedRowKeys, onSelectionChange }: DepartmentListProps) {
  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={departments}
      columns={columns}
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: 'No departments added yet' }}
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
  )
}
