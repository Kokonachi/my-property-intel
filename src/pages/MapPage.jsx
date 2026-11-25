import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { MapContainer, Marker, Circle, Tooltip, useMapEvents, useMap } from 'react-leaflet'
import L from '../lib/leaflet-globals.js'
import { AREAS, REGIONS, yieldBand, BANDS, TYPE_LABEL, fmtRM, fmtRMk } from '../data/properties.js'
import ProjectPhoto from '../components/ProjectPhoto.jsx'
import { Logo } from '../components/ui.jsx'
import { REAL, REAL_META, realAreaStats, yieldOf, rentSampleN, isThinSample, RANK_MIN_SAMPLES } from '../data/real.js'
import ClusterGroup from '../components/ClusterGroup.jsx'
import Basemap from '../components/Basemap.jsx'
import { useLang, LangToggle } from '../lib/i18n.jsx'
import { NavTabs } from '../components/AppNav.jsx'
import { LAUNCHES } from '../data/launches.js'
import { LaunchMarkers, LaunchCard } from '../components/LaunchPins.jsx'

const ALL = REAL
const onMapOk = p => p.lat != null && p.lng != null
const pct = v => (v == null ? '—' : `${v.toFixed(1)}%`)
const bandColor = v => (v == null ? '#94a3b8' : yieldBand(v).color)
const PRICE_RANGES = [
  { id: 'all', zh: '全部价格', en: 'Any price', min: 0, max: Infinity },
  { id: 'lt500', zh: '< RM500k', en: '< RM500k', min: 0, max: 500000 },
  { id: '500-1m', zh: 'RM500k–1M', en: 'RM500k–1M', min: 500000, max: 1000000 },
  { id: 'gt1m', zh: '> RM1M', en: '> RM1M', min: 1000000, max: Infinity },
]
const SORTS = [
  { id: 'yd', zh: '回报率 高→低', en: 'Yield: high → low' }, { id: 'ya', zh: '回报率 低→高', en: 'Yield: low → high' }, { id: 'pa', zh: '价格 低→高', en: 'Price: low → high' }, { id: 'psf', zh: '每平方尺 低→高', en: 'PSF: low → high' },
]
const GATEWAY_IDS = ['real-kl-gateway', 'real-kuala-lumpur-gateway', 'real-kuala-lumpur-gateway-menara-suezcap']
const GATEWAY_NAMES = {
  'real-kl-gateway': 'KL Gateway',
  'real-kuala-lumpur-gateway': 'Kuala Lumpur Gateway',
  'real-kuala-lumpur-gateway-menara-suezcap': 'Menara Suezcap',
}

function relatedNote(p, t) {
  if (!GATEWAY_IDS.includes(p.id)) return null
  const others = GATEWAY_IDS.filter(id => id !== p.id).map(id => GATEWAY_NAMES[id]).join(' / ')
  return t(`同一片区还有 ${others}（Brickz 分项记录，未合并）`, `Same precinct: also ${others} (separate Brickz records, not merged)`)
}

function noYieldText(p, rentMode, t) {
  if (rentMode === 'short') {
    if (p.str && p.str.status !== 'ok') return t('短租样本不足，无法计算回报', 'Not enough short-term listings — yield cannot be calculated')
    return t('未纳入本轮短租试做', 'Not in this short-term pilot')
  }
  return t('暂无在租样本，无法计算回报', 'No rent listings — yield cannot be calculated')
}

