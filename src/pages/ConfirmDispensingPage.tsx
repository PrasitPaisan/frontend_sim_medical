import PageShell from '../components/PageShell'
import PharmacistRecheckPanel from '../components/confirmDispensing/PharmacistRecheckPanel'
import PackagedPouchesPanel from '../components/confirmDispensing/PackagedPouchesPanel'
import { Tabs } from 'antd'

export default function ConfirmDispensingPage() {
  return (
    <PageShell title="Confirm Dispensing" subtitle="Verify what each machine has finished, then confirm to clear it from the queue">
      <Tabs
        items={[
          { key: 'RB1500', label: 'RB1500 (Pharmacist Recheck)', children: <PharmacistRecheckPanel /> },
          { key: 'NZP360', label: 'NZP360 (Packaged Pouches)', children: <PackagedPouchesPanel /> },
        ]}
      />
    </PageShell>
  )
}
