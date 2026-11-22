/** Standard Malaysian housing-loan instalment helpers.
 *  Default rate is a mid-market assumption, not a bank offer.
 *  BNM held the OPR at 2.75% on 5 Nov 2026, so every bank's SBR is 2.75%.
 *  Advertised standard packages in early Nov 2026 ran about 4.10–4.75% p.a.
 *  (SBR + spread). 4.3% sits in the middle of that range; first-home
 *  promotions can be lower, and investor loans can be higher.
 *  Tenure defaults to 35 years, commonly capped by the borrower's age (often 70).
 */

export const DEFAULT_RATE = 4.3
export const DEFAULT_YEARS = 35
export const LTVS = [90, 70]
export const LOAN_NOTE_AS_OF = '2026-11-05'
export const LOAN_RATE_RANGE = [4.10, 4.75]
export const SBR = 2.75

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

export function cashVsRent({ price, rentMo, ltv, rate = DEFAULT_RATE, years = DEFAULT_YEARS, maintMo = 0 }) {
  if (!(price > 0) || !(rentMo > 0) || !ltv) return null
  const loan = price * ltv / 100
  const inst = monthlyInstalment(loan, rate, years)
  if (inst == null) return null
  const cash = rentMo - inst
  const cashAfterMaint = cash - (maintMo || 0)
  return { ltv, loan, inst, rentMo, cash, cashAfterMaint, maintMo: maintMo || 0, covers: cash >= 0 }
}

export function ltvVerdicts({ price, rentMo, rate = DEFAULT_RATE, years = DEFAULT_YEARS, maintMo = 0, ltvs = LTVS }) {
  if (!(price > 0) || !(rentMo > 0)) return null
  return ltvs.map(ltv => cashVsRent({ price, rentMo, ltv, rate, years, maintMo }))
}

export function signedRM(n, { withMo = false, t } = {}) {
  if (n == null || Number.isNaN(n)) return '—'
  const v = Math.round(n)
  const body = `RM${Math.abs(v).toLocaleString('en-MY')}`
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  const mo = withMo ? (t ? t('/月', '/mo') : '/月') : ''
  return `${sign}${body}${mo}`
}
