/** Visitor profile: why they are buying (goal), how many housing loans they already have, and
 *  optional current rent / salary. Nothing here blocks the page: every field starts empty.
 *
 *  goal decides what the page leads with:
 *    'home'   — owner-occupier: cash to enter, monthly cost of owning vs current rent, salary share.
 *    'invest' — investor: net monthly cash flow if let, score, yields.
 *    null     — not chosen yet: investor view plus a one-tap prompt.
 *  loans only sets the loan-percentage cap: Bank Negara caps the 3rd and later housing loan at 70%.
 */
import { useSyncExternalStore } from 'react'
import { setLoanAssumptions, getLoanAssumptions } from './loanAssumptions.js'
import { DEFAULT_LTV, parseMoney } from './mortgage.js'
import { clearCompare } from './compareDraft.js'

export const HOLDER_KEY = 'mpi-holder'
export const LOANS_MAX = 10
export const THIRD_LOAN_LTV = 70

export const GOALS = {
  home: 'home',
  invest: 'invest',
}

/** Kept for page code that still branches on the older segment names. */
export const SEGMENTS = {
  zero: 'zero',
  few: 'few',
}

export const DEFAULT_CITY = 'kl-bss'

function moneyOrNull(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseMoney(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function clampLoans(n) {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 0
  return Math.min(LOANS_MAX, Math.max(0, v))
}

/** Max loan % for the next housing loan, given how many the buyer already has. */
export function ltvCapFor(loans) {
  return clampLoans(loans) >= 2 ? THIRD_LOAN_LTV : DEFAULT_LTV
}

const defaultState = () => ({
  goal: null,
  loans: 0,
  currentRent: null,
  salary: null,
})

function goalOrNull(g) {
  return g === GOALS.home || g === GOALS.invest ? g : null
}

function readStored() {
  try {
    const raw = localStorage.getItem(HOLDER_KEY)
    if (!raw) return defaultState()
    const o = JSON.parse(raw)
    let goal = goalOrNull(o.goal)
    let loans = o.loans != null ? clampLoans(o.loans) : 0
    // Migrate the earlier "how many properties do you hold" profile.
    if (o.goal === undefined && o.count != null && !o.skipped) {
      const count = clampLoans(o.count)
      goal = count === 0 ? GOALS.home : GOALS.invest
      loans = count
    }
    return {
      goal,
      loans,
      currentRent: moneyOrNull(o.currentRent),
      salary: moneyOrNull(o.salary),
    }
  } catch {
    return defaultState()
  }
}

let state = typeof window !== 'undefined' ? readStored() : defaultState()
// A stored loan % above this buyer's cap (e.g. migrated from the old profile) is pulled down on load.
if (typeof window !== 'undefined' && getLoanAssumptions().ltv > ltvCapFor(state.loans)) {
  setLoanAssumptions({ ltv: ltvCapFor(state.loans) }, {})
}
const subs = new Set()
const emit = () => subs.forEach(f => f())

function persist() {
  try { localStorage.setItem(HOLDER_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  emit()
}

export const getHolder = () => state

export function currentSegment(s = state) {
  return s.goal === GOALS.home ? SEGMENTS.zero : SEGMENTS.few
}

export function setGoal(goal) {
  state = { ...state, goal: goalOrNull(goal) }
  persist()
  return state
}

/** Set existing housing loans; applies the 70% cap from the 3rd loan, and restores 90% when it no longer applies. */
export function setLoans(n) {
  const loans = clampLoans(n)
  const prevCap = ltvCapFor(state.loans)
  state = { ...state, loans }
  persist()
  const cap = ltvCapFor(loans)
  const loan = getLoanAssumptions()
  if (loan.ltv > cap) {
    setLoanAssumptions({ ltv: cap }, {})
  } else if (!loan.ltvManual && cap !== prevCap) {
    setLoanAssumptions({ ltv: cap }, { source: 'segment' })
  }
  return state
}

export function setHolderBudget({ currentRent, salary } = {}) {
  state = {
    ...state,
    currentRent: currentRent === undefined ? state.currentRent : moneyOrNull(currentRent),
    salary: salary === undefined ? state.salary : moneyOrNull(salary),
  }
  persist()
  return state
}

/** Clear everything (language kept), reset loan % to 90 (not manual). */
export function resetProfile() {
  state = defaultState()
  persist()
  setLoanAssumptions({ ltv: DEFAULT_LTV, ltvManual: false })
  clearCompare()
  return state
}

export function useHolder() {
  const current = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
  return {
    holder: current,
    goal: current.goal,
    segment: currentSegment(current),
    ltvCap: ltvCapFor(current.loans),
    setGoal,
    setLoans,
    setBudget: setHolderBudget,
    restart: resetProfile,
  }
}
