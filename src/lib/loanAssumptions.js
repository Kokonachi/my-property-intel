import { useSyncExternalStore } from 'react'
import { DEFAULT_RATE, DEFAULT_YEARS, DEFAULT_LTV, clampLtv } from './mortgage.js'

const KEY = 'mpi-loan'
const subs = new Set()

function clamp(rate, years, ltv) {
  return {
    rate: rate > 0 && rate < 20 ? rate : DEFAULT_RATE,
    years: years > 0 && years <= 40 ? years : DEFAULT_YEARS,
    ltv: clampLtv(ltv),
  }
}

function readStored() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { rate: DEFAULT_RATE, years: DEFAULT_YEARS, ltv: DEFAULT_LTV, ltvManual: false }
    const o = JSON.parse(raw)
    return {
      ...clamp(Number(o.rate), Number(o.years), o.ltv == null ? DEFAULT_LTV : Number(o.ltv)),
      ltvManual: !!o.ltvManual,
    }
  } catch {
    return { rate: DEFAULT_RATE, years: DEFAULT_YEARS, ltv: DEFAULT_LTV, ltvManual: false }
  }
}

let loan = typeof window !== 'undefined' ? readStored() : { rate: DEFAULT_RATE, years: DEFAULT_YEARS, ltv: DEFAULT_LTV, ltvManual: false }

/** @param next {{ rate?: *, years?: *, ltv?: * }}
 *  @param opts {{ source?: 'user' | 'segment' }}
 *  source 'user' marks the loan % as manually edited.
 *  source 'segment' applies a segment default only when the user has not edited it.
 */
export function setLoanAssumptions(next, opts = {}) {
  const source = opts.source
  const ltvManual = source === 'user' ? true : source === 'segment' ? loan.ltvManual : (next.ltvManual != null ? !!next.ltvManual : loan.ltvManual)
  const ltv = (source === 'segment' && loan.ltvManual)
    ? loan.ltv
    : (next.ltv == null ? loan.ltv : Number(next.ltv))
  const clamped = clamp(
    Number(next.rate ?? loan.rate),
    Number(next.years ?? loan.years),
    ltv,
  )
  loan = { ...clamped, ltvManual }
  try { localStorage.setItem(KEY, JSON.stringify(loan)) } catch { /* ignore */ }
  subs.forEach(f => f())
}

export const getLoanAssumptions = () => loan

export function useLoanAssumptions() {
  const current = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => loan, () => loan)
  return { loan: current, setLoan: setLoanAssumptions }
}
