import { useEffect, useState } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from '../lib/leaflet-globals.js'
import { LangToggle, useLang } from '../lib/i18n.jsx'
import { REAL, yieldOf } from '../data/real.js'
import { LAUNCHES } from '../data/launches.js'
import { REGIONS, yieldBand } from '../data/properties.js'
import Basemap from '../components/Basemap.jsx'
import { FitLaunches, LaunchMarkers, LaunchStrip, LaunchLegend } from '../components/LaunchPins.jsx'
import { placeYieldMarkers } from '../lib/markerClearance.js'

const onMapOk = p => p.lat != null && p.lng != null
const bandColor = v => (v == null ? '#94a3b8' : yieldBand(v).color)

function pillIcon(p, y) {
  if (y == null) {
    return L.divIcon({
      className: 'ab-pill nodata',
      html: `<div data-pid="${p.id}" title="No yield"><i></i></div>`,
      iconSize: [0, 0], iconAnchor: [0, 0],
    })
  }
  return L.divIcon({
    className: 'ab-pill',
    html: `<div data-pid="${p.id}"><i style="background:${bandColor(y)}"></i>${y.toFixed(1)}%</div>`,
    iconSize: [0, 0], iconAnchor: [0, 0],
  })
}

function ClickDeselect({ onClick }) {
  useMapEvents({ click: () => onClick() })
  return null
}

/** Individual yield pills, nudged off launch pins so both stay readable. */
function ClearedYieldMarkers({ launches }) {
  const map = useMap()
  const [, setTick] = useState(0)
  useEffect(() => {
    const upd = () => setTick(n => n + 1)
    map.on('zoomend', upd)
    map.on('moveend', upd)
    return () => { map.off('zoomend', upd); map.off('moveend', upd) }
  }, [map])
  const projects = REAL.filter(onMapOk)
  const placed = placeYieldMarkers(map, projects, launches)
  return (
    <>
      {projects.map(p => {
        const y = yieldOf(p, 'long', 'gross')
        const pos = placed[p.id] || [p.lat, p.lng]
        return (
          <Marker key={p.id} position={pos} icon={pillIcon(p, y)}
            zIndexOffset={Math.round((y ?? 0) * 10)}
            eventHandlers={{
              click: e => { L.DomEvent.stopPropagation(e); window.location.hash = `#/property/${p.id}` },
            }} />
        )
      })}
    </>
  )
}

export default function LaunchHub() {
  const { t } = useLang()
  const [sel, setSel] = useState(null)

  const select = id => {
    setSel(id)
    requestAnimationFrame(() => {
      document.getElementById(`strip-${id}`)?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    })
  }

  useEffect(() => {
    if (!sel) return
    document.getElementById(`strip-${sel}`)?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [sel])

  return (
    <div className="relative h-full bg-slate-200 home-map" data-testid="launch-home">
      <MapContainer center={REGIONS.kv.center} zoom={15} zoomSnap={0.25} zoomDelta={0.5} maxZoom={19} minZoom={5} className="absolute inset-0" zoomControl={false} attributionControl data-testid="home-map">
        <Basemap kind="map" hideShields />
        <ClickDeselect onClick={() => setSel(null)} />
        <FitLaunches launches={LAUNCHES} selectedId={null} padBottom={248} />
        <ClearedYieldMarkers launches={LAUNCHES} />
        <LaunchMarkers launches={LAUNCHES} selectedId={sel} onSelect={select} />
      </MapContainer>

      <div className="absolute top-0 left-0 right-0 z-[800] pt-3 px-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <a href="#/" className="shrink-0 flex items-center gap-2 rounded-full bg-white/95 shadow pl-0.5 pr-3 h-10" aria-label={t('马来西亚房地产智能平台', 'Malaysia Property Intelligence')}>
            <span className="h-9 w-9 rounded-full bg-blue-600 text-white grid place-items-center font-black text-xs">MY</span>
            <span className="hidden sm:block text-[13px] font-bold text-slate-900 pr-1">{t('新楼盘', 'New launches')}</span>
          </a>
          <div className="flex-1 min-w-0" />
          <a href="#/map" data-testid="nav-map"
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/95 shadow px-2.5 h-10 text-[12px] font-semibold text-slate-800">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="2.2" /><circle cx="16.5" cy="15" r="2.2" /><path d="M8 10.2v6.3c0 .7.6 1.2 1.2.9L16.5 13" /></svg>
            {t('回报地图', 'Yield map')}
          </a>
          <LangToggle className="h-10" />
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-0 z-[700] pt-6 pb-[max(10px,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/40 via-black/10 to-transparent">
        <div className="px-3 mb-2" data-testid="home-legend"><LaunchLegend /></div>
        <LaunchStrip launches={LAUNCHES} selectedId={sel} onSelect={select} />
      </div>
    </div>
  )
}
