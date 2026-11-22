/** Fit the new-launch map so yield pills are not hidden under the top controls. */
import { REAL } from '../data/real.js'

/** Degrees (~1.8 km): covers Residensi 38 / Bangsar Permai just north of BSS, not Sri Penaga. */
export const NEARBY_DEG = 0.016
const EDGE_PAD = 0.0015

/** Geographic bounds of the launches plus nearby completed-project yield pills. */
export function exploreBounds(launches, projects = REAL) {
  const core = (launches || []).filter(p => p.lat != null && p.lng != null)
  if (!core.length) return null
  const minLat = Math.min(...core.map(p => p.lat))
  const maxLat = Math.max(...core.map(p => p.lat))
  const minLng = Math.min(...core.map(p => p.lng))
  const maxLng = Math.max(...core.map(p => p.lng))
  const extra = (projects || []).filter(p => (
    p.lat != null && p.lng != null && p.gross != null
    && p.lat >= minLat - NEARBY_DEG && p.lat <= maxLat + NEARBY_DEG
    && p.lng >= minLng - NEARBY_DEG && p.lng <= maxLng + NEARBY_DEG
  ))
  const pts = [...core, ...extra]
  const lats = pts.map(p => p.lat)
  const lngs = pts.map(p => p.lng)
  return [
    [Math.min(...lats) - EDGE_PAD, Math.min(...lngs) - EDGE_PAD],
    [Math.max(...lats) + EDGE_PAD, Math.max(...lngs) + EDGE_PAD],
  ]
}

/** Top padding so a pill's top edge sits below the control bar, plus a small gap. */
export function topClearance(map) {
  const wrap = map.getContainer()
  const chrome = wrap.parentElement?.querySelector('[data-testid=explore-chrome]')
  const wr = wrap.getBoundingClientRect()
  if (chrome) {
    const r = chrome.getBoundingClientRect()
    return Math.ceil(r.bottom - wr.top + 18)
  }
  return wrap.clientWidth < 768 ? 136 : 112
}

export function exploreFitOptions(map, panelOpen) {
  const isM = map.getContainer().clientWidth < 768
  const top = topClearance(map)
  return {
    paddingTopLeft: [36, top],
    paddingBottomRight: isM
      ? [24, panelOpen ? 360 : 88]
      : [panelOpen ? 400 : 56, 80],
    maxZoom: 16,
  }
}

/** If a yield or launch marker sits under the top controls, pan it clear. */
export function clearPillsUnderTop(map, minTop = topClearance(map)) {
  const wrap = map.getContainer()
  const wr = wrap.getBoundingClientRect()
  const nodes = wrap.querySelectorAll('.ab-pill, .nl-pin')
  let minY = Infinity
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.right < wr.left || r.left > wr.right || r.bottom < wr.top || r.top > wr.bottom) continue
    minY = Math.min(minY, r.top - wr.top)
  }
  if (Number.isFinite(minY) && minY < minTop - 1) {
    map.panBy([0, minTop - minY], { animate: false })
  }
}

export function fitExploreMap(map, { launches, panelOpen = false } = {}) {
  const b = exploreBounds(launches)
  if (!b) return
  const opts = exploreFitOptions(map, panelOpen)
  map.fitBounds(b, { ...opts, animate: false })
  // Markers are laid out after the bounds change; clear on the next frame, then once more after Leaflet settles.
  requestAnimationFrame(() => {
    clearPillsUnderTop(map, opts.paddingTopLeft[1])
    map.once('moveend', () => clearPillsUnderTop(map, topClearance(map)))
  })
}
