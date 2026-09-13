import { useState } from 'react'
import { Button, Input, InputNumber, Pagination } from 'antd'

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
  nzp360SentOnly: boolean
  onToggleNzp360SentOnly: (value: boolean) => void
  search: string
  onSearch: (value: string) => void
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
  nzp360SentOnly,
  onToggleNzp360SentOnly,
  search,
  onSearch,
}: PrescriptionToolbarProps) {
  const [customN, setCustomN] = useState<number | null>(null)
  // Local display value so typing doesn't fire a request on every
  // keystroke — the actual search only runs on Enter/the search icon
  // (Input.Search's onSearch), or on Clear.
  const [searchDraft, setSearchDraft] = useState(search)

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
        <Input.Search
          allowClear
          placeholder="Search by patient, MZ no., HIS id, doctor, or department"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onSearch={(value) => onSearch(value)}
          style={{ maxWidth: 360 }}
        />
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

      {/* Prescriptions split-sent to NZP360 alone (nzp360_sent_at set) stay
          in this list waiting on RB1500 — they can land anywhere across
          pages, so this filters down to just those rather than relying on
          spotting the "Sent to NZP360" tag while scanning every card. Kept
          in its own row, small/default styling, so it doesn't compete
          visually with the primary Send selected action above. */}
      <div className="prescription-toolbar__select-row">
        <Button
          size="small"
          type={nzp360SentOnly ? 'primary' : 'default'}
          onClick={() => onToggleNzp360SentOnly(!nzp360SentOnly)}
        >
          {nzp360SentOnly ? 'Showing: NZP360 sent, awaiting RB1500' : 'Show NZP360 sent, awaiting RB1500'}
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
