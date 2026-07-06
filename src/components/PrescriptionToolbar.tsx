import { Button } from 'antd'

type PrescriptionToolbarProps = {
  count: number
  loading: boolean
  onRefresh: () => void
  nextFetchInSeconds: number
  selectedCount: number
  onSendSelected: () => void
  sendingBatch: boolean
}

export default function PrescriptionToolbar({
  count,
  loading,
  onRefresh,
  nextFetchInSeconds,
  selectedCount,
  onSendSelected,
  sendingBatch,
}: PrescriptionToolbarProps) {
  return (
    <div className="prescription-toolbar">
      <div className="prescription-toolbar__summary">
        <strong>{count} prescription(s)</strong>
        <span className="prescription-toolbar__pill">
          Auto-refresh in {nextFetchInSeconds} second{nextFetchInSeconds === 1 ? '' : 's'}
        </span>
        {selectedCount > 0 ? (
          <span className="prescription-toolbar__pill prescription-toolbar__pill--accent">
            {selectedCount} selected
          </span>
        ) : null}
      </div>
      <div className="prescription-toolbar__actions">
        <Button className="prescription-toolbar__button" onClick={onRefresh} loading={loading}>
          Refresh now
        </Button>
        <Button className="prescription-toolbar__button" onClick={onSendSelected} loading={sendingBatch} disabled={selectedCount === 0}>
          Send selected
        </Button>
      </div>
    </div>
  )
}
