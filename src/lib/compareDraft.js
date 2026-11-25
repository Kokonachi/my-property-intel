/** In-session compare selection for the 3+ segment (2–3 launches). */
import { useSyncExternalStore } from 'react'

export const COMPARE_MIN = 2
export const COMPARE_MAX = 3

let ids = []
const subs = new Set()
const emit = () => subs.forEach(f => f())

export const getCompareIds = () => ids

export function toggleCompare(id) {
  if (!id) return ids
  if (ids.includes(id)) {
    ids = ids.filter(x => x !== id)
  } else if (ids.length < COMPARE_MAX) {
    ids = [...ids, id]
  }
  emit()
  return ids
}

export function clearCompare() {
  ids = []
  emit()
  return ids
}

export function useCompare() {
  const current = useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => ids, () => ids)
  return {
    ids: current,
    toggle: toggleCompare,
    clear: clearCompare,
    has: id => current.includes(id),
    canAdd: current.length < COMPARE_MAX,
    ready: current.length >= COMPARE_MIN,
  }
}
