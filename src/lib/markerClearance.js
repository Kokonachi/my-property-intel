import L from './leaflet-globals.js'

/** Extra padding around the pin body when testing overlap with a yield pill. */
export const LAUNCH_CLEAR_PX = 66
const PIN_W = 52
const PIN_H = 52
const PIN_TAIL = 8
const PILL_W = 66
const PILL_H = 30

function rectsOverlap(a, b, pad = 4) {
  return a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad
}

function pinBox(tip) {
  return {
    l: tip.x - PIN_W / 2,
    r: tip.x + PIN_W / 2,
    t: tip.y - PIN_TAIL - PIN_H,
    b: tip.y,
  }
}

function pillBox(pt) {
  return {
    l: pt.x - PILL_W / 2,
    r: pt.x + PILL_W / 2,
    t: pt.y - PILL_H / 2,
    b: pt.y + PILL_H / 2,
  }
}

/**
 * Display position for a yield marker so its pill does not sit under a launch pin.
 * Does not mutate the project's stored coordinates.
 */
export function clearedLatLng(map, lat, lng, launchPts, _minPx = LAUNCH_CLEAR_PX) {
  if (!map || lat == null || lng == null) return [lat, lng]
  let pt = map.latLngToLayerPoint(L.latLng(lat, lng))
  for (const lp of launchPts) {
    if (lp.lat == null || lp.lng == null) continue
    const tip = map.latLngToLayerPoint(L.latLng(lp.lat, lp.lng))
    const pin = pinBox(tip)
    // Push south-west first so we don't slide onto the highway north of Aviera.
    let guard = 0
    while (rectsOverlap(pillBox(pt), pin) && guard < 16) {
      const cx = (pin.l + pin.r) / 2
      const cy = (pin.t + pin.b) / 2
      let vx = pt.x - cx
      let vy = pt.y - cy
      if (vx === 0 && vy === 0) { vx = -0.6; vy = 0.8 }
      if (vy < 0.2) vy = 0.2
      const n = Math.hypot(vx, vy) || 1
      pt = L.point(pt.x + (vx / n) * 8, pt.y + (vy / n) * 8)
      guard++
    }
  }
  const out = map.layerPointToLatLng(pt)
  return [out.lat, out.lng]
}

/** Spread markers that share the same stored coordinate, then clear launch pins. */
export function placeYieldMarkers(map, projects, launches, minPx = LAUNCH_CLEAR_PX) {
  const launchPts = (launches || []).filter(p => p.lat != null && p.lng != null)
  const groups = new Map()
  for (const p of projects) {
    if (p.lat == null || p.lng == null) continue
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  }
  const placed = {}
  for (const group of groups.values()) {
    group.forEach((p, i) => {
      let lat = p.lat
      let lng = p.lng
      if (group.length > 1 && map) {
        const origin = map.latLngToLayerPoint(L.latLng(p.lat, p.lng))
        const angle = (-90 + (360 * i) / group.length) * Math.PI / 180
        const r = 34
        const shifted = L.point(origin.x + Math.cos(angle) * r, origin.y + Math.sin(angle) * r)
        const ll = map.layerPointToLatLng(shifted)
        lat = ll.lat
        lng = ll.lng
      }
      const [clat, clng] = map ? clearedLatLng(map, lat, lng, launchPts, minPx) : [lat, lng]
      placed[p.id] = [clat, clng]
    })
  }
  if (map) {
    separateYields(map, placed, 42)
    // Separation can slide a pill back under a launch pin; clear again.
    for (const id of Object.keys(placed)) {
      placed[id] = clearedLatLng(map, placed[id][0], placed[id][1], launchPts, minPx)
    }
    separateYields(map, placed, 40)
    for (const id of Object.keys(placed)) {
      placed[id] = clearedLatLng(map, placed[id][0], placed[id][1], launchPts, minPx)
    }
  }
  return placed
}

/** Push yield pills apart so labels like "6.2%" do not sit on top of each other. */
function separateYields(map, placed, minPx) {
  const ids = Object.keys(placed)
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = map.latLngToLayerPoint(L.latLng(...placed[ids[i]]))
        const b = map.latLngToLayerPoint(L.latLng(...placed[ids[j]]))
        const d = a.distanceTo(b)
        if (d === 0 || d >= minPx) continue
        const ux = d === 0 ? 1 : (a.x - b.x) / d
        const uy = d === 0 ? 0 : (a.y - b.y) / d
        const push = (minPx - d) / 2 + 1
        const a2 = map.layerPointToLatLng(L.point(a.x + ux * push, a.y + uy * push))
        const b2 = map.layerPointToLatLng(L.point(b.x - ux * push, b.y - uy * push))
        placed[ids[i]] = [a2.lat, a2.lng]
        placed[ids[j]] = [b2.lat, b2.lng]
      }
    }
  }
}
