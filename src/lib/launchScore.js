/** New-launch investment score (0–10), transparent and not fabricated.
 *
 *  score = yieldPts (0–4) + cashPts (0–3) + vsAreaPts (0–2) + confidencePts (0–1)
 *
 *  Yield: indicative gross of the headline typ (size-band asking rent × size × 12 ÷ list price).
 *    3% → 0, 6%+ → 4, linear in between.
 *  Cash at the user's current loan percentage: rent ÷ instalment at that LTV.
 *    coverage 0.85 → 0, 1.25+ → 3, linear. Ranking updates when the loan % changes.
 *  Vs-area: headline gross minus the area’s completed-project median gross
 *    (same area, excluding Angkasapuri low-cost flats). Equal → 1.0; ±2 pp → 0 or 2.
 *  Confidence: size-band sample count (area-median fallback is 0.2).
 *
 *  Uses the list price (or a user-entered net price if provided). Rent is an asking-rent estimate.
 */
import { REAL } from '../data/real.js'
import { typRentPsf } from '../data/launches.js'
import { typYields } from './launchYield.js'
import { entryYield } from './launchEntry.js'
import { cashVsRent, DEFAULT_RATE, DEFAULT_YEARS, DEFAULT_LTV, clampLtv } from './mortgage.js'

export const SCORE_WEIGHTS = { yield: 4, cash: 3, vsArea: 2, confidence: 1 }

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

/** Completed high-rise stats in the same area, excluding low-cost flats. */
export function areaCompletedStats(area) {
  const ps = REAL.filter(p => p.area === area && p.gross != null && !isLowCostFlat(p))
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
  const area = areaCompletedStats(p.area)
  const gross = yields.gross
  const yieldPts = clamp(((gross - 3) / 3) * SCORE_WEIGHTS.yield, 0, SCORE_WEIGHTS.yield)

  const v = cashVsRent({ price, rentMo: yields.rentMo, ltv: ltvN, rate, years, maintMo: (p.maint_psf || 0) * typ.size })
  const coverage = v && v.inst > 0 ? v.rentMo / v.inst : null
  const cashPts = coverage == null ? 0 : clamp(((coverage - 0.85) / 0.4) * SCORE_WEIGHTS.cash, 0, SCORE_WEIGHTS.cash)

  const delta = area.medianGross != null ? gross - area.medianGross : 0
  const vsAreaPts = area.medianGross == null ? 0 : clamp(1 + delta / 2, 0, SCORE_WEIGHTS.vsArea)

  const confN = band?.n ?? 0
  const confPts = confidencePts(source, confN)

  const raw = yieldPts + cashPts + vsAreaPts + confPts
  const score = Math.round(raw * 10) / 10

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

export function rankedLaunches(launches, opts) {
  return (launches || [])
    .map(p => ({ p, s: launchScore(p, opts) }))
    .sort((a, b) => {
      const as = a.s.score, bs = b.s.score
      if (as == null && bs == null) return 0
      if (as == null) return 1
      if (bs == null) return -1
      if (bs !== as) return bs - as
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
    return t(`${head}，租金可覆盖贷${s.ltv}%月供`, `${head}: rent covers a ${s.ltv}% loan instalment`)
  }
  return t(`${head}，贷${s.ltv}%每月倒贴约 RM${short}`, `${head}: a ${s.ltv}% loan is about RM${short}/mo short`)
}

/** One-line investment verdict for cards and the map panel. */
export function headlineVerdict(s, t) {
  if (!s?.v) return null
  const amt = Math.abs(Math.round(s.v.cash)).toLocaleString('en-MY')
  const who = t(`贷${s.ltv}%`, `${s.ltv}% loan`)
  if (s.v.covers) return t(`${who} · 每月+RM${amt}`, `${who} · +RM${amt}/mo`)
  return t(`${who} · 每月倒贴 RM${amt}`, `${who} · −RM${amt}/mo`)
}

export function downLabel(down, t) {
  if (down == null) return null
  const amt = Math.round(down).toLocaleString('en-MY')
  return t(`首付 RM${amt}`, `Down RM${amt}`)
}
