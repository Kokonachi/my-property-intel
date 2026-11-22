import { LangToggle, useLang } from '../lib/i18n.jsx'
import { Logo } from './ui.jsx'

export function NavTabs({ active, className = '' }) {
  const { t } = useLang()
  const tab = (id, href, zh, en) => (
    <a href={href} data-testid={`nav-${id}`}
      className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ${active === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
      {t(zh, en)}
    </a>
  )
  return (
    <nav className={`flex items-center gap-1 p-0.5 rounded-full bg-slate-100/80 border border-slate-200 ${className}`} aria-label={t('栏目', 'Sections')}>
      {tab('launches', '#/', '新楼盘', 'New launches')}
      {tab('map', '#/map', '租金回报地图', 'Yield map')}
    </nav>
  )
}

export function AppNav({ active, end }) {
  return (
    <header className="sticky top-0 z-[1100] border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 sm:h-[72px]">
        <Logo compact />
        <div className="hidden sm:block"><NavTabs active={active} /></div>
        <div className="flex-1 min-w-0" />
        {end}
        <LangToggle />
      </div>
      <div className="sm:hidden px-4 pb-2">
        <NavTabs active={active} />
      </div>
    </header>
  )
}
