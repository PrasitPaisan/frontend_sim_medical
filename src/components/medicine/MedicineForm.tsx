import { Button, DatePicker, Form, Input, InputNumber, Select } from 'antd'
import dayjs from 'dayjs'
import type { MedicineFormValues } from '../../hooks/useMedicines'
import { DISPENSE_TYPE_OPTIONS } from '../../lib/dispenseType'

type MedicineForm = MedicineFormValues & { validate_time?: dayjs.Dayjs | string }

type MedicineFormProps = {
  onAdd: (values: MedicineFormValues) => void
}

export default function MedicineForm({ onAdd }: MedicineFormProps) {
  const [form] = Form.useForm<MedicineForm>()

  const handleFinish = (values: MedicineForm) => {
    const payload: MedicineFormValues = {
      ...values,
      validate_time: values.validate_time ? dayjs(values.validate_time).format('YYYY-MM-DD') : undefined,
    }

    onAdd(payload)
    form.resetFields()
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={(values) => handleFinish(values)}
      initialValues={{ medicinestate: 1, boxmaxnum: 1, dispense_type: 'manual' }}
    >
      <div className="medicine-form__section">
        <h5 className="medicine-form__section-title">Common (used by both machines)</h5>
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
        </div>
      </div>

      <div className="medicine-form__section">
        <h5 className="medicine-form__section-title">RB-1500 Only</h5>
        <div className="medicine-form__grid">
          <Form.Item name="hpmtypeunit" label="HPM Type Unit" rules={[{ required: true }]}>
            <Input placeholder="pill" />
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
          <Form.Item
            name="desc_code"
            label="Tracking Code (desc_code)"
            tooltip="Electronic medication tracking code(s), each 7 digits. Separate multiple codes with |"
            rules={[{ pattern: /^\d{7}(\|\d{7})*$/, message: 'Each code must be 7 digits, separated by |' }]}
          >
            <Input placeholder="1234567|7654321" />
          </Form.Item>
        </div>
      </div>

      <div className="medicine-form__section">
        <h5 className="medicine-form__section-title">NZP-360 Only</h5>
        <div className="medicine-form__grid">
          <Form.Item name="med_unit_capacity" label="Unit Capacity">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="9" />
          </Form.Item>
        </div>
      </div>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit">
          Add to List
        </Button>
      </Form.Item>
    </Form>
  )
}
