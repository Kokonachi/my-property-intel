/** Side map used on completed-project detail. Visuals must stay in sync with MapPage (pins, legend, layers, zoom). */
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Circle, Tooltip, useMapEvents, useMap } from 'react-leaflet'
import L from '../lib/leaflet-globals.js'
import { AREAS, REGIONS, yieldBand, BANDS } from '../data/properties.js'
import { REAL, realAreaStats, yieldOf } from '../data/real.js'
import ClusterGroup from './ClusterGroup.jsx'
import Basemap from './Basemap.jsx'
import { useLang } from '../lib/i18n.jsx'
import { LAUNCHES } from '../data/launches.js'
import { LaunchMarkers } from './LaunchPins.jsx'

const onMapOk = p => p.lat != null && p.lng != null
const bandColor = v => (v == null ? '#94a3b8' : yieldBand(v).color)

export function pillIcon(p, y, active) {
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
  return <Marker position={[3.148, 101.668]} icon={icon} interactive={false} keyboard={false} zIndexOffset={2500} />
}

function MapViewSetup({ focus, onMove, onClick }) {
  const map = useMapEvents({ moveend: () => onMove?.(map.getBounds()), click: () => onClick?.() })
  useEffect(() => {
    if (focus?.lat != null && focus?.lng != null) {
      // Zoom 16 is ClusterGroup's disableClusteringAtZoom, so the focused pin is not hidden in a bubble.
      map.setView([focus.lat, focus.lng], focus.zoom ?? 16, { animate: false })
    } else {
      const isM = map.getContainer().clientWidth < 768
      map.setView(isM ? [3.108, 101.662] : [3.102, 101.652], isM ? 12 : 11.75, { animate: false })
    }
    onMove?.(map.getBounds())
    window.__map = map
  }, [map, focus?.lat, focus?.lng, focus?.zoom, onMove])
  return null
}

/**
 * The completed-project yield map pane used on #/map (same markers, legend, layers, zoom).
 * Pass `focus` to centre on a project (detail side map).
 */
export default function YieldMapPane({
  focus = null,
  highlightedId = null,
  onPinClick,
  onLaunchClick,
  showSearchAsMove = false,
  className = 'absolute inset-0',
}) {
  const { t, L: tl } = useLang()
  const [metric, setMetric] = useState('gross')
  const rentMode = 'long'
  const [heat, setHeat] = useState(false)
  const [basemap, setBasemap] = useState('map')
  const [layersOpen, setLayersOpen] = useState(false)
  const [hover, setHover] = useState(null)
  const [selectedLaunch, setSelectedLaunch] = useState(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const markerRefs = useRef({})
  const activeId = highlightedId || hover
  const metricLabel = metric === 'gross' ? t('毛回报', 'Gross yield') : t('净回报', 'Net yield')
  const projects = REAL.filter(onMapOk)

  useEffect(() => {
    for (const p of projects) {
      const m = markerRefs.current[p.id]
      if (m) m.options.yieldVal = yieldOf(p, rentMode, metric) ?? undefined
    }
    clusterRef.current?.refreshClusters()
  }, [metric, rentMode])

  return (
    <>
      <MapContainer ref={mapRef} center={focus?.lat != null ? [focus.lat, focus.lng] : REGIONS.kv.center} zoom={focus?.lat != null ? (focus.zoom ?? 16) : 11.75} zoomSnap={0.25} zoomDelta={0.5} maxZoom={19} minZoom={5} className={className} zoomControl={false} attributionControl>
        <Basemap kind={basemap} />
        <MapViewSetup focus={focus} onClick={() => { setSelectedLaunch(null); setLayersOpen(false) }} />
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
          {projects.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={pillIcon(p, yieldOf(p, rentMode, metric), activeId === p.id)}
              yieldVal={yieldOf(p, rentMode, metric) ?? undefined}
              zIndexOffset={activeId === p.id ? 2000 : Math.round((yieldOf(p, rentMode, metric) ?? 0) * 10)}
              ref={el => { if (el) markerRefs.current[p.id] = el }}
              eventHandlers={{
                click: e => {
                  L.DomEvent.stopPropagation(e)
                  if (onPinClick) onPinClick(p.id)
                },
                mouseover: () => setHover(p.id), mouseout: () => setHover(null),
              }} />
          ))}
        </ClusterGroup>
        <LaunchMarkers launches={LAUNCHES} selectedId={selectedLaunch} onSelect={id => {
          setSelectedLaunch(id)
          if (onLaunchClick) onLaunchClick(id)
        }} />
      </MapContainer>

      {showSearchAsMove && (
        <div className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 z-[650]">
          <label className="flex items-center gap-2 bg-white rounded-full shadow-[0_3px_12px_rgba(15,23,42,.18)] px-3.5 py-2 text-[13px] font-medium text-slate-800 cursor-pointer whitespace-nowrap">
            <input type="checkbox" className="accent-slate-900 w-4 h-4" disabled />
            {t('移动地图时搜索', 'Search as I move the map')}
          </label>
        </div>
      )}
      <div className="absolute right-3 top-3 z-[660] flex flex-col items-end gap-2">
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
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col bg-white rounded-xl shadow-[0_3px_12px_rgba(15,23,42,.18)] overflow-hidden">
          <button className="w-9 h-9 text-lg hover:bg-slate-100" onClick={() => mapRef.current?.zoomIn()} aria-label="zoom in">+</button>
          <button className="w-9 h-9 text-lg hover:bg-slate-100 border-t border-slate-100" onClick={() => mapRef.current?.zoomOut()} aria-label="zoom out">−</button>
        </div>
      </div>
      <div className="absolute left-3 bottom-3 z-[640] bg-white/95 rounded-xl shadow px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-600 max-w-[calc(100%-1.5rem)]" data-testid="legend">
        {BANDS.map(b => <span key={b.key} className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: b.color }} />{b.label}</span>)}
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block bg-white border-2 border-slate-500" />{t('暂无回报', 'No yield')}</span>
        <span className="flex items-center gap-1.5 font-semibold text-slate-800"><span className="nl-legend-pin" aria-hidden="true" />{t('新盘', 'New')}</span>
        <span className="hidden md:inline border-l border-slate-200 pl-2 font-semibold text-slate-700">{metricLabel}</span>
      </div>
    </>
  )
}
