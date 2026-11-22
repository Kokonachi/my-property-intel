import { useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { REAL, REAL_META } from '../data/real.js'
import { yieldBand, TYPE_LABEL, fmtRM, fmtRMk } from '../data/properties.js'
import { Logo, Footer } from '../components/ui.jsx'
import ProjectPhoto from '../components/ProjectPhoto.jsx'
import Calculator from '../components/Calculator.jsx'
import { useLang, LangToggle } from '../lib/i18n.jsx'

const pct = v => (v == null ? '—' : `${v.toFixed(2)}%`)
const CONF = { high: ['高', 'High', 'text-emerald-700 bg-emerald-50'], medium: ['中', 'Medium', 'text-amber-800 bg-amber-50'], low: ['低', 'Low', 'text-rose-700 bg-rose-50'] }
const yColor = v => (v == null ? '#64748b' : yieldBand(v).color)
const UPDATED = (REAL_META.generated_at || '2026-11-15').slice(0, 10)

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


function Stat({ label, v, line2, sub, className = '' }) {
  return (
    <div className={`rounded-2xl p-3 bg-slate-50 ${className}`}>
      <div className="text-[12px] text-slate-600">{label}</div>
      <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 leading-tight">{v}</div>
      {line2 && <div className="text-[12px] font-medium text-slate-700 mt-0.5 leading-snug">{line2}</div>}
      {sub && <div className="text-[12px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

const rm = v => 'RM ' + Math.round(v).toLocaleString('en-MY')

function displaySources(sources, t) {
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
    <section className="card p-5 sm:p-6" data-testid="yield-working">
      <h3 className="font-bold text-slate-900">{t('回报率怎么算', 'How the yield is calculated')}</h3>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-700 space-y-1">
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
            <div className="min-w-0"><div className="text-slate-800">{label}</div><div className="text-[12px] text-slate-600">{formula} · ≈ {amt}{t('/年', '/yr')}</div></div>
            <div className="shrink-0 font-semibold text-rose-600 tabular-nums">−{pts.toFixed(2)}</div>
          </div>
        ))}
        <div className="py-2 flex items-center justify-between font-bold text-slate-900"><span>{t('净回报（估）', 'Net yield (est.)')}</span><span className="tabular-nums" data-testid="net-total">{p.net.toFixed(2)}%</span></div>
      </div>
      <p className="text-[12px] text-slate-600 mt-1">{t('管理费、空置、门牌税、地税和保险均为估算假设（参考：DBKL / MBSJ 住宅门牌税率 4%；Bangsar South 公寓管理费约 RM0.33–0.35 psf；梳邦公寓约 RM0.30–0.45 psf），实际以管理处账单为准。扣减以「点」计算，与毛回报同一估值基准。',
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

export default function RealDetailPage({ p }) {
  const { t, L, lang } = useLang()
  const b = { color: yColor(p.gross) }
  const [cz, ce, cc] = CONF[p.confidence]
  const est = p.rent_estimate
  const samples = (p.ask_rent.samples || []).filter(s => s.size > 0 && s.rent > 0).map(s => ({ ...s, size: +s.size, rent: +s.rent, psf: +(s.rent / s.size).toFixed(2) }))
  const [showAll, setShowAll] = useState(false)
  const allPeers = REAL.filter(x => x.area === p.area).sort((x, y) => (y.gross ?? -1) - (x.gross ?? -1)).map((x, i) => ({ ...x, rank: i + 1 }))
  const peers = showAll ? allPeers : allPeers.filter(x => x.rank <= 8 || x.id === p.id)
  const calcP = { ...p, price: p.price, rent: p.rent || 0, maint: p.maint, otherCosts: p.otherCosts }
  const state = p.area === 'sj' ? 'Selangor' : 'Kuala Lumpur'
  const locTxt = p.on_map === false
    ? t('位置待核实，未在地图显示', 'Location unverified — not shown on the map')
    : t('位置根据楼盘名称匹配', 'Location matched from the project name')
  const rentLabel = p.rent_method === 'area_comps' ? t('区域估算租金', 'Area-estimated rent') : t('叫租中位', 'Median asking rent')
  const nRent = est ? est.n : p.ask_rent.count
  const txSize = impliedTxSize(p.tx)
  const txSizeRange = impliedSizeRange(p.tx)
  const txRooms = roomsNear(samples, txSize)
  const rentSize = est ? null : (p.ask_rent.size_median || p.size)
  const rentRooms = est ? null : (roomsNear(samples, rentSize) ?? (samples.length ? mid(samples.map(s => s.rooms).filter(v => v != null)) : null))
  const rentRange = (!est && samples.length) ? sampleRangeLine(samples, t) : null
  const rentUnitBits = rentRange ? [] : unitSuffix(t, { rooms: rentRooms, size: rentSize })
  const txUnitBits = unitSuffix(t, { rooms: txRooms, size: txSize, sizeRange: txSizeRange })
  const rentValueTxt = p.rent ? `${fmtRM(p.rent)}${t('/月', '/mo')}` : '—'
  const rentLine2 = rentRange || (rentUnitBits.length ? rentUnitBits.join(' · ') : null)
  const txPriceTxt = p.tx.price_median ? fmtRMk(p.tx.price_median) : '—'
  const txLine2 = txUnitBits.length ? txUnitBits.join(' · ') : null
  const impliedFromMedians = (!est && p.rent && rentSize && p.tx.psf_median)
    ? p.rent * 12 / (p.tx.psf_median * rentSize) * 100 : null
  const yieldMismatch = impliedFromMedians != null && p.gross != null && Math.abs(impliedFromMedians - p.gross) >= 0.3
  const matchedVal = p.net_costs?.ref_value
  const matchedSize = p.net_costs?.ref_size
  const rentSub = p.excluded ? t('不适用（已排除）', 'Not applicable (excluded)')
    : est ? t(`${est.n} 则同类房源（${est.basis}）`, `${est.n} comparable ads (${est.basis})`)
    : rentSize && p.ask_rent.rent_psf_median ? t(`RM${p.ask_rent.rent_psf_median}/sqft · ${nRent} 则`, `RM${p.ask_rent.rent_psf_median}/sqft · ${nRent === 1 ? '1 ad' : `${nRent} ads`}`)
    : t('租金样本不足', 'Not enough rent listings')
  const txPriceSubParts = []
  if (p.tx.count) txPriceSubParts.push(t(`${p.tx.count} 宗成交`, p.tx.count === 1 ? '1 sale' : `${p.tx.count} sales`))
  if (txSize && !est) txPriceSubParts.push(t('面积由总价÷中位 psf 推算', 'Size inferred from price ÷ median psf'))
  if (matchedVal && matchedSize && txSize && Math.abs(matchedSize - txSize) / txSize > 0.1) {
    txPriceSubParts.push(t(`回报按 ${Math.round(matchedSize).toLocaleString('en-MY')} sqft 估值 ${fmtRMk(matchedVal)}`, `Yield uses ${Math.round(matchedSize).toLocaleString('en-MY')} sqft valued at ${fmtRMk(matchedVal)}`))
  } else if (!est && !txSize) {
    txPriceSubParts.push(t('仅供参考，回报率按同面积估值计算', 'For reference — yields use size-matched values'))
  }
  if (est && p.tx.period) txPriceSubParts.push(`${p.tx.period[0]} → ${p.tx.period[1]}`)
  const txPriceSub = txPriceSubParts.join(' · ')
  const buckets = (!est && samples.length && p.tx.psf_median) ? unitBuckets(samples, p.tx.psf_median) : []
  const sources = displaySources(p.sources, t)
  const lowWarn = p.confidence === 'low' && !p.excluded && p.gross != null
  const warnText = est
    ? t('有地住宅租金为区域同类房源估算，不是本楼盘的租盘，回报率仅供参考。', 'Landed rent is estimated from comparable houses in the area, not ads for this project — treat the yield as indicative only.')
    : t('样本较少，回报率仅供参考。', 'Low sample count — treat this yield as indicative only.')
  const nRentAdsLabel = t(`${nRent} 则`, nRent === 1 ? '1 ad' : `${nRent} ads`)

  return (
    <div className="min-h-full bg-[#f3f6fb]">
      <header className="sticky top-0 z-50 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-2 px-3 sm:px-6">
        <a href="#/" className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-blue-400 hover:text-blue-700" data-testid="back">← {t('返回地图', 'Back to map')}</a>
        <div className="min-w-0 flex-1 font-semibold text-[13px] sm:text-sm text-slate-800 truncate md:hidden" data-testid="sticky-name">{p.name}</div>
        <div className="hidden md:block md:ml-2 min-w-0"><Logo /></div>
        <LangToggle className="ml-auto shrink-0" />
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-5">
        <section className="card overflow-hidden">
          {p.photo ? <ProjectPhoto p={p} className="h-48 sm:h-72 w-full" /> : <ProjectPhoto p={p} className="h-11 w-full rounded-none" />}
          <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>📍 {L({ zh: p.area_zh, en: p.area_en })}, {state}</span>
            <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[12px] font-medium">{L(TYPE_LABEL[p.type])}</span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[12px]">{p.tenure === 'Freehold' ? t('永久地契', 'Freehold') : t('租赁地契', 'Leasehold')}</span>
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${cc}`} data-testid="confidence">{t(`可信度 ${cz}`, `Confidence: ${ce}`)}</span>
          </div>
          {lowWarn && <div className="mt-2 rounded-xl bg-rose-50 text-rose-800 text-[12px] p-2.5" data-testid="low-sample-warning">⚠ {warnText}</div>}
          {p.gross == null && !p.excluded && (
            <div className="mt-2 rounded-xl bg-slate-100 text-slate-800 text-[12px] p-2.5" data-testid="no-rent-note">{t('暂无在租样本，无法计算回报', 'No rent listings — yield cannot be calculated')}</div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1" data-testid="prop-name">{p.name}</h1>
          {gatewayNote(p.id, t) && <div className="text-[12px] text-slate-600 mt-1" data-testid="related-precinct">{gatewayNote(p.id, t)}</div>}
          <div className="text-[12px] text-slate-600 mt-1" data-testid="scrape-date">{t(`数据更新于 ${UPDATED} · ${locTxt}`, `Updated ${UPDATED} · ${locTxt}`)}</div>

          {p.excluded && <div className="mt-3 rounded-xl bg-slate-100 text-slate-700 text-[12px] p-3" data-testid="excluded">⛔ {t('已排除，不计算回报率：', 'Excluded from yield: ')}{lang === 'zh' ? '工业园地段，PropertyGuru/Mudah 上没有住宅出租市场，因此不显示回报率。' : p.excluded}</div>}

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {p.gross == null ? (
              <div className="rounded-2xl p-3 bg-slate-50" data-testid="gross-kpi">
                <div className="text-[12px] text-slate-600">{t('毛回报', 'Gross yield')}</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-700">{t('暂无', 'N/A')}</div>
                <div className="text-[12px] text-slate-600">{t('暂无在租样本，无法计算回报', 'No rent listings — yield cannot be calculated')}</div>
              </div>
            ) : (
              <div className="rounded-2xl p-3 text-white" style={{ background: b.color }} data-testid="gross-kpi">
                <div className="text-[12px] opacity-90">{t('毛回报', 'Gross yield')}</div>
                <div className="text-2xl sm:text-3xl font-extrabold">{pct(p.gross)}</div>
                <div className="text-[12px] opacity-90">{est ? t('区域租金 ×12 ÷ 成交中位价', 'Area rent ×12 ÷ median sale price') : t('叫租 ÷ 同面积成交价', 'Asking rent ÷ transacted value (same size)')}</div>
              </div>
            )}
            <Stat label={t('净回报（估）', 'Net yield (est.)')} v={p.net == null ? t('暂无', 'N/A') : pct(p.net)} sub={p.net_costs && p.gross != null ? t(`毛回报 − 空置、门牌税、管理费、地税保险 = −${(p.gross - p.net).toFixed(2)} 点`, `Gross − vacancy, assessment, maintenance, quit rent & insurance = −${(p.gross - p.net).toFixed(2)} pts`) : ''} />
            <Stat label={rentLabel} v={rentValueTxt} line2={rentLine2} sub={rentSub} />
            <Stat label={t('成交中位总价', 'Median transacted price')} v={txPriceTxt} line2={txLine2} sub={txPriceSub} />
          </div>
          {yieldMismatch && (
            <p className="mt-2 text-[12px] text-slate-600" data-testid="yield-method-note">
              {t(`毛回报是各则整套出租广告「月租 × 12 ÷（成交中位 psf × 该广告面积）」的中位数，不是中位租金 ÷ 中位面积（按中位数相除约为 ${impliedFromMedians.toFixed(2)}%）。`,
                `Gross yield is the median of each whole-unit ad’s rent × 12 ÷ (transacted psf × that ad’s size), not median rent ÷ median size (that quotient is about ${impliedFromMedians.toFixed(2)}%).`)}
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Stat label={t('成交中位 psf', 'Transacted psf')} v={p.tx.psf_median ? `RM ${p.tx.psf_median.toLocaleString()}` : '—'} sub={p.tx.psf_q ? t(`四分位 RM${p.tx.psf_q[0]}–${p.tx.psf_q[1]}`, `IQR RM${p.tx.psf_q[0]}–${p.tx.psf_q[1]}`) : ''} />
            <Stat label={t('成交宗数', 'Transactions')} v={`${p.tx.count}`} sub={`Brickz.my · ${p.brickz_town}`} />
            <Stat label={t('叫价中位 psf', 'Asking sale psf')} v={p.ask_sale.psf_median ? `RM ${p.ask_sale.psf_median.toLocaleString()}` : '—'} sub={t(`${p.ask_sale.count} 条出售广告`, p.ask_sale.count === 1 ? '1 sale ad' : `${p.ask_sale.count} sale ads`)} />
            <Stat label={t('样本', 'Samples')} v={t(`出租 ${nRent} · 出售 ${p.ask_sale.count}`, `Rent ${nRent} · Sale ${p.ask_sale.count}`)} sub={t('出租广告 · 出售广告', 'Rent listings · sale listings')} />
          </div>
          {buckets.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-100 overflow-hidden" data-testid="unit-compare">
              <div className="px-3 pt-3 pb-2">
                <h3 className="font-bold text-slate-900 text-sm">{t('按户型对比（租金 vs 同面积成交估值）', 'By unit type (rent vs size-matched transacted value)')}</h3>
                <p className="text-[12px] text-slate-600 mt-0.5">{t('成交估值为中位 psf × 该户型面积，不是该户型已登记的成交总价。毛回报按该行租金与估值计算，供对照。', 'Value is median transacted psf × that unit’s size, not a recorded sale of that exact layout. Gross yield on each row is rent ÷ that value, for comparison.')}</p>
              </div>
              <div className="min-[480px]:hidden divide-y divide-slate-100" data-testid="unit-compare-cards">
                {buckets.map((row, i) => (
                  <div key={i} className="px-3 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold text-slate-900">{[roomsLabel(row.rooms, t), row.size ? `${Math.round(row.size).toLocaleString('en-MY')} sqft` : null].filter(Boolean).join(' · ') || '—'}</div>
                      <div className="shrink-0 font-bold tabular-nums" style={{ color: yColor(row.gross) }}>{row.gross == null ? '—' : `${row.gross.toFixed(2)}%`}</div>
                    </div>
                    <div className="mt-1.5 space-y-1 text-[13px]">
                      <div className="flex justify-between gap-3"><span className="text-slate-600">{t('中位租金', 'Median rent')}</span><span className="text-slate-800">{fmtRM(row.rent)}{t('/月', '/mo')}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-600">{t('同面积估值', 'Size-matched value')}</span><span className="text-slate-800">{row.value ? fmtRMk(row.value) : '—'}</span></div>
                    </div>
                    <div className="text-[12px] text-slate-600 mt-1">{t(`样本 ${row.n} 则`, row.n === 1 ? '1 ad' : `${row.n} ads`)}</div>
                  </div>
                ))}
              </div>
              <div className="hidden min-[480px]:block overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[12px] text-slate-600 text-left border-t border-slate-100">
                      <th className="py-2 pl-3 font-medium">{t('户型', 'Unit')}</th>
                      <th className="py-2 font-medium">{t('样本', 'Ads')}</th>
                      <th className="py-2 font-medium">{t('中位租金', 'Median rent')}</th>
                      <th className="py-2 font-medium">{t('同面积估值', 'Size-matched value')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{t('毛回报', 'Gross')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-2 pl-3 text-slate-800 font-medium">{[roomsLabel(row.rooms, t), row.size ? `${Math.round(row.size).toLocaleString('en-MY')} sqft` : null].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="py-2 text-slate-700">{row.n}</td>
                        <td className="py-2 text-slate-800">{fmtRM(row.rent)}{t('/月', '/mo')}</td>
                        <td className="py-2 text-slate-800">{row.value ? fmtRMk(row.value) : '—'}</td>
                        <td className="py-2 pr-3 text-right font-semibold" style={{ color: yColor(row.gross) }}>{row.gross == null ? '—' : `${row.gross.toFixed(2)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </section>

        {p.net_costs && <YieldWorking p={p} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section className="card p-5 sm:p-6 lg:col-span-2" data-testid="rent-samples">
            <h3 className="font-bold text-slate-900">{t(`租金样本（${nRentAdsLabel}）`, `Rent samples (${nRentAdsLabel})`)}</h3>
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
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-800 space-y-1" data-testid="rent-sample-text">
                {samples.length === 1 ? (
                  <div>{t(`仅 1 条在租样本：${fmtRM(samples[0].rent)}/月，${Number(samples[0].size).toLocaleString('en-MY')} sqft`,
                    `Only 1 rent listing: ${fmtRM(samples[0].rent)}/mo, ${Number(samples[0].size).toLocaleString('en-MY')} sqft`)}</div>
                ) : (
                  <>
                    <div>{t(`仅 ${samples.length} 条在租样本：`, `Only ${samples.length} rent listings:`)}</div>
                    {samples.map((s, i) => (
                      <div key={i} className="text-slate-700">{fmtRM(s.rent)}{t('/月', '/mo')} · {Number(s.size).toLocaleString('en-MY')} sqft{s.src ? ` · ${s.src}` : ''}</div>
                    ))}
                  </>
                )}
              </div>
            ) : est ? (
              <div className="mt-3 text-sm text-slate-600">
                {t(`同区同类有地住宅租金（${est.basis}）：`, `Comparable landed rents (${est.basis}): `)}
                <div className="mt-2 flex flex-wrap gap-1.5">{est.rents.map((r, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{fmtRM(r)}</span>)}</div>
              </div>
            ) : <div className="text-sm text-slate-600 mt-3">{p.excluded ? t('已排除，没有住宅出租市场。', 'Excluded — no residential rental market.') : t('此楼盘暂未在 PropertyGuru / Mudah 找到可匹配的出租广告。', 'No matching rent ads found on PropertyGuru / Mudah for this project.')}</div>}
            {samples.length > 2 ? (
              <p className="text-[12px] text-slate-600 mt-2">{t(`每个点 = 一则整套出租广告（蓝 PropertyGuru ${p.ask_rent.by_source?.PropertyGuru ?? 0} 条，橙 Mudah ${p.ask_rent.by_source?.Mudah ?? 0} 条）。回报率 = 每则租金 ×12 ÷（成交中位 psf × 该单位面积），再取中位数。`, `Each dot is one whole-unit ad (blue PropertyGuru ${p.ask_rent.by_source?.PropertyGuru ?? 0}, orange Mudah ${p.ask_rent.by_source?.Mudah ?? 0}); yield = rent ×12 ÷ (transacted psf × that unit's size), median across ads.`)}</p>
            ) : est ? (
              <p className="text-[12px] text-slate-600 mt-2">{t('有地住宅：取 Mudah 上同区同类型（排屋/半独立/独立）出租广告的中位数，回报率 = 中位租金 ×12 ÷ Brickz 成交中位价。', 'Landed: median of Mudah rent ads for the same house type in the area; yield = median rent ×12 ÷ Brickz median sale price.')}</p>
            ) : samples.length ? (
              <p className="text-[12px] text-slate-600 mt-2">{t('回报率 = 每则整套出租广告的租金 ×12 ÷（成交中位 psf × 该单位面积），再取中位数。分租/单间广告已排除。', 'Yield = each whole-unit ad’s rent ×12 ÷ (transacted psf × that unit’s size), then the median. Room rentals are excluded.')}</p>
            ) : null}
          </section>

          <section className="card p-5 sm:p-6" data-testid="sources">
            <h3 className="font-bold text-slate-900">{t('数据来源', 'Sources')}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {sources.map(s => (
                <li key={s.name}><a className="text-blue-600 hover:underline break-all" href={s.url} target="_blank" rel="noreferrer noopener">{s.name} ↗</a></li>
              ))}
            </ul>
            <div className="text-[12px] text-slate-600 mt-4 space-y-1">
              <div>{t('成交宗数', 'Transactions')}: <b>{p.tx.count}</b></div>
              <div>{t(`出租 ${nRent} · 出售 ${p.ask_sale.count}`, `Rent ${nRent} · Sale ${p.ask_sale.count}`)}</div>
              <div>{t(`数据更新于 ${UPDATED}`, `Updated ${UPDATED}`)}</div>
            </div>
            <p className="text-[12px] text-slate-600 mt-4">{t('叫租不等于实际成交租金；成交价来自已登记交易的中位数。试抓数据，不构成投资建议。', 'Asking rents ≠ achieved rents; prices are medians of registered transactions. Pilot data, not investment advice.')}</p>
          </section>
        </div>

        <section className="card p-4 sm:p-6">
          <h3 className="font-bold text-slate-900">{t(`${p.area_zh}其他真实楼盘（按毛回报）`, `Other real projects in ${p.area_en} (by gross yield)`)}</h3>
          <ol className="sm:hidden mt-3 space-y-2" data-testid="peer-cards">
            {peers.map(x => {
              const me = x.id === p.id
              const Tag = me ? 'div' : 'a'
              return (
                <li key={x.id}>
                  <Tag {...(me ? {} : { href: `#/property/${x.id}` })} className={`block rounded-xl border p-3 ${me ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white active:bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className={`font-semibold leading-tight ${me ? 'text-blue-700' : 'text-slate-900'}`}><span className="text-slate-500 font-normal mr-1">{x.rank}.</span>{x.name}{me && <span className="ml-1 text-[10px] rounded-full bg-blue-600 text-white px-1.5 py-0.5 align-middle">{t('当前', 'This')}</span>}</div>
                      <div className="shrink-0 font-extrabold" style={{ color: yColor(x.gross) }}>{pct(x.gross)}</div>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 text-[12px]">
                      <div><div className="text-slate-600">{t('成交 psf', 'Transacted psf')}</div><div className="text-slate-800 font-medium">RM {x.tx.psf_median}</div></div>
                      <div><div className="text-slate-600">{t('租金', 'Rent')}</div><div className="text-slate-800 font-medium">{x.rent ? fmtRM(x.rent) : '—'}</div></div>
                      <div><div className="text-slate-600">{t('出租 · 成交', 'Rent · tx')}</div><div className="text-slate-800 font-medium">{x.rent_estimate ? x.rent_estimate.n : x.ask_rent.count} · {x.tx.count}</div></div>
                    </div>
                  </Tag>
                </li>
              )
            })}
          </ol>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full mt-3 text-sm" data-testid="peer-table">
              <thead><tr className="text-[12px] text-slate-600 text-left">
                <th className="py-2 pl-2">#</th><th>{t('楼盘', 'Project')}</th><th className="text-right whitespace-nowrap px-2">{t('成交 psf', 'Transacted psf')}</th><th className="text-right whitespace-nowrap px-2">{t('租金', 'Rent')}</th><th className="text-right whitespace-nowrap px-2">{t('出租 · 成交', 'Rent · tx')}</th><th className="text-right whitespace-nowrap pr-2 pl-2">{t('毛回报', 'Gross')}</th>
              </tr></thead>
              <tbody>
                {peers.map(x => {
                  const me = x.id === p.id
                  return (
                    <tr key={x.id} className={`${me ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'} border-t border-slate-100`}>
                      <td className="py-2.5 pl-2 text-slate-600">{x.rank}</td>
                      <td>{me ? <span className="text-blue-700">{x.name}</span> : <a className="text-slate-800 hover:text-blue-600" href={`#/property/${x.id}`}>{x.name}</a>}</td>
                      <td className="text-right px-2 whitespace-nowrap">RM {x.tx.psf_median}</td>
                      <td className="text-right px-2 whitespace-nowrap">{x.rent ? fmtRM(x.rent) : '—'}</td>
                      <td className="text-right px-2 text-slate-600">{x.rent_estimate ? x.rent_estimate.n : x.ask_rent.count} · {x.tx.count}</td>
                      <td className="text-right pr-2"><span className="font-bold" style={{ color: yColor(x.gross) }}>{pct(x.gross)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {allPeers.length > peers.length || showAll ? (
            <button className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setShowAll(v => !v)} data-testid="peers-toggle">
              {showAll ? t('收起', 'Show less') : t(`查看全部 ${allPeers.length} 个楼盘`, `Show all ${allPeers.length} projects`)}
            </button>
          ) : null}
        </section>

        {p.rent ? <Calculator p={calcP} key={p.id} /> : null}

        <div className="text-center">
          <a href="#/" className="inline-block rounded-full bg-slate-900 text-white px-6 py-2.5 font-semibold hover:bg-slate-800">← {t('返回地图', 'Back to map')}</a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
