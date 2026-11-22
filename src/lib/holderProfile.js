/** First-visit holder profile: count, segment (0 / 1–2 / 3+), budget and city. */
import { useSyncExternalStore } from 'react'
import { setLoanAssumptions } from './loanAssumptions.js'
import { parseMoney } from './mortgage.js'

export const HOLD_MIN = 0
export const HOLD_MAX = 100
export const HOLDER_KEY = 'mpi-holder'

export const SEGMENTS = {
  zero: 'zero',
  few: 'few',
  many: 'many',
}

export const SORTS = [
  { id: 'entry', zh: '入场成本', en: 'Entry cost' },
  { id: 'score', zh: '投资评分', en: 'Score' },
  { id: 'net', zh: '净回报', en: 'Net yield' },
  { id: 'psf', zh: '每尺价', en: 'Price psf' },
]

export const SEGMENT_SORTS = {
  zero: [{ id: 'entry', zh: '入场成本', en: 'Entry cost' }],
  few: SORTS,
  many: SORTS,
}

export const DEFAULT_SORT = {
  zero: 'entry',
  few: 'score',
  many: 'net',
}

export const DEFAULT_CITY = 'kl-bss'

export const CITIES = [
  { id: 'kl-bss', zh: '吉隆坡 · 孟沙南', en: 'Kuala Lumpur · Bangsar South', shortZh: '孟沙南', shortEn: 'Bangsar South', available: true },
  { id: 'selangor-pj', zh: '雪兰莪 / 八打灵再也', en: 'Selangor / Petaling Jaya', shortZh: '雪兰莪', shortEn: 'Selangor', available: false },
  { id: 'penang', zh: '槟城', en: 'Penang', shortZh: '槟城', shortEn: 'Penang', available: false },
  { id: 'jb', zh: '新山', en: 'Johor Bahru', shortZh: '新山', shortEn: 'Johor Bahru', available: false },
]

export function cityById(id) {
  return CITIES.find(c => c.id === id) || null
}

export function clampHold(n) {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 0
  return Math.min(HOLD_MAX, Math.max(HOLD_MIN, v))
}

export function segmentOf(count) {
  if (count == null || count === '') return SEGMENTS.few
  const n = clampHold(count)
  if (n <= 0) return SEGMENTS.zero
  if (n <= 2) return SEGMENTS.few
  return SEGMENTS.many
}

export function segmentLtv(segment) {
  return segment === SEGMENTS.many ? 70 : 90
}

function moneyOrNull(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseMoney(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function cityOrNull(id, fallback = null) {
  const c = CITIES.find(x => x.id === id && x.available)
  return c ? c.id : fallback
}

const defaultState = () => ({
  asked: false,
  skipped: false,
  count: null,
  currentRent: null,
  salary: null,
  city: null,
  sortBy: { ...DEFAULT_SORT },
})

function readStored() {
  try {
    const raw = localStorage.getItem(HOLDER_KEY)
    if (!raw) return defaultState()
    const o = JSON.parse(raw)
    const sortBy = { ...DEFAULT_SORT, ...(o.sortBy || {}) }
    for (const k of Object.keys(DEFAULT_SORT)) {
      if (!SORTS.some(s => s.id === sortBy[k])) sortBy[k] = DEFAULT_SORT[k]
    }
    const asked = !!o.asked || o.skipped === true || o.count != null
    const skipped = !!o.skipped && o.count == null
    const count = skipped || o.count == null ? null : clampHold(o.count)
    return {
      asked,
      skipped,
      count,
      currentRent: moneyOrNull(o.currentRent),
      salary: moneyOrNull(o.salary),
      // Returning v8 users who already finished count shouldn't be re-prompted.
      city: cityOrNull(o.city, asked ? DEFAULT_CITY : null),
      sortBy,
    }
  } catch {
    return defaultState()
  }
}

let state = typeof window !== 'undefined' ? readStored() : defaultState()
const subs = new Set()
const emit = () => subs.forEach(f => f())

function persist() {
  try { localStorage.setItem(HOLDER_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  emit()
}

export const getHolder = () => state

export function currentSegment(s = state) {
  if (!s.asked || s.skipped || s.count == null) return SEGMENTS.few
  return segmentOf(s.count)
}

export function currentSort(s = state) {
  const seg = currentSegment(s)
  const allowed = SEGMENT_SORTS[seg] || SORTS
  const id = s.sortBy?.[seg] || DEFAULT_SORT[seg]
  return allowed.some(x => x.id === id) ? id : DEFAULT_SORT[seg]
}

/** Apply the segment's default loan % only if the user has not edited it. */
export function applySegmentLoan(segment) {
  setLoanAssumptions({ ltv: segmentLtv(segment) }, { source: 'segment' })
}

function maybeApplyLoan(prevSeg) {
  const nextSeg = currentSegment(state)
  if (nextSeg !== prevSeg) applySegmentLoan(nextSeg)
  return state
}

export function setHolderCount(count, { skipped = false } = {}) {
  const prevSeg = state.asked ? currentSegment(state) : null
  if (skipped) {
    state = { ...state, asked: true, skipped: true, count: null, city: state.city || DEFAULT_CITY }
  } else {
    const nextCount = clampHold(count)
    const dropBudget = nextCount > 0
    state = {
      ...state,
      asked: true,
      skipped: false,
      count: nextCount,
      currentRent: dropBudget ? null : state.currentRent,
      salary: dropBudget ? null : state.salary,
      city: state.city || DEFAULT_CITY,
    }
  }
  persist()
  return maybeApplyLoan(prevSeg)
}

/** Finish the multi-step onboarding (or chip editor) in one write. */
export function completeOnboarding({ count, skipped = false, currentRent, salary, city } = {}) {
  const prevSeg = state.asked ? currentSegment(state) : null
  const nextCity = cityOrNull(city, DEFAULT_CITY) || DEFAULT_CITY
  if (skipped) {
    state = {
      ...state,
      asked: true,
      skipped: true,
      count: null,
      currentRent: null,
      salary: null,
      city: nextCity,
    }
  } else {
    const nextCount = clampHold(count)
    const isZero = nextCount <= 0
    state = {
      ...state,
      asked: true,
      skipped: false,
      count: nextCount,
      currentRent: isZero ? moneyOrNull(currentRent) : null,
      salary: isZero ? moneyOrNull(salary) : null,
      city: nextCity,
    }
  }
  persist()
  return maybeApplyLoan(prevSeg)
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

export function setHolderCity(city) {
  const next = cityOrNull(city)
  if (!next) return state
  state = { ...state, city: next }
  persist()
  return state
}

export function setHolderSort(sortId) {
  const seg = currentSegment(state)
  const allowed = SEGMENT_SORTS[seg] || SORTS
  if (!allowed.some(s => s.id === sortId)) return state
  state = { ...state, sortBy: { ...state.sortBy, [seg]: sortId } }
  persist()
  return state
}

export function openHolderEditor() {
  emit()
}

export function useHolder() {
  const current = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
  return {
    holder: current,
    segment: currentSegment(current),
    sortBy: currentSort(current),
    setCount: setHolderCount,
    setSort: setHolderSort,
    setBudget: setHolderBudget,
    setCity: setHolderCity,
    complete: completeOnboarding,
  }
}
