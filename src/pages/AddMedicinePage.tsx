import { useState } from 'react'
import type { Key } from 'react'
import { Button, Modal, Select, message } from 'antd'
import PageShell from '../components/PageShell'
import MedicineForm from '../components/medicine/MedicineForm'
import MedicineList from '../components/medicine/MedicineList'
import MedicineStagingTable, { type StagedMedicine } from '../components/medicine/MedicineStagingTable'
import { useMedicines, type Medicine, type MedicineFormValues, type TargetMachine } from '../hooks/useMedicines'

const TARGET_MACHINE_OPTIONS: { value: TargetMachine; label: string }[] = [
  { value: 'RB1500', label: 'RB-1500' },
  { value: 'NZP360', label: 'NZP-360' },
]

function toStagedMedicine(medicine: Medicine): StagedMedicine {
  return {
    medicinehisid: medicine.medicinehisid,
    medicinenamech: medicine.medicinenamech,
    medicinenameen: medicine.medicinenameen ?? undefined,
    medicineunit: medicine.medicineunit,
    medicinestate: medicine.medicinestate,
    medfactoryid: medicine.medfactoryid ?? undefined,
    medfactoryname: medicine.medfactoryname,
    typeunit: medicine.typeunit,
    hpmtypeunit: medicine.hpmtypeunit,
    numcode: medicine.numcode ?? undefined,
    pycode: medicine.pycode,
    boxmaxnum: medicine.boxmaxnum,
    medposition: medicine.medposition ?? undefined,
    med_batch: medicine.med_batch ?? undefined,
    validate_time: medicine.validate_time ?? undefined,
    med_unit_capacity: medicine.med_unit_capacity ?? undefined,
    dispense_type: medicine.dispense_type,
    _key: `db-${medicine.id}-${Date.now()}-${Math.random()}`,
  }
}

export default function AddMedicinePage() {
  const { medicines, loading, sendMedicines, saveMedicines, previewSendMedicines } = useMedicines()
  const [staged, setStaged] = useState<StagedMedicine[]>([])
  const [targetMachine, setTargetMachine] = useState<TargetMachine>('RB1500')
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [selectedMedicines, setSelectedMedicines] = useState<Medicine[]>([])

  const handleAdd = (values: MedicineFormValues) => {
    setStaged((current) => [...current, { ...values, _key: `${values.medicinehisid}-${Date.now()}-${Math.random()}` }])
  }

  const handleAddSelected = () => {
    if (selectedMedicines.length === 0) return
    setStaged((current) => [...current, ...selectedMedicines.map(toStagedMedicine)])
    setSelectedRowKeys([])
    setSelectedMedicines([])
  }

  const handleRemove = (key: string) => {
    setStaged((current) => current.filter((item) => item._key !== key))
  }

  const handleOpenPreview = async () => {
    if (staged.length === 0) return
    setPreviewLoading(true)
    try {
      const payload = staged.map(({ _key, ...rest }) => rest)
      const result = await previewSendMedicines(payload, targetMachine)
      if (result.ok) {
        setPreviewXml(result.xml)
      } else {
        message.error(result.message)
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirmSend = async () => {
    setPreviewXml(null)
    setSubmitting(true)
    try {
      const payload = staged.map(({ _key, ...rest }) => rest)
      const result = await sendMedicines(payload, targetMachine)
      if (result.ok) {
        message.success(result.message || `Sent ${payload.length} medicine(s) to machine`)
        setStaged([])
      } else {
        message.error(result.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  const handleSaveAll = async () => {
    if (staged.length === 0) return
    setSaving(true)
    try {
      const payload = staged.map(({ _key, ...rest }) => rest)
      const result = await saveMedicines(payload)
      if (result.ok) {
        message.success(result.message || `Saved ${payload.length} medicine(s) to the database`)
        setStaged([])
      } else {
        message.error(result.message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Add Medicine to Machine" subtitle="Add one or more medicines to the list, then send them to the dispensing machine together">
      <div className="placeholder-card">
        <h4>Medicine details</h4>
        <MedicineForm onAdd={handleAdd} />
      </div>

      <div className="placeholder-card">
        <div className="medicine-staging__header">
          <h4>Medicines to send ({staged.length})</h4>
          <div className="medicine-staging__actions">
            <Select
              value={targetMachine}
              onChange={setTargetMachine}
              options={TARGET_MACHINE_OPTIONS}
              style={{ minWidth: 160 }}
            />
            <Button disabled={staged.length === 0} loading={saving} onClick={() => void handleSaveAll()}>
              Save to Database
            </Button>
            <Button type="primary" disabled={staged.length === 0} loading={previewLoading} onClick={() => void handleOpenPreview()}>
              Send All to Machine
            </Button>
          </div>
        </div>
        <MedicineStagingTable medicines={staged} onRemove={handleRemove} />
      </div>

      <Modal
        title={`Confirm SOAP payload (${targetMachine === 'RB1500' ? 'RB-1500' : 'NZP-360'})`}
        open={previewXml !== null}
        onCancel={() => setPreviewXml(null)}
        width={720}
        footer={[
          <Button key="cancel" onClick={() => setPreviewXml(null)}>
            Cancel
          </Button>,
          <Button key="copy" onClick={handleCopyPreview}>
            Copy
          </Button>,
          <Button key="send" type="primary" loading={submitting} onClick={() => void handleConfirmSend()}>
            Confirm &amp; Send
          </Button>,
        ]}
      >
        <pre className="medicine-preview__xml">{previewXml}</pre>
      </Modal>

      <div className="placeholder-card">
        <div className="medicine-staging__header">
          <h4>Medicine Database</h4>
          <Button
            disabled={selectedMedicines.length === 0}
            onClick={handleAddSelected}
          >
            Add Selected to List ({selectedMedicines.length})
          </Button>
        </div>
        <MedicineList
          medicines={medicines}
          loading={loading}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={(keys, rows) => {
            setSelectedRowKeys(keys)
            setSelectedMedicines(rows)
          }}
        />
      </div>
    </PageShell>
  )
}
