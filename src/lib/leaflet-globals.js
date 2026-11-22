// Leaflet plugins (markercluster, maplibre-gl-leaflet) expect globals; ES imports are hoisted,
// so this must be its own module imported BEFORE those plugins.
import L from 'leaflet'
import maplibregl from 'maplibre-gl'
window.L = window.L || L
window.maplibregl = window.maplibregl || maplibregl
export default L
