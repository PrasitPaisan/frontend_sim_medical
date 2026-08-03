import PageShell from '../components/PageShell'
import InventoryPanel from '../components/inventory/InventoryPanel'
import { Tabs } from 'antd'

export default function MachineInventoryPage() {
  return (
    <PageShell title="Machine Inventory" subtitle="Monitor devices, status, and availability">
      <Tabs
        items={[
          { key: 'RB1500', label: 'RB1500', children: <InventoryPanel machine="RB1500" /> },
          { key: 'NZP360', label: 'NZP360', children: <InventoryPanel machine="NZP360" /> },
        ]}
      />
    </PageShell>
  )
}
