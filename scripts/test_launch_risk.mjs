import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { launchScore } from '../src/lib/launchScore.js'
import { constructionInterest, sensitivity, launchRisks, monthsBetween, yearsUntil } from '../src/lib/launchRisk.js'

const today = new Date('2026-11-25T00:00:00Z')
assert.equal(monthsBetween('2029-11-05', '2031-05-05'), 18)
assert.ok(Math.abs(yearsUntil('2027-11-25', today) - 1) < 0.01)

// Nothing built: average balance is half the loan.
const ci0 = constructionInterest({ loan: 600000, rate: 4, progressPct: 0, handover: '2028-11-25', today })
assert.ok(Math.abs(ci0.total - 600000 * 0.5 * 0.04 * ci0.years) < 1e-6)
assert.ok(Math.abs(ci0.years - 2) < 0.01)
// Fully built: the whole loan is outstanding.
const ci100 = constructionInterest({ loan: 600000, rate: 4, progressPct: 100, handover: '2027-11-25', today })
assert.ok(Math.abs(ci100.total - 600000 * 0.04 * ci100.years) < 1e-6)
assert.equal(constructionInterest({ loan: 600000, rate: 4, handover: null, today }), null)

const loan = { rate: 4.3, years: 35, ltv: 90 }
const aviera = LAUNCHES.find(p => p.id === 'nl-aviera')
const s = launchScore(aviera, loan)
const risks = launchRisks(aviera, s, { loan, today })
const ids = risks.map(r => r.id)
for (const id of ['extension', 'construction-interest', 'supply', 'negative-leverage']) assert.ok(ids.includes(id), `Aviera should flag ${id}: ${ids}`)
assert.ok(!ids.includes('leasehold'), 'Aviera is freehold')
const ciRisk = risks.find(r => r.id === 'construction-interest')
assert.ok(ciRisk.amount > 40000 && ciRisk.amount < 80000, `Aviera interest before handover ${ciRisk.amount}`)

const rp = LAUNCHES.find(p => p.id === 'nl-river-park-2b')
const rpRisks = launchRisks(rp, launchScore(rp, loan), { loan, today }).map(r => r.id)
assert.ok(rpRisks.includes('leasehold'))

const sens = sensitivity({ price: s.price, rentMo: s.v.rentMo, ltv: 90, rate: 4.3, years: 35, maintMo: s.v.maintMo })
assert.ok(Math.abs(sens.base - s.v.cash) < 1e-6)
assert.ok(sens.lowRent < sens.base && sens.highRate < sens.base && sens.both < Math.min(sens.lowRent, sens.highRate))
console.log('aviera risks', risks.map(r => `${r.id}${r.amount ? ' ' + Math.round(r.amount) : ''}`).join(', '), 'sens', Object.fromEntries(Object.entries(sens).map(([k, v]) => [k, Math.round(v * 100) / 100])))
console.log('launch risk tests ok')
