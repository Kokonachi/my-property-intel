/** Shared-scale bar model for 0-segment instalment / current-rent / rent-out comparisons.
 *  Deltas use the same rounding as the v10 plain-language lines.
 */
export function compareBarModel({ inst, currentRent, rentMo, cash } = {}) {
  const instN = Number(inst)
  const nowN = Number(currentRent) > 0 ? Number(currentRent) : null
  const letN = Number(rentMo) > 0 ? Number(rentMo) : null
  const hasInst = instN > 0
  if (!hasInst && letN == null && nowN == null) return null

  const instVsNow = hasInst && nowN != null ? Math.round(instN - nowN) : null
  const letVsInst = hasInst && letN != null
    ? (cash != null && !Number.isNaN(Number(cash)) ? Math.round(Number(cash)) : Math.round(letN - instN))
    : null

  const values = [hasInst ? instN : null, nowN, letN].filter(v => v != null)
  const max = values.length ? Math.max(...values) : 0

  return {
    inst: hasInst ? instN : null,
    currentRent: nowN,
    rentMo: letN,
    instVsNow,
    letVsInst,
    max,
  }
}

export function pctOf(value, max) {
  if (!(max > 0) || value == null) return 0
  return Math.max(0, Math.min(100, (Number(value) / max) * 100))
}

export function deltaLabel(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  const v = Math.round(Number(n))
  if (v === 0) return '0'
  const sign = v > 0 ? '+' : '−'
  return `${sign}RM${Math.abs(v).toLocaleString('en-MY')}`
}
