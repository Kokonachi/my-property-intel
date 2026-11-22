import { useSyncExternalStore } from 'react'
import { DEFAULT_RATE, DEFAULT_YEARS } from './mortgage.js'

const KEY = 'mpi-loan'
const subs = new Set()

function clamp(rate, years) {
  return {
    rate: rate > 0 && rate < 20 ? rate : DEFAULT_RATE,
    years: years > 0 && years <= 40 ? years : DEFAULT_YEARS,
  }
}

function readStored() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { rate: DEFAULT_RATE, years: DEFAULT_YEARS }
    const o = JSON.parse(raw)
    return clamp(Number(o.rate), Number(o.years))
  } catch {
    return { rate: DEFAULT_RATE, years: DEFAULT_YEARS }
  }
}

let loan = typeof window !== 'undefined' ? readStored() : { rate: DEFAULT_RATE, years: DEFAULT_YEARS }

export function setLoanAssumptions(next) {
  loan = clamp(Number(next.rate ?? loan.rate), Number(next.years ?? loan.years))
  try { localStorage.setItem(KEY, JSON.stringify(loan)) } catch { /* ignore */ }
  subs.forEach(f => f())
}

export const getLoanAssumptions = () => loan

export function useLoanAssumptions() {
  const current = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => loan, () => loan)
  return { loan: current, setLoan: setLoanAssumptions }
}
