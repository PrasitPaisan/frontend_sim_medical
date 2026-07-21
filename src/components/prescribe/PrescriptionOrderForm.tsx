import { Button, Form, Input, InputNumber, Select, message } from 'antd'
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { Medicine } from '../../hooks/useMedicines'
import type { Department } from '../../hooks/useDepartments'
import type { PrescribeOrderInput, PrescribeOrderResult } from '../../hooks/usePrescribeOrder'
import { PRIORITY_OPTIONS } from '../../lib/priority'
import { getDispenseTypeLabel } from '../../lib/dispenseType'

const MOCK_FIRST_NAMES = ['สมชาย', 'สมหญิง', 'วิชัย', 'อรทัย', 'ประยุทธ์', 'กัลยา', 'ธนากร', 'วิภา', 'ปิติ', 'มาลี']
const MOCK_LAST_NAMES = ['ใจดี', 'รักษาดี', 'เจริญสุข', 'ศรีสุข', 'บุญมาก', 'ทองแท้', 'วงศ์สว่าง', 'ยืนยง', 'แสงทอง', 'พูลสวัสดิ์']
const MOCK_DOCTOR_NAMES = ['นพ.วิชัย รักษาดี', 'พญ.สุนีย์ ใจบุญ', 'นพ.ประเสริฐ ตั้งมั่น', 'พญ.รัตนา แสงจันทร์']
const MOCK_HINTS = ['Before meal', 'After meal', 'Before bed', 'On empty stomach', 'With plenty of water']
const MOCK_ADMINISTRATIONS = ['Oral', 'Sublingual', 'Topical', 'Intravenous']
const MOCK_DOSAGE_UNITS = ['Tablet', 'Capsule', 'ml', 'mg']
const MOCK_PERFORM_FREQS: Array<{ detail: string; freq: string; print: string }> = [
  { detail: '8-12-16-20', freq: '4 times per day', print: 'Morning-noon-evening-night' },
  { detail: '8-20', freq: '2 times per day', print: 'Morning-night' },
  { detail: '8', freq: 'Once per day', print: 'Morning' },
  { detail: '8-12-18', freq: '3 times per day', print: 'Morning-noon-night' },
]

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pad2 = (value: number) => String(value).padStart(2, '0')
const randomClockTime = () => `${pad2(randomInt(0, 23))}:${pad2(randomInt(0, 59))}:${pad2(randomInt(0, 59))}`
// Matches the sample envelope's odd date+time format (e.g. "2017032909:44:30"
// — YYYYMMDD immediately followed by HH:MM:SS, no separator).
const randomDateTimeStamp = () => `${randomInt(2024, 2026)}${pad2(randomInt(1, 12))}${pad2(randomInt(1, 28))}${randomClockTime()}`

type DrugRow = {
  medicineId?: number
  medhisid?: string
  medunit?: string
  medfactoryid?: string
  medfactoryname?: string
  medicinenamech?: string
  medicinenum?: number
  medicineheteromorphism?: number
  medicinehint?: string
  // NZP360-only — optional, no autofill source (dictionary doesn't carry these).
  drugspec?: string
  drugpycode?: string
  dosage?: string
  dosageunit?: string
  dosageperunit?: string
  dispensingtime?: string
  performtime?: string
  performfreqdetail?: string
  performfreq?: string
  performfreqprint?: string
  nursingcode?: string
  priority?: number
}

type PrescriptionOrderFormValues = {
  mzno: string
  patientname: string
  patientage: number
  patientsex: number
  prescriptionhisid: string
  prescriptiondoctorname?: string
  prescriptionhint?: string
  departmentId?: number
  departmentname?: string
  fetchwindow: number
  // NZP360-only header fields — optional, collapsed by default. No
  // patienthisid here: mzno IS the patient identifier, NZP360 just calls it
  // PATIENT_ID — there's no separate value or DB column for it.
  patientbirthday?: string
  patientvisitid?: string
  patientbed?: string
  doctorid?: string
  administration?: string
  repeatindicator?: string
  deptcode?: string
  drugs: DrugRow[]
}