function KlHaloLabel({ enabled }) {
  const map = useMap()
  const [on, setOn] = useState(false)
  useEffect(() => {
    const upd = () => {
      const z = map.getZoom()
      setOn(!!enabled && z >= 10.8 && z < 14.25)
    }
    upd()
    map.on('zoomend', upd)
    map.on('moveend', upd)
    return () => { map.off('zoomend', upd); map.off('moveend', upd) }
  }, [map, enabled])
  if (!on) return null
  const icon = L.divIcon({
    className: 'city-halo-label',
    html: '<span>Kuala Lumpur</span>',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
  // West of the KLCC cluster so the 8 / 4.1% bubble no longer covers the city name.
  return <Marker position={[3.148, 101.668]} icon={icon} interactive={false} keyboard={false} zIndexOffset={2500} />
}

function rentAdLabel(n, t) {
  const c = n ?? 0
  return t(`${c} 则租盘`, c === 1 ? '1 rent ad' : `${c} rent ads`)
}
function saleLabel(n, t) {
  const c = n ?? 0
  return t(`${c} 宗成交`, c === 1 ? '1 sale' : `${c} sales`)
}

function pillIcon(p, y, active) {
  if (y == null) {
    return L.divIcon({
      className: 'ab-pill nodata' + (active ? ' active' : ''),
      html: `<div data-pid="${p.id}" title="No yield"><i></i></div>`,
      iconSize: [0, 0], iconAnchor: [0, 0],
    })
  }
  return L.divIcon({
    className: 'ab-pill' + (active ? ' active' : ''),
    html: `<div data-pid="${p.id}"><i style="background:${bandColor(y)}"></i>${y.toFixed(1)}%</div>`,
    iconSize: [0, 0], iconAnchor: [0, 0],
  })
}

function MapEvents({ onMove, onClick }) {
  const map = useMapEvents({ moveend: () => onMove(map.getBounds()), click: () => onClick() })
  useEffect(() => {
    // Fixed zoom (not fit-all-points): a full-KV fit zooms out past Putrajaya and
    // plants the KLCC cluster on the large “Kuala Lumpur” label. 11.75 + this centre
    // keeps Subang/KL inside the pane with a little edge margin.
    const isM = map.getContainer().clientWidth < 768
    map.setView(isM ? [3.108, 101.662] : [3.102, 101.652], isM ? 12 : 11.75, { animate: false })
    onMove(map.getBounds())
    window.__map = map
  }, [])
  return null
}

function SampleBadge({ p }) {
  const { t } = useLang()
  if (!isThinSample(p) || p.gross == null) return null
  const n = rentSampleN(p)
  return (
    <span className="mt-1 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200" data-testid="sample-badge">
      {t(`仅 ${n} 则租盘 · 未排名`, n === 1 ? 'Only 1 rent ad · not ranked' : `Only ${n} rent ads · not ranked`)}
    </span>
  )
}

function ListingCard({ p, metric, rentMode, active, onHover, onClick, compact }) {
  const { t, L: tl } = useLang()
  const grossY = yieldOf(p, rentMode, 'gross')
  const netY = yieldOf(p, rentMode, 'net')
  const noYield = yieldOf(p, rentMode, metric) == null
  const nRent = p.rent_estimate ? p.rent_estimate.n : p.ask_rent.count
  const related = relatedNote(p, t)
  const priceTxt = p.price ? fmtRMk(p.price) : (p.tx?.price_median ? fmtRMk(p.tx.price_median) : '—')

  if (noYield) {
    return (
      <a href={`#/property/${p.id}`} data-card={p.id}
        onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)} onClick={onClick}
        className={`block min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 ${active ? 'ring-2 ring-slate-900' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-[15px] text-slate-900 leading-tight truncate">{p.name}</div>
            <div className="text-[12px] text-slate-600 truncate mt-0.5">{tl({ zh: p.area_zh, en: p.area_en })} · {tl(TYPE_LABEL[p.type])} · {t('成交', 'Transacted')} {priceTxt}</div>
          </div>
        </div>
        <div className="text-[12px] text-slate-700 mt-1">{noYieldText(p, rentMode, t)}</div>
        {related && <div className="text-[12px] text-slate-600 mt-0.5">{related}</div>}
        {!onMapOk(p) && <div className="text-[12px] text-slate-600 mt-0.5">📍 {t('位置待核实，未在地图显示', 'Location unverified — not shown on map')}</div>}
        {onMapOk(p) && (p.geo_precision === 'street' || p.geo_precision === 'area') && <div className="text-[11.5px] text-amber-800 mt-0.5" data-testid="geo-approx">📍 {t('大概位置', 'Approx. location')}</div>}
      </a>
    )
  }

  if (compact) {
    return (
      <a href={`#/property/${p.id}`} data-card={p.id}
        onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)} onClick={onClick}
        className={`group flex gap-3 items-stretch min-w-0 rounded-2xl ${active ? 'ring-2 ring-slate-900' : ''}`}>
        {p.photo
          ? <ProjectPhoto p={p} compact className="w-[112px] h-[112px] shrink-0 rounded-xl" />
          : <ProjectPhoto p={p} compact strip className="w-1.5 self-stretch rounded-full" />}
        <div className="min-w-0 flex-1 py-0.5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-[15px] text-slate-900 leading-tight line-clamp-2">{p.name}</div>
              <div className="shrink-0 font-bold text-[15px] tabular-nums" style={{ color: bandColor(grossY) }}>{pct(grossY)}</div>
            </div>
            <div className="text-[12px] text-slate-600 truncate mt-0.5">{tl({ zh: p.area_zh, en: p.area_en })} · {tl(TYPE_LABEL[p.type])}</div>
            {onMapOk(p) && (p.geo_precision === 'street' || p.geo_precision === 'area') && <div className="text-[11.5px] text-amber-800 truncate" data-testid="geo-approx">📍 {t('大概位置', 'Approx. location')}</div>}
            <SampleBadge p={p} />
          </div>
          <div>
            <div className="text-[12px] text-slate-700 truncate">{t('成交', 'Transacted')} {p.psf ? `RM${Number(p.psf).toLocaleString('en-MY')} psf` : priceTxt} · {p.rent ? `${t('租', 'Rent')} ${fmtRM(p.rent)}${t('/月', '/mo')}` : ''}</div>
            <div className="mt-0.5 text-[12px] font-semibold" style={{ color: bandColor(netY) }}>{pct(netY)} <span className="font-normal text-slate-600">{t('净回报', 'Net yield')}</span></div>
            {related && <div className="text-[12px] text-slate-600 truncate">{related}</div>}
          </div>
        </div>
      </a>
    )
  }

  return (
    <a href={`#/property/${p.id}`} data-card={p.id}
      onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)} onClick={onClick}
      className={`group block min-w-0 rounded-2xl ${active ? 'ring-2 ring-slate-900' : ''}`}>
      {p.photo
        ? <ProjectPhoto p={p} className="aspect-[16/10] rounded-2xl" />
        : <ProjectPhoto p={p} className="h-10 rounded-xl" />}
      <div className="pt-2 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-[15px] text-slate-900 leading-tight truncate">{p.name}</div>
          <div className="shrink-0 font-bold text-sm tabular-nums" style={{ color: bandColor(grossY) }}>{pct(grossY)}</div>
        </div>
        <div className="text-[12px] text-slate-600 truncate">{tl({ zh: p.area_zh, en: p.area_en })} · {tl(TYPE_LABEL[p.type])} · {p.tenure === 'Freehold' ? t('永久地契', 'Freehold') : t('租赁地契', 'Leasehold')}</div>
        <SampleBadge p={p} />
        <div className="text-[12px] text-slate-600 truncate">
          {t(`成交 RM${p.psf ? Number(p.psf).toLocaleString('en-MY') : '—'} psf · ${rentAdLabel(nRent, t)} / ${saleLabel(p.tx.count, t)}`, `Transacted RM${p.psf ? Number(p.psf).toLocaleString('en-MY') : '—'} psf · ${rentAdLabel(nRent, t)} / ${saleLabel(p.tx.count, t)}`)}
        </div>
        <div className="text-[14px] text-slate-900 mt-0.5"><b>{priceTxt}</b><span className="text-[12px] text-slate-600">{p.size ? t(` 按 ${Number(p.size).toLocaleString('en-MY')} sqft 估值`, ` value at ${Number(p.size).toLocaleString('en-MY')} sqft`) : t(' 典型单位', ' typical unit')}</span> · {t('租', 'Rent')} <b>{p.rent ? fmtRM(p.rent) : '—'}</b>{t('/月', '/mo')}{p.rent_method === 'area_comps' && <span className="text-[12px] text-amber-800"> · {t('区域估算', 'area est.')}</span>}</div>
        {related && <div className="text-[12px] text-slate-600">{related}</div>}
        {!onMapOk(p) && <div className="text-[12px] text-slate-600">📍 {t('位置待核实，未在地图显示', 'Location unverified — not shown on map')}</div>}
        {onMapOk(p) && (p.geo_precision === 'street' || p.geo_precision === 'area') && <div className="text-[11.5px] text-amber-800" data-testid="geo-approx">📍 {t('大概位置', 'Approx. location')}</div>}
        <div className="mt-1 text-[12px] font-semibold" style={{ color: bandColor(netY) }}>{pct(netY)} <span className="font-normal text-slate-600">{t('净回报', 'Net yield')}</span></div>
      </div>
    </a>
  )
}

