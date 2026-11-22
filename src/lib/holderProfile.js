/** First-visit holder count and content segment (0 / 1–2 / 3+). */
import { useSyncExternalStore } from 'react'
import { setLoanAssumptions } from './loanAssumptions.js'

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

export const DEFAULT_SORT = {
  zero: 'entry',
  few: 'score',
  many: 'net',
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

const defaultState = () => ({
  asked: false,
  skipped: false,
  count: null,
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
    return { asked, skipped, count, sortBy }
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
  return s.sortBy?.[seg] || DEFAULT_SORT[seg]
}

/** Apply the segment's default loan % only if the user has not edited it. */
export function applySegmentLoan(segment) {
  setLoanAssumptions({ ltv: segmentLtv(segment) }, { source: 'segment' })
}

export function setHolderCount(count, { skipped = false } = {}) {
  const prevSeg = state.asked ? currentSegment(state) : null
  if (skipped) {
    state = { ...state, asked: true, skipped: true, count: null }
  } else {
    state = { ...state, asked: true, skipped: false, count: clampHold(count) }
  }
  persist()
  const nextSeg = currentSegment(state)
  if (nextSeg !== prevSeg) applySegmentLoan(nextSeg)
  return state
}

export function setHolderSort(sortId) {
  if (!SORTS.some(s => s.id === sortId)) return state
  const seg = currentSegment(state)
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
  }
}
