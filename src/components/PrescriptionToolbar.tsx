import { useState } from 'react'
import { Button, InputNumber, Pagination } from 'antd'

const SELECT_PRESETS = [20, 50, 100]

type PrescriptionToolbarProps = {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  loading: boolean
  onRefresh: () => void
  nextFetchInSeconds: number
  selectedCount: number
  onSendSelected: () => void
  sendingBatch: boolean
  onSelectFirstN: (n: number) => void
  onClearSelection: () => void
  selecting: boolean
}

export default function PrescriptionToolbar({
  total,
  page,
  pageSize,
  onPageChange,
  loading,
  onRefresh,
  nextFetchInSeconds,
  selectedCount,
  onSendSelected,
  sendingBatch,
  onSelectFirstN,
  onClearSelection,
  selecting,
}: PrescriptionToolbarProps) {
  const [customN, setCustomN] = useState<number | null>(null)

  return (
    <div className="prescription-toolbar">
      <div className="prescription-toolbar__summary">
        <strong>{total} prescription(s)</strong>
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

      {/* "Select first N" — most urgent (Stat) prescriptions are always
          first in that ordering, so this reliably picks the top-priority
          batch regardless of which page is currently on screen. */}
      <div className="prescription-toolbar__select-row">
        <span className="prescription-toolbar__select-label">Select first:</span>
        {SELECT_PRESETS.map((n) => (
          <Button key={n} size="small" onClick={() => onSelectFirstN(n)} loading={selecting} disabled={total === 0}>
            {n}
          </Button>
        ))}
        <InputNumber
          size="small"
          min={1}
          max={total || undefined}
          placeholder="Custom"
          value={customN}
          onChange={(value) => setCustomN(value)}
          style={{ width: 90 }}
        />
        <Button
          size="small"
          onClick={() => customN && onSelectFirstN(customN)}
          loading={selecting}
          disabled={!customN || total === 0}
        >
          Select
        </Button>
        <Button size="small" onClick={onClearSelection} disabled={selectedCount === 0}>
          Clear selection
        </Button>
      </div>

      <Pagination
        className="prescription-toolbar__pagination"
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={onPageChange}
      />
    </div>
  )
}
