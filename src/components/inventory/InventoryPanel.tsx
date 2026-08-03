import { useState } from 'react'
import { Button, InputNumber, Select, Table, Tag, message } from 'antd'
import { CloudDownloadOutlined, WarningFilled } from '@ant-design/icons'
import { useInventory, type InventoryItem, type InventoryMachine } from '../../hooks/useInventory'

const OPERATION_OPTIONS = [
  { value: 1, label: 'Query shortage inventory' },
  { value: 2, label: 'Query inventory summary' },
  { value: 3, label: 'Query inventory details' },
]

// Shared by both machines' Machine Inventory tabs — QueryInventory's field
// shapes are identical between RB1500 and NZP360 (see
// MachineService.queryInventoryFromRB1500/queryInventoryFromNZP360), only
// the machine/endpoint and description text differ.
export default function InventoryPanel({ machine }: { machine: InventoryMachine }) {
  const { queryInventory } = useInventory()

  const [machineId, setMachineId] = useState(1)
  const [operation, setOperation] = useState(1)
  const [fetching, setFetching] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)

  const handleFetch = async () => {
    setFetching(true)
    try {
      const result = await queryInventory(machineId, operation, machine)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      setItems(result.items)
      setLastFetchedAt(result.queriedAt)
      message.success(result.message)
    } finally {
      setFetching(false)
    }
  }

  const shortageCount = items.filter((item) => item.isShortage === '1').length
  const okCount = items.length - shortageCount

  const columns = [
    {
      title: 'Medicine',
      key: 'medicine',
      render: (_: unknown, record: InventoryItem) => (
        <div>
          <div>{record.medName || '—'}</div>
          <div className="medicine-list__subtext">
            {[record.medSpecs, record.medFactory].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
      ),
    },
    { title: 'Location', dataIndex: 'locationCode', key: 'locationCode', render: (value: string | undefined) => value || '—' },
    {
      title: 'Qty',
      key: 'qty',
      render: (_: unknown, record: InventoryItem) => (
        <span>
          {record.currentQuantity ?? '—'} / {record.maximumQuantity ?? '—'} {record.medUnit || ''}
        </span>
      ),
      sorter: (a: InventoryItem, b: InventoryItem) => Number(a.currentQuantity ?? 0) - Number(b.currentQuantity ?? 0),
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'isShortage',
      // Shortages sort first by default — see defaultSortOrder below — so
      // the medicines that actually need attention are what a pharmacist
      // sees without having to sort manually.
      sorter: (a: InventoryItem, b: InventoryItem) => Number(b.isShortage === '1') - Number(a.isShortage === '1'),
      defaultSortOrder: 'ascend' as const,
      render: (value: string | undefined) =>
        value === '1' ? (
          <Tag color="red" icon={<WarningFilled />}>
            Low Stock
          </Tag>
        ) : (
          <Tag color="green">OK</Tag>
        ),
    },
  ]

  return (
    <div className="placeholder-card">
      <div className="machine-sim-card__header">
        <h4>{machine}</h4>
        <p>เรียก QueryInventory ไปที่เครื่อง {machine} เพื่อดูสต็อกยาปัจจุบัน</p>
      </div>

      <div className="machine-sim-card__query-toolbar">
        <span>Machine ID</span>
        <InputNumber min={1} value={machineId} onChange={(value) => setMachineId(value ?? 1)} style={{ width: 100 }} disabled={fetching} />
        <span>Operation</span>
        <Select value={operation} onChange={setOperation} options={OPERATION_OPTIONS} style={{ width: 220 }} disabled={fetching} />
        <Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => void handleFetch()} loading={fetching}>
          Fetch
        </Button>
        {lastFetchedAt ? (
          <span className="machine-sim-card__query-meta">Last fetched {new Date(lastFetchedAt).toLocaleTimeString()}</span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="inventory-stat-row">
          <div className="inventory-stat-tile">
            <span className="inventory-stat-tile__value">{items.length}</span>
            <span className="inventory-stat-tile__label">SKUs</span>
          </div>
          <div className="inventory-stat-tile inventory-stat-tile--critical">
            <span className="inventory-stat-tile__value">{shortageCount}</span>
            <span className="inventory-stat-tile__label">Low Stock</span>
          </div>
          <div className="inventory-stat-tile inventory-stat-tile--good">
            <span className="inventory-stat-tile__value">{okCount}</span>
            <span className="inventory-stat-tile__label">OK</span>
          </div>
        </div>
      ) : null}

      <Table
        rowKey={(record) => record.medHisId ?? record.locationCode ?? record.medName ?? Math.random()}
        dataSource={items}
        columns={columns}
        loading={fetching}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: lastFetchedAt ? 'No inventory data returned.' : `Press "Fetch" to load inventory from ${machine}.` }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}
