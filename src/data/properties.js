// Shared constants & helpers. All project data is real (scraper → src/data/real_projects.json); no sample data.

export const REGIONS = {
  kv: { id: 'kv', zh: '巴生谷', en: 'Klang Valley', center: [3.105, 101.665], zoom: 11 },
}

// areas covered by the scrape (centre used for the heat layer; transit/amenities shown on detail pages)
export const AREAS = [
  { id: 'klcc', zh: '吉隆坡城中城', en: 'KLCC', region: 'kv', c: [3.1578, 101.7123],
    transit: ['LRT KLCC (Kelana Jaya Line)', 'MRT Persiaran KLCC (Putrajaya Line)'], amen: ['Suria KLCC', 'KLCC Park', 'Gleneagles KL', 'Pavilion KL'] },
  { id: 'bb', zh: '武吉免登', en: 'Bukit Bintang', region: 'kv', c: [3.1466, 101.7108],
    transit: ['MRT Bukit Bintang', 'Monorail Bukit Bintang', 'MRT TRX'], amen: ['Pavilion KL', 'The Exchange TRX', 'Lot 10', 'Berjaya Times Square'] },
  { id: 'mk', zh: '满家乐', en: 'Mont Kiara', region: 'kv', c: [3.1701, 101.6512],
    transit: ['MRT Sri Hartamas (planned)', 'Bus T852 to MRT Semantan'], amen: ['Publika', '163 Retail Park', 'Mont Kiara Int’l School', 'Garden International School'] },
  { id: 'bs', zh: '孟沙', en: 'Bangsar', region: 'kv', c: [3.1300, 101.6720],
    transit: ['LRT Bangsar', 'KL Sentral (1.5 km)'], amen: ['Bangsar Village', 'Bangsar Shopping Centre', 'Pantai Hospital KL', 'Mid Valley Megamall'] },
  { id: 'bss', zh: '孟沙南', en: 'Bangsar South', region: 'kv', c: [3.1105, 101.6655],
    transit: ['LRT Kerinchi', 'LRT Universiti', 'LRT Abdullah Hukum'], amen: ['Nexus Bangsar South', 'Mid Valley Megamall', 'Universiti Malaya', 'KL Eco City'] },
  { id: 'sj', zh: '梳邦再也', en: 'Subang Jaya', region: 'kv', c: [3.0490, 101.5850],
    transit: ['LRT SS15', 'LRT USJ 7', 'KTM Subang Jaya'], amen: ['Sunway Pyramid', 'Subang Parade', 'Sunway Medical Centre', 'Taylor’s University'] },
]

export const TYPE_LABEL = {
  Condo: { zh: '公寓', en: 'Condo' },
  'Serviced Residence': { zh: '服务式公寓', en: 'Serviced Residence' },
  Landed: { zh: '有地住宅', en: 'Landed' },
}

export const areaById = Object.fromEntries(AREAS.map(a => [a.id, a]))

export function yieldBand(y) {
  if (y < 4) return { key: 'b1', color: '#94a3b8', label: '< 4%' }
  if (y < 5) return { key: 'b2', color: '#3b82f6', label: '4–5%' }
  if (y < 6) return { key: 'b3', color: '#f59e0b', label: '5–6%' }
  return { key: 'b4', color: '#16a34a', label: '> 6%' }
}
export const BANDS = [yieldBand(3), yieldBand(4.5), yieldBand(5.5), yieldBand(6.5)]

export function distKm(a, b) {
  const R = 6371, toR = x => x * Math.PI / 180
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const fmtRM = v => 'RM ' + Math.round(v).toLocaleString('en-MY')
export const fmtRMk = v => v >= 1e6 ? `RM ${(v / 1e6).toFixed(2)}M` : `RM ${Math.round(v / 1000)}k`

/** Brickz sometimes stores “Kl Gateway”; show “KL Gateway”. */
export function displayName(pOrName) {
  const n = typeof pOrName === 'string' ? pOrName : pOrName?.name
  return (n || '').replace(/^Kl\b/, 'KL')
}
