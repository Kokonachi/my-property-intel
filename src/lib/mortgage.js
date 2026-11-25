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


/** Stamp duty bands for an instrument of transfer (Stamp Act, commonly published scale). */
export const SPA_STAMP_BANDS = [
  [100000, 0.01],
  [500000, 0.02],
  [1000000, 0.03],
  [Infinity, 0.04],
]
/** Loan-agreement stamp duty, 0.5% of the loan amount. */
export const LOAN_STAMP_RATE = 0.005
/** Commonly published Solicitors’ Remuneration Order scale for conveyancing. */
export const SRO_LEGAL_BANDS = [
  [500000, 0.01],
  [1000000, 0.008],
  [3000000, 0.007],
  [5000000, 0.006],
  [7500000, 0.005],
  [Infinity, 0.005],
]
/** SST on professional legal fees (8% as of 2024). */
export const LEGAL_SST = 0.08
/** Basic fit-out allowance for a new-launch high-rise, not a contractor quote. */
export const RENO_PSF = 40
/** Salary-to-instalment guide only: under 30% comfortable, 30–40% tight, over 40% stretched. */
export const SALARY_COMFORT = 30
export const SALARY_TIGHT = 40

export function bandedFee(amount, bands) {
  let left = Math.max(0, Number(amount) || 0)
  let prev = 0
  let fee = 0
  for (const [cap, rate] of bands) {
    const slice = Math.min(left, cap - prev)
    if (slice > 0) {
      fee += slice * rate
      left -= slice
    }
    prev = cap
    if (left <= 0) break
  }
  return fee
}

export function spaStampDuty(price) {
  if (!(Number(price) > 0)) return null
  return bandedFee(price, SPA_STAMP_BANDS)
}

export function loanStampDuty(loan) {
  if (!(Number(loan) > 0)) return 0
  return Number(loan) * LOAN_STAMP_RATE
}

export function sroLegalFee(amount) {
  if (!(Number(amount) > 0)) return 0
  return bandedFee(amount, SRO_LEGAL_BANDS)
}

export function renovationEst(size) {
  if (!(Number(size) > 0)) return 0
  return Number(size) * RENO_PSF
}

export function salaryBurden(inst, salary) {
  if (!(Number(inst) > 0) || !(Number(salary) > 0)) return null
  const pct = Number(inst) / Number(salary) * 100
  const band = pct < SALARY_COMFORT ? 'comfortable' : pct <= SALARY_TIGHT ? 'tight' : 'stretched'
  return { pct, band }
}

export function parseMoney(raw) {
  if (raw == null || raw === '') return null
  const n = Number(String(raw).replace(/[RM,\s]/gi, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Cash to enter: down payment + SPA/loan stamp + legal fees (incl. SST) + renovation allowance. */
export function entryCost({ price, down, size }) {
  if (!(Number(price) > 0) || down == null || Number.isNaN(Number(down))) return null
  const priceN = Number(price)
  const downN = Number(down)
  const loan = Math.max(0, priceN - downN)
  const spaStamp = spaStampDuty(priceN) || 0
  const loanStamp = loanStampDuty(loan)
  const legalEx = sroLegalFee(priceN) + sroLegalFee(loan)
  const legal = legalEx * (1 + LEGAL_SST)
  const stamp = spaStamp + loanStamp
  const renovation = renovationEst(size)
  const fees = stamp + legal
  return {
    down: downN,
    loan,
    spaStamp,
    loanStamp,
    stamp,
    legalEx,
    legal,
    fees,
    renovation,
    total: downN + stamp + legal + renovation,
    renoPsf: RENO_PSF,
    legalSst: LEGAL_SST,
  }
}
