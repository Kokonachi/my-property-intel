/** New-launch project score (0–10), transparent and not fabricated.
 *
 *  score = (yieldPts (0–4) + vsAreaPts (0–2) + confidencePts (0–1)) ÷ 7 × 10
 *  It describes the project at its list price and does NOT move with the visitor's loan %.
 *  cashPts (0–3) is still computed and returned in `parts.cash` as an affordability signal, but is
 *  kept out of the score: a project is not better because someone borrows less.
 *
 *  Yield: indicative gross of the headline typ (size-band asking rent × size × 12 ÷ list price).
 *    3% → 0, 6%+ → 4, linear in between.
 *  Cash at the user's current loan percentage: rent AFTER holding costs (vacancy, assessment,
 *    maintenance, quit rent + insurance) ÷ instalment at that LTV.
 *    coverage 0.85 → 0, 1.25+ → 3, linear. Ranking updates when the loan % changes.
 *  Vs-area: headline gross minus the area’s completed-project median gross
 *    (same area, excluding Angkasapuri low-cost flats and projects with fewer than 3 rent ads). Equal → 1.0; ±2 pp → 0 or 2.
 *  Confidence: size-band sample count (area-median fallback is 0.2).
 *
 *  Uses the list price (or a user-entered net price if provided). Rent is an asking-rent estimate.
 */
import { REAL, isThinSample } from '../data/real.js'
import { typRentPsf, compsFor } from '../data/launches.js'
import { typYields } from './launchYield.js'
import { entryYield } from './launchEntry.js'
import { cashVsRent, DEFAULT_RATE, DEFAULT_YEARS, DEFAULT_LTV, clampLtv, entryCost } from './mortgage.js'

export const SCORE_WEIGHTS = { yield: 4, cash: 3, vsArea: 2, confidence: 1 }
export const SCORE_QUALITY_MAX = SCORE_WEIGHTS.yield + SCORE_WEIGHTS.vsArea + SCORE_WEIGHTS.confidence

function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

function isLowCostFlat(p) {
  const n = (p.name || '').toLowerCase()
  return n.includes('flat') || n.includes('angkasa')
}

/** Completed high-rise stats in the same area, excluding low-cost flats and thin rent samples (< 3 ads). */
/** Completed, comparable projects in an area (no low-cost flats, no thin samples); KL Gateway's
 *  duplicate Brickz records are listed once. */
const GATEWAY_DUPES = new Set(['real-kuala-lumpur-gateway', 'real-kuala-lumpur-gateway-menara-suezcap'])
export function areaCompletedProjects(area) {
  return REAL.filter(p => p.area === area && p.psf > 0 && p.gross != null && !isLowCostFlat(p) && !isThinSample(p) && !GATEWAY_DUPES.has(p.id))
}

/** Launches with their own comparable set (comps_key, e.g. HAUS ON 15 → ss15) use the pre-built nearby resale set. */
export function launchPeers(p) {
  const r = p?.comps_key ? compsFor(p.comps_key).resale : null
  if (!r) return areaCompletedProjects(p.area)
  const ids = new Set(r.projects.map(x => x.id))
  return REAL.filter(x => ids.has(x.id) && x.psf > 0)
}

export function areaCompletedStats(area, launch) {
  const r = launch?.comps_key ? compsFor(launch.comps_key).resale : null
  if (r) return { n: r.n_projects, medianGross: r.median_gross, medianPsf: r.median_psf }
  const ps = REAL.filter(p => p.area === area && p.gross != null && !isLowCostFlat(p) && !isThinSample(p))
  const grosses = ps.map(p => p.gross)
  const psfs = ps.map(p => p.psf).filter(v => v > 0)
  return {
    n: ps.length,
    medianGross: median(grosses),
    medianPsf: median(psfs),
  }
}

export function scoreBand(score) {
  if (score == null) return { color: '#64748b', bg: '#f1f5f9', fg: '#334155', zh: '暂无', en: 'n/a' }
  if (score >= 8) return { color: '#059669', bg: '#d1fae5', fg: '#065f46', zh: '推荐', en: 'Strong' }
  if (score >= 6.5) return { color: '#0d9488', bg: '#ccfbf1', fg: '#115e59', zh: '可看', en: 'Worth a look' }
  if (score >= 5) return { color: '#d97706', bg: '#fef3c7', fg: '#92400e', zh: '一般', en: 'Mixed' }
  return { color: '#e11d48', bg: '#ffe4e6', fg: '#9f1239', zh: '偏弱', en: 'Weak' }
}

export function confidencePts(source, n) {
  if (source === 'band') {
    if (n >= 20) return 1
    if (n >= 10) return 0.85
    if (n >= 5) return 0.7
    if (n >= 4) return 0.45
    return 0.25
  }
  if (source === 'area_fallback') return 0.2
  return 0
}