function PeekCard({ p, metric, rentMode, onClose }) {
  const { t, L: tl } = useLang()
  const grossY = yieldOf(p, rentMode, 'gross')
  const netY = yieldOf(p, rentMode, 'net')
  const noYield = yieldOf(p, rentMode, metric) == null
  return (
    <div className="relative bg-white rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,.28)] overflow-hidden flex" data-testid="peek-card">
      <button onClick={onClose} aria-label="close" className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/95 shadow text-slate-700 text-sm">✕</button>
      <a href={`#/property/${p.id}`} className="flex w-full">
        {p.photo
          ? <ProjectPhoto p={p} compact className="w-[38%] shrink-0 min-h-[136px]" />
          : <ProjectPhoto p={p} compact strip className="w-1.5 self-stretch" />}
        <div className="p-3 min-w-0 flex-1">
          <div className="font-semibold text-slate-900 text-[15px] leading-tight pr-7 truncate">{p.name}</div>
          <div className="text-[12px] text-slate-600 truncate">{tl({ zh: p.area_zh, en: p.area_en })} · {tl(TYPE_LABEL[p.type])}</div>
          {noYield ? (
            <div className="text-[12px] text-slate-700 mt-2">{noYieldText(p, rentMode, t)}</div>
          ) : (
            <>
              <div className="text-[13px] mt-1.5 text-slate-800"><b>{p.price ? fmtRMk(p.price) : '—'}</b> <span className="text-slate-600">· {t('成交', 'Transacted')} {p.psf ? `RM${Number(p.psf).toLocaleString('en-MY')} psf` : ''}</span></div>
              <div className="text-[13px] text-slate-800">{t('租金', 'Rent')} <b>{p.rent ? fmtRM(p.rent) : '—'}</b>{t('/月', '/mo')}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                <span className="font-bold" style={{ color: bandColor(grossY) }}>{pct(grossY)} <span className="font-normal text-slate-600">{t('毛回报', 'Gross')}</span></span>
                <span className="font-bold" style={{ color: bandColor(netY) }}>{pct(netY)} <span className="font-normal text-slate-600">{t('净回报', 'Net')}</span></span>
              </div>
              <SampleBadge p={p} />
            </>
          )}
          <div className="text-[12px] font-semibold text-blue-700 mt-1.5">{t('查看详情 →', 'View details →')}</div>
        </div>
      </a>
    </div>
  )
}

