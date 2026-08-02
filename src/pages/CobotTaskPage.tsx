import { useState } from 'react'
import { Button, Input, InputNumber, Modal, Tag, message } from 'antd'
import { CheckCircleOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import PageShell from '../components/PageShell'
import { useCobotTask, type QueryCobotTaskResult } from '../hooks/useCobotTask'

export default function CobotTaskPage() {
  const { fetchTask, previewFinishTask, finishTask } = useCobotTask()

  const [machineId, setMachineId] = useState(1)
  const [cobotId, setCobotId] = useState('COBOT001')
  const [fetching, setFetching] = useState(false)
  const [task, setTask] = useState<QueryCobotTaskResult | null>(null)
  // Clicking the task box selects it — separate from `task` itself so the
  // box can be deselected without losing the last-fetched result on screen.
  const [selected, setSelected] = useState(false)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  const handleFetch = async () => {
    setFetching(true)
    setSelected(false)
    try {
      const result = await fetchTask(machineId, cobotId)
      setTask(result)
      if (!result.ok) {
        message.error(result.message)
      } else if (!result.taskNo) {
        message.info('No COBOT task available right now')
      }
    } finally {
      setFetching(false)
    }
  }

  const handleOpenConfirm = async () => {
    if (!task?.taskNo) return
    setPreviewLoading(true)
    try {
      const result = await previewFinishTask(machineId, cobotId, task.taskNo)
      if (!result.ok) {
        message.error(result.message)
        return
      }
      setPreviewXml(result.xml)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirmFinish = async () => {
    if (!task?.taskNo) return
    setPreviewXml(null)
    setFinishing(true)
    try {
      const result = await finishTask(machineId, cobotId, task.taskNo)
      if (result.ok) {
        message.success(result.message)
        // The task this backend/machine just handed off is done — clear it
        // so the pharmacist has to Fetch again to pick up whatever's next,
        // rather than being able to double-confirm the same TaskNo.
        setTask(null)
        setSelected(false)
      } else {
        message.error(result.message)
      }
    } finally {
      setFinishing(false)
    }
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  const hasTask = Boolean(task?.ok && task.taskNo)

  return (
    <PageShell title="COBOT Task Management" subtitle="Fetch the next task RB1500 has queued for a COBOT, then confirm once it's physically done">
      <div className="machine-sim-card machine-sim-card--wide">
        <div className="machine-sim-card__header">
          <span className="prescription-card__badge">Machine-only</span>
          <h4>
            <CloudDownloadOutlined /> Query COBOT Task
          </h4>
          <p>เรียก QueryCOBOTTask ไปที่เครื่อง RB1500 เพื่อดูงานถัดไปที่ COBOT ตัวนี้ต้องทำ</p>
        </div>

        <div className="machine-sim-card__query-toolbar">
          <span>Machine ID</span>
          <InputNumber min={1} value={machineId} onChange={(value) => setMachineId(value ?? 1)} style={{ width: 100 }} disabled={fetching} />
          <span>COBOT ID</span>
          <Input value={cobotId} onChange={(event) => setCobotId(event.target.value)} style={{ width: 160 }} disabled={fetching} />
          <Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => void handleFetch()} loading={fetching} disabled={!cobotId}>
            Fetch
          </Button>
        </div>

        {task && !task.ok ? <div className="machine-sim-card__error">{task.message}</div> : null}

        {!task ? <div className="machine-sim-card__query-empty">Press "Fetch" to check for a queued COBOT task.</div> : null}

        {task && task.ok && !task.taskNo ? (
          <div className="machine-sim-card__query-empty">No COBOT task available right now.</div>
        ) : null}

        {hasTask ? (
          <div
            className={`cobot-task-box ${selected ? 'cobot-task-box--selected' : ''}`}
            onClick={() => setSelected((value) => !value)}
            role="button"
            tabIndex={0}
          >
            <div className="cobot-task-box__row">
              <span className="cobot-task-box__label">Task No</span>
              <strong>{task!.taskNo}</strong>
            </div>
            <div className="cobot-task-box__row">
              <span className="cobot-task-box__label">Prescription</span>
              <span>
                {task!.preHisId ?? '—'} <Tag>PreId {task!.preId ?? '—'}</Tag>
              </span>
            </div>
            <div className="cobot-task-box__row">
              <span className="cobot-task-box__label">Basket</span>
              <span>
                {task!.basketId ?? '—'} {task!.splitId ? <Tag color="purple">Split {task!.splitId}</Tag> : null}
              </span>
            </div>
            <div className="cobot-task-box__hint">{selected ? 'Selected — press "Confirm Finish" below' : 'Click to select this task'}</div>
          </div>
        ) : null}

        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          disabled={!selected || !hasTask}
          loading={previewLoading}
          onClick={() => void handleOpenConfirm()}
        >
          Confirm Finish
        </Button>
      </div>

      <Modal
        title="Confirm SOAP payload — UpdateCOBOTTask (Process complete)"
        open={previewXml !== null}
        onCancel={finishing ? undefined : () => setPreviewXml(null)}
        closable={!finishing}
        maskClosable={!finishing}
        width={720}
        footer={[
          <Button key="cancel" disabled={finishing} onClick={() => setPreviewXml(null)}>
            Cancel
          </Button>,
          <Button key="copy" onClick={handleCopyPreview}>
            Copy
          </Button>,
          <Button key="send" type="primary" loading={finishing} onClick={() => void handleConfirmFinish()}>
            Confirm &amp; Finish
          </Button>,
        ]}
      >
        <p>This tells RB1500 task {task?.taskNo} is complete (TaskState = 2), letting the basket carry on past the COBOT station. This calls the real machine's SOAP endpoint directly.</p>
        <pre className="medicine-preview__xml">{previewXml}</pre>
      </Modal>
    </PageShell>
  )
}
