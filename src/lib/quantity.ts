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
