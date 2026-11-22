import { Marker, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from '../lib/leaflet-globals.js'
import { useLang } from '../lib/i18n.jsx'
import { entryYield, launchBounds } from '../lib/launchEntry.js'
import { fmtRM, yieldBand } from '../data/properties.js'
import { LtvChips } from './LtvVerdict.jsx'

const BUILDING = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="1.85" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M5 20V9.2L12 5l7 4.2V20"/><path d="M9 20v-5.5h6V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"/></svg>`

const IMG_FALLBACK = `this.style.display='none';var f=this.nextElementSibling;if(f)f.style.display='grid'`

function pinInner({ src, badge, testid }) {
  const img = src
    ? `<span class="nl-photo"><img class="nl-thumb" src="${src}" alt="" width="156" height="156" decoding="async" onerror="${IMG_FALLBACK}" /><span class="nl-fallback" style="display:none">${BUILDING}</span></span>`
    : `<span class="nl-photo"><span class="nl-fallback">${BUILDING}</span></span>`
  return `<div data-testid="${testid}"><span class="nl-badge">${badge}</span>${img}</div>`
}

export function launchPinIcon({ id, active, badge, src }) {
  return L.divIcon({
    className: 'nl-pin' + (src ? ' nl-pin-photo' : '') + (active ? ' active' : ''),
    html: pinInner({ src, badge, testid: `launch-pin-${id}` }),
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export function FitLaunches({ launches, selectedId, padBottom = 24 }) {
  const map = useMap()
  useEffect(() => {
    const sel = selectedId && launches.find(p => p.id === selectedId)
    if (sel?.lat != null) {
      map.flyTo([sel.lat, sel.lng], Math.max(map.getZoom(), 16), { duration: 0.45 })
      return
    }
    const b = launchBounds(launches)
    if (!b) return
    const isM = map.getContainer().clientWidth < 768
    map.fitBounds(b, {
      paddingTopLeft: [36, isM ? 118 : 96],
      paddingBottomRight: [88, isM ? padBottom : 220],
      maxZoom: 16,
      animate: false,
    })
  }, [map, launches, selectedId, padBottom])
  return null
}

export function launchGroupIcon({ launches, badge }) {
  const thumbs = (launches || []).slice(0, 2).map((p, i) => {
    const src = p.render?.pin || p.render?.src
    if (src) return `<img class="nl-group-thumb nl-group-thumb-${i}" src="${src}" alt="" width="156" height="156" decoding="async" onerror="${IMG_FALLBACK}" /><span class="nl-fallback nl-group-thumb nl-group-thumb-${i}" style="display:none">${BUILDING}</span>`
    return `<span class="nl-fallback nl-group-thumb nl-group-thumb-${i}">${BUILDING}</span>`
  }).join('')
  return L.divIcon({
    className: 'nl-pin nl-pin-group',
    html: `<div data-testid="launch-pin-group"><span class="nl-badge">${badge}</span><span class="nl-group-stack">${thumbs}</span><b>2</b></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export function LaunchMarkers({ launches, selectedId, onSelect }) {
  const { lang } = useLang()
  const map = useMap()
  const [z, setZ] = useState(() => map.getZoom())
  useEffect(() => {
    const upd = () => setZ(map.getZoom())
    map.on('zoomend', upd)
    return () => map.off('zoomend', upd)
  }, [map])
  const badge = lang === 'zh' ? '新盘' : 'NEW'
  const pts = launches.filter(p => p.lat != null && p.lng != null)
  if (z < 14 && pts.length > 1) {
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
    return (
      <Marker
        key={`group-${lang}`}
        position={[lat, lng]}
        icon={launchGroupIcon({ launches: pts, badge })}
        zIndexOffset={4000}
        eventHandlers={{
          click: e => {
            L.DomEvent.stopPropagation(e)
            const b = launchBounds(pts)
            if (b) map.fitBounds(b, { padding: [48, 80], maxZoom: 16 })
          },
        }}
      />
    )
  }
  return (
    <>
      {pts.map(p => (
        <Marker
          key={`${p.id}-${lang}`}
          position={[p.lat, p.lng]}
          icon={launchPinIcon({ id: p.id, active: selectedId === p.id, badge, src: p.render?.pin || p.render?.src })}
          zIndexOffset={selectedId === p.id ? 4000 : 2800}
          eventHandlers={{
            click: e => { L.DomEvent.stopPropagation(e); onSelect?.(p.id) },
          }}
        />
      ))}
    </>
  )
}

function Chip({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-semibold px-2 py-0.5 shadow-sm">
      {icon}{children}
    </span>
  )
}

const cal = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4M16 4v4M4 10h16" /></svg>
)
const keyI = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="8" cy="14" r="3.5" /><path d="M11 14h9l-2 2 2 2" /></svg>
)
const unitI = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></svg>
)

export function LaunchCard({ p, selected, onSelect, variant = 'strip' }) {
  const { t } = useLang()
  const { typ, y } = entryYield(p)
  const color = y ? yieldBand(y.gross).color : '#0f172a'
  const tenure = /freehold/i.test(p.tenure) ? t('永久', 'Freehold') : t('99年', '99-yr')
  const wide = variant === 'peek'
  const media = p.render?.src ? (
    <>
      <img src={p.render.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
    </>
  ) : (
    <div className="absolute inset-0 bg-slate-800" />
  )
  const chips = (
    <div className="absolute inset-x-0 top-0 p-2 flex flex-wrap gap-1">
      <Chip>{t('新盘', 'NEW')}</Chip>
      <Chip icon={cal}>{p.expected_completion_year}</Chip>
      <Chip icon={keyI}>{tenure}</Chip>
    </div>
  )
  if (wide) {
    return (
      <a href={`#/launch/${p.id}`} data-testid={`launch-peek-${p.id}`} onClick={() => onSelect?.(p.id)}
        className={`relative flex overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_rgba(15,23,42,.28)] ring-2 ${selected ? 'ring-slate-900' : 'ring-transparent'}`}>
        <div className="relative w-[42%] min-h-[132px] shrink-0 bg-slate-200">
          {media}
          {chips}
        </div>
        <div className="p-3 min-w-0 flex-1">
          <div className="font-extrabold text-slate-900 text-[15px] leading-tight pr-1">{p.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Chip icon={unitI}>{p.total_units.toLocaleString('en-MY')}</Chip>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="font-extrabold text-slate-900 tabular-nums text-[18px] leading-none">
              {typ.price_from ? fmtRM(typ.price_from) : t('待报价', 'Ask')}
              {typ.price_from ? <span className="ml-0.5 text-[11px] font-semibold text-slate-500">{t(' 起', ' from')}</span> : null}
            </div>
            {y && <div className="font-extrabold text-2xl tabular-nums leading-none" style={{ color }}>{y.gross.toFixed(2)}%</div>}
          </div>
          <LtvChips price={typ.price_from} rentMo={y?.rentMo} className="mt-2" />
        </div>
      </a>
    )
  }
  return (
    <a href={`#/launch/${p.id}`} data-testid={`launch-card-${p.id}`} onClick={() => onSelect?.(p.id)}
      className={`group relative block shrink-0 w-[72vw] max-w-[280px] sm:max-w-none sm:w-[340px] snap-center overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,.22)] ring-2 transition ${selected ? 'ring-[#fde047] ring-offset-2 ring-offset-black/20' : 'ring-transparent'}`}>
      <div className="relative aspect-[16/10] bg-slate-700">
        {media}
        {!p.render?.src && (
          <div className="absolute inset-0 grid place-items-center text-white text-[12px] px-3 text-center">{t('暂无效果图', 'No render yet')}</div>
        )}
        {chips}
        <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0 text-white">
            <div className="font-extrabold text-[14px] leading-snug line-clamp-2 drop-shadow">{p.card_name || p.name}</div>
            <div className="font-extrabold tabular-nums text-[16px] leading-tight mt-0.5 drop-shadow">
              {typ.price_from ? fmtRM(typ.price_from) : t('待报价', 'Ask')}
              {typ.price_from ? <span className="ml-0.5 text-[11px] font-semibold text-white/80">{t(' 起', ' from')}</span> : null}
            </div>
          </div>
          {y && (
            <div className="shrink-0 rounded-xl px-2 py-1 text-white shadow" style={{ background: color }}>
              <div className="text-[16px] font-extrabold leading-none tabular-nums">{y.gross.toFixed(2)}%</div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-slate-950/95 px-2.5 py-1.5">
        <LtvChips price={typ.price_from} rentMo={y?.rentMo} />
      </div>
    </a>
  )
}

export function LaunchStrip({ launches, selectedId, onSelect }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-3 pb-1" data-testid="launch-strip">
      {launches.map(p => (
        <div key={p.id} id={`strip-${p.id}`}>
          <LaunchCard p={p} selected={selectedId === p.id} onSelect={onSelect} />
        </div>
      ))}
    </div>
  )
}

export function LaunchLegend() {
  const { t } = useLang()
  return (
    <div className="bg-white/95 rounded-xl shadow px-2.5 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-700" data-testid="launch-legend">
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <span className="nl-legend-pin" aria-hidden="true" />
        {t('新盘', 'New')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="w-5 h-3.5 rounded-full bg-white border border-slate-300 shadow-sm inline-flex items-center justify-center">
          <i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        </i>
        {t('已建成回报', 'Yield')}
      </span>
    </div>
  )
}
