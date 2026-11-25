import { useState } from 'react'
import { useLang } from '../lib/i18n.jsx'
import { GOALS } from '../lib/holderProfile.js'
import { areaCompletedProjects } from '../lib/launchScore.js'
import { launchRisks } from '../lib/launchRisk.js'
import { cashVsRent, entryCost } from '../lib/mortgage.js'
import { ownerMonthly } from './CompareTiles.jsx'

// One accent (amber = this launch), one good (green), one bad (rose). Everything else is slate.
const AMBER = '#f59e0b'
const AMBER_INK = '#b45309'
const GOOD = '#15803d'
const BAD = '#e11d48'
const INK = '#0b1220'

const k = n => (n == null ? '—' : Math.abs(n) >= 10000 ? `${Math.round(n / 1000)}k` : Math.round(n).toLocaleString('en-MY'))
const money = n => (n == null ? '—' : Math.round(n).toLocaleString('en-MY'))
const signed = n => (n == null ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('en-MY')}`)
const shortName = s => s.replace(/\s*\(.*\)$/, '').replace(/\s+(Bangsar South|Residences?|Serviced Suites|Serviced Residence)$/ig, '').replace(/\s+(Bangsar South|Residences?)$/ig, '').replace(/^Residensi\s+/i, '').replace(/^Pantai\s+/i, '')

/** Completed projects on one psf axis; this launch is the amber pin above the line. */
function PsfStrip({ launchName, psf, median, peers, t }) {
  const W = 340
  const PAD = 18
  const vals = [psf, median, ...peers.map(p => p.psf)].filter(Boolean)
  const lo = Math.floor(Math.min(...vals) / 100) * 100
  const hi = Math.ceil(Math.max(...vals) / 100) * 100
  const x = v => PAD + (v - lo) / (hi - lo) * (W - 2 * PAD)
  const AXIS = 66
  const sorted = [...peers].sort((a, b) => a.psf - b.psf)
  const dots = []
  const rows = [[], []]
  for (const p of sorted) {
    const cx = x(p.psf)
    const near = dots.filter(q => Math.abs(q.cx - cx) < 13).length
    const label = shortName(p.name)
    const half = label.length * 2.75 + 5
    const lx = Math.min(Math.max(cx, PAD + half - 6), W - PAD - half + 6)
    const row = rows.findIndex(r => r.every(([a, b]) => lx + half < a || lx - half > b))
    if (row >= 0) rows[row].push([lx - half, lx + half])
    dots.push({ id: p.id, cx, cy: AXIS - near * 13, label, lx, row })
  }
  const px = x(psf)
  const mx = median ? x(median) : null
  const tag = `${shortName(launchName)} · RM${Math.round(psf).toLocaleString('en-MY')}`
  const tagW = tag.length * 6.6 + 18
  const tagX = Math.min(Math.max(px - tagW / 2, 2), W - tagW - 2)
  return (
    <svg width="100%" viewBox={`0 0 ${W} 126`} data-testid="psf-strip" role="img" aria-label={t('同区每平方尺价格', 'Price per sqft nearby')}>
      <defs>
        <linearGradient id="nc-track" x1="0" x2="1"><stop offset="0" stopColor="#e2e8f0" /><stop offset="1" stopColor="#cbd5e1" /></linearGradient>
        <filter id="nc-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#b45309" floodOpacity=".28" /></filter>
      </defs>
      <rect x={PAD - 4} y={AXIS - 2} width={W - 2 * PAD + 8} height="4" rx="2" fill="url(#nc-track)" />
      {mx != null && px > mx && <rect x={mx} y={AXIS - 2} width={px - mx} height="4" fill={AMBER} opacity=".55" />}
      {mx != null && (
        <g>
          <line x1={mx} y1={AXIS + 9} x2={mx} y2={AXIS + 15} stroke="#64748b" strokeWidth="1.5" />
          <text x={mx} y={AXIS + 27} fontSize="10" fontWeight="600" fill="#475569" textAnchor="middle">{t(`中位 ${median}`, `Median ${median}`)}</text>
        </g>
      )}
      {dots.map(d => <circle key={d.id} cx={d.cx} cy={d.cy} r="5.5" fill="#fff" stroke="#94a3b8" strokeWidth="2" />)}
      {dots.filter(d => d.row >= 0).map(d => (
        <text key={`l-${d.id}`} x={d.lx} y={AXIS + 42 + d.row * 13} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{d.label}</text>
      ))}
      <g filter="url(#nc-shadow)">
        <rect x={tagX} y="4" width={tagW} height="24" rx="12" fill={AMBER} />
        <text x={tagX + tagW / 2} y="20" fontSize="11.5" fontWeight="700" fill="#fff" textAnchor="middle">{tag}</text>
      </g>
      <line x1={px} y1="28" x2={px} y2={AXIS - 9} stroke={AMBER} strokeWidth="2" />
      <circle cx={px} cy={AXIS} r="8" fill={AMBER} stroke="#fff" strokeWidth="3" filter="url(#nc-shadow)" />
    </svg>
  )
}

const ICON = {
  new: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" />,
  resale: <path d="M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M10 7h1M13 7h1M10 11h1M13 11h1M10 15h1M13 15h1M10 21v-3h4v3" />,
  rent: <path d="M8 19a4 4 0 100-8 4 4 0 000 8zM11 12l8-8M16 7l2.5 2.5M14 9l1.5 1.5" />,
  extension: <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'construction-interest': <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  supply: <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />,
  'negative-leverage': <path d="M12 4v16M6 14l6 6 6-6" />,
  leasehold: <path d="M7 3h10v18H7zM10 8h4M10 12h4" />,
}
const Svg = ({ d, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>

/** Comparison table: row labels once on the left, one column per option; the winner of each row is green. */
function OptionTable({ cols, rows }) {
  const n = cols.length
  return (
    <div className="relative" data-testid="option-columns">
      <div className="pointer-events-none absolute inset-y-0 rounded-2xl bg-amber-50 ring-1 ring-amber-200/70"
        style={{ left: `calc(30% + 2px)`, width: `calc(${70 / n}% - 4px)` }} aria-hidden="true" />
      <div className="relative grid" style={{ gridTemplateColumns: `30% repeat(${n}, minmax(0, 1fr))` }}>
        <div />
        {cols.map(c => (
          <div key={c.key} className="flex flex-col items-center pb-2 pt-3" data-testid={`opt-${c.key}`}>
            <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: c.bg, color: c.fg }}><Svg d={ICON[c.key]} /></span>
            <span className="mt-1.5 text-[12.5px] font-semibold text-slate-900">{c.title}</span>
          </div>
        ))}
        {rows.map((r, i) => (
          <div key={r.key} className="contents">
            <div className={`flex items-center py-3 pl-0.5 text-[12px] text-slate-500 ${i ? 'border-t border-slate-100' : ''}`}>{r.label}</div>
            {r.cells.map((c, j) => (
              <div key={j} className={`flex items-center justify-center py-3 ${i ? 'border-t border-slate-100' : ''}`}>
                <span className="text-[17px] font-bold leading-none tracking-tight tabular-nums" style={{ color: c.color || INK }}>{c.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskRow({ risks, t, L }) {
  const [open, setOpen] = useState(null)
  const sel = risks.find(r => r.id === open)
  if (!risks.length) return null
  return (
    <div data-testid="risk-list">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 no-scrollbar">
        {risks.map(r => {
          const high = r.level === 'high'
          const on = open === r.id
          return (
            <button key={r.id} type="button" data-testid={`risk-${r.id}`} aria-expanded={on} onClick={() => setOpen(on ? null : r.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-semibold transition ${on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full ${on ? 'bg-white/15 text-white' : high ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}><Svg d={ICON[r.id]} size={14} /></span>
              {L(r.short)}
            </button>
          )
        })}
      </div>
      {sel && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] leading-snug text-slate-600" data-testid="risk-detail">{t(sel.zh, sel.en)}</p>}
    </div>
  )
}

function Stat({ value, label, color, testId }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <div className="text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-1.5 text-[12px] text-slate-500">{label}</div>
    </div>
  )
}

/** First screen of a launch, comparison-first: where its price sits among neighbours, then the same unit
 *  bought new, bought resale nearby, or (owner-occupier) kept renting. */
export function NeighbourCompare({ p, s, entry, goal, loan, currentRent }) {
  const { t, L } = useLang()
  if (!s?.v || !s.typ) return null
  const home = goal === GOALS.home
  const typ = s.typ
  const v = s.v
  const median = s.area?.medianPsf || null
  const peers = areaCompletedProjects(p.area)
  const room = typ.beds == null ? '' : typ.beds <= 0 ? t('套房', 'Studio') : t(`${typ.beds} 房`, `${typ.beds}-bed`)
  const premium = s.psf && median ? (s.psf / median - 1) * 100 : null

  const resalePrice = median ? median * typ.size : null
  const rv = resalePrice ? cashVsRent({ price: resalePrice, rentMo: v.rentMo, ltv: loan.ltv, rate: loan.rate, years: loan.years, maintMo: v.maintMo }) : null
  const rEntry = resalePrice ? entryCost({ price: resalePrice, down: resalePrice * (1 - loan.ltv / 100), size: typ.size }) : null
  const own = ownerMonthly(v)
  const rOwn = rv ? ownerMonthly(rv) : null
  const hasRent = Number(currentRent) > 0
  const rentNow = hasRent ? Number(currentRent) : v.rentMo
  const year = p.expected_completion_year
  const risks = launchRisks(p, s, { loan })

  // Green marks the best value in a row (lowest cost / highest cash / soonest).
  const best = (vals, pick = Math.min) => {
    const ok = vals.filter(x => x != null)
    const b = ok.length ? pick(...ok) : null
    return vals.map(x => (x != null && x === b ? GOOD : undefined))
  }
  const row = (key, label, values, raw, pick) => {
    const colors = raw ? best(raw, pick) : []
    return { key, label, cells: values.map((value, i) => ({ value, color: colors[i] })) }
  }

  const cols = [
    { key: 'new', title: t('新盘', 'New'), bg: '#fef3c7', fg: AMBER_INK },
    { key: 'resale', title: t('同区二手', 'Resale'), bg: '#e0f2fe', fg: '#0369a1' },
    ...(home ? [{ key: 'rent', title: t('继续租', 'Rent'), bg: '#f1f5f9', fg: '#475569' }] : []),
  ]
  const soon = [year ?? 9999, 0, 0]
  const rows = home
    ? [
        row('price', t('总价', 'Price'), [k(s.price), k(resalePrice), '—'], [s.price, resalePrice, null]),
        row('entry', t('入场现金', 'Cash in'), [k(entry?.total), k(rEntry?.total), '0'], [entry?.total, rEntry?.total, 0]),
        row('mo', hasRent ? t('每月', 'Per month') : t('每月 · 租按市价', 'Per month'), [money(own?.total), money(rOwn?.total), money(rentNow)], [own?.total, rOwn?.total, rentNow]),
        row('in', t('入住', 'Move in'), [year || '—', t('现在', 'Now'), t('现在', 'Now')], soon),
      ]
    : [
        row('price', t('总价', 'Price'), [k(s.price), k(resalePrice)], [s.price, resalePrice]),
        row('entry', t('入场现金', 'Cash in'), [k(entry?.total), k(rEntry?.total)], [entry?.total, rEntry?.total]),
        row('cash', t('每月净现金流', 'Net cash / mo'), [signed(v.cash), signed(rv?.cash)], [v.cash, rv?.cash], Math.max),
        row('in', t('开始收租', 'Rent from'), [year || '—', t('现在', 'Now')], soon.slice(0, 2)),
      ]

  const gapMo = home ? (own && rOwn ? own.total - rOwn.total : null) : (rv ? v.cash - rv.cash : null)

  return (
    <div className="mt-5 space-y-4" data-testid="neighbour-compare">
      <div className="grid grid-cols-2 gap-4" data-testid="compare-hero">
        <Stat testId="sum-premium" value={premium == null ? '—' : `${premium >= 0 ? '+' : '−'}${Math.round(Math.abs(premium))}%`} color={premium != null && premium > 0 ? AMBER_INK : GOOD}
          label={t('每平方尺比同区二手', 'Per sqft vs resale nearby')} />
        <Stat testId="sum-monthly" value={gapMo == null ? '—' : signed(home ? gapMo : gapMo).replace(/^([+−]?)/, '$1RM')} color={(home ? gapMo > 0 : gapMo < 0) ? BAD : GOOD}
          label={home ? t('每月比买二手多付', 'Per month vs buying resale') : t('每月现金流比二手', 'Monthly cash vs resale')} />
      </div>

      {median != null && <PsfStrip launchName={p.name} psf={s.psf} median={median} peers={peers} t={t} />}

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-slate-900">{t(`同样一间 ${room} · ${typ.size.toLocaleString()} sqft`, `Same ${room} · ${typ.size.toLocaleString()} sqft`)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 tabular-nums">{t(`贷 ${loan.ltv}%`, `${loan.ltv}% loan`)}</span>
        </div>
        <OptionTable cols={cols} rows={rows} />
      </div>

      <RiskRow risks={risks} t={t} L={L} />
      <p className="text-[10px] leading-snug text-slate-400">{t('二手 = 同区成交中位 psf × 同面积，租金相同。估算，不构成投资建议。', 'Resale = area median psf × same size, same rent. Estimates, not advice.')}</p>
    </div>
  )
}
