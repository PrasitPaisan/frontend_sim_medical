import { Table } from 'antd'
import type { Department } from '../../hooks/useDepartments'

type DepartmentListProps = {
  departments: Department[]
  loading: boolean
}

const columns = [
  { title: 'Code', dataIndex: 'dept_code', key: 'dept_code' },
  { title: 'Name', dataIndex: 'dept_name', key: 'dept_name' },
  { title: 'PY Code', dataIndex: 'dept_py', key: 'dept_py' },
  {
    title: 'Added',
    dataIndex: 'updated_at',
    key: 'updated_at',
    render: (value: string) => new Date(value).toLocaleString(),
  },
]

export default function DepartmentList({ departments, loading }: DepartmentListProps) {
  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={departments}
      columns={columns}
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: 'No departments added yet' }}
      scroll={{ x: 'max-content' }}
    />
  )
}
