import { LangToggle, useLang } from '../lib/i18n.jsx'
import { Logo } from './ui.jsx'
import { HoldChip } from './HolderSheet.jsx'
import { useSkin, skinHref } from '../lib/cardSkin.jsx'

export function NavTabs({ active, className = '' }) {
  const { t } = useLang()
  const skin = useSkin()
  const tab = (id, href, zh, en) => {
    const on = active === id
    return (
      <a href={skinHref(href)} data-testid={`nav-${id}`}
        className="flex-1 sm:flex-none text-center px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap"
        style={on
          ? { background: skin.navOn, color: skin.navOnInk }
          : { color: skin.muted }}>
        {t(zh, en)}
      </a>
    )
  }
  return (
    <nav
      className={`flex items-center gap-1 p-0.5 rounded-full ${className}`}
      style={{ background: skin.navTrack, border: `1px solid ${skin.line}` }}
      aria-label={t('栏目', 'Sections')}
    >
      {tab('launches', '#/', '新楼盘', 'New launches')}
      {tab('map', '#/map', '租金回报地图', 'Yield map')}
    </nav>
  )
}

export function AppNav({ active, end, below }) {
  const skin = useSkin()
  return (
    <header className="sticky top-0 z-[1100] backdrop-blur" style={{ background: skin.headerBg, borderBottom: `1px solid ${skin.line}` }}>
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 sm:h-[72px]">
        <Logo compact />
        <div className="hidden sm:block"><NavTabs active={active} /></div>
        <div className="flex-1 min-w-0" />
        {end}
        <HoldChip />
        <LangToggle />
      </div>
      <div className="sm:hidden px-4 pb-2">
        <NavTabs active={active} />
      </div>
      {below ? <div className="px-4 sm:px-6 pb-2 max-w-xl mx-auto w-full">{below}</div> : null}
    </header>
  )
}
