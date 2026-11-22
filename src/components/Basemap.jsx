import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from '../lib/leaflet-globals.js'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-leaflet'

export const OFM_ATTR = '&copy; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
export const ESRI_ATTR = 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'

// kind: 'map' (OpenFreeMap Positron vector, via MapLibre GL) | 'sat' (Esri World Imagery + place labels)

// Hide the mid-zoom "Kuala Lumpur" typeset so the KLCC cluster does not cover "pur".
// Other city labels (Petaling Jaya, Subang Jaya, Ampang) stay. We draw our own haloed label.
function hideKualaLumpurLabel(glMap) {
  if (!glMap || glMap.__klLabelHidden) return
  const notKl = ['!=', ['downcase', ['to-string', ['coalesce', ['get', 'name_en'], ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]]], 'kuala lumpur']
  try {
    if (glMap.getLayer('label_city')) {
      glMap.setFilter('label_city', ['all', ['==', ['get', 'class'], 'city'], ['!=', ['get', 'capital'], 2], notKl])
    }
    if (glMap.getLayer('label_city_capital')) {
      glMap.setFilter('label_city_capital', ['all', ['==', ['get', 'class'], 'city'], ['==', ['get', 'capital'], 2], notKl])
    }
    glMap.__klLabelHidden = true
  } catch (e) { /* style may still be swapping */ }
}

// Hide highway number shields (the "2" next to Aviera is Federal Route 2).
// Optional, used on the new-launch home map so a shield is not read as a UI badge.
function hideRoadShields(glMap) {
  if (!glMap || glMap.__shieldsHidden) return
  try {
    const layers = glMap.getStyle?.()?.layers || []
    for (const layer of layers) {
      const id = layer.id || ''
      const src = layer['source-layer'] || ''
      if (/shield/i.test(id) || /shield/i.test(src)) {
        glMap.setLayoutProperty(id, 'visibility', 'none')
      }
    }
    glMap.__shieldsHidden = true
  } catch (e) { /* style may still be swapping */ }
}

export default function Basemap({ kind = 'map', hideShields = false }) {

  const map = useMap()
  useEffect(() => {
    const layers = []
    if (kind === 'sat') {
      layers.push(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, className: 'basemap-sat' }))
      layers.push(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, className: 'basemap-sat-labels' }))
    } else {
      const gl = L.maplibreGL({ style: 'https://tiles.openfreemap.org/styles/positron', interactive: false })
      layers.push(gl)
      const hook = () => {
        const glMap = gl.getMaplibreMap?.() || gl._maplibre || gl._glMap
        if (!glMap) return false
        const apply = () => {
          hideKualaLumpurLabel(glMap)
          if (hideShields) hideRoadShields(glMap)
        }
        if (glMap.isStyleLoaded?.()) apply()
        else glMap.once?.('load', apply)
        return true
      }
      if (!hook()) {
        const t1 = setTimeout(hook, 400)
        const t2 = setTimeout(hook, 1200)
        // cleared in the effect cleanup via layers removal; timers are short
        gl._klTimers = [t1, t2]
      }
    }
    const attr = kind === 'sat' ? ESRI_ATTR : OFM_ATTR
    layers.forEach(l => l.addTo(map))
    // The MapLibre plugin injects the style's own attribution and never removes it; own the list ourselves.
    const ac = map.attributionControl
    const reset = () => { if (ac) { ac._attributions = {}; ac.addAttribution(attr) } }
    reset()
    const t = setTimeout(reset, 1500)
    return () => { clearTimeout(t); layers.forEach(l => { (l._klTimers || []).forEach(clearTimeout); map.removeLayer(l) }); if (ac) { ac._attributions = {}; ac._update() } }
  }, [kind, map, hideShields])
  return null
}
