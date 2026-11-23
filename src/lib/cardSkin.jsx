import { createContext, useContext, useMemo } from 'react'

export const SKINS = {
  l: {
    id: 'l',
    bg: '#F3F4F6',
    card: '#FFFFFF',
    tile: '#F1F2F4',
    ink: '#141416',
    muted: '#8B8D93',
    line: '#E4E6EA',
    accent: '#3DDC5F',
    accentSoft: 'rgba(61, 220, 95, 0.14)',
    warn: '#A35B5B',
    hatch: '#D4D6DB',
    track: '#E6E8EC',
    fillShort: '#5C5E66',
    shadow: '0 8px 28px rgba(15, 23, 42, 0.07)',
    headerBg: 'rgba(255, 255, 255, 0.88)',
    navTrack: '#ECEEF1',
    navOn: '#141416',
    navOnInk: '#FFFFFF',
    logoMark: '#141416',
    logoMarkInk: '#FFFFFF',
  },
  d: {
    id: 'd',
    bg: '#0C0C0D',
    card: '#161617',
    tile: '#1F1F21',
    ink: '#F3F3F4',
    muted: '#8A8A8E',
    line: '#2C2C2E',
    accent: '#C8F542',
    accentSoft: 'rgba(200, 245, 66, 0.14)',
    warn: '#D4A0A0',
    hatch: '#3A3A3C',
    track: '#2A2A2C',
    fillShort: '#9A9AA0',
    shadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
    headerBg: 'rgba(16, 16, 17, 0.88)',
    navTrack: '#222224',
    navOn: '#C8F542',
    navOnInk: '#111111',
    logoMark: '#C8F542',
    logoMarkInk: '#111111',
  },
}

export function readSkin(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const q = String(hash).split('?')[1] || ''
  return new URLSearchParams(q).get('skin')?.toLowerCase() === 'd' ? 'd' : 'l'
}

export function skinHref(path, hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const skin = readSkin(hash)
  const [base, query] = String(path).split('?')
  const params = new URLSearchParams(query || '')
  if (skin === 'd') params.set('skin', 'd')
  else params.delete('skin')
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

const SkinCtx = createContext(SKINS.l)
export const useSkin = () => useContext(SkinCtx)

export function SkinProvider({ hash, children }) {
  const skin = useMemo(() => SKINS[readSkin(hash)], [hash])
  const vars = {
    '--bg': skin.bg,
    '--card': skin.card,
    '--tile': skin.tile,
    '--ink': skin.ink,
    '--muted': skin.muted,
    '--line': skin.line,
    '--accent': skin.accent,
    '--accent-soft': skin.accentSoft,
    '--warn': skin.warn,
    '--hatch': skin.hatch,
    '--track': skin.track,
    '--shadow': skin.shadow,
    '--header-bg': skin.headerBg,
    minHeight: '100%',
    background: skin.bg,
    color: skin.ink,
  }
  return (
    <SkinCtx.Provider value={skin}>
      <div data-skin={skin.id} data-testid="app-skin" style={vars}>
        {children}
      </div>
    </SkinCtx.Provider>
  )
}
