import { useState } from 'react'
import { Button, Modal, Select, Tag, message } from 'antd'
import { BulbOutlined, ReloadOutlined } from '@ant-design/icons'
import PageShell from '../components/PageShell'
import { useTrackedPrescriptions } from '../hooks/useTrackedPrescriptions'
import { useQueryBasket, type QueryBasketResult } from '../hooks/useQueryBasket'

// type doubles as a lighting command per RB1500's spec — anything other than
// 1/2/3 is treated as a plain query with no lighting side effect.
const TYPE_OPTIONS = [
  { value: '1', label: 'Light blue' },
  { value: '2', label: 'Light green' },
  { value: '3', label: 'Light red' },
  { value: '0', label: 'Query only (no light)' },
]

export default function QueryBasketPage() {
  // Only pre_state = 0 prescriptions are eligible — those are the ones
  // RB1500 has actually accepted (SendPrescription succeeded) and still has
  // a basket bound to, so QueryBasket has something real to find. Already-
  // complete (pre_state = 1) ones had their basket released back to the
  // pool, so querying them would just be the "PrescriptionID not exist" /
  // empty-basket case.
  const { prescriptions, loading, loadTrackedPrescriptions } = useTrackedPrescriptions()
  const { previewQueryBasket, queryBasket } = useQueryBasket()

  const [prescriptionHisId, setPrescriptionHisId] = useState<string | undefined>(undefined)
  const [type, setType] = useState('1')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<QueryBasketResult | null>(null)

  const inProgress = prescriptions.filter((item) => item.pre_state === 0)
  const options = inProgress.map((item) => ({
    value: item.prescriptionhisid,
    label: `${item.mzno} — ${item.patientname} (${item.prescriptionhisid})`,
  }))

  const handleOpenPreview = async () => {
    if (!prescriptionHisId) {
      message.warning('Select a prescription first')
      return
    }
    setPreviewLoading(true)
    try {
      const previewResult = await previewQueryBasket(prescriptionHisId, type)
      if (!previewResult.ok) {
        message.error(previewResult.message)
        return
      }
      setPreviewXml(previewResult.xml)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirmSend = async () => {
    if (!prescriptionHisId) return
    setPreviewXml(null)
    setSending(true)
    try {
      const queryResult = await queryBasket(prescriptionHisId, type)
      setResult(queryResult)
      if (!queryResult.ok) {
        message.error(queryResult.message)
      } else {
        message.success(queryResult.message)
      }
    } finally {
      setSending(false)
    }
  }

  const handleCopyPreview = () => {
    if (!previewXml) return
    void navigator.clipboard.writeText(previewXml).then(
      () => message.success('SOAP body copied to clipboard'),
      () => message.error('Failed to copy to clipboard'),
    )
  }

  return (
    <PageShell title="Query Basket" subtitle="Light up (or plainly query) the basket RB1500 has bound to an in-progress prescription">
      <div className="machine-sim-card machine-sim-card--wide">
        <div className="machine-sim-card__header">
          <span className="prescription-card__badge">Machine-only</span>
          <h4>
            <BulbOutlined /> Query Basket
          </h4>
          <p>เรียก QueryBasket ไปที่เครื่อง RB1500 — type 1/2/3 จะสั่งจุดไฟตะกร้า (ฟ้า/เขียว/แดง) ค่าอื่นเป็นแค่ query เฉยๆ</p>
        </div>

        <div className="machine-sim-card__query-toolbar">
          <span>Prescription</span>
          <Select
            style={{ minWidth: 320 }}
            placeholder="Pick a prescription already sent to RB1500"
            value={prescriptionHisId}
            onChange={setPrescriptionHisId}
            options={options}
            showSearch
            optionFilterProp="label"
            loading={loading}
            notFoundContent={loading ? 'Loading…' : 'No in-progress prescriptions right now'}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void loadTrackedPrescriptions()} loading={loading}>
            Refresh
          </Button>
        </div>

        <div className="machine-sim-card__query-toolbar">
          <span>Color / type</span>
          <Select style={{ width: 200 }} value={type} onChange={setType} options={TYPE_OPTIONS} />
          <Button
            type="primary"
            icon={<BulbOutlined />}
            loading={previewLoading}
            disabled={!prescriptionHisId}
            onClick={() => void handleOpenPreview()}
          >
            Query
          </Button>
        </div>

        {result ? (
          result.ok ? (
            <div className="cobot-task-box">
              <div className="cobot-task-box__row">
                <span className="cobot-task-box__label">Patient</span>
                <strong>{result.patientName || '—'}</strong>
              </div>
              <div className="cobot-task-box__row">
                <span className="cobot-task-box__label">Basket</span>
                <span>{result.basketId || '—'}</span>
              </div>
              <div className="cobot-task-box__row">
                <span className="cobot-task-box__label">Fetch window</span>
                <span>{result.fetchWindow || '—'}</span>
              </div>
              <div className="cobot-task-box__row">
                <span className="cobot-task-box__label">Delete flag</span>
                <span>{result.deleteFlag || '—'}</span>
              </div>
              <div className="cobot-task-box__row">
                <span className="cobot-task-box__label">Finish time</span>
                <span>{result.finishTime || <Tag>Not finished</Tag>}</span>
              </div>
            </div>
          ) : (
            <div className="machine-sim-card__error">{result.message}</div>
          )
        ) : null}
      </div>

      <Modal
        title={`Confirm SOAP payload — QueryBasket (${TYPE_OPTIONS.find((option) => option.value === type)?.label})`}
        open={previewXml !== null}
        onCancel={sending ? undefined : () => setPreviewXml(null)}
        closable={!sending}
        maskClosable={!sending}
        width={720}
        footer={[
          <Button key="cancel" disabled={sending} onClick={() => setPreviewXml(null)}>
            Cancel
          </Button>,
          <Button key="copy" onClick={handleCopyPreview}>
            Copy
          </Button>,
          <Button key="send" type="primary" loading={sending} onClick={() => void handleConfirmSend()}>
            Confirm &amp; Query
          </Button>,
        ]}
      >
        <p>This calls the real machine's SOAP endpoint directly. If the selected type is 1/2/3, the physical basket will light up.</p>
        <pre className="medicine-preview__xml">{previewXml}</pre>
      </Modal>
    </PageShell>
  )
}
