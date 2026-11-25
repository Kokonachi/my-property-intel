// Official exterior photo (full bleed), or a thin colour band with the area name.
// Never a keyless map tile, a tall empty grey block, or a repeated project name.
import { TYPE_LABEL, displayName } from '../data/properties.js'
import { useLang } from '../lib/i18n.jsx'

const SRC_LABEL = {
  'PropertyGuru project': ['© PropertyGuru', '© PropertyGuru'],
  'PropertyGuru listing': ['© PropertyGuru', '© PropertyGuru'],
  'Mudah.my listing': ['© Mudah.my', '© Mudah.my'],
}

const AREA_TINT = {
  klcc: { bg: '#dbeafe', fg: '#1e40af' },
  bb: { bg: '#fce7f3', fg: '#9d174d' },
  mk: { bg: '#fef3c7', fg: '#92400e' },
  bs: { bg: '#dcfce7', fg: '#166534' },
  bss: { bg: '#e0e7ff', fg: '#3730a3' },
  sj: { bg: '#ffedd5', fg: '#9a3412' },
}

export default function ProjectPhoto({ p, className = '', compact = false, label = true, strip = false, hero = false }) {
  const { t, L } = useLang()
  const ph = p.photo
  if (ph) {
    const aerial = ph.kind === 'aerial'
    const [zh, en] = aerial ? ['© Esri', '© Esri'] : SRC_LABEL[ph.source] || ['© listing', '© listing']
    return (
      <div className={`relative overflow-hidden bg-slate-200 ${className}`} data-testid="photo" data-kind={ph.kind}>
        <img src={`${import.meta.env.BASE_URL}${ph.src}`} alt={displayName(p)} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        {label && !compact && <span className="absolute left-1.5 bottom-1.5 rounded bg-black/40 text-white/90 text-[10px] leading-none px-1 py-0.5 max-w-[90%] truncate" data-testid="photo-credit">{t(zh, en)}</span>}
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
  if (hero) {
    return (
      <div className={`overflow-hidden flex items-center justify-center ${className}`} style={{ background: '#eef1f4' }} data-testid="photo-fallback">
        <div className="px-5 text-center">
          <div className="text-[13px] font-medium text-slate-500">{area}</div>
          <div className="text-[12px] text-slate-400 mt-1">{t('暂无官方外观照片', 'No official exterior photo')}</div>
        </div>
      </div>
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
