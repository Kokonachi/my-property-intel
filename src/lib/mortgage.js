/** Standard Malaysian housing-loan instalment helpers.
 *  Default rate is a mid-market assumption, not a bank offer.
 *  BNM held the OPR at 2.75% on 5 Nov 2026, so every bank's SBR is 2.75%.
 *  Advertised standard packages in early Nov 2026 ran about 4.10–4.75% p.a.
 *  (SBR + spread). 4.3% sits in the middle of that range; first-home
 *  promotions can be lower, and investor loans can be higher.
 *  Tenure defaults to 35 years, commonly capped by the borrower's age (often 70).
 *  Loan percentage defaults to 90%, and is user-editable (50–90).
 */

export const DEFAULT_RATE = 4.3
export const DEFAULT_YEARS = 35
export const DEFAULT_LTV = 90
export const LTV_MIN = 50
export const LTV_MAX = 90
export const LTV_STEP = 5
export const RATE_MIN = 0.1
export const RATE_MAX = 15
export const YEARS_MIN = 5
export const YEARS_MAX = 35
export const LOAN_NOTE_AS_OF = '2026-11-05'
export const LOAN_RATE_RANGE = [4.10, 4.75]
export const SBR = 2.75

export function clampLtv(n) {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return DEFAULT_LTV
  return Math.min(LTV_MAX, Math.max(LTV_MIN, v))
}

/** Monthly instalment for a reducing-balance loan. */
export function monthlyInstalment(principal, annualRatePct, years) {
  const P = Number(principal)
  const yearsN = Number(years)
  const rate = Number(annualRatePct)
  if (!(P > 0) || !(yearsN > 0)) return null
  const n = Math.round(yearsN * 12)
  const i = rate / 100 / 12
  if (!i) return P / n
  return P * i / (1 - Math.pow(1 + i, -n))
}

export function cashVsRent({ price, rentMo, ltv = DEFAULT_LTV, rate = DEFAULT_RATE, years = DEFAULT_YEARS, maintMo = 0 }) {
  const ltvN = clampLtv(ltv)
  if (!(price > 0) || !(rentMo > 0) || !ltvN) return null
  const loan = price * ltvN / 100
  const down = price - loan
  const inst = monthlyInstalment(loan, rate, years)
  if (inst == null) return null
  const cash = rentMo - inst
  const cashAfterMaint = cash - (maintMo || 0)
  return { ltv: ltvN, loan, down, inst, rentMo, cash, cashAfterMaint, maintMo: maintMo || 0, covers: cash >= 0 }
}

export function ltvVerdicts({ price, rentMo, rate = DEFAULT_RATE, years = DEFAULT_YEARS, maintMo = 0, ltv = DEFAULT_LTV, ltvs }) {
  if (!(price > 0) || !(rentMo > 0)) return null
  const list = ltvs && ltvs.length ? ltvs : [ltv]
  return list.map(v => cashVsRent({ price, rentMo, ltv: v, rate, years, maintMo })).filter(Boolean)
}

export function signedRM(n, { withMo = false, t } = {}) {
  if (n == null || Number.isNaN(n)) return '—'
  const v = Math.round(n)
  const body = `RM${Math.abs(v).toLocaleString('en-MY')}`
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  const mo = withMo ? (t ? t('/月', '/mo') : '/月') : ''
  return `${sign}${body}${mo}`
}
