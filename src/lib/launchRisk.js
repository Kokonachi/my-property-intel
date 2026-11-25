/** Decision helpers for a new-launch detail page: what happens before handover, and how fragile the
 *  monthly number is. Everything here is a rough, labelled estimate built from the page's own inputs. */
import { cashVsRent } from './mortgage.js'

const DAY = 24 * 3600 * 1000

export function yearsUntil(dateStr, today = new Date()) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, (d.getTime() - today.getTime()) / (365.25 * DAY))
}

export function monthsBetween(a, b) {
  if (!a || !b) return null
  const da = new Date(`${a}T00:00:00Z`)
  const db = new Date(`${b}T00:00:00Z`)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null
  return Math.round((db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth()))
}

/** Interest paid on progressive disbursement before handover, when there is no rent yet.
 *  Assumes the bank releases the loan in line with construction: what is already built is drawn now,
 *  the rest is drawn evenly until handover, so the average balance is loan × (p + (1 − p) / 2).
 *  Ignores the final 10–15% released at handover / CCC, which slightly overstates the tail. */
export function constructionInterest({ loan, rate, progressPct = 0, handover, today = new Date() }) {
  const years = yearsUntil(handover, today)
  if (!(loan > 0) || years == null || !(Number(rate) > 0)) return null
  const p = Math.min(1, Math.max(0, Number(progressPct) / 100 || 0))
  const avgShare = p + (1 - p) / 2
  const total = loan * avgShare * (Number(rate) / 100) * years
  return { total, years, avgShare, perMonthAvg: years > 0 ? total / (years * 12) : 0 }
}

/** Net monthly cash flow under simple shocks: rent −10%, rate +1 pp, both. */
export function sensitivity({ price, rentMo, ltv, rate, years, maintMo, rentShock = 0.1, rateShock = 1 }) {
  const base = cashVsRent({ price, rentMo, ltv, rate, years, maintMo })
  if (!base) return null
  const lowRent = cashVsRent({ price, rentMo: rentMo * (1 - rentShock), ltv, rate, years, maintMo })
  const highRate = cashVsRent({ price, rentMo, ltv, rate: Number(rate) + rateShock, years, maintMo })
  const both = cashVsRent({ price, rentMo: rentMo * (1 - rentShock), ltv, rate: Number(rate) + rateShock, years, maintMo })
  return { base: base.cash, lowRent: lowRent.cash, highRate: highRate.cash, both: both.cash, rentShock, rateShock }
}

/** Risk flags shown above the fold. Each: { id, level: 'high' | 'medium', zh, en }. */
export function launchRisks(p, s, { loan, today = new Date() } = {}) {
  const out = []
  const handover = p.handover_after_extension || p.handover_spa
  const ext = monthsBetween(p.handover_spa, p.handover_after_extension)
  const progress = p.construction_progress_pct
  if (ext > 0) {
    const early = progress != null && progress < 10
    out.push({
      id: 'extension',
      level: ext >= 12 ? 'high' : 'medium',
      zh: `交房已批准延期 ${ext} 个月（合约 ${p.handover_spa} → ${p.handover_after_extension}）${early ? '，而且是在几乎还没开工时就批的' : ''}。`,
      en: `Handover has an approved ${ext}-month extension (SPA ${p.handover_spa} → ${p.handover_after_extension})${early ? ', granted before construction had really started' : ''}.`,
    })
  }
  const ci = s?.v ? constructionInterest({ loan: s.v.loan, rate: loan?.rate, progressPct: progress, handover, today }) : null
  if (ci && ci.years >= 0.25) {
    const amt = Math.round(ci.total).toLocaleString('en-MY')
    out.push({
      id: 'construction-interest',
      level: ci.years >= 2 ? 'high' : 'medium',
      amount: ci.total,
      zh: `交房前约 ${ci.years.toFixed(1)} 年没有租金，但要付分期放款的利息，估计共约 RM${amt}（开工进度 ${progress ?? 0}%，按进度平均放款估算）。这笔钱不在入场成本里。`,
      en: `About ${ci.years.toFixed(1)} years with no rent before handover, while paying interest on progressive disbursement: roughly RM${amt} in total (construction ${progress ?? 0}%, even drawdown assumed). This is not in the cash to enter.`,
    })
  }
  if (p.total_units >= 400 && progress != null && progress < 100) {
    out.push({
      id: 'supply',
      level: 'medium',
      zh: `${p.total_units.toLocaleString()} 个单位会在差不多同一时间交房、同时招租，交房头一两年的实际租金可能低于这里用的叫租。`,
      en: `${p.total_units.toLocaleString()} units hand over at about the same time and look for tenants together, so rent in the first year or two may be below the asking rent used here.`,
    })
  }
  if (s?.v?.negativeLeverage) {
    out.push({
      id: 'negative-leverage',
      level: 'high',
      zh: `净回报 ${s.v.netYield.toFixed(2)}% 低于贷款利率 ${loan?.rate}%：借得越多，每月倒贴越多，回本要靠升值。`,
      en: `Net yield ${s.v.netYield.toFixed(2)}% is below the ${loan?.rate}% loan rate: the more you borrow, the more you top up, and the return depends on capital gain.`,
    })
  }
  if (/lease/i.test(p.tenure || '')) {
    out.push({
      id: 'leasehold',
      level: 'medium',
      zh: '99 年租赁地契：剩余年期越短，转售和再贷款越难，长期升值通常不如永久地契。',
      en: '99-year leasehold: as the remaining lease shortens, resale and refinancing get harder, and long-run gains usually trail freehold.',
    })
  }
  return out
}