function BottomSheet({ count, avg, metric, children, snap, setSnap }) {
  const { t } = useLang()
  const ref = useRef(null)
  const drag = useRef(null)
  const vh = () => (window.visualViewport?.height || window.innerHeight || 800)
  const [H, setH] = useState(vh)
  useEffect(() => { const f = () => setH(vh()); f(); window.addEventListener('resize', f); window.visualViewport?.addEventListener('resize', f); return () => { window.removeEventListener('resize', f); window.visualViewport?.removeEventListener('resize', f) } }, [])
  const pos = { peek: H - 92, half: Math.round(H * 0.45), full: 72 }
  const [dy, setDy] = useState(null)
  const y = dy ?? pos[snap]
  const start = e => { drag.current = { y0: e.clientY, base: pos[snap], moved: false }; e.currentTarget.setPointerCapture?.(e.pointerId) }
  const move = e => { if (!drag.current) return; const d = e.clientY - drag.current.y0; if (Math.abs(d) > 4) drag.current.moved = true; setDy(Math.max(pos.full, Math.min(pos.peek, drag.current.base + d))) }
  const end = () => {
    if (!drag.current) return
    const cur = dy ?? pos[snap]
    if (!drag.current.moved) setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')
    else setSnap(Object.entries(pos).sort((a, b) => Math.abs(a[1] - cur) - Math.abs(b[1] - cur))[0][0])
    drag.current = null; setDy(null)
  }
  const hint = snap === 'peek' ? t('上拉查看列表', 'Pull up for list') : t('下拉回地图', 'Pull down for map')
  return (
    <div ref={ref} data-testid="sheet" data-snap={snap}
      className="md:hidden fixed left-0 right-0 bottom-0 z-[1050] overflow-x-hidden bg-white rounded-t-3xl shadow-[0_-6px_24px_rgba(15,23,42,.18)] flex flex-col"
      style={{ top: y, maxHeight: '100dvh', transition: dy == null ? 'top .28s cubic-bezier(.2,.8,.2,1)' : 'none' }}>
      <div className="pt-2 pb-3 touch-none cursor-grab select-none" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} data-testid="sheet-handle">
        <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-300" />
        <div className="text-center mt-2 font-semibold text-[15px] text-slate-900">{t(`${count} 个楼盘`, `${count} projects`)}</div>
        <div className="text-center text-[12px] text-slate-600">{metric === 'gross' ? t('平均毛回报', 'Avg gross yield') : t('平均净回报', 'Avg net yield')} {avg.toFixed(2)}% · {hint}</div>
      </div>
      <div className={`flex-1 min-h-0 px-4 pb-6 ${snap === 'peek' ? 'overflow-hidden' : 'overflow-y-auto'}`}>{children}</div>
    </div>
  )
}

