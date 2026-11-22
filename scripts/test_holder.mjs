import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { rankedLaunches, entryCostOf, launchScore } from '../src/lib/launchScore.js'
import { entryCost, spaStampDuty, loanStampDuty, sroLegalFee, LEGAL_SST, RENO_PSF, salaryBurden, parseMoney } from '../src/lib/mortgage.js'
import { setLoanAssumptions, getLoanAssumptions } from '../src/lib/loanAssumptions.js'
import { segmentOf, segmentLtv, setHolderCount, currentSegment, currentSort, setHolderSort, clampHold, HOLD_MAX, completeOnboarding, getHolder, DEFAULT_CITY } from '../src/lib/holderProfile.js'

assert.equal(segmentOf(0), 'zero')
assert.equal(segmentOf(1), 'few')
assert.equal(segmentOf(2), 'few')
assert.equal(segmentOf(3), 'many')
assert.equal(segmentOf(100), 'many')
assert.equal(segmentOf(null), 'few')
assert.equal(segmentLtv('zero'), 90)
assert.equal(segmentLtv('few'), 90)
assert.equal(segmentLtv('many'), 70)
assert.equal(clampHold(-3), 0)
assert.equal(clampHold(140), HOLD_MAX)

assert.equal(parseMoney('RM 2,500'), 2500)
assert.equal(spaStampDuty(666000), 13980)
assert.equal(loanStampDuty(599400), 2997)
assert.equal(sroLegalFee(666000), 6328)
assert.equal(sroLegalFee(599400), 5795.2)
const cost = entryCost({ price: 666000, down: 66600, size: 543 })
assert.equal(RENO_PSF, 40)
assert.equal(Math.round(cost.spaStamp), 13980)
assert.equal(Math.round(cost.loanStamp), 2997)
assert.equal(Math.round(cost.legal), Math.round((6328 + 5795.2) * (1 + LEGAL_SST)))
assert.equal(Math.round(cost.renovation), 543 * 40)
assert.equal(Math.round(cost.total), Math.round(66600 + cost.stamp + cost.legal + cost.renovation))
const burdenEasy = salaryBurden(2500, 10000)
assert.equal(burdenEasy.band, 'comfortable')
assert.ok(burdenEasy.pct < 30)
assert.equal(salaryBurden(3500, 10000).band, 'tight')
assert.equal(salaryBurden(4500, 10000).band, 'stretched')
assert.equal(salaryBurden(2500, null), null)

setLoanAssumptions({ rate: 4.3, years: 35, ltv: 90, ltvManual: false })
setHolderCount(5)
assert.equal(currentSegment(), 'many')
assert.equal(getLoanAssumptions().ltv, 70)
assert.equal(currentSort(), 'net')

setLoanAssumptions({ ltv: 80 }, { source: 'user' })
assert.equal(getLoanAssumptions().ltvManual, true)
setHolderCount(0)
assert.equal(currentSegment(), 'zero')
assert.equal(getLoanAssumptions().ltv, 80, 'manual loan % is kept when segment changes')

setLoanAssumptions({ ltv: 90, ltvManual: false })
setHolderCount(2)
assert.equal(getLoanAssumptions().ltv, 90)
assert.equal(currentSort(), 'score')

setHolderCount(null, { skipped: true })
assert.equal(currentSegment(), 'few')

const byEntry = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35, ltv: 90, sortBy: 'entry' })
const byScore = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35, ltv: 90, sortBy: 'score' })
assert.ok(byEntry.length >= 2)
const e0 = entryCostOf(byEntry[0].s).total
const e1 = entryCostOf(byEntry[1].s).total
assert.ok(e0 <= e1, `entry sort ${e0} <= ${e1}`)
assert.ok(byScore[0].s.score >= byScore[1].s.score)

const aviera = launchScore(LAUNCHES.find(p => p.id === 'nl-aviera'), { rate: 4.3, years: 35, ltv: 90 })
assert.ok(entryCostOf(aviera).total > aviera.down)

setHolderSort('psf')
// skipped segment is few, so sort for few becomes psf
assert.equal(currentSort(), 'psf')

completeOnboarding({ count: 0, currentRent: 2500, salary: 8000, city: 'kl-bss' })
assert.equal(currentSegment(), 'zero')
assert.equal(getHolder().currentRent, 2500)
assert.equal(getHolder().salary, 8000)
assert.equal(getHolder().city, DEFAULT_CITY)
completeOnboarding({ count: 0, currentRent: 2500, salary: 8000, city: 'penang' })
assert.equal(getHolder().city, DEFAULT_CITY, 'unavailable cities fall back to the live city')
completeOnboarding({ count: 4, currentRent: 2500, salary: 8000, city: 'kl-bss' })
assert.equal(currentSegment(), 'many')
assert.equal(getHolder().currentRent, null, 'rent is only kept for the 0-property segment')
completeOnboarding({ skipped: true })
assert.equal(currentSegment(), 'few')
assert.equal(getHolder().city, DEFAULT_CITY)

console.log('holder tests ok')
console.log({
  entryOrder: byEntry.map(r => `${r.p.card_name || r.p.name} ${Math.round(entryCostOf(r.s).total)}`),
  scoreOrder: byScore.map(r => `${r.p.card_name || r.p.name} ${r.s.score}`),
  avieraEntry90: entryCostOf(aviera),
})
