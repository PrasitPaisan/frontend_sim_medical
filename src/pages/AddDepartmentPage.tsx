import { useRef, useState } from 'react'
import type { Key } from 'react'
import type { FormInstance } from 'antd'
import { Button, Modal, message } from 'antd'
import PageShell from '../components/PageShell'
import DepartmentForm from '../components/department/DepartmentForm'
import DepartmentList from '../components/department/DepartmentList'
import { useDepartments, type Department, type DepartmentFormValues } from '../hooks/useDepartments'

function toDepartmentFormValues(department: Department): DepartmentFormValues {
  return {
    deptcode: department.dept_code,
    deptname: department.dept_name,
    deptpy: department.dept_py,
  }
}

export default function AddDepartmentPage() {
  const { departments, loading, sendDepartments, saveDepartments, previewDepartments } = useDepartments()
  const formRef = useRef<FormInstance<DepartmentFormValues> | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [pendingValues, setPendingValues] = useState<DepartmentFormValues[] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([])

  const openPreview = async (values: DepartmentFormValues[]) => {
    setPreviewLoading(true)
    try {
      const result = await previewDepartments(values)
      if (result.ok) {
        setPendingValues(values)
        setPreviewXml(result.xml)
      } else {
        message.error(result.message)
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSaveToDatabase = async (values: DepartmentFormValues) => {
    setSaving(true)
    try {
      const result = await saveDepartments([values])
      if (result.ok) {
        message.success(result.message || `Saved department "${values.deptname}" to the database`)
        formRef.current?.resetFields()
      } else {
        message.error(result.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSendSelected = () => {
    if (selectedDepartments.length === 0) return
    void openPreview(selectedDepartments.map(toDepartmentFormValues))
  }

  const handleConfirmSend = async () => {
    if (!pendingValues) return
    setPreviewXml(null)
    setSubmitting(true)
    try {
      const result = await sendDepartments(pendingValues)
      if (result.ok) {
        message.success(result.message || `Sent ${pendingValues.length} department(s) to machine`)
        formRef.current?.resetFields()
        setSelectedRowKeys([])
        setSelectedDepartments([])
      } else {
        message.error(result.message)
      }
    } finally {
      setSubmitting(false)
      setPendingValues(null)
    }
  }

  const handleCancelPreview = () => {
    setPreviewXml(null)
    setPendingValues(null)
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  return (
    <PageShell title="Add Department" subtitle="Manage the department dictionary used by NZP360's SendDeptInfo and prescription forms">
      <div className="placeholder-card">
        <h4>Department details</h4>
        <DepartmentForm
          submitting={previewLoading}
          saving={saving}
          formRef={formRef}
          onSubmit={(values) => void openPreview([values])}
          onSaveToDatabase={(values) => void handleSaveToDatabase(values)}
        />
      </div>

      <Modal
        title="Confirm SOAP payload (NZP-360)"
        open={previewXml !== null}
        onCancel={handleCancelPreview}
        width={720}
        footer={[
          <Button key="cancel" onClick={handleCancelPreview}>
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
          <h4>Departments</h4>
          <Button disabled={selectedDepartments.length === 0} onClick={handleSendSelected}>
            Send Selected to Machine ({selectedDepartments.length})
          </Button>
        </div>
        <DepartmentList
          departments={departments}
          loading={loading}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={(keys, rows) => {
            setSelectedRowKeys(keys)
            setSelectedDepartments(rows)
          }}
        />
      </div>
    </PageShell>
  )
}
