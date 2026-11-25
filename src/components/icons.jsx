/** Lucide-style 24px stroke icons, drawn here so we do not add an icon package.
 *  Visual language inspired by lucide-icons/lucide (ISC). Not a copy of their files. */
import { useId } from 'react'

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function Icon({ children, size = 18, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" {...S} {...rest}>
      {children}
    </svg>
  )
}

export function IconKey(p) {
  return (
    <Icon {...p}>
      <circle cx="7" cy="14" r="3.6" />
      <path d="M10.6 14H21" />
      <path d="M17.5 14v3.6" />
      <path d="M20.5 14v2.6" />
    </Icon>
  )
}

export function IconWallet(p) {
  return (
    <Icon {...p}>
      <path d="M5 7.2h12.5" />
      <rect x="3.5" y="7.2" width="17" height="12.3" rx="2.2" />
      <path d="M15.2 13.4h5.3v2.6H15.2a1.3 1.3 0 0 1 0-2.6z" />
    </Icon>
  )
}

export function IconHouse(p) {
  return (
    <Icon {...p}>
      <path d="M4 11.5L12 4l8 7.5" />
      <path d="M6.5 10.5V20h11V10.5" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  )
}

export function IconCoins(p) {
  return (
    <Icon {...p}>
      <ellipse cx="12" cy="6.5" rx="7" ry="2.6" />
      <path d="M5 6.5v3.2c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6.5" />
      <path d="M5 9.7v3.3c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V9.7" />
      <path d="M5 13v3.3c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V13" />
    </Icon>
  )
}

export function IconArrowUp(p) {
  return (
    <Icon {...p}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </Icon>
  )
}

export function IconArrowDown(p) {
  return (
    <Icon {...p}>
      <path d="M12 5v14" />
      <path d="M18 13l-6 6-6-6" />
    </Icon>
  )
}

export function IconInfo(p) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.5" r="0.7" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconCalendar(p) {
  return (
    <Icon {...p}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
    </Icon>
  )
}

export function IconFile(p) {
  return (
    <Icon {...p}>
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14 3.5V9h5.5" />
    </Icon>
  )
}

export function IconStamp(p) {
  return (
    <Icon {...p}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
      <circle cx="12" cy="12" r="3.2" />
    </Icon>
  )
}

export function IconBrush(p) {
  return (
    <Icon {...p}>
      <path d="M14.5 4.5l5 5-8.2 8.2H6.3v-5l8.2-8.2z" />
      <path d="M6.3 17.7c0 2-1.5 2.8-3 2.8 1 0 1.8-1.5 1.8-2.8" />
    </Icon>
  )
}

export function IconScore(p) {
  return (
    <Icon {...p}>
      <polygon points="12,3 14.5,9 21,9.5 16,14 17.5,20.5 12,17.2 6.5,20.5 8,14 3,9.5 9.5,9" />
    </Icon>
  )
}

export function IconPsf(p) {
  return (
    <Icon {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 14h16" />
      <path d="M14 4v16" />
    </Icon>
  )
}

const GOOD = { fill: '#059669', empty: '#d1fae5', stroke: '#065f46', overflow: '#34d399', sliver: null }
const SHORT = { fill: '#be123c', empty: '#fecdd3', stroke: '#9f1239', overflow: null, sliver: '#e11d48' }

/** House filled from the floor by rent ÷ instalment. Colour follows surplus (green) or top-up (red). */
export function HouseFill({ coverage, surplus = null, size = 40, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const clip = `hf-${uid}`
  const ratio = coverage == null || Number.isNaN(Number(coverage)) ? 0 : Math.max(0, Number(coverage))
  const isSurplus = surplus == null ? ratio >= 0.995 : !!surplus
  const pal = isSurplus ? GOOD : SHORT
  const fillPct = Math.min(1, ratio)
  const floor = 36
  const ceil = 6
  const span = floor - ceil
  const fillH = span * fillPct
  const fillY = floor - fillH
  const showSliver = !isSurplus && fillPct < 0.995 && fillH > 2

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d="M6 18 L20 7 L34 18 V36 H6 Z" />
        </clipPath>
      </defs>
      <path d="M6 18 L20 7 L34 18 V36 H6 Z" fill={pal.empty} />
      <rect x="5" y={fillY} width="30" height={fillH} fill={pal.fill} clipPath={`url(#${clip})`} />
      {showSliver && (
        <rect x="5" y={Math.max(ceil, fillY - 1.6)} width="30" height="2.2" fill={pal.sliver} clipPath={`url(#${clip})`} />
      )}
      {isSurplus && fillPct >= 0.995 && (
        <path d="M16 5.5 L20 2.5 L24 5.5" fill="none" stroke={pal.overflow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <path d="M4 19.5 L20 6 L36 19.5" fill="none" stroke={pal.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 18.5 V36 H32 V18.5" fill="none" stroke={pal.stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17 36 V28.5 H23 V36" fill="none" stroke={pal.stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