type PrescriptionOrderFormProps = {
  medicines: Medicine[]
  departments: Department[]
  departmentsLoading: boolean
  submitting: boolean
  onSubmit: (order: PrescribeOrderInput) => Promise<PrescribeOrderResult>
}

export default function PrescriptionOrderForm({
  medicines,
  departments,
  departmentsLoading,
  submitting,
  onSubmit,
}: PrescriptionOrderFormProps) {
  const [form] = Form.useForm<PrescriptionOrderFormValues>()

  // Type (dispense_type) shown right after the name — during testing what
  // matters most is which dispensing scenario/station a medicine routes to.
  const medicineOptions = medicines.map((medicine) => ({
    value: medicine.id,
    label: `${medicine.medicinenamech} — ${getDispenseTypeLabel(medicine.dispense_type)} (${medicine.medicinehisid}, ${medicine.medfactoryname})`,
  }))

  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: `${department.dept_name} (${department.dept_code})`,
  }))

  // Only the dictionary-backed fields get auto-filled; quantity, heteromorphism
  // and hint are per-order specifics the dictionary can't know, so those stay
  // blank for the pharmacist to fill in by hand. drugspec/drugpycode ARE
  // dictionary-backed (medicineunit/pycode) even though NZP360 only needs
  // them — skipping them here (unlike handleMockup, which already fills
  // them) left every real NZP360 send with blank DRUG_SPEC/DRUG_PY.
  const handleMedicineSelect = (rowIndex: number, medicineId: number) => {
    const medicine = medicines.find((item) => item.id === medicineId)
    if (!medicine) return

    const drugs = form.getFieldValue('drugs') as DrugRow[]
    drugs[rowIndex] = {
      ...drugs[rowIndex],
      medicineId,
      medhisid: medicine.medicinehisid,
      medunit: medicine.medicineunit,
      medfactoryid: medicine.medfactoryid ?? undefined,
      medfactoryname: medicine.medfactoryname,
      medicinenamech: medicine.medicinenamech,
      drugspec: medicine.medicineunit,
      drugpycode: medicine.pycode,
    }
    form.setFieldValue('drugs', [...drugs])
  }

  // Picking a department autofills both the free-text departmentname (used
  // by RB1500 and shown across the app) and deptcode (NZP360-only) from the
  // same department_dictionary row, so they can never disagree.
  const handleDepartmentSelect = (departmentId: number) => {
    const department = departments.find((item) => item.id === departmentId)
    if (!department) return

    form.setFieldsValue({
      departmentname: department.dept_name,
      deptcode: department.dept_code,
    })
  }

  // Fills the whole form with plausible fake data for demoing in front of a
  // pharmacist without typing everything by hand each time — generated
  // locally (no AI/network call), and only ever picks medicines/departments
  // that already exist in the real dictionaries, so a mocked submission is
  // guaranteed to be valid.
  const handleMockup = () => {
    if (medicines.length === 0) {
      message.warning('Medicine dictionary is empty — add a medicine first')
      return
    }

    const department = departments.length > 0 ? randomItem(departments) : undefined
    const drugCount = Math.min(randomInt(1, 3), medicines.length)
    const chosenMedicines = [...medicines].sort(() => Math.random() - 0.5).slice(0, drugCount)

    const drugs: DrugRow[] = chosenMedicines.map((medicine) => {
      const freq = randomItem(MOCK_PERFORM_FREQS)
      return {
        medicineId: medicine.id,
        medhisid: medicine.medicinehisid,
        medunit: medicine.medicineunit,
        medfactoryid: medicine.medfactoryid ?? undefined,
        medfactoryname: medicine.medfactoryname,
        medicinenamech: medicine.medicinenamech,
        medicinenum: randomInt(1, 30),
        medicineheteromorphism: 0,
        medicinehint: randomItem(MOCK_HINTS),
        drugspec: medicine.medicineunit,
        drugpycode: medicine.pycode,
        dosage: String(randomInt(1, 2)),
        dosageunit: randomItem(MOCK_DOSAGE_UNITS),
        dosageperunit: (randomInt(1, 5) / 10).toFixed(1),
        dispensingtime: randomDateTimeStamp(),
        performtime: randomDateTimeStamp(),
        performfreqdetail: freq.detail,
        performfreq: freq.freq,
        performfreqprint: freq.print,
        nursingcode: String(randomInt(100000000000, 999999999999)),
        priority: randomItem(PRIORITY_OPTIONS).value,
      }
    })

    form.setFieldsValue({
      prescriptionhisid: `MOCK${Date.now()}`,
      mzno: String(randomInt(1000000, 9999999)),
      patientname: `${randomItem(MOCK_FIRST_NAMES)} ${randomItem(MOCK_LAST_NAMES)}`,
      patientage: randomInt(5, 90),
      patientsex: Math.random() > 0.5 ? 1 : 0,
      prescriptiondoctorname: randomItem(MOCK_DOCTOR_NAMES),
      prescriptionhint: randomItem(MOCK_HINTS),
      fetchwindow: randomInt(1, 6),
      departmentId: department?.id,
      departmentname: department?.dept_name,
      deptcode: department?.dept_code,
      patientbirthday: `${randomInt(1950, 2015)}${String(randomInt(1, 12)).padStart(2, '0')}${String(randomInt(1, 28)).padStart(2, '0')}`,
      patientvisitid: String(randomInt(100000, 999999)),
      patientbed: `B${randomInt(1, 30)}`,
      doctorid: `D${randomInt(1000, 9999)}`,
      administration: randomItem(MOCK_ADMINISTRATIONS),
      repeatindicator: '1',
      drugs,
    })

    message.success('Mock prescription filled in — review before submitting')
  }

  const handleFinish = async (values: PrescriptionOrderFormValues) => {
    if (!values.drugs || values.drugs.length === 0) {
      message.warning('Add at least one medicine')
      return
    }

    const incompleteRow = values.drugs.find((row) => !row.medhisid || !row.medicinenum)
    if (incompleteRow) {
      message.warning('Pick a medicine and enter quantity for every row')
      return
    }

    const order: PrescribeOrderInput = {
      mzno: values.mzno,
      patientname: values.patientname,
      patientage: values.patientage,
      patientsex: values.patientsex,
      prescriptionhisid: values.prescriptionhisid,
      prescriptiondoctorname: values.prescriptiondoctorname,
      prescriptionhint: values.prescriptionhint,
      departmentname: values.departmentname,
      fetchwindow: values.fetchwindow,
      patientbirthday: values.patientbirthday,
      patientvisitid: values.patientvisitid,
      patientbed: values.patientbed,
      doctorid: values.doctorid,
      administration: values.administration,
      repeatindicator: values.repeatindicator,
      deptcode: values.deptcode,
      details: values.drugs.map((row) => ({
        medhisid: row.medhisid!,
        medunit: row.medunit!,
        medicinenum: row.medicinenum!,
        medicineheteromorphism: row.medicineheteromorphism ?? 0,
        medicinehint: row.medicinehint,
        medfactoryid: row.medfactoryid,
        medfactoryname: row.medfactoryname!,
        medicinenamech: row.medicinenamech!,
        drugspec: row.drugspec,
        drugpycode: row.drugpycode,
        dosage: row.dosage,
        dosageunit: row.dosageunit,
        dosageperunit: row.dosageperunit,
        dispensingtime: row.dispensingtime,
        performtime: row.performtime,
        performfreqdetail: row.performfreqdetail,
        performfreq: row.performfreq,
        performfreqprint: row.performfreqprint,
        nursingcode: row.nursingcode,
        priority: row.priority,
      })),
    }

    const result = await onSubmit(order)

    if (result.ok && result.inserted > 0) {
      message.success(result.message || 'Prescription order recorded')
      form.resetFields()
    } else {
      message.error(result.message || 'Failed to submit prescription order')
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)} initialValues={{ patientsex: 1, fetchwindow: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<ThunderboltOutlined />} onClick={handleMockup}>
          Mockup
        </Button>
      </div>

      <div className="medicine-form__grid">
        <Form.Item name="prescriptionhisid" label="Prescription HIS ID" rules={[{ required: true }]}>
          <Input placeholder="O2026070411" />
        </Form.Item>
        {/* Field key stays "mzno" (that's what RB1500's contract and the
            mzno DB column are named) — only the visible label changes,
            since this is the same patient identifier NZP360 calls
            PATIENT_ID (mapped straight from mzno on the backend, no
            separate patienthisid column/field exists). */}
        <Form.Item name="mzno" label="Patient ID" rules={[{ required: true }]}>
          <Input placeholder="02514995" />
        </Form.Item>
        <Form.Item name="patientname" label="Patient Name" rules={[{ required: true }]}>
          <Input placeholder="สมชาย ใจดี" />
        </Form.Item>
        <Form.Item name="patientage" label="Patient Age" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="patientsex" label="Patient Sex">
          <Select
            options={[
              { value: 1, label: 'Male' },
              { value: 0, label: 'Female' },
            ]}
          />
        </Form.Item>
        <Form.Item name="prescriptiondoctorname" label="Doctor Name">
          <Input placeholder="นพ.วิชัย รักษาดี" />
        </Form.Item>
        <Form.Item name="departmentId" label="Department">
          <Select
            options={departmentOptions}
            showSearch
            optionFilterProp="label"
            loading={departmentsLoading}
            placeholder="Pick from department dictionary"
            onChange={handleDepartmentSelect}
            notFoundContent={departmentsLoading ? 'Loading…' : 'No departments yet — add one on the Add Department page'}
          />
        </Form.Item>
        {/* Autofilled by handleDepartmentSelect above — read-only so the
            department name and its NZP360 code (below, in the collapsed
            section) can never drift out of sync with the picked dictionary row. */}
        <Form.Item name="departmentname" label="Department Name (from dictionary)">
          <Input disabled placeholder="Pick a department above" />
        </Form.Item>
        <Form.Item name="fetchwindow" label="Fetch Window (pickup counter)" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="prescriptionhint" label="Prescription Hint">
          <Input placeholder="Before meal" />
        </Form.Item>
      </div>

      <h4 style={{ marginTop: 24 }}>Additional fields for NZP360</h4>
      <div className="medicine-form__grid">
        <Form.Item name="patientbirthday" label="Patient Birthday">
          <Input placeholder="19330903" />
        </Form.Item>
        <Form.Item name="patientvisitid" label="Patient Visit ID">
          <Input placeholder="703662" />
        </Form.Item>
        <Form.Item name="patientbed" label="Bed">
          <Input placeholder="B15+" />
        </Form.Item>
        <Form.Item name="doctorid" label="Doctor ID">
          <Input placeholder="D1097" />
        </Form.Item>
        <Form.Item name="administration" label="Administration Route">
          <Input placeholder="Oral" />
        </Form.Item>
        <Form.Item name="repeatindicator" label="Repeat Indicator">
          <Input placeholder="1" />
        </Form.Item>
        <Form.Item name="deptcode" label="Department Code (from dictionary)">
          <Input disabled placeholder="Pick a department above" />
        </Form.Item>
      </div>

      <h4 style={{ marginTop: 24 }}>Medicines</h4>
      <p className="medicine-list__subtext">Pick from the machine's medicine dictionary — matching fields autofill; quantity and hint still need to be entered by hand.</p>

      <Form.List name="drugs">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }) => (
              <div className="prescribe-order__drug-row" key={key}>
                <Form.Item name={[name, 'medicineId']} label="Medicine" rules={[{ required: true, message: 'Pick a medicine' }]} style={{ flex: '2 1 260px' }}>
                  <Select
                    options={medicineOptions}
                    showSearch
                    optionFilterProp="label"
                    placeholder="Search medicine dictionary"
                    onChange={(value: number) => handleMedicineSelect(name, value)}
                  />
                </Form.Item>
                {/* Autofilled by handleMedicineSelect/handleMockup — need a real
                    Form.Item (even if hidden) or antd's onFinish silently drops
                    them, since it only collects values for registered fields. */}
                <Form.Item name={[name, 'medhisid']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={[name, 'medunit']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={[name, 'medfactoryid']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={[name, 'medfactoryname']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={[name, 'medicinenamech']} hidden>
                  <Input />
                </Form.Item>
                <Form.Item name={[name, 'medicinenum']} label="Quantity" rules={[{ required: true, message: 'Required' }]} style={{ flex: '1 1 100px' }}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name={[name, 'medicineheteromorphism']} label="Heteromorphism" style={{ flex: '1 1 120px' }}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name={[name, 'medicinehint']} label="Hint" style={{ flex: '1 1 160px' }}>
                  <Input placeholder="Before meal" />
                </Form.Item>
                <Form.Item name={[name, 'priority']} label="Priority" style={{ flex: '1 1 140px' }}>
                  <Select options={PRIORITY_OPTIONS} placeholder="Continue" />
                </Form.Item>
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 4 }} />

                <div className="prescribe-order__drug-row-extra-label">Additional fields for NZP360</div>
                <div className="prescribe-order__drug-row-extra">
                  <Form.Item name={[name, 'drugspec']} label="Drug Spec" style={{ flex: '1 1 140px' }}>
                    <Input placeholder="0.2 mg * 10" />
                  </Form.Item>
                  <Form.Item name={[name, 'drugpycode']} label="Drug PY Code" style={{ flex: '1 1 120px' }}>
                    <Input placeholder="dxsyslzh" />
                  </Form.Item>
                  <Form.Item name={[name, 'dosage']} label="Dosage" style={{ flex: '1 1 100px' }}>
                    <Input placeholder="1.0" />
                  </Form.Item>
                  <Form.Item name={[name, 'dosageunit']} label="Dosage Unit" style={{ flex: '1 1 100px' }}>
                    <Input placeholder="Tablet" />
                  </Form.Item>
                  <Form.Item name={[name, 'dosageperunit']} label="Dosage Per Unit" style={{ flex: '1 1 120px' }}>
                    <Input placeholder="0.2" />
                  </Form.Item>
                  <Form.Item name={[name, 'dispensingtime']} label="Dispensing Time" style={{ flex: '1 1 160px' }}>
                    <Input placeholder="2017032909:44:30" />
                  </Form.Item>
                  <Form.Item name={[name, 'performtime']} label="Perform Time" style={{ flex: '1 1 160px' }}>
                    <Input placeholder="2017032900:00:00" />
                  </Form.Item>
                  <Form.Item name={[name, 'performfreqdetail']} label="Perform Freq Detail" style={{ flex: '1 1 140px' }}>
                    <Input placeholder="8-12-16-20" />
                  </Form.Item>
                  <Form.Item name={[name, 'performfreq']} label="Perform Freq" style={{ flex: '1 1 140px' }}>
                    <Input placeholder="4 times per day" />
                  </Form.Item>
                  <Form.Item name={[name, 'performfreqprint']} label="Perform Freq Print" style={{ flex: '1 1 160px' }}>
                    <Input placeholder="Morning-noon-night" />
                  </Form.Item>
                  <Form.Item name={[name, 'nursingcode']} label="Nursing Code" style={{ flex: '1 1 160px' }}>
                    <Input placeholder="201703329091142" />
                  </Form.Item>
                </div>
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>
              Add medicine
            </Button>
          </>
        )}
      </Form.List>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Submit Prescription Order
        </Button>
      </Form.Item>
    </Form>
  )
}
