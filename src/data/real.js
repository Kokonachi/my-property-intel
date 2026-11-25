// Real-data projects (scraper/scrape.py → src/data/real_projects.json). All yields are computed in the scraper —
// this file only maps fields; it must NOT recompute gross/net (see scripts/check_yields.py).
import raw from './real_projects.json' with { type: 'json' }
import klBatch1 from './kl_batch1_site.json' with { type: 'json' }  // scraper/kl_expand.py site (Mudah rents only)
import photos from './photos.json' with { type: 'json' }
import strPilot from './str_pilot.json' with { type: 'json' }

export const REAL_META = { generated_at: raw.generated_at, note: raw.note, summary: raw.summary }
export const STR_META = {
  generated_at: strPilot.generated_at,
  assumptions: strPilot.assumptions,
  occupancy_note: strPilot.occupancy_note,
  stay: strPilot.stay,
  min_listings: strPilot.min_listings,
}
const STR_BY_ID = strPilot.projects || {}

export function yieldOf(p, rentMode, metric) {
  if (rentMode === 'short') {
    if (p.str?.status === 'ok') return metric === 'gross' ? p.str.gross : p.str.net
    return null
  }
  return p[metric]
}


// How exact a map point is. 'street': placed on a street from Brickz transactions; 'area': an area
// centre (geo_source 'approx' is a jittered area centre) or a point shared with other projects.
const coordKey = r => `${r.lat},${r.lng}`
const ALL = [...raw.projects, ...klBatch1.projects]
const SHARED = ALL.reduce((m, r) => (r.lat != null ? m.set(coordKey(r), (m.get(coordKey(r)) || 0) + 1) : m), new Map())
export function geoPrecision(r) {
  if (r.lat == null || r.lng == null) return 'none'
  if (r.geo_source === 'verified') return 'verified'
  if (/^street from/i.test(r.geo_detail || '')) return 'street'
  if (r.geo_source === 'approx' || SHARED.get(coordKey(r)) > 1) return 'area'
  return 'name'
}

export const REAL = ALL.map((r, i) => {
  const c = r.net_costs
  const est = r.rent_estimate
  const size = c?.ref_size ?? r.ask_rent.size_median ?? null
  const psf = r.tx.psf_median
  const price = c?.ref_value ?? (size && psf ? Math.round(psf * size) : r.tx.price_median)  // value basis used for yields
  const rent = r.excluded ? null : est ? est.rent : r.ask_rent.rent_median
  const maint = c ? Math.round(c.maint_psf * (size || 0)) : 0                 // RM / month
  const otherCosts = c ? Math.round(c.assessment_rate * (rent || 0) * 12 + c.fixed_rm_yr) : 0  // RM / year
  const rooms = r.ask_rent.samples.map(s => s.rooms).filter(Boolean).sort((a, b) => a - b)
  return {
    ...r,
    name: r.name.replace(/^Kl\b/, 'KL'),
    real: true,
    geo_precision: geoPrecision(r),
    price, rent, psf, size, maint, otherCosts,
    gross: r.gross_yield, net: r.net_yield,
    photo: photos[r.id] || null,
    str: STR_BY_ID[r.id] || null,
    beds: rooms.length ? rooms[Math.floor(rooms.length / 2)] : null,
    seed: 1000 + i,
  }
})

export const realById = id => REAL.find(p => p.id === id)

/** Rent listings behind a project's yield (own ads, or area comps for landed estimates). */
export const rentSampleN = p => (p.rent_estimate ? p.rent_estimate.n : p.ask_rent?.count) ?? 0
/** Below this many rent ads a yield is shown but kept out of yield rankings. */
export const RANK_MIN_SAMPLES = 3
export const isThinSample = p => rentSampleN(p) < RANK_MIN_SAMPLES

// Area averages from real projects only (used by the heat layer)
export function realAreaStats(area, rentMode = 'long') {
  const val = (p, metric) => yieldOf(p, rentMode, metric)
  const ps = REAL.filter(p => p.area === area && val(p, 'gross') != null)
  const avg = metric => (ps.length ? ps.reduce((s, p) => s + val(p, metric), 0) / ps.length : null)
  return { count: ps.length, gross: avg('gross'), net: avg('net') }
}
