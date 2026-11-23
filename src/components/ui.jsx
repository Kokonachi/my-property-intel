import { useLang } from '../lib/i18n.jsx'
import { skinHref } from '../lib/cardSkin.jsx'

export function Logo({ compact = false }) {
  const { t } = useLang()
  return (
    <a href={skinHref("#/")} className="flex items-center gap-2 min-w-0">
      <div className="logo-mark h-8 w-8 shrink-0 rounded-xl bg-blue-600 text-white grid place-items-center font-black text-sm">MY</div>
      <div className="leading-tight min-w-0">
        <div className={`font-bold text-slate-900 text-sm skin-ink sm:text-base truncate ${compact ? 'max-sm:max-w-[11.5rem]' : ''}`}>{t('马来西亚房地产智能平台', 'Malaysia Property Intelligence')}</div>
        <div className="text-[12px] text-slate-600 truncate skin-muted">{t('新楼盘 · 租金回报', 'New launches · rental yield')}</div>
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
    <footer className="text-[12px] text-slate-600 leading-relaxed px-4 py-6 text-center">
      {t('※ 数据来自公开网页的小规模抓取（Brickz.my 成交中位价 + PropertyGuru / Mudah.my 叫租；有地住宅为区域同类房源估算）。净回报中的管理费、空置、门牌税等为估算假设。叫租不等于实际租金，仅供原型演示，不构成投资建议。',
        '※ Data from a small scrape of public pages (Brickz.my transacted medians + PropertyGuru / Mudah.my asking rents; landed rents are area-level estimates). Net-yield costs (maintenance, vacancy, assessment etc.) are estimated assumptions. Asking rents are not achieved rents. Prototype only — not investment advice.')}
      {' '}Map © OpenFreeMap / OpenMapTiles / OpenStreetMap contributors; imagery © Esri.
    </footer>
  )
}
