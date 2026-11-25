import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { rankedLaunches, entryCostOf, launchScore } from '../src/lib/launchScore.js'
import { entryCost, spaStampDuty, loanStampDuty, sroLegalFee, LEGAL_SST, RENO_PSF, salaryBurden, parseMoney } from '../src/lib/mortgage.js'
import { setLoanAssumptions, getLoanAssumptions } from '../src/lib/loanAssumptions.js'
import { GOALS, setGoal, setLoans, ltvCapFor, clampLoans, LOANS_MAX, currentSegment, getHolder, setHolderBudget, resetProfile } from '../src/lib/holderProfile.js'

assert.equal(ltvCapFor(0), 90)
assert.equal(ltvCapFor(1), 90)
assert.equal(ltvCapFor(2), 70, 'the 3rd housing loan is capped at 70%')
assert.equal(ltvCapFor(7), 70)
assert.equal(clampLoans(-3), 0)
assert.equal(clampLoans(140), LOANS_MAX)

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

// Nothing is asked up front: an empty profile is the investor view with no goal.
assert.equal(getHolder().goal, null)
assert.equal(currentSegment(), 'few')
setGoal(GOALS.home)
assert.equal(currentSegment(), 'zero')
setGoal(GOALS.invest)
assert.equal(currentSegment(), 'few')
setGoal('nonsense')
assert.equal(getHolder().goal, null)

// Loans only move the loan %: default follows the cap, a manual choice above the cap is pulled down to it.
setLoanAssumptions({ rate: 4.3, years: 35, ltv: 90, ltvManual: false })
setLoans(2)
assert.equal(getLoanAssumptions().ltv, 70)
setLoans(0)
assert.equal(getLoanAssumptions().ltv, 90, 'cap lifted, default restored')
setLoanAssumptions({ ltv: 85 }, { source: 'user' })
setLoans(3)
assert.equal(getLoanAssumptions().ltv, 70, 'manual 85% is above the 3rd-loan cap')
setLoans(1)
assert.equal(getLoanAssumptions().ltv, 70, 'a manual choice is kept when the cap lifts')
setLoanAssumptions({ ltv: 60 }, { source: 'user' })
setLoans(4)
assert.equal(getLoanAssumptions().ltv, 60, 'manual loan % under the cap is kept')

const byEntry = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35, ltv: 90, sortBy: 'entry' })
const byScore = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35, ltv: 90, sortBy: 'score' })
assert.ok(byEntry.length >= 2)
const e0 = entryCostOf(byEntry[0].s).total
const e1 = entryCostOf(byEntry[1].s).total
assert.ok(e0 <= e1, `entry sort ${e0} <= ${e1}`)
assert.ok(byScore[0].s.score >= byScore[1].s.score)

const aviera = launchScore(LAUNCHES.find(p => p.id === 'nl-aviera'), { rate: 4.3, years: 35, ltv: 90 })
assert.ok(entryCostOf(aviera).total > aviera.down)

setGoal(GOALS.home)
setHolderBudget({ currentRent: 'RM 2,500', salary: 8000 })
assert.equal(getHolder().currentRent, 2500)
assert.equal(getHolder().salary, 8000)
setHolderBudget({ currentRent: '' })
assert.equal(getHolder().currentRent, null)
assert.equal(getHolder().salary, 8000, 'salary untouched')

setLoanAssumptions({ ltv: 80, rate: 4.3, years: 35 }, { source: 'user' })
resetProfile()
assert.equal(getHolder().goal, null)
assert.equal(getHolder().loans, 0)
assert.equal(getHolder().currentRent, null)
assert.equal(getHolder().salary, null)
assert.equal(getLoanAssumptions().ltv, 90, 'reset restores the default loan %')
assert.equal(getLoanAssumptions().ltvManual, false)
assert.equal(getLoanAssumptions().rate, 4.3, 'interest is kept')

console.log('holder tests ok')
console.log({
  entryOrder: byEntry.map(r => `${r.p.card_name || r.p.name} ${Math.round(entryCostOf(r.s).total)}`),
  scoreOrder: byScore.map(r => `${r.p.card_name || r.p.name} ${r.s.score}`),
  avieraEntry90: entryCostOf(aviera),
})