export default function MapPage() {
  const [q, setQ] = useState('')
  const [minYield, setMinYield] = useState(0)
  const [types, setTypes] = useState([])
  const [tenure, setTenure] = useState('all')
  const [price, setPrice] = useState('all')
  const [sort, setSort] = useState('yd')
  const [metric, setMetric] = useState('gross')
  const rentMode = 'long' // STR UI parked; user asked not to launch short-term yield
  const [heat, setHeat] = useState(false)
  const [inView, setInView] = useState(true)
  const [bounds, setBounds] = useState(null)
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(null)
  const [selectedLaunch, setSelectedLaunch] = useState(null)
  const [layersOpen, setLayersOpen] = useState(false)
  const [basemap, setBasemap] = useState('map')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [snap, setSnap] = useState('peek')
  const { t, L: tl } = useLang()
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const markerRefs = useRef({})
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

  const filtered = useMemo(() => {
    const pr = PRICE_RANGES.find(x => x.id === price)
    const s = q.trim().toLowerCase()
    const list = ALL.filter(p => {
      const y = yieldOf(p, rentMode, metric)
      if (minYield > 0 && (y == null || y < minYield)) return false
      if (types.length && !types.includes(p.type)) return false
      if (tenure !== 'all' && p.tenure !== tenure) return false
      if (price !== 'all' && (p.price == null || p.price < pr.min || p.price >= pr.max)) return false
      if (s && !(p.name.toLowerCase().includes(s) || p.area_en.toLowerCase().includes(s) || p.area_zh.includes(s))) return false
      return true
    })
    const yv = p => yieldOf(p, rentMode, metric) ?? -1
    const cmp = { yd: (a, b) => yv(b) - yv(a), ya: (a, b) => yv(a) - yv(b), pa: (a, b) => (a.price ?? 1e12) - (b.price ?? 1e12), psf: (a, b) => (a.psf ?? 1e9) - (b.psf ?? 1e9) }[sort]
    return list.sort(cmp)
  }, [q, minYield, types, tenure, price, sort, metric, rentMode])

  const listed = useMemo(() => (inView && bounds ? filtered.filter(p => onMapOk(p) && bounds.contains([p.lat, p.lng])) : filtered), [filtered, inView, bounds])
  const withY = listed.filter(p => yieldOf(p, rentMode, metric) != null)
  const noY = listed.filter(p => yieldOf(p, rentMode, metric) == null)
  // Yield rankings only use projects with enough rent ads; thin ones are listed after, flagged.
  const ranked = withY.filter(p => !isThinSample(p))
  const thinY = withY.filter(p => isThinSample(p))
  const avg = withY.length ? withY.reduce((s, p) => s + yieldOf(p, rentMode, metric), 0) / withY.length : 0
  const sel = selected ? ALL.find(p => p.id === selected) : null
  const activeId = hover || selected
  const groupNoYield = sort === 'yd' || sort === 'ya'

  const toggleType = typ => setTypes(ts => (ts.includes(typ) ? ts.filter(x => x !== typ) : [...ts, typ]))
  const reset = () => { setQ(''); setMinYield(0); setTypes([]); setTenure('all'); setPrice('all') }
  const nFilters = (minYield > 0) + (types.length > 0) + (tenure !== 'all') + (price !== 'all')
  const onMove = useCallback(b => setBounds(b), [])
  useEffect(() => {
    for (const p of ALL) { const m = markerRefs.current[p.id]; if (m) m.options.yieldVal = yieldOf(p, rentMode, metric) ?? undefined }
    clusterRef.current?.refreshClusters()
  }, [metric, rentMode, filtered])
  const chip = on => `shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] border transition ${on ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-900'}`

  const chips = (
    <>
      <button className={chip(nFilters > 0) + ' inline-flex items-center gap-1.5'} onClick={() => setFiltersOpen(true)} data-testid="filters-btn">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4h12M4 8h8M6 12h4" /></svg>{t('筛选', 'Filters')}{nFilters ? ` · ${nFilters}` : ''}
      </button>
      {[[4, '≥ 4%'], [5, '≥ 5%'], [6, '≥ 6%']].map(([v, l]) => (
        <button key={v} className={chip(minYield === v)} onClick={() => setMinYield(m => (m === v ? 0 : v))}>{t('回报', 'Yield')} {l}</button>
      ))}
      {Object.entries(TYPE_LABEL).map(([k, v]) => (
        <button key={k} className={chip(types.includes(k))} onClick={() => toggleType(k)}>{tl(v)}</button>
      ))}
      <button className={chip(tenure === 'Freehold')} onClick={() => setTenure(tn => (tn === 'Freehold' ? 'all' : 'Freehold'))}>{t('永久地契', 'Freehold')}</button>
    </>
  )

  const searchBar = (
    <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-[0_3px_12px_rgba(15,23,42,.12)] pl-4 pr-1.5 py-1.5 w-full">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0f172a" strokeWidth="2"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('搜索楼盘或地区', 'Search project or area')} className="flex-1 min-w-0 bg-transparent text-sm outline-none py-1" data-testid="search" />
    </div>
  )

  const renderCards = (items, compact) => items.map(p => (
    <ListingCard key={p.id} p={p} metric={metric} rentMode={rentMode} active={hover === p.id} onHover={setHover} onClick={() => {}} compact={compact} />
  ))

  const listBody = (compact) => (
    <>
      <div className={compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-5 gap-y-6 items-start'} data-testid="property-list">
        {renderCards(groupNoYield ? ranked : listed, compact)}
        {!listed.length && <div className="col-span-full py-10 text-center text-sm text-slate-600">{t('没有符合条件的楼盘，试试移动地图或放宽筛选。', 'No matching projects — try moving the map or loosening filters.')}</div>}
      </div>
      {groupNoYield && thinY.length > 0 && (
        <div className="mt-6" data-testid="thin-sample-group">
          <h3 className="text-[13px] font-semibold text-slate-700">{t(`另 ${thinY.length} 个楼盘租盘少于 ${RANK_MIN_SAMPLES} 则，不参与排名`, `${thinY.length} more projects have fewer than ${RANK_MIN_SAMPLES} rent ads and are not ranked`)}</h3>
          <p className="text-[12px] text-slate-500 mb-2">{t('一两则叫租就能把回报拉高或拉低好几个百分点，只供参考。', 'One or two asking rents can move a yield by several points. Shown for reference only.')}</p>
          <div className={compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-5 gap-y-6 items-start'}>{renderCards(thinY, compact)}</div>
        </div>
      )}
      {groupNoYield && noY.length > 0 && (
        <div className="mt-6" data-testid="no-rent-group">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-2">{t(`另 ${noY.length} 个楼盘暂无租金数据`, `${noY.length} more projects have no rent data`)}</h3>
          <div className="grid grid-cols-1 gap-2">{renderCards(noY, compact)}</div>
        </div>
      )}
    </>
  )

  const metricLabel = metric === 'gross' ? t('毛回报', 'Gross yield') : t('净回报', 'Net yield')

  const mapControls = (
    <>
      <div className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 z-[650]">
        <label className="flex items-center gap-2 bg-white rounded-full shadow-[0_3px_12px_rgba(15,23,42,.18)] px-3.5 py-2 text-[13px] font-medium text-slate-800 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={inView} onChange={e => setInView(e.target.checked)} className="accent-slate-900 w-4 h-4" />
          {t('移动地图时搜索', 'Search as I move the map')}
        </label>
      </div>
      <div className="absolute right-3 top-3 max-md:top-[7.75rem] z-[660] flex flex-col items-end gap-2">
        <div className="relative">
          <button onClick={() => setLayersOpen(o => !o)} data-testid="layers-btn" aria-expanded={layersOpen}
            className={`flex items-center gap-1.5 rounded-full shadow-[0_3px_12px_rgba(15,23,42,.18)] px-2.5 sm:px-3 h-9 text-[12px] font-semibold max-w-[200px] ${layersOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
            <svg width="16" height="16" className="shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
            <span className="truncate">{t('图层：', 'Layers: ')}{metricLabel}</span>
          </button>
          {layersOpen && (
            <div className="absolute right-0 top-11 w-[236px] bg-white rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,.25)] p-3 space-y-3 text-[13px]" data-testid="layers-panel">
              {[[t('底图', 'Base map'), 'basemap-toggle', [['map', t('地图', 'Map')], ['sat', t('卫星', 'Satellite')]], basemap, setBasemap],
                [t('回报率', 'Yield shown'), 'metric-toggle', [['gross', t('毛回报', 'Gross yield')], ['net', t('净回报', 'Net yield')]], metric, setMetric]].map(([title, tid, opts, val, set]) => (
                <div key={tid}>
                  <div className="text-[12px] text-slate-600 mb-1">{title}</div>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" data-testid={tid}>
                    {opts.map(([k, l]) => <button key={k} onClick={() => set(k)} className={`rounded-lg py-1.5 ${val === k ? 'bg-white shadow text-slate-900 font-semibold' : 'text-slate-600'}`}>{l}</button>)}
                  </div>
                </div>
              ))}
              <label className="flex items-center justify-between gap-2 cursor-pointer" data-testid="heat-toggle">
                <span>{t('区域平均回报（热度圈）', 'Area average (heat circles)')}</span>
                <input type="checkbox" checked={heat} onChange={e => setHeat(e.target.checked)} className="accent-slate-900 w-4 h-4" />
              </label>
              <label className="flex items-center justify-between gap-2 cursor-pointer" data-testid="search-as-move">
                <span>{t('移动地图时搜索', 'Search as I move the map')}</span>
                <input type="checkbox" checked={inView} onChange={e => setInView(e.target.checked)} className="accent-slate-900 w-4 h-4" />
              </label>
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col bg-white rounded-xl shadow-[0_3px_12px_rgba(15,23,42,.18)] overflow-hidden">
          <button className="w-9 h-9 text-lg hover:bg-slate-100" onClick={() => mapRef.current?.zoomIn()} aria-label="zoom in">+</button>
          <button className="w-9 h-9 text-lg hover:bg-slate-100 border-t border-slate-100" onClick={() => mapRef.current?.zoomOut()} aria-label="zoom out">−</button>
        </div>
      </div>
      <div className="absolute left-3 bottom-3 max-md:bottom-[118px] z-[640] bg-white/95 rounded-xl shadow px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-600 max-w-[calc(100%-1.5rem)]" data-testid="legend">
        {BANDS.map(b => <span key={b.key} className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: b.color }} />{b.label}</span>)}
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block bg-white border-2 border-slate-500" />{t('暂无回报', 'No yield')}</span>
        <span className="flex items-center gap-1.5 font-semibold text-slate-800"><span className="nl-legend-pin" aria-hidden="true" />{t('新盘', 'New')}</span>
        <span className="hidden md:inline border-l border-slate-200 pl-2 font-semibold text-slate-700">{metricLabel}</span>
      </div>
    </>
  )

  const map = (
    <MapContainer ref={mapRef} center={REGIONS.kv.center} zoom={11.75} zoomSnap={0.25} zoomDelta={0.5} maxZoom={19} minZoom={5} className="absolute inset-0" zoomControl={false} attributionControl>
      <Basemap kind={basemap} />
      <MapEvents onMove={onMove} onClick={() => { setSelected(null); setSelectedLaunch(null); setLayersOpen(false) }} />
      {heat && AREAS.map(a => {
        const st = realAreaStats(a.id, rentMode); const v = metric === 'gross' ? st.gross : st.net
        if (v == null) return null
        return (
          <Circle key={a.id} center={a.c} radius={2200} pathOptions={{ color: yieldBand(v).color, fillColor: yieldBand(v).color, fillOpacity: 0.2, weight: 1 }}>
            <Tooltip direction="center">{tl(a)}: {t(`${st.count} 个楼盘均值`, `avg of ${st.count} projects`)} {v.toFixed(2)}%</Tooltip>
          </Circle>
        )
      })}
      {basemap === 'map' && <KlHaloLabel enabled />}
      <ClusterGroup ref={clusterRef}>
        {filtered.filter(onMapOk).map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pillIcon(p, yieldOf(p, rentMode, metric), activeId === p.id)}
            yieldVal={yieldOf(p, rentMode, metric) ?? undefined}
            zIndexOffset={activeId === p.id ? 2000 : Math.round((yieldOf(p, rentMode, metric) ?? 0) * 10)}
            ref={el => { if (el) markerRefs.current[p.id] = el }}
            eventHandlers={{
              click: e => { L.DomEvent.stopPropagation(e); setSelected(p.id); setSnap('peek') },
              mouseover: () => setHover(p.id), mouseout: () => setHover(null),
            }} />
        ))}
      </ClusterGroup>
      <LaunchMarkers launches={LAUNCHES} selectedId={selectedLaunch} onSelect={id => { setSelected(null); setSelectedLaunch(id); setSnap('peek') }} />
    </MapContainer>
  )

  const countLabel = inView
    ? t(`地图内 ${listed.length} / 共 ${REAL.length}`, `${listed.length} in map / ${REAL.length} total`)
    : t(`${listed.length} / 共 ${REAL.length} 个楼盘`, `${listed.length} / ${REAL.length} projects`)

  return (
    <div className="h-full flex flex-col bg-white">
      <header className="hidden md:flex h-[72px] shrink-0 items-center gap-4 px-6 border-b border-slate-200 bg-white z-[1100] relative">
        <Logo />
        <NavTabs active="map" />
        <div className="flex-1 max-w-[560px] mx-auto">{searchBar}</div>
        <div className="text-[12px] text-slate-600 text-right leading-tight">{countLabel}<br />{t('更新', 'Updated')} {REAL_META.generated_at?.slice(0, 10)}</div>
        <LangToggle />
      </header>
      <div className="hidden md:flex items-center gap-2 px-6 py-3 border-b border-slate-100 overflow-x-auto no-scrollbar bg-white">{chips}</div>

      <div className="flex-1 flex min-h-0 relative">
        <section className="hidden md:block w-[55%] overflow-y-auto px-6 py-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[20px] font-bold text-slate-900">{countLabel}</h2>
              <div className="text-[13px] text-slate-600">{metric === 'gross' ? t('平均毛回报', 'Avg gross yield') : t('平均净回报', 'Avg net yield')} <b className="text-slate-900">{avg.toFixed(2)}%</b> · {t('Brickz 成交 + PropertyGuru/Mudah 租盘', 'Brickz transactions + PropertyGuru/Mudah rent ads')}</div>
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-full border border-slate-300 px-3 py-1.5 text-[13px] bg-white" aria-label="sort">
              {SORTS.map(s => <option key={s.id} value={s.id}>{tl(s)}</option>)}
            </select>
          </div>
          {listBody(false)}
          <p className="text-[12px] text-slate-600 mt-8">{t('※ 数据来自公开网页的小规模抓取，叫租不等于实际租金；有地住宅租金为区域同类房源估算；净回报的费用为估算假设。不构成投资建议。', '※ Data from a small scrape of public pages; asking rents are not achieved rents; landed rents are area-level estimates; net-yield costs are estimated assumptions. Not investment advice.')} Map © OpenFreeMap / OpenMapTiles / OSM contributors; imagery © Esri.</p>
        </section>

        <div className="flex-1 relative md:p-4 md:pl-0">
          <div className="absolute inset-0 md:inset-4 md:left-0 md:rounded-2xl overflow-hidden">
            {map}
            {mapControls}
            {(sel || selectedLaunch) && (
              <div className="absolute z-[700] left-3 right-3 md:left-auto md:right-4 md:w-[380px] bottom-3 max-md:bottom-[118px]">
                {selectedLaunch ? (
                  <div className="relative" data-testid="launch-peek">
                    <button onClick={() => setSelectedLaunch(null)} aria-label="close" className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/95 shadow text-slate-700 text-sm">✕</button>
                    <LaunchCard p={LAUNCHES.find(l => l.id === selectedLaunch)} selected onSelect={() => {}} variant="peek" />
                  </div>
                ) : (
                  <PeekCard p={sel} metric={metric} rentMode={rentMode} onClose={() => setSelected(null)} />
                )}
              </div>
            )}
          </div>

          <div className="md:hidden absolute top-0 left-0 right-0 z-[800] pt-3 px-3 space-y-2 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <a href="#/" className="shrink-0 flex items-center justify-center rounded-full bg-white/95 shadow px-2.5 h-10 text-[12px] font-semibold text-slate-800">{t('新楼盘', 'Launches')}</a>
              <a href="#/map" className="shrink-0 flex items-center gap-1 rounded-full bg-slate-900 text-white shadow pl-0.5 pr-2 h-10">
                <span className="h-9 w-9 rounded-full bg-blue-600 text-white grid place-items-center font-black text-xs">MY</span>
                <span className="text-[12px] font-semibold leading-tight">{t('地图', 'Map')}</span>
              </a>
              <div className="flex-1 min-w-0">{searchBar}</div>
              <LangToggle className="h-10" />
            </div>
            <div className="relative pointer-events-auto -mr-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{chips}</div>
              <div className="chip-fade chip-fade-map" />
            </div>
          </div>
        </div>

        {isMobile && <BottomSheet count={listed.length} avg={avg} metric={metric} snap={snap} setSnap={setSnap}>
          {snap !== 'peek' && (
            <div className="relative mb-3 -mx-1">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{chips}</div>
              <div className="chip-fade" />
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-full border border-slate-300 px-3 py-1.5 text-[13px] bg-white" aria-label="sort">
              {SORTS.map(s => <option key={s.id} value={s.id}>{tl(s)}</option>)}
            </select>
            <button className="text-[13px] underline" onClick={() => setSnap('peek')}>🗺 {t('地图', 'Map')}</button>
          </div>
          {listBody(true)}
        </BottomSheet>}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/40 flex items-end md:items-center justify-center" onClick={() => setFiltersOpen(false)}>
          <div className="bg-white w-full md:w-[520px] rounded-t-3xl md:rounded-3xl p-5 space-y-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="filters-modal">
            <div className="flex items-center justify-between"><h3 className="font-bold text-lg">{t('筛选', 'Filters')}</h3><button onClick={() => setFiltersOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100">✕</button></div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>{metric === 'gross' ? t('最低毛回报率', 'Min gross yield') : t('最低净回报率', 'Min net yield')}</span><b>{minYield === 0 ? t('不限', 'Any') : `${minYield.toFixed(1)}%`}</b></div>
              <input type="range" min="0" max="8" step="0.5" value={minYield} onChange={e => setMinYield(+e.target.value)} className="w-full" />
            </div>
            <div><div className="text-sm mb-2">{t('类型', 'Type')}</div><div className="flex flex-wrap gap-2">{Object.entries(TYPE_LABEL).map(([k, v]) => <button key={k} className={chip(types.includes(k))} onClick={() => toggleType(k)}>{tl(v)}</button>)}</div></div>
            <div><div className="text-sm mb-2">{t('地契', 'Tenure')}</div><div className="flex flex-wrap gap-2">{[['all', t('全部', 'Any')], ['Freehold', t('永久地契', 'Freehold')], ['Leasehold', t('租赁地契', 'Leasehold')]].map(([k, l]) => <button key={k} className={chip(tenure === k)} onClick={() => setTenure(k)}>{l}</button>)}</div></div>
            <div><div className="text-sm mb-2">{t('价格', 'Price')}</div><div className="flex flex-wrap gap-2">{PRICE_RANGES.map(r => <button key={r.id} className={chip(price === r.id)} onClick={() => setPrice(r.id)}>{tl(r)}</button>)}</div></div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <button className="underline text-sm" onClick={reset}>{t('清除', 'Clear all')}</button>
              <button className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold" onClick={() => setFiltersOpen(false)}>{t(`显示 ${filtered.length} 个楼盘`, `Show ${filtered.length} projects`)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
