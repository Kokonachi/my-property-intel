// Official exterior photo (full bleed), or a thin colour band with the area name.
// Never a keyless map tile, a tall empty grey block, or a repeated project name.
import { TYPE_LABEL, displayName } from '../data/properties.js'
import { useLang } from '../lib/i18n.jsx'

const SRC_LABEL = {
  'PropertyGuru project': ['照片：PropertyGuru 楼盘页', 'Photo: PropertyGuru project page'],
  'PropertyGuru listing': ['照片：PropertyGuru 房源', 'Photo: PropertyGuru listing'],
  'Mudah.my listing': ['照片：Mudah.my 房源', 'Photo: Mudah.my listing'],
}

const AREA_TINT = {
  klcc: { bg: '#dbeafe', fg: '#1e40af' },
  bb: { bg: '#fce7f3', fg: '#9d174d' },
  mk: { bg: '#fef3c7', fg: '#92400e' },
  bs: { bg: '#dcfce7', fg: '#166534' },
  bss: { bg: '#e0e7ff', fg: '#3730a3' },
  sj: { bg: '#ffedd5', fg: '#9a3412' },
}

export default function ProjectPhoto({ p, className = '', compact = false, label = true, strip = false }) {
  const { t, L } = useLang()
  const ph = p.photo
  if (ph) {
    const aerial = ph.kind === 'aerial'
    const [zh, en] = aerial ? ['卫星影像 © Esri', 'Satellite view © Esri'] : SRC_LABEL[ph.source] || ['照片：房源广告', 'Photo: listing']
    return (
      <div className={`relative overflow-hidden bg-slate-200 ${className}`} data-testid="photo" data-kind={ph.kind}>
        <img src={`${import.meta.env.BASE_URL}${ph.src}`} alt={displayName(p)} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        {label && <span className="absolute left-1.5 bottom-1.5 rounded bg-black/55 text-white text-[12px] leading-none px-1.5 py-1 max-w-[90%] truncate" data-testid="photo-credit">{t(zh, en)}</span>}
      </div>
    )
  }
  const tint = AREA_TINT[p.area] || { bg: '#e8eef4', fg: '#334155' }
  const area = L({ zh: p.area_zh, en: p.area_en })
  const typ = L(TYPE_LABEL[p.type] || {})
  if (compact || strip) {
    return (
      <div className={`shrink-0 ${className}`} style={{ background: tint.bg }} data-testid="photo-fallback" title={area} aria-hidden />
    )
  }
  return (
    <div className={`overflow-hidden flex items-center ${className}`} style={{ background: tint.bg }} data-testid="photo-fallback">
      <div className="px-3 py-2 text-[12px] font-semibold truncate" style={{ color: tint.fg }}>
        {area}{typ ? ` · ${typ}` : ''}
      </div>
    </div>
  )
}
