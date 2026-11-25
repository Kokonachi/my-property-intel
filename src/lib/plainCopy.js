/** Plain-language lines for the 0-property segment. */
import { fmtRM } from '../data/properties.js'

const NEAR = 20

export function vsCurrentRentLine(inst, currentRent, t) {
  if (!(Number(inst) > 0) || !(Number(currentRent) > 0)) return null
  const d = Math.round(Number(inst) - Number(currentRent))
  if (d > NEAR) {
    return t(`每月要比你现在付的租金多 ${fmtRM(d)}`, `Each month is ${fmtRM(d)} more than your current rent`)
  }
  if (d < -NEAR) {
    return t(`每月要比你现在付的租金少 ${fmtRM(Math.abs(d))}`, `Each month is ${fmtRM(Math.abs(d))} less than your current rent`)
  }
  return t('月供和你现在付的租金差不多', 'The instalment is about the same as your current rent')
}

export function rentOutLine(cash, t) {
  if (cash == null || Number.isNaN(Number(cash))) return null
  const n = Number(cash)
  const amt = Math.abs(Math.round(n)).toLocaleString('en-MY')
  if (n >= 0) {
    return t(`租出去每月大约剩 RM${amt}`, `Renting it out leaves about RM${amt} each month`)
  }
  return t(`租出去每月还要自己补 RM${amt}`, `If rented out, you’d still top up about RM${amt} each month`)
}

export function salaryBandCopy(band, t) {
  if (band === 'comfortable') return t('比较轻松', 'Comfortable')
  if (band === 'tight') return t('有点紧', 'Tight')
  if (band === 'stretched') return t('压力较大', 'Stretched')
  return ''
}
