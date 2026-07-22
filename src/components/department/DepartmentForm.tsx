import { Button, Form, Input } from 'antd'
import type { FormInstance } from 'antd'
import type { DepartmentFormValues } from '../../hooks/useDepartments'

type DepartmentFormProps = {
  submitting: boolean
  saving?: boolean
  formRef?: React.RefObject<FormInstance<DepartmentFormValues> | null>
  onSubmit: (values: DepartmentFormValues) => void
  onSaveToDatabase?: (values: DepartmentFormValues) => void
}

export default function DepartmentForm({ submitting, saving, formRef, onSubmit, onSaveToDatabase }: DepartmentFormProps) {
  const [form] = Form.useForm<DepartmentFormValues>()

  if (formRef) {
    formRef.current = form
  }

  const handleSaveToDatabase = () => {
    if (!onSaveToDatabase) return
    form.validateFields().then(onSaveToDatabase).catch(() => undefined)
  }

  return (
    <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values)}>
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
        <div className="medicine-staging__actions">
          {onSaveToDatabase ? (
            <Button loading={saving} onClick={handleSaveToDatabase}>
              Save to Database
            </Button>
          ) : null}
          <Button type="primary" htmlType="submit" loading={submitting}>
            Save Department
          </Button>
        </div>
      </Form.Item>
    </Form>
  )
}
