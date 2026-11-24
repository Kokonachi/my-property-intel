import { useEffect, useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { REAL, REAL_META } from '../data/real.js'
import { TYPE_LABEL, fmtRM, fmtRMk } from '../data/properties.js'
import { Footer, Logo } from '../components/ui.jsx'
import ProjectPhoto from '../components/ProjectPhoto.jsx'
import { useLang, LangToggle } from '../lib/i18n.jsx'
import { NavTabs } from '../components/AppNav.jsx'
import YieldMapPane from '../components/YieldMapPane.jsx'
import { areaCompletedStats } from '../lib/launchScore.js'
import { LoanPctControl, LoanRateYears, LtvCompare } from '../components/LtvVerdict.jsx'

const pct = v => (v == null ? '—' : `${v.toFixed(2)}%`)
const UPDATED = (REAL_META.generated_at || '2026-11-15').slice(0, 10)
const rm = v => 'RM ' + Math.round(v).toLocaleString('en-MY')

const GATEWAY = {
  'real-kl-gateway': 'KL Gateway',
  'real-kuala-lumpur-gateway': 'Kuala Lumpur Gateway',
  'real-kuala-lumpur-gateway-menara-suezcap': 'Menara Suezcap',
}
function gatewayNote(id, t) {
  if (!(id in GATEWAY)) return null
  const others = Object.entries(GATEWAY).filter(([k]) => k !== id).map(([, n]) => n).join(' / ')
  return t(`同一片区还有 ${others}（Brickz 分项记录，价格与成交不同，未合并）`, `Same precinct: also ${others} (separate Brickz records with different prices — not merged)`)
}

function displaySources(sources) {
  const order = [
    { test: /brickz/i, name: 'Brickz.my' },
    { test: /propertyguru/i, name: 'PropertyGuru' },
    { test: /mudah/i, name: 'Mudah.my' },
  ]
  const out = []
  const seen = new Set()
  for (const { test, name } of order) {
    const hit = (sources || []).find(s => test.test(s.name) || test.test(s.url || ''))
    if (hit && !seen.has(name)) {
      seen.add(name)
      out.push({ name, url: hit.url })
    }
  }
  return out
}

function YieldWorking({ p }) {
  const { t } = useLang()
  const c = p.net_costs, est = p.rent_estimate
  const S = c.ref_size, V = c.ref_value, R = c.ref_rent, psf = p.tx.psf_median
  const area = { klcc: 'KLCC', bb: 'Bukit Bintang', mk: 'Mont Kiara', bs: 'Bangsar', bss: 'Bangsar South', sj: 'Subang Jaya' }[p.area]
  const maintBasis = p.type === 'Landed' ? t('有地住宅无管理费', 'landed — no strata fee')
    : /flat/i.test(p.brickz_type || '') ? t('组屋/平价公寓假设', 'low-cost flat assumption')
    : (p.brickz_type || '').toLowerCase() === 'apartment' ? t('旧式公寓假设', 'older apartment assumption')
    : t(`${area} 公寓/服务式公寓假设`, `${area} condo / serviced-residence assumption`)
  const nAds = p.ask_rent.count
  const adsPhrase = t(`${nAds} 则租盘`, nAds === 1 ? '1 rent ad' : `${nAds} rent ads`)
  const typY = S && V && R ? R * 12 / V * 100 : null
  const typDiffers = typY != null && Math.abs(typY - p.gross) >= 0.15
  const rows = [
    [t('空置（每年约 1 个月）', 'Vacancy (~1 month a year)'), `${p.gross.toFixed(2)}% × 1/12`, rm(R), c.pts.vacancy],
    [t('门牌税 Cukai Taksiran（年租值 4%）', 'Assessment tax (4% of annual rent)'), `${p.gross.toFixed(2)}% × 4%`, rm(R * 12 * c.assessment_rate), c.pts.assessment],
    [t(`管理费 + 偿债基金（假设 RM${c.maint_psf.toFixed(2)} psf/月，${maintBasis}）`, `Maintenance + sinking fund (assumed RM${c.maint_psf.toFixed(2)} psf/mo, ${maintBasis})`),
      c.maint_psf ? `RM${c.maint_psf.toFixed(2)} × 12 ÷ RM${psf} psf` : '—', c.maint_psf ? `${rm(c.maint_psf * S * 12)}` : 'RM 0', c.pts.maintenance],
    [t('地税、保险（估算）', 'Quit rent, insurance (est.)'), `RM${c.fixed_rm_yr} ÷ ${rm(V)}`, rm(c.fixed_rm_yr), c.pts.quit_rent_insurance],
  ]
  return (
    <section className="pt-3" data-testid="yield-working">
      <h3 className="font-semibold text-slate-900">{t('回报率怎么算', 'How the yield is calculated')}</h3>
      <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-700 space-y-1">
        <div><b>{t('毛回报', 'Gross')} {p.gross.toFixed(2)}%</b> = {est
          ? t(`区域租金 ${rm(R)} × 12 ÷ 成交中位价 ${rm(V)}`, `area rent ${rm(R)} × 12 ÷ median sale price ${rm(V)}`)
          : t(`${adsPhrase}各自的「月租 × 12 ÷（成交中位 RM${psf} psf × 该单位面积）」取中位数`, `median over ${adsPhrase} of “rent × 12 ÷ (median transacted RM${psf} psf × that ad's size)”`)}</div>
        {!est && <div className="text-[12px] text-slate-600">{typDiffers
          ? t(`费用拆解用的代表单位：${S.toLocaleString()} sqft × RM${psf} = 估值 ${rm(V)}，该则月租 ${rm(R)}（本则回报 ${typY.toFixed(2)}%；楼盘毛回报 ${p.gross.toFixed(2)}% 为各则中位数）。以下 RM 金额按此单位计。`,
            `Representative unit for the cost breakdown: ${S.toLocaleString()} sqft × RM${psf} = value ${rm(V)}, this ad’s rent ${rm(R)}/mo (this ad ${typY.toFixed(2)}%; project gross ${p.gross.toFixed(2)}% is the median across ads). RM amounts below are for this unit.`)
          : t(`代表单位（最接近中位回报的一则）：${S.toLocaleString()} sqft × RM${psf} = 估值 ${rm(V)}，月租 ${rm(R)}（以下 RM 金额按此单位计）`, `Representative unit (the ad closest to the median yield): ${S.toLocaleString()} sqft × RM${psf} = value ${rm(V)}, rent ${rm(R)}/mo (RM amounts below are for this unit)`)}</div>}
      </div>
      <div className="mt-3 divide-y divide-slate-100 text-[13px]">
        {rows.map(([label, formula, amt, pts]) => (
          <div key={label} className="py-2 flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="text-slate-800">{label}</div><div className="text-[12px] text-slate-500">{formula} · ≈ {amt}{t('/年', '/yr')}</div></div>
            <div className="shrink-0 font-semibold text-slate-700 tabular-nums">−{pts.toFixed(2)}</div>
          </div>
        ))}
        <div className="py-2 flex items-center justify-between font-semibold text-slate-900"><span>{t('净回报（估）', 'Net yield (est.)')}</span><span className="tabular-nums" data-testid="net-total">{p.net.toFixed(2)}%</span></div>
      </div>
      <p className="text-[12px] text-slate-500 mt-1">{t('管理费、空置、门牌税、地税和保险均为估算假设（参考：DBKL / MBSJ 住宅门牌税率 4%；Bangsar South 公寓管理费约 RM0.33–0.35 psf；梳邦公寓约 RM0.30–0.45 psf），实际以管理处账单为准。扣减以「点」计算，与毛回报同一估值基准。',
        'Maintenance, vacancy, assessment, quit rent and insurance are estimated assumptions (refs: DBKL / MBSJ residential assessment rate 4%; Bangsar South condos ≈ RM0.33–0.35 psf; Subang condos ≈ RM0.30–0.45 psf) — check the actual management bill. Deductions are in percentage points on the same value basis as gross.')}</p>
    </section>
  )
}

function mid(arr) {
  if (!arr.length) return null
  const a = [...arr].sort((x, y) => x - y)
  const i = Math.floor(a.length / 2)
  return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2
}
function roomsLabel(rooms, t) {
  if (rooms == null || Number.isNaN(+rooms)) return null
  const n = Math.round(+rooms)
  if (n <= 0) return t('套房', 'Studio')
  return t(`${n}\u00a0房`, n === 1 ? '1 bed' : `${n} beds`)
}
function roomsNear(samples, size, tol = 0.15) {
  if (!size || !samples?.length) return null
  const hits = samples.filter(s => s.size > 0 && s.rooms != null && Math.abs(s.size - size) / size <= tol).map(s => +s.rooms)
  return mid(hits)
}
function impliedTxSize(tx) {
  return tx?.price_median && tx?.psf_median ? tx.price_median / tx.psf_median : null
}
function impliedSizeRange(tx) {
  if (!tx?.price_median || !tx?.psf_median) return null
  const midSz = tx.price_median / tx.psf_median
  const sizes = [midSz]
  if (tx.price_q) sizes.push(tx.price_q[0] / tx.psf_median, tx.price_q[1] / tx.psf_median)
  if (tx.psf_q?.[0] && tx.psf_q?.[1]) sizes.push(tx.price_median / tx.psf_q[1], tx.price_median / tx.psf_q[0])
  const lo = Math.min(...sizes), hi = Math.max(...sizes)
  if (!midSz || (hi - lo) / midSz < 0.1) return null
  return [lo, hi]
}
function unitSuffix(t, { rooms, size, sizeRange }) {
  const bits = []
  const rl = roomsLabel(rooms, t)
  if (rl) bits.push(rl)
  const fmt = n => Math.round(n).toLocaleString('en-MY')
  if (sizeRange && size) bits.push(t(`中位 ${fmt(size)} sqft（约 ${fmt(sizeRange[0])}–${fmt(sizeRange[1])}）`, `median ${fmt(size)} sqft (c. ${fmt(sizeRange[0])}–${fmt(sizeRange[1])})`))
  else if (size) bits.push(`${fmt(size)} sqft`)
  else if (sizeRange) bits.push(t(`约 ${fmt(sizeRange[0])}–${fmt(sizeRange[1])} sqft`, `c. ${fmt(sizeRange[0])}–${fmt(sizeRange[1])} sqft`))
  return bits
}
function unitBuckets(samples, psf) {
  const groups = new Map()
  for (const s of samples) {
    const key = s.rooms == null ? 'u' : String(Math.round(s.rooms))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  const rows = []
  for (const [key, list] of groups) {
    const size = mid(list.map(s => s.size))
    const rent = mid(list.map(s => s.rent))
    const rooms = key === 'u' ? null : +key
    const value = psf && size ? Math.round(psf * size) : null
    const gross = value && rent ? rent * 12 / value * 100 : null
    rows.push({ rooms, size, rent, n: list.length, value, gross })
  }
  rows.sort((a, b) => (a.rooms ?? 99) - (b.rooms ?? 99) || a.size - b.size)
  return rows
}

function sampleRangeLine(samples, t) {
  if (samples.length < 2) return null
  const sizes = samples.map(s => s.size).filter(s => s > 0)
  if (sizes.length < 2) return null
  const lo = Math.min(...sizes), hi = Math.max(...sizes)
  const midSz = mid(sizes)
  if (!midSz || (hi - lo) / midSz < 0.25) return null
  const a = samples.reduce((m, s) => (s.size < m.size ? s : m))
  const b = samples.reduce((m, s) => (s.size > m.size ? s : m))
  const fmt = s => [roomsLabel(s.rooms, t), s.size ? `${Math.round(s.size).toLocaleString('en-MY')} sqft` : null].filter(Boolean).join(' · ')
  return t(`${fmt(a)} 至 ${fmt(b)}`, `${fmt(a)} to ${fmt(b)}`)
}

function yieldSentence(p, t, L) {
  if (p.gross == null) return t('暂无足够的租金样本，还算不出回报。', 'Not enough rent listings to calculate a yield.')
  if (p.rent_estimate) {
    return t('毛回报按同区同类有地住宅的租金估算，仅供参考。', 'Gross yield uses estimated rents from similar landed homes in the area, so treat it as indicative.')
  }
  const area = areaCompletedStats(p.area)
  const areaName = L({ zh: p.area_zh, en: p.area_en })
  if (area?.medianGross != null) {
    const d = p.gross - area.medianGross
    const mid = area.medianGross.toFixed(2)
    if (Math.abs(d) < 0.15) {
      return t(`毛回报与${areaName}已建成楼盘中位（${mid}%）大致持平。`, `Gross yield is in line with the ${areaName} completed-project median of ${mid}%.`)
    }
    if (d > 0) {
      return t(`毛回报比${areaName}已建成楼盘中位（${mid}%）高 ${d.toFixed(2)} 个百分点。`, `Gross yield is ${d.toFixed(2)} pp above the ${areaName} completed-project median of ${mid}%.`)
    }
    return t(`毛回报比${areaName}已建成楼盘中位（${mid}%）低 ${Math.abs(d).toFixed(2)} 个百分点。`, `Gross yield is ${Math.abs(d).toFixed(2)} pp below the ${areaName} completed-project median of ${mid}%.`)
  }
  return t('毛回报按叫租与成交价估算。', 'Gross yield is an estimate from asking rents and transacted prices.')
}

function DataConfidence({ p, nRent }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const nTx = p.tx?.count || 0
  const rentBit = t(`${nRent} 则租盘`, nRent === 1 ? '1 rent ad' : `${nRent} rent ads`)
  const saleBit = t(`${nTx} 宗成交`, nTx === 1 ? '1 sale' : `${nTx} sales`)
  const level = p.confidence
  const head = level === 'high'
    ? t('数据较足', 'Solid data')
    : level === 'medium'
      ? t('数据一般', 'Fair data')
      : t('数据较少', 'Low data')
  const note = p.rent_estimate
    ? t('有地住宅租金为区域同类房源估算，不是本楼盘的租盘，回报率仅供参考。', 'Landed rent is estimated from comparable houses in the area, not ads for this project — treat the yield as indicative only.')
    : level === 'low'
      ? t('样本较少，回报率仅供参考。', 'Sample counts are small, so treat this yield as indicative only.')
      : level === 'medium'
        ? t('样本尚可，但仍是叫租和成交中位，不是交割后的实收租金。', 'A fair sample, still based on asking rents and median transacted prices, not achieved rent.')
        : t('样本较足。回报仍按叫租与成交中位估算，不是交割后的实收租金。', 'A solid sample. Yield is still an estimate from asking rents and median transacted prices, not achieved rent.')
  return (
    <div className="mt-2.5">
      <button
        type="button"
        data-testid="confidence"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5"
        title={note}
      >
        <span>{head} · {rentBit} · {saleBit}</span>
        <span className="text-slate-400 text-[10px] leading-none" aria-hidden="true">{open ? '▴' : 'i'}</span>
      </button>
      {open && (
        <p className="mt-1.5 text-[12px] leading-snug text-slate-500" data-testid="confidence-note">
          {note}
        </p>
      )}
    </div>
  )
}

function KeyFact({ label, value }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-900 leading-snug">{value}</div>
    </div>
  )
}


function useDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export default function RealDetailPage({ p }) {
  const isDesktop = useDesktop()
  const { t, L } = useLang()
  const est = p.rent_estimate
  const samples = (p.ask_rent.samples || []).filter(s => s.size > 0 && s.rent > 0).map(s => ({ ...s, size: +s.size, rent: +s.rent, psf: +(s.rent / s.size).toFixed(2) }))
  const [showAll, setShowAll] = useState(false)
  const allPeers = REAL.filter(x => x.area === p.area).sort((x, y) => (y.gross ?? -1) - (x.gross ?? -1)).map((x, i) => ({ ...x, rank: i + 1 }))
  const peers = showAll ? allPeers : allPeers.filter(x => x.rank <= 8 || x.id === p.id)
  const locTxt = p.on_map === false
    ? t('位置待核实，未在地图显示', 'Location unverified — not shown on the map')
    : t('位置根据楼盘名称匹配', 'Location matched from the project name')
  const nRent = est ? est.n : p.ask_rent.count
  const nRentAdsLabel = t(`${nRent} 则`, nRent === 1 ? '1 ad' : `${nRent} ads`)
  const tenure = p.tenure === 'Freehold' ? t('永久地契', 'Freehold') : t('租赁地契', 'Leasehold')
  const typ = L(TYPE_LABEL[p.type] || {})
  const areaName = L({ zh: p.area_zh, en: p.area_en })
  const metaLine = [areaName, typ, tenure].filter(Boolean).join(' · ')
  const sentence = yieldSentence(p, t, L)
  const sources = displaySources(p.sources)
  const buckets = (!est && samples.length && p.tx.psf_median) ? unitBuckets(samples, p.tx.psf_median) : []
  const txSize = impliedTxSize(p.tx)
  const txSizeRange = impliedSizeRange(p.tx)
  const txRooms = roomsNear(samples, txSize)
  const rentSize = est ? null : (p.ask_rent.size_median || p.size)
  const rentRooms = est ? null : (roomsNear(samples, rentSize) ?? (samples.length ? mid(samples.map(s => s.rooms).filter(v => v != null)) : null))
  const rentRange = (!est && samples.length) ? sampleRangeLine(samples, t) : null
  const rentUnitBits = rentRange ? [] : unitSuffix(t, { rooms: rentRooms, size: rentSize })
  const txUnitBits = unitSuffix(t, { rooms: txRooms, size: txSize, sizeRange: txSizeRange })
  const impliedFromMedians = (!est && p.rent && rentSize && p.tx.psf_median)
    ? p.rent * 12 / (p.tx.psf_median * rentSize) * 100 : null
  const yieldMismatch = impliedFromMedians != null && p.gross != null && Math.abs(impliedFromMedians - p.gross) >= 0.3
  const mortPrice = p.net_costs?.ref_value || p.price
  const mortRent = p.net_costs?.ref_rent || p.rent
  const mortMaint = p.net_costs ? (p.net_costs.maint_psf || 0) * (p.net_costs.ref_size || 0) : (p.maint || 0)
  const valueDiffers = mortPrice && p.tx.price_median && Math.abs(mortPrice - p.tx.price_median) / p.tx.price_median > 0.08
  const gw = gatewayNote(p.id, t)

  const txCount = p.tx?.count || 0
  const facts = [
    p.rent ? { label: t('中位租金', 'Median rent'), value: `${fmtRM(p.rent)}${t('/月', '/mo')}` } : null,
    p.tx.price_median ? {
      label: txCount
        ? t(`成交中位价 · ${txCount} 宗`, txCount === 1 ? 'Median sale · 1 sale' : `Median sale · ${txCount} sales`)
        : t('成交中位价', 'Median sale'),
      value: fmtRM(p.tx.price_median),
    } : null,
    p.tx.psf_median ? { label: t('成交 psf', 'Transacted psf'), value: `RM ${p.tx.psf_median.toLocaleString('en-MY')}` } : null,
    p.ask_sale?.psf_median ? { label: t('叫价 psf', 'Asking psf'), value: `RM ${p.ask_sale.psf_median.toLocaleString('en-MY')}` } : null,
    valueDiffers ? { label: t('月供所用估值', 'Value used for loan'), value: fmtRM(mortPrice) } : null,
  ].filter(Boolean)

  const goMap = (e) => {
    if (e.key === 'Enter') window.location.hash = '#/map'
  }

  return (
    <div className="min-h-full md:h-full md:min-h-0 md:overflow-hidden bg-[#f6f7f8] md:bg-white flex flex-col">
      <header className="hidden md:flex h-[72px] shrink-0 items-center gap-4 px-6 border-b border-slate-200 bg-white z-[1100] relative">
        <Logo />
        <NavTabs active="map" />
        <div className="flex-1 max-w-[560px] mx-auto">
          <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-[0_3px_12px_rgba(15,23,42,.12)] pl-4 pr-1.5 py-1.5 w-full">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0f172a" strokeWidth="2"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
            <input onKeyDown={goMap} readOnly onFocus={() => { window.location.hash = '#/map' }} placeholder={t('搜索楼盘或地区', 'Search project or area')} className="flex-1 min-w-0 bg-transparent text-sm outline-none py-1 cursor-pointer" data-testid="search" aria-label={t('搜索楼盘或地区', 'Search project or area')} />
          </div>
        </div>
        <div className="text-[12px] text-slate-600 text-right leading-tight whitespace-nowrap shrink-0">{t('更新', 'Updated')} {UPDATED}</div>
        <LangToggle />
      </header>

      <header className="md:hidden sticky top-0 z-50 h-12 bg-white/90 backdrop-blur border-b border-slate-200/80 flex items-center gap-2 px-3 sm:px-5">
        <a href="#/map" className="shrink-0 rounded-full border border-slate-200 bg-white px-3 h-8 inline-flex items-center text-[13px] font-medium text-slate-700" data-testid="back">← {t('返回地图', 'Back to map')}</a>
        <div className="min-w-0 flex-1 font-semibold text-[13px] text-slate-800 truncate" data-testid="sticky-name">{p.name}</div>
        <LangToggle className="ml-auto shrink-0" />
      </header>

      <div className="flex-1 flex min-h-0 relative md:overflow-hidden">
      <main className="w-full md:w-[55%] md:overflow-y-auto max-w-2xl mx-auto md:max-w-none md:mx-0 px-3 sm:px-5 py-3 sm:py-5 md:px-6 md:py-5 space-y-3">
        <a href="#/map" className="hidden md:inline-flex shrink-0 rounded-full border border-slate-200 bg-white px-3 h-8 items-center text-[13px] font-medium text-slate-700" data-testid="back-desktop">← {t('返回地图', 'Back to map')}</a>
        <section className="rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <ProjectPhoto p={p} hero className={p.photo ? 'h-52 sm:h-72 w-full' : 'h-28 sm:h-32 w-full'} />
          <div className="p-4 sm:p-5">
            <h1 className="text-[22px] sm:text-[26px] font-semibold text-slate-900 leading-tight tracking-tight" data-testid="prop-name">{p.name}</h1>
            <p className="mt-1 text-[13px] text-slate-500" data-testid="prop-meta">{metaLine}</p>
            {gw && <p className="mt-1 text-[12px] text-slate-500" data-testid="related-precinct">{gw}</p>}

            {p.excluded && (
              <div className="mt-3 rounded-xl bg-slate-100 text-slate-700 text-[12px] p-3" data-testid="excluded">
                {t('已排除，不计算回报率：工业园地段，PropertyGuru/Mudah 上没有住宅出租市场。', 'Excluded from yield: industrial plot with no residential rental market on PropertyGuru/Mudah.')}
              </div>
            )}

            {!p.excluded && (
              <div className="mt-4" data-testid="gross-kpi">
                {p.gross == null ? (
                  <div>
                    <div className="text-[11px] text-slate-500">{t('毛回报', 'Gross yield')}</div>
                    <div className="text-[28px] font-semibold text-slate-700 tabular-nums leading-none mt-0.5">{t('暂无', 'N/A')}</div>
                    <p className="mt-2 text-[13px] text-slate-600 leading-snug" data-testid="no-rent-note">{t('暂无在租样本，无法计算回报。', 'No rent listings — yield cannot be calculated.')}</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] text-slate-500">{t('毛回报', 'Gross yield')}</div>
                    <div className="flex items-end gap-3 mt-0.5">
                      <div className="text-[32px] font-semibold tabular-nums leading-none tracking-tight text-slate-900">{pct(p.gross)}</div>
                      {p.net != null && (
                        <div className="pb-0.5 text-[13px] text-slate-500 tabular-nums">
                          {t('净回报', 'Net')} <span className="font-semibold text-slate-800">{pct(p.net)}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] text-slate-600 leading-snug">{sentence}</p>
                  </div>
                )}
                <DataConfidence p={p} nRent={nRent} />
              </div>
            )}

            {facts.length > 0 && !p.excluded && (
              <div className={`mt-4 grid gap-3 ${facts.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : facts.length === 3 ? 'grid-cols-3' : facts.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`} data-testid="key-facts">
                {facts.map(f => <KeyFact key={f.label} label={f.label} value={f.value} />)}
              </div>
            )}
          </div>
        </section>

        {!p.excluded && mortPrice > 0 && mortRent > 0 && (
          <section className="rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]" data-testid="mortgage-vs-rent">
            <h2 className="text-[15px] font-semibold text-slate-900">{t('月供 vs 租金', 'Instalment vs rent')}</h2>
            {valueDiffers && (
              <p className="mt-0.5 text-[12px] text-slate-500 leading-snug" data-testid="mortgage-basis">
                {t('按上方「月供所用估值」，不是成交中位价', 'Uses the “Value used for loan” above, not the median sale')}
              </p>
            )}
            <LoanPctControl variant="full" className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200/80 px-2 py-1" />
            <LoanRateYears />
            <LtvCompare price={mortPrice} rentMo={mortRent} maintMo={mortMaint} hideTitle />
          </section>
        )}

        {buckets.length > 0 && (
          <section className="rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]" data-testid="unit-compare">
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold text-slate-900">{t('按户型', 'By unit type')}</h2>
            </div>
            <div className="min-[480px]:hidden divide-y divide-slate-100" data-testid="unit-compare-cards">
              {buckets.map((row, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-slate-900">{[roomsLabel(row.rooms, t), row.size ? `${Math.round(row.size).toLocaleString('en-MY')} sqft` : null].filter(Boolean).join(' · ') || '—'}</div>
                    <div className="shrink-0 font-semibold tabular-nums text-slate-900">{row.gross == null ? '—' : `${row.gross.toFixed(2)}%`}</div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] tabular-nums text-slate-600">
                    <span>{fmtRM(row.rent)}{t('/月', '/mo')}</span>
                    {row.value ? <span>{fmtRMk(row.value)}</span> : null}
                    <span>{t(`${row.n} 则`, row.n === 1 ? '1 ad' : `${row.n} ads`)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden min-[480px]:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] text-slate-500 text-left border-t border-slate-100">
                    <th className="py-2 pl-4 font-medium">{t('户型', 'Unit')}</th>
                    <th className="py-2 font-medium">{t('样本', 'Ads')}</th>
                    <th className="py-2 font-medium">{t('中位租金', 'Median rent')}</th>
                    <th className="py-2 font-medium">{t('同面积估值', 'Size-matched value')}</th>
                    <th className="py-2 pr-4 font-medium text-right">{t('毛回报', 'Gross')}</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-2 pl-4 text-slate-800 font-medium">{[roomsLabel(row.rooms, t), row.size ? `${Math.round(row.size).toLocaleString('en-MY')} sqft` : null].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="py-2 text-slate-600 tabular-nums">{row.n}</td>
                      <td className="py-2 text-slate-800 tabular-nums">{fmtRM(row.rent)}{t('/月', '/mo')}</td>
                      <td className="py-2 text-slate-800 tabular-nums">{row.value ? fmtRMk(row.value) : '—'}</td>
                      <td className="py-2 pr-4 text-right font-semibold tabular-nums text-slate-900">{row.gross == null ? '—' : `${row.gross.toFixed(2)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-4 sm:p-5 ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <h2 className="text-[15px] font-semibold text-slate-900">{t(`${p.area_zh}其他楼盘`, `Other projects in ${p.area_en}`)}</h2>
          <ol className="sm:hidden mt-2 divide-y divide-slate-100" data-testid="peer-cards">
            {peers.map(x => {
              const me = x.id === p.id
              return (
                <li key={x.id} className="py-2.5 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 tabular-nums mr-1.5">{x.rank}</span>
                    {me ? <span className="font-medium text-slate-900">{x.name}</span> : <a className="text-slate-800 hover:text-slate-950" href={`#/property/${x.id}`}>{x.name}</a>}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{pct(x.gross)}</span>
                </li>
              )
            })}
          </ol>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full mt-1 text-[13px]" data-testid="peer-table">
              <thead>
                <tr className="text-[11px] text-slate-500 text-left">
                  <th className="py-2 pl-0 font-medium">#</th>
                  <th className="font-medium">{t('楼盘', 'Project')}</th>
                  <th className="text-right font-medium px-2 whitespace-nowrap">{t('成交 psf', 'Transacted psf')}</th>
                  <th className="text-right font-medium px-2 whitespace-nowrap">{t('租金', 'Rent')}</th>
                  <th className="text-right font-medium pr-0 pl-2 whitespace-nowrap">{t('毛回报', 'Gross')}</th>
                </tr>
              </thead>
              <tbody>
                {peers.map(x => {
                  const me = x.id === p.id
                  return (
                    <tr key={x.id} className={`border-t border-slate-100 ${me ? 'bg-slate-50' : ''}`}>
                      <td className="py-2 text-slate-400 tabular-nums">{x.rank}</td>
                      <td>{me ? <span className="font-medium text-slate-900">{x.name}</span> : <a className="text-slate-800 hover:text-slate-950" href={`#/property/${x.id}`}>{x.name}</a>}</td>
                      <td className="text-right px-2 whitespace-nowrap tabular-nums">{x.tx.psf_median ? `RM${x.tx.psf_median.toLocaleString('en-MY')}` : '—'}</td>
                      <td className="text-right px-2 whitespace-nowrap tabular-nums">{x.rent ? fmtRM(x.rent) : '—'}</td>
                      <td className="text-right font-semibold tabular-nums">{pct(x.gross)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {allPeers.length > peers.length || showAll ? (
            <button type="button" className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-[13px] font-medium text-slate-700" onClick={() => setShowAll(v => !v)} data-testid="peers-toggle">
              {showAll ? t('收起', 'Show less') : t(`查看全部 ${allPeers.length} 个楼盘`, `Show all ${allPeers.length} projects`)}
            </button>
          ) : null}
        </section>

        <details className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] group" data-testid="how-calculated">
          <summary className="cursor-pointer list-none px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-[15px] font-semibold text-slate-900">
            <span>{t('怎么计算 / 数据', 'How we calculate / Data')}</span>
            <span className="text-slate-400 text-[13px] font-medium group-open:hidden">{t('展开', 'Show')}</span>
            <span className="text-slate-400 text-[13px] font-medium hidden group-open:inline">{t('收起', 'Hide')}</span>
          </summary>
          <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 space-y-4">
            <p className="pt-3 text-[12px] text-slate-500" data-testid="scrape-date">
              {t(`数据更新于 ${UPDATED} · ${locTxt}`, `Updated ${UPDATED} · ${locTxt}`)}
            </p>
            {yieldMismatch && (
              <p className="text-[12px] text-slate-600" data-testid="yield-method-note">
                {t(`毛回报是各则整套出租广告「月租 × 12 ÷（成交中位 psf × 该广告面积）」的中位数，不是中位租金 ÷ 中位面积（按中位数相除约为 ${impliedFromMedians.toFixed(2)}%）。`,
                  `Gross yield is the median of each whole-unit ad’s rent × 12 ÷ (transacted psf × that ad’s size), not median rent ÷ median size (that quotient is about ${impliedFromMedians.toFixed(2)}%).`)}
              </p>
            )}
            {(rentUnitBits.length || rentRange || txUnitBits.length || p.tx.psf_q) && (
              <div className="text-[12px] text-slate-600 space-y-1">
                {rentRange || rentUnitBits.length ? <div>{t('租金样本面积', 'Rent sample size')}: {rentRange || rentUnitBits.join(' · ')}</div> : null}
                {txUnitBits.length ? <div>{t('成交推算面积', 'Inferred sale size')}: {txUnitBits.join(' · ')}</div> : null}
                {p.tx.psf_q && p.tx.psf_q[0] !== p.tx.psf_q[1] ? <div>{t(`成交 psf 四分位 RM${p.tx.psf_q[0]}–${p.tx.psf_q[1]}`, `Transacted psf IQR RM${p.tx.psf_q[0]}–${p.tx.psf_q[1]}`)}</div> : null}
                {p.tx.count ? <div>{t(`成交 ${p.tx.count} 宗`, p.tx.count === 1 ? '1 registered sale' : `${p.tx.count} registered sales`)} · Brickz.my{p.brickz_town ? ` · ${p.brickz_town}` : ''}</div> : null}
              </div>
            )}

            {p.net_costs && p.gross != null && <YieldWorking p={p} />}

            <section data-testid="rent-samples">
              <h3 className="font-semibold text-slate-900">{t(`租金样本（${nRentAdsLabel}）`, `Rent samples (${nRentAdsLabel})`)}</h3>
              {samples.length > 2 ? (
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 20, left: 12, bottom: 32 }}>
                      <CartesianGrid stroke="#eef2f7" />
                      <XAxis type="number" dataKey="size" name={t('面积', 'Size')} unit="" tick={{ fontSize: 12, fill: '#475569' }} domain={['auto', 'auto']}
                        label={{ value: t('面积（sqft）', 'Size (sqft)'), position: 'insideBottom', offset: -16, fontSize: 12, fill: '#475569' }} />
                      <YAxis type="number" dataKey="rent" name={t('租金', 'Rent')} tick={{ fontSize: 12, fill: '#475569' }} width={56} tickFormatter={v => `RM${(v / 1000).toFixed(1)}k`} domain={['auto', 'auto']} />
                      <ZAxis range={[60, 60]} />
                      <Tooltip formatter={(v, n) => (n === t('租金', 'Rent') ? fmtRM(v) : `${v} sqft`)} />
                      <Scatter name="PropertyGuru" data={samples.filter(x => x.src === 'PropertyGuru')} fill="#2563eb" isAnimationActive={false} />
                      <Scatter name="Mudah" data={samples.filter(x => x.src !== 'PropertyGuru')} fill="#f59e0b" isAnimationActive={false} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : samples.length ? (
                <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-800 space-y-1" data-testid="rent-sample-text">
                  {samples.map((s, i) => (
                    <div key={i} className="text-slate-700">{fmtRM(s.rent)}{t('/月', '/mo')} · {Number(s.size).toLocaleString('en-MY')} sqft{s.src ? ` · ${s.src}` : ''}</div>
                  ))}
                </div>
              ) : est ? (
                <div className="mt-2 text-sm text-slate-600">
                  {t(`同区同类有地住宅租金（${est.basis}）：`, `Comparable landed rents (${est.basis}): `)}
                  <div className="mt-2 flex flex-wrap gap-1.5">{est.rents.map((r, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{fmtRM(r)}</span>)}</div>
                </div>
              ) : <div className="text-sm text-slate-600 mt-2">{p.excluded ? t('已排除，没有住宅出租市场。', 'Excluded — no residential rental market.') : t('此楼盘暂未在 PropertyGuru / Mudah 找到可匹配的出租广告。', 'No matching rent ads found on PropertyGuru / Mudah for this project.')}</div>}
              {samples.length > 2 ? (
                <p className="text-[12px] text-slate-500 mt-2">{t(`每个点 = 一则整套出租广告（蓝 PropertyGuru ${p.ask_rent.by_source?.PropertyGuru ?? 0} 条，橙 Mudah ${p.ask_rent.by_source?.Mudah ?? 0} 条）。回报率 = 每则租金 ×12 ÷（成交中位 psf × 该单位面积），再取中位数。`, `Each dot is one whole-unit ad (blue PropertyGuru ${p.ask_rent.by_source?.PropertyGuru ?? 0}, orange Mudah ${p.ask_rent.by_source?.Mudah ?? 0}); yield = rent ×12 ÷ (transacted psf × that unit's size), median across ads.`)}</p>
              ) : est ? (
                <p className="text-[12px] text-slate-500 mt-2">{t('有地住宅：取 Mudah 上同区同类型（排屋/半独立/独立）出租广告的中位数，回报率 = 中位租金 ×12 ÷ Brickz 成交中位价。', 'Landed: median of Mudah rent ads for the same house type in the area; yield = median rent ×12 ÷ Brickz median sale price.')}</p>
              ) : null}
            </section>

            <section data-testid="sources">
              <h3 className="font-semibold text-slate-900">{t('数据来源', 'Sources')}</h3>
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {sources.map(s => (
                  <li key={s.name}><a className="text-slate-700 underline underline-offset-2 hover:text-slate-950 break-all" href={s.url} target="_blank" rel="noreferrer noopener">{s.name}</a></li>
                ))}
              </ul>
              <div className="text-[12px] text-slate-500 mt-3 space-y-0.5">
                <div>{t('成交宗数', 'Transactions')}: {p.tx.count}</div>
                <div>{t(`出租 ${nRent} · 出售广告 ${p.ask_sale.count}`, `Rent ${nRent} · Sale ads ${p.ask_sale.count}`)}</div>
              </div>
              <p className="text-[12px] text-slate-500 mt-3">{t('叫租不等于实际成交租金；成交价来自已登记交易的中位数。试抓数据，不构成投资建议。', 'Asking rents ≠ achieved rents; prices are medians of registered transactions. Pilot data, not investment advice.')}</p>
            </section>
          </div>
        </details>
      <Footer />
      </main>
        {isDesktop && p.lat != null && p.lng != null && (
          <div className="hidden md:block flex-1 relative p-4 pl-0" data-testid="detail-sidemap">
            <div className="absolute inset-4 left-0 rounded-2xl overflow-hidden">
              <YieldMapPane
                focus={{ lat: p.lat, lng: p.lng, zoom: 16 }}
                highlightedId={p.id}
                onPinClick={id => { if (id !== p.id) window.location.hash = `#/property/${id}` }}
                onLaunchClick={id => { window.location.hash = `#/launch/${id}` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
