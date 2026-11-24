import { useSyncExternalStore } from 'react'
import { DEFAULT_RATE, DEFAULT_YEARS, DEFAULT_LTV, clampLtv, RATE_MIN, RATE_MAX, YEARS_MIN, YEARS_MAX } from './mortgage.js'

const KEY = 'mpi-loan'
const subs = new Set()

function clamp(rate, years, ltv) {
  const r = Number(rate)
  const y = Math.round(Number(years))
  return {
    rate: Number.isFinite(r) && r >= RATE_MIN && r <= RATE_MAX ? r : DEFAULT_RATE,
    years: Number.isFinite(y) && y >= YEARS_MIN && y <= YEARS_MAX ? y : DEFAULT_YEARS,
    ltv: clampLtv(ltv),
  }
}

function readStored() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { rate: DEFAULT_RATE, years: DEFAULT_YEARS, ltv: DEFAULT_LTV }
    const o = JSON.parse(raw)
    return clamp(Number(o.rate), Number(o.years), o.ltv == null ? DEFAULT_LTV : Number(o.ltv))
  } catch {
    return { rate: DEFAULT_RATE, years: DEFAULT_YEARS, ltv: DEFAULT_LTV }
  }
}

let loan = typeof window !== 'undefined' ? readStored() : { rate: DEFAULT_RATE, years: DEFAULT_YEARS, ltv: DEFAULT_LTV }

export function setLoanAssumptions(next) {
  loan = clamp(
    Number(next.rate ?? loan.rate),
    Number(next.years ?? loan.years),
    next.ltv == null ? loan.ltv : Number(next.ltv),
  )
  try { localStorage.setItem(KEY, JSON.stringify(loan)) } catch { /* ignore */ }
  subs.forEach(f => f())
}

export const getLoanAssumptions = () => loan

export function useLoanAssumptions() {
  const current = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => loan, () => loan)
  return { loan: current, setLoan: setLoanAssumptions }
}