export function launchScore(p, { rate = DEFAULT_RATE, years = DEFAULT_YEARS, ltv = DEFAULT_LTV, priceOverride } = {}) {
  const ltvN = clampLtv(ltv)
  const { typ, y, source } = entryYield(p)
  const { psf, band } = typRentPsf(typ)
  const price = priceOverride || typ?.price_from
  const yields = price && typ?.size && psf
    ? typYields({ size: typ.size, price, rentPsf: psf, maintPsf: p.maint_psf })
    : y
  if (!yields || !price) {
    return { score: null, typ, reason: 'missing_price_or_rent', area: null, parts: null, ltv: ltvN }
  }
  const area = areaCompletedStats(p.area, p)
  const gross = yields.gross
  const yieldPts = clamp(((gross - 3) / 3) * SCORE_WEIGHTS.yield, 0, SCORE_WEIGHTS.yield)

  const v = cashVsRent({ price, rentMo: yields.rentMo, ltv: ltvN, rate, years, maintMo: (p.maint_psf || 0) * typ.size })
  const coverage = v && v.inst > 0 ? v.netRentMo / v.inst : null
  const cashPts = coverage == null ? 0 : clamp(((coverage - 0.85) / 0.4) * SCORE_WEIGHTS.cash, 0, SCORE_WEIGHTS.cash)

  const delta = area.medianGross != null ? gross - area.medianGross : 0
  const vsAreaPts = area.medianGross == null ? 0 : clamp(1 + delta / 2, 0, SCORE_WEIGHTS.vsArea)

  const confN = band?.n ?? 0
  const confPts = confidencePts(source, confN)

  const quality = yieldPts + vsAreaPts + confPts
  const score = Math.round(quality / SCORE_QUALITY_MAX * 100) / 10

  return {
    score,
    typ,
    yields,
    source,
    bandN: confN,
    area,
    v,
    coverage,
    ltv: ltvN,
    down: v?.down ?? null,
    yieldDelta: area.medianGross != null ? delta : null,
    psf: typ.psf_from || (typ.size ? price / typ.size : null),
    price,
    parts: {
      yield: Math.round(yieldPts * 100) / 100,
      cash: Math.round(cashPts * 100) / 100,
      vsArea: Math.round(vsAreaPts * 100) / 100,
      confidence: Math.round(confPts * 100) / 100,
    },
    rate,
    years,
  }
}

export function entryCostOf(s) {
  if (!s) return null
  return entryCost({ price: s.price, down: s.down, size: s.typ?.size })
}

function missingLast(av, bv, dir = 1) {
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  return (av - bv) * dir
}

export function rankedLaunches(launches, opts = {}) {
  const sortBy = opts.sortBy || 'score'
  return (launches || [])
    .map(p => ({ p, s: launchScore(p, opts) }))
    .sort((a, b) => {
      if (sortBy === 'entry') {
        const ae = entryCostOf(a.s)?.total
        const be = entryCostOf(b.s)?.total
        const d = missingLast(ae, be, 1)
        if (d) return d
      } else if (sortBy === 'net') {
        const d = missingLast(a.s.yields?.net, b.s.yields?.net, -1)
        if (d) return d
      } else if (sortBy === 'psf') {
        const d = missingLast(a.s.psf, b.s.psf, 1)
        if (d) return d
      } else if (sortBy === 'gross') {
        const d = missingLast(a.s.yields?.gross, b.s.yields?.gross, -1)
        if (d) return d
      } else {
        const d = missingLast(a.s.score, b.s.score, -1)
        if (d) return d
      }
      return (b.s.yields?.gross || 0) - (a.s.yields?.gross || 0)
    })
}

export function railChip(p, t) {
  if (p.kerinchi_lrt?.official_m != null) {
    const m = p.kerinchi_lrt.official_m
    return t(`LRT ${m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m'}`, `LRT ${m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m'}`)
  }
  const en = p.transit?.[0]?.en || ''
  const kmTm = en.match(/(\d[\d.]*)\s*m pedestrian walkway to KTM/i) || en.match(/KTM[^0-9]{0,40}(\d[\d.]*)\s*m/i)
  if (kmTm) return t(`KTM ${kmTm[1]} m`, `KTM ${kmTm[1]} m`)
  if (p.abdullah_hukum?.official_km != null) {
    return t(`LRT ${p.abdullah_hukum.official_km} km`, `LRT ${p.abdullah_hukum.official_km} km`)
  }
  return null
}

export function takeaway(s, t) {
  if (!s?.typ || !s.yields) return null
  const typ = s.typ
  const room = typ.beds == null ? '' : typ.beds <= 0 ? t('套房', 'Studio') : t(`${typ.beds} 房`, typ.beds === 1 ? '1-bed' : `${typ.beds}-bed`)
  const size = `${typ.size.toLocaleString()} sqft`
  const head = [room, size].filter(Boolean).join(' ')
  if (!s.v) return head
  const short = Math.abs(Math.round(s.v.cash)).toLocaleString('en-MY')
  if (s.v.covers) {
    return t(`${head}，扣持有成本后租金可覆盖贷${s.ltv}%月供`, `${head}: rent after holding costs covers a ${s.ltv}% loan instalment`)
  }
  return t(`${head}，贷${s.ltv}%扣持有成本后每月倒贴约 RM${short}`, `${head}: a ${s.ltv}% loan is about RM${short}/mo short after holding costs`)
}

/** One-line investment verdict for cards and the map panel. */
export function headlineVerdict(s, t) {
  if (!s?.v) return null
  const amt = Math.abs(Math.round(s.v.cash)).toLocaleString('en-MY')
  const who = t(`贷${s.ltv}%`, `${s.ltv}% loan`)
  if (s.v.covers) return t(`${who} · 每月净 +RM${amt}`, `${who} · net +RM${amt}/mo`)
  return t(`${who} · 每月净倒贴 RM${amt}`, `${who} · net −RM${amt}/mo`)
}

export function downLabel(down, t) {
  if (down == null) return null
  const amt = Math.round(down).toLocaleString('en-MY')
  return t(`首付 RM${amt}`, `Down RM${amt}`)
}
