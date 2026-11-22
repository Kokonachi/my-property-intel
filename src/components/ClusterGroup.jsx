import L from '../lib/leaflet-globals.js'
import { createPathComponent } from '@react-leaflet/core'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { yieldBand } from '../data/properties.js'

// Cluster bubble coloured by the average yield of its children.
function iconCreate(cluster) {
  const ms = cluster.getAllChildMarkers()
  const ys = ms.map(m => m.options.yieldVal).filter(v => v != null)
  const avg = ys.length ? ys.reduce((s, v) => s + v, 0) / ys.length : null
  const color = avg == null ? '#64748b' : yieldBand(avg).color
  const n = ms.length
  const size = n < 5 ? 40 : n < 15 ? 46 : 54
  return L.divIcon({
    className: 'yield-cluster',
    iconSize: [size, size],
    // Sit above the centroid so the KLCC cluster does not cover the city name.
    iconAnchor: [size / 2, size + 8],
    html: `<div style="--c:${color};width:${size}px;height:${size}px" data-cluster="${n}">
      <b>${n}</b><span>${avg == null ? '—' : avg.toFixed(1) + '%'}</span></div>`,
  })
}

const ClusterGroup = createPathComponent(({ children: _c, ...props }, ctx) => {
  const instance = L.markerClusterGroup({
    iconCreateFunction: iconCreate,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: 48,
    disableClusteringAtZoom: 16,
    ...props,
  })
  return { instance, context: { ...ctx, layerContainer: instance } }
})

export default ClusterGroup
