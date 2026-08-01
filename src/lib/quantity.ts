// Splits a total quantity given in the medicine's small unit (hpmtypeunit,
// e.g. pill/tablet/sachet) into RB1500's two-field representation:
// medicinenum = whole units of typeunit (e.g. box), medicineheteromorphism =
// leftover hpmtypeunit units that don't fill a whole typeunit. boxmaxnum is
// how many hpmtypeunit make up one typeunit — e.g. boxmaxnum=30 means a
// 70-pill order becomes medicinenum=2, medicineheteromorphism=10.
export function splitQuantity(totalQuantity: number, boxmaxnum: number) {
  const safeBoxmaxnum = boxmaxnum > 0 ? boxmaxnum : 1
  return {
    medicinenum: Math.floor(totalQuantity / safeBoxmaxnum),
    medicineheteromorphism: totalQuantity % safeBoxmaxnum,
  }
}

// DB usage codes with a confirmed once-daily meaning (see ATDPS_Master_Test_Cases.xlsx
// TC-M-13/TC-M-14) — other DB codes (e.g. '3601200') don't have a confirmed
// count and are deliberately left unmapped rather than guessed.
const ONCE_DAILY_CODES = new Set(['qd', 'qn'])

// Best-effort count of doses/day from a PERFORM_FREQ_DETAIL string — returns
// undefined when it can't be determined confidently (NULL/PRN, unmapped DB
// codes, malformed input) rather than guessing, since a wrong guess here
// would silently corrupt the total-quantity calculation below.
export function countDosesPerDay(performfreqdetail: string | undefined): number | undefined {
  if (!performfreqdetail) return undefined
  const trimmed = performfreqdetail.trim()
  if (trimmed === '') return undefined
  if (ONCE_DAILY_CODES.has(trimmed.toLowerCase())) return 1
  // HH:MM / HH-HH / HH:MM-HH:MM-HH:MM / qid-style "8-12-16-20" — count of
  // '-'-separated time segments, each segment either HH or HH:MM.
  if (/^\d{1,2}(:\d{2})?(-\d{1,2}(:\d{2})?)*$/.test(trimmed)) {
    return trimmed.split('-').filter(Boolean).length
  }
  return undefined
}

// total quantity (hpmtypeunit) = dosage per administration × doses/day ×
// days ordered (repeatindicator) — e.g. dosage=2, freq="8-12" (2x/day),
// repeatindicator="5" days -> 2*2*5 = 20. Returns undefined (not 0 or a
// guess) whenever any input can't be determined, so the caller knows to
// fall back to manual entry instead of silently suggesting a wrong number.
export function computeSuggestedTotalQuantity(
  dosage: number | undefined,
  performfreqdetail: string | undefined,
  repeatindicator: string | undefined,
): number | undefined {
  if (!dosage || dosage <= 0) return undefined
  const dosesPerDay = countDosesPerDay(performfreqdetail)
  if (!dosesPerDay) return undefined
  const days = Number(repeatindicator)
  if (!Number.isFinite(days) || days <= 0) return undefined
  return dosage * dosesPerDay * days
}
