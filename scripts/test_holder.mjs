import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { rankedLaunches, entryCostOf, launchScore } from '../src/lib/launchScore.js'
import { entryCost, LEGAL_STAMP_PCT } from '../src/lib/mortgage.js'
import { setLoanAssumptions, getLoanAssumptions } from '../src/lib/loanAssumptions.js'
import { segmentOf, segmentLtv, setHolderCount, currentSegment, currentSort, setHolderSort, clampHold, HOLD_MAX } from '../src/lib/holderProfile.js'

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

const cost = entryCost({ price: 666000, down: 66600 })
assert.equal(LEGAL_STAMP_PCT, 0.04)
assert.equal(Math.round(cost.fees), 26640)
assert.equal(Math.round(cost.total), 66600 + 26640)

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

console.log('holder tests ok')
console.log({
  entryOrder: byEntry.map(r => `${r.p.card_name || r.p.name} ${Math.round(entryCostOf(r.s).total)}`),
  scoreOrder: byScore.map(r => `${r.p.card_name || r.p.name} ${r.s.score}`),
  avieraEntry90: entryCostOf(aviera),
})
