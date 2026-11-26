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
  // KL batch 1 (scraper/kl_expand.py): Brickz towns; centres are the town centroids used for the location check
  { id: 'dh', zh: '白沙罗高原', en: 'Damansara Heights', region: 'kv', c: [3.1480, 101.6580], transit: ['MRT Semantan'], amen: [] },
  { id: 'hartamas', zh: '斯里哈达马斯', en: 'Sri Hartamas', region: 'kv', c: [3.1620, 101.6500], transit: [], amen: [] },
  { id: 'dutamas', zh: 'Dutamas', en: 'Dutamas', region: 'kv', c: [3.1720, 101.6640], transit: [], amen: [] },
  { id: 'dpc', zh: '德沙公园城', en: 'Desa ParkCity', region: 'kv', c: [3.1870, 101.6300], transit: [], amen: [] },
  { id: 'sentral', zh: '吉隆坡中环', en: 'KL Sentral', region: 'kv', c: [3.1340, 101.6860], transit: ['KL Sentral'], amen: [] },
  { id: 'bf', zh: '十五碑', en: 'Brickfields', region: 'kv', c: [3.1300, 101.6850], transit: [], amen: [] },
  { id: 'mv', zh: '谷中城', en: 'Mid Valley', region: 'kv', c: [3.1180, 101.6770], transit: ['KTM Mid Valley'], amen: [] },
  { id: 'pantai', zh: 'Pantai', en: 'Pantai', region: 'kv', c: [3.1150, 101.6650], transit: [], amen: [] },
  { id: 'seputeh', zh: '士布爹', en: 'Seputeh', region: 'kv', c: [3.1140, 101.6800], transit: [], amen: [] },
  { id: 'td', zh: '德沙花园', en: 'Taman Desa', region: 'kv', c: [3.1030, 101.6830], transit: [], amen: [] },
  { id: 'okr', zh: '旧巴生路', en: 'Old Klang Road', region: 'kv', c: [3.0900, 101.6750], transit: [], amen: [] },
  { id: 'kl-kuchai', zh: 'Kuchai Lama', en: 'Kuchai Lama', region: 'kv', c: [3.0890, 101.6900], transit: [], amen: [] },
  { id: 'bj', zh: '武吉加里尔', en: 'Bukit Jalil', region: 'kv', c: [3.0580, 101.6900], transit: [], amen: [] },
  // Klang Valley batch 2 (scraper/kv_batch2.py): Brickz towns; centres from Nominatim, used for the location check
  { id: 'cheras', zh: '蕉赖', en: 'Cheras', region: 'kv', c: [3.0992, 101.7374], transit: [], amen: [] },
  { id: 'setapak', zh: '文良港', en: 'Setapak', region: 'kv', c: [3.1976, 101.7140], transit: [], amen: [] },
  { id: 'sentul', zh: '冼都', en: 'Sentul', region: 'kv', c: [3.1823, 101.6887], transit: [], amen: [] },
  { id: 'ampang-kl', zh: '安邦（吉隆坡）', en: 'Ampang (KL)', region: 'kv', c: [3.1618, 101.7354], transit: [], amen: [] },
  { id: 'kepong', zh: '甲洞', en: 'Kepong', region: 'kv', c: [3.2140, 101.6348], transit: [], amen: [] },
  { id: 'wangsa', zh: '旺沙玛朱', en: 'Wangsa Maju', region: 'kv', c: [3.2058, 101.7319], transit: [], amen: [] },
  { id: 'segambut', zh: '泗岩沫', en: 'Segambut', region: 'kv', c: [3.1864, 101.6642], transit: [], amen: [] },
  { id: 'jkuching', zh: '古晋路', en: 'Jalan Kuching', region: 'kv', c: [3.1786, 101.6729], transit: [], amen: [] },
  { id: 'srip', zh: '大城堡', en: 'Sri Petaling', region: 'kv', c: [3.0614, 101.6871], transit: [], amen: [] },
  { id: 'desap', zh: 'Desa Petaling', en: 'Desa Petaling', region: 'kv', c: [3.0842, 101.7036], transit: [], amen: [] },
  { id: 'batucaves-kl', zh: '黑风洞（吉隆坡）', en: 'Batu Caves (KL)', region: 'kv', c: [3.2282, 101.6893], transit: [], amen: [] },
  { id: 'bts', zh: '南湖镇', en: 'Bandar Tasik Selatan', region: 'kv', c: [3.0761, 101.7113], transit: [], amen: [] },
  { id: 'jipoh', zh: '怡保路', en: 'Jalan Ipoh', region: 'kv', c: [3.1893, 101.6811], transit: [], amen: [] },
  { id: 'jinjang', zh: '增江', en: 'Jinjang', region: 'kv', c: [3.2095, 101.6558], transit: [], amen: [] },
  { id: 'ttdi', zh: '敦依斯迈花园', en: 'Taman Tun Dr Ismail', region: 'kv', c: [3.1361, 101.6307], transit: [], amen: [] },
  { id: 'sgbesi', zh: '新街场', en: 'Sungai Besi', region: 'kv', c: [3.0652, 101.7109], transit: [], amen: [] },
  { id: 'menjalara', zh: '文明阁', en: 'Bandar Menjalara', region: 'kv', c: [3.1941, 101.6272], transit: [], amen: [] },
  { id: 'salak', zh: '沙叻南', en: 'Salak South', region: 'kv', c: [3.0983, 101.7050], transit: [], amen: [] },
  { id: 'setiawangsa', zh: 'Setiawangsa', en: 'Setiawangsa', region: 'kv', c: [3.1828, 101.7452], transit: [], amen: [] },
  { id: 'keramat', zh: '吉拉末', en: 'Keramat', region: 'kv', c: [3.1650, 101.7319], transit: [], amen: [] },
  { id: 'pj', zh: '八打灵再也', en: 'Petaling Jaya', region: 'kv', c: [3.0989, 101.6454], transit: [], amen: [] },
  { id: 'ampang', zh: '安邦', en: 'Ampang', region: 'kv', c: [3.1505, 101.7602], transit: [], amen: [] },
  { id: 'puchong', zh: '蒲种', en: 'Puchong', region: 'kv', c: [3.0342, 101.6170], transit: [], amen: [] },
  { id: 'shahalam', zh: '莎阿南', en: 'Shah Alam', region: 'kv', c: [3.0739, 101.5185], transit: [], amen: [] },
  { id: 'cheras-sel', zh: '蕉赖（雪兰莪）', en: 'Cheras (Selangor)', region: 'kv', c: [3.0731, 101.7627], transit: [], amen: [] },
  { id: 'klang', zh: '巴生', en: 'Klang', region: 'kv', c: [3.0448, 101.4447], transit: [], amen: [] },
  { id: 'kajang', zh: '加影', en: 'Kajang', region: 'kv', c: [2.9948, 101.7897], transit: [], amen: [] },
  { id: 'serikembangan', zh: '沙登', en: 'Seri Kembangan', region: 'kv', c: [3.0341, 101.7056], transit: [], amen: [] },
  { id: 'ulukelang', zh: 'Ulu Kelang', en: 'Ulu Kelang', region: 'kv', c: [3.2202, 101.7770], transit: [], amen: [] },
  { id: 'sunway', zh: '双威', en: 'Sunway', region: 'kv', c: [3.0836, 101.6107], transit: [], amen: [] },
  { id: 'rawang', zh: '万挠', en: 'Rawang', region: 'kv', c: [3.3189, 101.5750], transit: [], amen: [] },
  { id: 'bangi', zh: '万宜', en: 'Bangi', region: 'kv', c: [2.9040, 101.7863], transit: [], amen: [] },
  { id: 'kotadamansara', zh: '哥打白沙罗', en: 'Kota Damansara', region: 'kv', c: [3.1537, 101.5935], transit: [], amen: [] },
  { id: 'sgbuloh', zh: '双溪毛糯', en: 'Sungai Buloh', region: 'kv', c: [3.2063, 101.5818], transit: [], amen: [] },
  { id: 'kinrara', zh: '金銮镇', en: 'Bandar Kinrara', region: 'kv', c: [3.0460, 101.6463], transit: [], amen: [] },
  { id: 'setiaalam', zh: 'Setia Alam', en: 'Setia Alam', region: 'kv', c: [3.1078, 101.4621], transit: [], amen: [] },
  { id: 'selayang', zh: '士拉央', en: 'Selayang', region: 'kv', c: [3.2537, 101.6539], transit: [], amen: [] },
  { id: 'kepong-sel', zh: '甲洞（雪兰莪）', en: 'Kepong (Selangor)', region: 'kv', c: [3.2087, 101.6285], transit: [], amen: [] },
  { id: 'aradamansara', zh: 'Ara Damansara', en: 'Ara Damansara', region: 'kv', c: [3.1084, 101.5867], transit: [], amen: [] },
  { id: 'bukitraja', zh: '武吉拉惹', en: 'Bukit Raja', region: 'kv', c: [3.0694, 101.4699], transit: [], amen: [] },
  { id: 'dperdana', zh: 'Damansara Perdana', en: 'Damansara Perdana', region: 'kv', c: [3.1701, 101.6048], transit: [], amen: [] },
  { id: 'ddamai', zh: 'Damansara Damai', en: 'Damansara Damai', region: 'kv', c: [3.1998, 101.5929], transit: [], amen: [] },
  { id: 'bsd', zh: '斯里白沙罗', en: 'Bandar Sri Damansara', region: 'kv', c: [3.1935, 101.6128], transit: [], amen: [] },
  { id: 'batucaves', zh: '黑风洞', en: 'Batu Caves', region: 'kv', c: [3.2378, 101.6814], transit: [], amen: [] },
  { id: 'serendah', zh: 'Serendah', en: 'Serendah', region: 'kv', c: [3.3760, 101.6145], transit: [], amen: [] },
  { id: 'semenyih', zh: '士毛月', en: 'Semenyih', region: 'kv', c: [2.9474, 101.8460], transit: [], amen: [] },
  { id: 'kapar', zh: '加埔', en: 'Kapar', region: 'kv', c: [3.1377, 101.3732], transit: [], amen: [] },
  { id: 'balakong', zh: '无拉港', en: 'Balakong', region: 'kv', c: [3.0291, 101.7472], transit: [], amen: [] },
  { id: 'tropicana', zh: 'Tropicana', en: 'Tropicana', region: 'kv', c: [3.1305, 101.6271], transit: [], amen: [] },
  { id: 'puncakalam', zh: 'Puncak Alam', en: 'Puncak Alam', region: 'kv', c: [3.2342, 101.4258], transit: [], amen: [] },
  { id: 'bu', zh: '万达镇', en: 'Bandar Utama', region: 'kv', c: [3.1469, 101.6187], transit: [], amen: [] },
  { id: 'mutiara', zh: 'Mutiara Damansara', en: 'Mutiara Damansara', region: 'kv', c: [3.1601, 101.6089], transit: [], amen: [] },
  { id: 'sglong', zh: '双溪龙', en: 'Sungai Long', region: 'kv', c: [3.0401, 101.7883], transit: [], amen: [] },
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
