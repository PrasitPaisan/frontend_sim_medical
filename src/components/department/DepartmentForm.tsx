import { Button, Form, Input, message } from 'antd'
import type { DepartmentFormValues } from '../../hooks/useDepartments'

type DepartmentFormProps = {
  submitting: boolean
  onSubmit: (values: DepartmentFormValues) => Promise<{ ok: boolean; message?: string }>
}

export default function DepartmentForm({ submitting, onSubmit }: DepartmentFormProps) {
  const [form] = Form.useForm<DepartmentFormValues>()

  const handleFinish = async (values: DepartmentFormValues) => {
    const result = await onSubmit(values)
    if (result.ok) {
      message.success(`Department "${values.deptname}" saved`)
      form.resetFields()
    } else {
      message.error(result.message || 'Failed to save department')
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
      <div className="medicine-form__grid">
        <Form.Item name="deptcode" label="Department Code" rules={[{ required: true }]}>
          <Input placeholder="701" />
        </Form.Item>
        <Form.Item name="deptname" label="Department Name" rules={[{ required: true }]}>
          <Input placeholder="Test department 1" />
        </Form.Item>
        <Form.Item name="deptpy" label="PY Code" rules={[{ required: true }]}>
          <Input placeholder="ek" />
        </Form.Item>
      </div>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={submitting}>
          Save Department
        </Button>
      </Form.Item>
    </Form>
  )
}
