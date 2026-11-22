import { typRentPsf } from '../data/launches.js'
import { typYields } from './launchYield.js'

/** Headline typ: prefer a list-priced typ with a sufficient size-band rent sample. */
export function entryYield(p) {
  const typ = p.typologies.find(ty => ty.price_from && typRentPsf(ty).source === 'band')
    || p.typologies.find(ty => ty.price_from)
    || p.typologies[0]
  const otherFrom = p.typologies.find(ty => ty.price_from && ty.id !== typ.id)
  const { psf, source } = typRentPsf(typ)
  const y = typ.price_from ? typYields({ size: typ.size, price: typ.price_from, rentPsf: psf, maintPsf: p.maint_psf }) : null
  return { typ, otherFrom, source, y }
}

export function launchBounds(launches) {
  const pts = (launches || []).filter(p => p.lat != null && p.lng != null)
  if (!pts.length) return null
  const lats = pts.map(p => p.lat)
  const lngs = pts.map(p => p.lng)
  const padLatSouth = 0.0025
  const padLatNorth = 0.0065  // keep northern yield pills (e.g. KL Eco City) below the header
  const padLngWest = 0.005  // keep nearby Bangsar South yield pills in frame
  const padLngEast = 0.0025
  return [
    [Math.min(...lats) - padLatSouth, Math.min(...lngs) - padLngWest],
    [Math.max(...lats) + padLatNorth, Math.max(...lngs) + padLngEast],
  ]
}
