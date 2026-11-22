/** Indicative yield helpers for new-launch typologies. */

export function mid(arr) {
  const a = arr.filter(v => v != null && !Number.isNaN(+v)).map(Number).sort((x, y) => x - y)
  if (!a.length) return null
  const i = Math.floor(a.length / 2)
  return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2
}

/** Gross and net yield on a given purchase price. Rent is implied as rentPsf × size. */
export function typYields({ size, price, rentPsf, maintPsf, fixedRmYr = 250, vacancyMonths = 1, assessmentRate = 0.04 }) {
  if (!size || !price || !rentPsf) return null
  const rentMo = rentPsf * size
  const rentYr = rentMo * 12
  const gross = rentYr / price * 100
  const vacancyPts = gross * (vacancyMonths / 12)
  const assessmentPts = (rentYr * assessmentRate) / price * 100
  const maintYr = (maintPsf || 0) * size * 12
  const maintenancePts = maintYr / price * 100
  const fixedPts = (fixedRmYr || 0) / price * 100
  const net = gross - vacancyPts - assessmentPts - maintenancePts - fixedPts
  return {
    rentMo, rentYr, gross, net,
    vacancyPts, assessmentPts, maintenancePts, fixedPts,
    maintYr, fixedRmYr: fixedRmYr || 0,
  }
}

/** List price after a user-entered discount % (e.g. 7 means 7% off). */
export function priceAfterPct(listPrice, pct) {
  if (!listPrice || pct == null || Number.isNaN(+pct)) return null
  return listPrice * (1 - Number(pct) / 100)
}

/** Discount % needed so indicative gross equals the target (e.g. 5 or 6). */
export function discountToTargetGross(listPrice, size, rentPsf, targetPct) {
  if (!listPrice || !size || !rentPsf || !targetPct) return null
  const rentYr = rentPsf * size * 12
  const needed = rentYr / (targetPct / 100)
  if (needed <= 0) return null
  if (needed >= listPrice) return { alreadyMet: true, neededPrice: needed, discountPct: 0 }
  return { alreadyMet: false, neededPrice: needed, discountPct: (1 - needed / listPrice) * 100 }
}

/**
 * Resolve the typ's working price.
 * mode 'pct' uses discount percent off list; mode 'price' uses a user-entered net price.
 * Empty / invalid input returns the list price (or null if there is no list price).
 */
export function workingPrice({ listPrice, mode, pct, netPrice }) {
  if (mode === 'price') {
    const p = Number(String(netPrice ?? '').replace(/[, ]/g, ''))
    return p > 0 ? p : (listPrice || null)
  }
  const d = Number(pct)
  if (pct !== '' && pct != null && !Number.isNaN(d) && listPrice) return Math.max(0, priceAfterPct(listPrice, d))
  return listPrice || null
}
