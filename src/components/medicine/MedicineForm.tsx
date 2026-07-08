import { Button, DatePicker, Form, Input, InputNumber, Select, message } from 'antd'
import dayjs from 'dayjs'
import type { MedicineFormValues, SendMedicineResult, TargetMachine } from '../../hooks/useMedicines'
import { DISPENSE_TYPE_OPTIONS } from '../../lib/dispenseType'

const TARGET_MACHINE_OPTIONS: { value: TargetMachine; label: string }[] = [
  { value: 'RB1500', label: 'RB-1500' },
  { value: 'NZP360', label: 'NZP-360' },
]

type MedicineForm = MedicineFormValues & { validate_time?: dayjs.Dayjs | string; targetMachine: TargetMachine }

type MedicineFormProps = {
  submitting: boolean
  onSubmit: (values: MedicineFormValues, targetMachine: TargetMachine) => Promise<SendMedicineResult>
}

export default function MedicineForm({ submitting, onSubmit }: MedicineFormProps) {
  const [form] = Form.useForm<MedicineForm>()

  const handleFinish = async (values: MedicineForm) => {
    const { targetMachine, ...rest } = values
    const payload: MedicineFormValues = {
      ...rest,
      validate_time: rest.validate_time ? dayjs(rest.validate_time).format('YYYY-MM-DD') : undefined,
    }

    const result = await onSubmit(payload, targetMachine)

    if (result.ok) {
      message.success(result.message || `${payload.medicinenamech} sent to machine`)
      form.resetFields()
    } else {
      message.error(result.message)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) => void handleFinish(values)}
      initialValues={{ medicinestate: 1, boxmaxnum: 1, dispense_type: 'manual', targetMachine: 'RB1500' }}
    >
      <div className="medicine-form__target-machine">
        <Form.Item name="targetMachine" label="Send To Machine" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
          <Select options={TARGET_MACHINE_OPTIONS} size="large" style={{ minWidth: 220 }} />
        </Form.Item>
      </div>

      <div className="medicine-form__grid">
        <Form.Item name="medicinehisid" label="Medicine HIS ID" rules={[{ required: true }]}>
          <Input placeholder="1309075152" />
        </Form.Item>
        <Form.Item name="medicinenamech" label="Name (Chinese)" rules={[{ required: true }]}>
          <Input placeholder="阿司匹林" />
        </Form.Item>
        <Form.Item name="medicinenameen" label="Name (English)">
          <Input placeholder="Vigar" />
        </Form.Item>
        <Form.Item name="medicineunit" label="Unit" rules={[{ required: true }]}>
          <Input placeholder="50mg" />
        </Form.Item>
        <Form.Item name="medicinestate" label="State">
          <Select
            options={[
              { value: 1, label: 'Active' },
              { value: 0, label: 'Inactive' },
            ]}
          />
        </Form.Item>
        <Form.Item name="medfactoryid" label="Factory ID">
          <Input placeholder="123" />
        </Form.Item>
        <Form.Item name="medfactoryname" label="Factory Name" rules={[{ required: true }]}>
          <Input placeholder="Suzhou Changzheng Xinkai Pharmaceutical" />
        </Form.Item>
        <Form.Item name="typeunit" label="Type Unit" rules={[{ required: true }]}>
          <Input placeholder="box" />
        </Form.Item>
        <Form.Item name="hpmtypeunit" label="HPM Type Unit" rules={[{ required: true }]}>
          <Input placeholder="pill" />
        </Form.Item>
        <Form.Item name="dispense_type" label="Dispense Station">
          <Select options={DISPENSE_TYPE_OPTIONS} showSearch allowClear />
        </Form.Item>
        <Form.Item name="numcode" label="Num Code">
          <Input placeholder="234" />
        </Form.Item>
        <Form.Item name="pycode" label="PY Code" rules={[{ required: true }]}>
          <Input placeholder="aspl" />
        </Form.Item>
        <Form.Item name="boxmaxnum" label="Box Max Num">
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="medposition" label="Position">
          <Input placeholder="article number 12" />
        </Form.Item>
        <Form.Item name="med_batch" label="Batch">
          <Input placeholder="TD1234" />
        </Form.Item>
        <Form.Item name="validate_time" label="Expiry Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </div>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Send to Machine
        </Button>
      </Form.Item>
    </Form>
  )
}
