import { useEffect, useState } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from '../lib/leaflet-globals.js'
import { LangToggle, useLang } from '../lib/i18n.jsx'
import { HoldChip } from '../components/HolderSheet.jsx'
import { REAL, yieldOf } from '../data/real.js'
import { LAUNCHES, launchById } from '../data/launches.js'
import { REGIONS, yieldBand } from '../data/properties.js'
import Basemap from '../components/Basemap.jsx'
import { LaunchMarkers, LaunchLegend } from '../components/LaunchPins.jsx'
import LaunchPanel from '../components/LaunchPanel.jsx'
import { placeYieldMarkers, mergeYieldMarkers } from '../lib/markerClearance.js'
import { fitExploreMap } from '../lib/exploreFit.js'

const onMapOk = p => p.lat != null && p.lng != null
const bandColor = v => (v == null ? '#94a3b8' : yieldBand(v).color)

function pillIcon(p, y, n = 1) {
  if (y == null) {
    return L.divIcon({
      className: 'ab-pill nodata',
      html: `<div data-pid="${p.id}" title="No yield"><i></i></div>`,
      iconSize: [0, 0], iconAnchor: [0, 0],
    })
  }
  const merged = n > 1
  const label = merged ? `${y.toFixed(1)}% · ${n}` : `${y.toFixed(1)}%`
  return L.divIcon({
    className: 'ab-pill' + (merged ? ' merged' : ''),
    html: `<div data-pid="${p.id}" data-n="${n}"><i style="background:${bandColor(y)}"></i>${label}</div>`,
    iconSize: [0, 0], iconAnchor: [0, 0],
  })
}

function ClickDeselect({ onClick }) {
  useMapEvents({ click: () => onClick() })
  return null
}

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
  const groups = mergeYieldMarkers(map, placed, projects, p => yieldOf(p, 'long', 'gross'))
  return (
    <>
      {groups.map(g => {
        const y = g.y
        return (
          <Marker key={g.id} position={g.pos} icon={pillIcon(g.p, y, g.n)}
            zIndexOffset={Math.round((y ?? 0) * 2)}
            eventHandlers={{
              click: e => {
                L.DomEvent.stopPropagation(e)
                if (g.n > 1) {
                  map.setView(g.pos, Math.min(19, (map.getZoom() || 15) + 1.25))
                  return
                }
                window.location.hash = `#/property/${g.p.id}`
              },
            }} />
        )
      })}
    </>
  )
}

function FitExplore({ launches, panelOpen }) {
  const map = useMap()
  useEffect(() => {
    fitExploreMap(map, { launches, panelOpen })
  }, [map, launches, panelOpen])
  return null
}

export default function LaunchExplore({ focusId }) {
  const { t } = useLang()
  const [sel, setSel] = useState(focusId || null)
  useEffect(() => { if (focusId) setSel(focusId) }, [focusId])

  const select = id => {
    setSel(id)
    const next = `#/explore/${id}`
    if (window.location.hash !== next) history.replaceState(null, '', next)
  }
  const close = () => {
    setSel(null)
    if (window.location.hash !== '#/explore') history.replaceState(null, '', '#/explore')
  }
  const selected = sel ? launchById(sel) : null

  return (
    <div className={`relative h-full bg-slate-200 explore-map${selected ? ' panel-open' : ''}`} data-testid="explore-map">
      <MapContainer center={REGIONS.kv.center} zoom={15} zoomSnap={0.25} zoomDelta={0.5} maxZoom={19} minZoom={5} className="absolute inset-0" zoomControl={false} attributionControl>
        <Basemap kind="map" hideShields />
        <ClickDeselect onClick={close} />
        <FitExplore launches={LAUNCHES} panelOpen={!!selected} />
        <ClearedYieldMarkers launches={LAUNCHES} />
        <LaunchMarkers launches={LAUNCHES} selectedId={sel} onSelect={select} />
      </MapContainer>

      <div className="absolute top-0 left-0 right-0 z-[900] pt-3 px-3 pointer-events-none" data-testid="explore-chrome">
        <div className="flex items-center gap-2 pointer-events-auto">
          <a href="#/" data-testid="back-home" className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/95 shadow pl-2 pr-3 h-10 text-[13px] font-bold text-slate-900">
            <span aria-hidden="true">←</span>
            {t('新楼盘', 'New launches')}
          </a>
          <div className="flex-1 min-w-0" />
          <a href="#/map" data-testid="nav-map"
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/95 shadow px-2.5 h-10 text-[12px] font-semibold text-slate-800">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="2.2" /><circle cx="16.5" cy="15" r="2.2" /><path d="M8 10.2v6.3c0 .7.6 1.2 1.2.9L16.5 13" /></svg>
            {t('回报地图', 'Yield map')}
          </a>
          <HoldChip className="h-10" />
          <LangToggle className="h-10" />
        </div>
      </div>

      {!selected && (
        <div className="absolute left-3 z-[800] bottom-[max(12px,env(safe-area-inset-bottom))]">
          <LaunchLegend />
        </div>
      )}

      {selected && (
        <div className="launch-dock">
          <LaunchPanel p={selected} onClose={close} />
        </div>
      )}
    </div>
  )
}
