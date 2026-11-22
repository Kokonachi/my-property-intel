import { typYields, priceAfterPct, discountToTargetGross, workingPrice } from '../src/lib/launchYield.js'

const close = (a, b, d = 0.02) => {
  if (Math.abs(a - b) > d) throw new Error(`expected ${b}, got ${a}`)
}

// Aviera Type B: 5.05 psf × 543 × 12 ÷ 666000
const b = typYields({ size: 543, price: 666000, rentPsf: 5.05, maintPsf: 0.5 })
close(b.gross, 5.05 * 543 * 12 / 666000 * 100)
close(b.vacancyPts, b.gross / 12)
close(b.assessmentPts, b.gross * 0.04)
close(b.maintenancePts, 0.5 * 543 * 12 / 666000 * 100)
close(b.fixedPts, 250 / 666000 * 100)
close(b.net, b.gross - b.vacancyPts - b.assessmentPts - b.maintenancePts - b.fixedPts)

const after = typYields({ size: 543, price: priceAfterPct(666000, 10), rentPsf: 5.05, maintPsf: 0.5 })
if (!(after.gross > b.gross)) throw new Error('discount should raise gross')

const t5 = discountToTargetGross(666000, 543, 5.05, 5)
const t6 = discountToTargetGross(666000, 543, 5.05, 6)
close(typYields({ size: 543, price: t5.neededPrice, rentPsf: 5.05, maintPsf: 0.5 }).gross, 5, 0.001)
close(typYields({ size: 543, price: t6.neededPrice, rentPsf: 5.05, maintPsf: 0.5 }).gross, 6, 0.001)

// River A already above 5%
const r = typYields({ size: 812, price: 783600, rentPsf: 4.13, maintPsf: 0.35 })
if (r.gross < 5) throw new Error('expected River A list gross above 5')
if (!discountToTargetGross(783600, 812, 4.13, 5).alreadyMet) throw new Error('5% should already be met')

if (workingPrice({ listPrice: 666000, mode: 'pct', pct: '', netPrice: '' }) !== 666000) throw new Error('empty pct keeps list')
close(workingPrice({ listPrice: 666000, mode: 'pct', pct: '10', netPrice: '' }), 599400)
close(workingPrice({ listPrice: 666000, mode: 'price', pct: '', netPrice: '600,000' }), 600000)
if (workingPrice({ listPrice: null, mode: 'price', pct: '', netPrice: '' }) != null) throw new Error('no list, empty price')

console.log('ok', { avieraB_gross: b.gross.toFixed(2), avieraB_net: b.net.toFixed(2), riverA_gross: r.gross.toFixed(2), riverA_net: r.net.toFixed(2), t5: t5, t6pct: t6.discountPct.toFixed(2) })
