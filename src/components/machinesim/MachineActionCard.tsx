import { useState, type ReactNode } from 'react'
import { Button, Input, Modal, Progress, message } from 'antd'
import type { MachineCallResult } from '../../hooks/useMachineSim'

type MachineActionCardProps = {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  confirmTitle: string
  confirmDescription: string
  variant: 'danger' | 'positive'
  onPreview: (hisId: string) => Promise<{ ok: true; xml: string } | { ok: false; message: string }>
  onSubmit: (hisId: string) => Promise<MachineCallResult>
}

// Accepts one id ("ABC123"), comma/newline separated ids, a bracketed list
// ("[ABC123, DEF456]"), or a pasted JSON array of quoted strings (one per
// line, trailing comma and all) — brackets and per-id quotes are stripped,
// then split on commas/newlines so any of those input styles work the same way.
function parseHisIds(raw: string): string[] {
  return raw
    .replace(/[[\]]/g, '')
    .split(/[\n,]+/)
    .map((id) => id.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

type SubmitResult = { id: string; result: MachineCallResult }

// Pause between successive SOAP calls in a batch — the machine's tolerance
// for back-to-back requests is unconfirmed, so this is a defensive gap
// rather than a documented requirement.
const BATCH_CALL_DELAY_MS = 500

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Shared shell for the machine-only action cards on this page (Eliminate
// Prescription, Confirm Dispensing Complete, …) — unlike the pipeline
// station cards, these are not simulation: each fires a real SOAP call
// straight at RB1500 with no database read/write on either end. Clicking
// the action button previews the exact SOAP body(ies) first (no machine
// call) before the user confirms in the modal. Multiple ids are looped
// sequentially (one SOAP call at a time, not concurrent) on both preview
// and submit, since onPreview/onSubmit only know how to handle one id —
// looping here keeps that single-id contract simple for every caller.
export default function MachineActionCard({
  icon,
  title,
  description,
  actionLabel,
  confirmTitle,
  confirmDescription,
  variant,
  onPreview,
  onSubmit,
}: MachineActionCardProps) {
  const [hisIdInput, setHisIdInput] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewXml, setPreviewXml] = useState<string | null>(null)
  const [previewIds, setPreviewIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState<{ done: number; total: number; currentId: string } | null>(null)
  const [lastResults, setLastResults] = useState<SubmitResult[]>([])

  const handleOpenPreview = async () => {
    const ids = parseHisIds(hisIdInput)
    if (ids.length === 0) {
      message.warning('Enter at least one HIS id')
      return
    }

    setPreviewLoading(true)
    try {
      const combined: string[] = []
      for (const id of ids) {
        const result = await onPreview(id)
        if (!result.ok) {
          message.error(`${id}: ${result.message}`)
          return
        }
        combined.push(ids.length > 1 ? `--- ${id} ---\n${result.xml}` : result.xml)
      }
      setPreviewXml(combined.join('\n\n'))
      setPreviewIds(ids)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirmSend = async () => {
    const ids = previewIds
    setSubmitting(true)
    setLastResults([])
    const results: SubmitResult[] = []
    // Sequential, not Promise.all — fires one SOAP call at a time so the
    // machine never sees concurrent eliminate/confirm requests from a batch,
    // with a short gap between calls (see BATCH_CALL_DELAY_MS above). The
    // modal stays open with a live progress bar since these are real calls
    // to the physical machine, not a simulation.
    for (let i = 0; i < ids.length; i++) {
      if (i > 0) await delay(BATCH_CALL_DELAY_MS)
      setSubmitProgress({ done: i, total: ids.length, currentId: ids[i] })
      const result = await onSubmit(ids[i])
      results.push({ id: ids[i], result })
      setLastResults([...results])
      setSubmitProgress({ done: i + 1, total: ids.length, currentId: ids[i] })
    }
    setSubmitting(false)
    setSubmitProgress(null)
    setPreviewXml(null)

    const successCount = results.filter((r) => r.result.ok).length
    if (successCount === results.length) {
      message.success(results.length > 1 ? `${actionLabel}d ${successCount}/${results.length} prescriptions` : results[0].result.message)
      setHisIdInput('')
    } else {
      message.warning(`${successCount}/${results.length} succeeded — see results below`)
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
    <div className={`machine-sim-card ${variant === 'danger' ? 'machine-sim-card--danger' : 'machine-sim-card--positive'}`}>
      <div className="machine-sim-card__header">
        <span className="prescription-card__badge">Machine-only</span>
        <h4>
          {icon} {title}
        </h4>
        <p>{description}</p>
      </div>

      <div className="machine-sim-card__controls">
        <Input.TextArea
          placeholder="Prescription HIS id(s) — one, comma/newline separated, or [id1, id2, id3]"
          value={hisIdInput}
          onChange={(event) => setHisIdInput(event.target.value)}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={submitting}
        />
        <Button
          danger={variant === 'danger'}
          type="primary"
          loading={previewLoading}
          disabled={parseHisIds(hisIdInput).length === 0}
          onClick={() => void handleOpenPreview()}
        >
          {actionLabel}
        </Button>
      </div>

      <Modal
        title={confirmTitle}
        open={previewXml !== null || submitting}
        onCancel={submitting ? undefined : () => setPreviewXml(null)}
        closable={!submitting}
        maskClosable={!submitting}
        width={720}
        footer={
          submitting
            ? null
            : [
                <Button key="cancel" onClick={() => setPreviewXml(null)}>
                  Cancel
                </Button>,
                <Button key="copy" onClick={handleCopyPreview}>
                  Copy
                </Button>,
                <Button key="send" danger={variant === 'danger'} type="primary" onClick={() => void handleConfirmSend()}>
                  Confirm &amp; {actionLabel} {previewIds.length > 1 ? `(${previewIds.length})` : ''}
                </Button>,
              ]
        }
      >
        {submitting && submitProgress ? (
          <div className="machine-sim-card__progress">
            <Progress percent={Math.round((submitProgress.done / submitProgress.total) * 100)} status="active" />
            <p>
              Sending {submitProgress.done} / {submitProgress.total} — real SOAP call to the machine, currently:{' '}
              <strong>{submitProgress.currentId}</strong>
            </p>
            <div className="machine-sim-card__results">
              {lastResults.map(({ id, result }) => (
                <div key={id} className={result.ok ? 'machine-sim-card__complete' : 'machine-sim-card__error'}>
                  {id}: {result.message}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p>{confirmDescription}</p>
            {previewIds.length > 1 ? <p>This will fire {previewIds.length} separate SOAP calls, one after another, against the real machine.</p> : null}
            <pre className="medicine-preview__xml">{previewXml}</pre>
          </>
        )}
      </Modal>

      {lastResults.length > 0 ? (
        <div className="machine-sim-card__results">
          {lastResults.map(({ id, result }) => (
            <div key={id} className={result.ok ? 'machine-sim-card__complete' : 'machine-sim-card__error'}>
              {id}: {result.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
