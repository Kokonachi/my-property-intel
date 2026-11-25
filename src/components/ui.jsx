import { useLang } from '../lib/i18n.jsx'

export function Logo({ compact = false }) {
  const { t } = useLang()
  return (
    <a href="#/" className="flex items-center gap-2 min-w-0">
      <div className="h-8 w-8 shrink-0 rounded-xl bg-blue-600 text-white grid place-items-center font-black text-sm">MY</div>
      <div className="leading-tight min-w-0">
        <div className={`font-bold text-slate-900 text-sm sm:text-base truncate ${compact ? 'max-sm:max-w-[11.5rem]' : ''}`}>{t('马来西亚房地产智能平台', 'Malaysia Property Intelligence')}</div>
        <div className="text-[12px] text-slate-600 truncate">{t('新楼盘 · 租金回报', 'New launches · rental yield')}</div>
      </div>
    </a>
  )
}

export function Bi({ zh, en, className = '' }) {
  const { t } = useLang()
  return <span className={className}>{t(zh, en)}</span>
}

export function Footer() {
  const { t } = useLang()
  return (
    <footer className="text-[11px] text-slate-400 leading-relaxed px-4 py-6 text-center">
      {t('估算 · 不构成投资建议 · 数据 Brickz / PropertyGuru / Mudah', 'Estimates · Not investment advice · Data Brickz / PropertyGuru / Mudah')}
      <br />Map © OpenFreeMap / OpenMapTiles / OpenStreetMap; imagery © Esri
    </footer>
  )
}
