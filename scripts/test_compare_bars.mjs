import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { launchScore } from '../src/lib/launchScore.js'
import { compareBarModel, deltaLabel } from '../src/lib/compareBars.js'

const aviera = launchScore(LAUNCHES.find(p => p.id === 'nl-aviera'), { rate: 4.3, years: 35, ltv: 90 })
const river = launchScore(LAUNCHES.find(p => p.id === 'nl-river-park-2b'), { rate: 4.3, years: 35, ltv: 90 })

assert.equal(Math.round(aviera.v.inst), 2763)
assert.equal(Math.round(aviera.v.cash), -21)
assert.equal(Math.round(river.v.inst), 3251)
assert.equal(Math.round(river.v.cash), 103)

const a2600 = compareBarModel({ inst: aviera.v.inst, currentRent: 2600, rentMo: aviera.v.rentMo, cash: aviera.v.cash })
assert.equal(a2600.instVsNow, 163)
assert.equal(a2600.letVsInst, -21)
assert.equal(deltaLabel(a2600.instVsNow), '+RM163')
assert.equal(deltaLabel(a2600.letVsInst), '−RM21')

const r2600 = compareBarModel({ inst: river.v.inst, currentRent: 2600, rentMo: river.v.rentMo, cash: river.v.cash })
assert.equal(r2600.instVsNow, 651)
assert.equal(r2600.letVsInst, 103)
assert.equal(deltaLabel(r2600.instVsNow), '+RM651')
assert.equal(deltaLabel(r2600.letVsInst), '+RM103')

const noRent = compareBarModel({ inst: aviera.v.inst, rentMo: aviera.v.rentMo, cash: aviera.v.cash })
assert.equal(noRent.currentRent, null)
assert.equal(noRent.instVsNow, null)
assert.equal(noRent.letVsInst, -21)
assert.equal(Math.round(noRent.inst), 2763)

console.log('compare bar tests ok', {
  aviera: { inst: Math.round(aviera.v.inst), cash: Math.round(aviera.v.cash), vs2600: a2600.instVsNow },
  river: { inst: Math.round(river.v.inst), cash: Math.round(river.v.cash), vs2600: r2600.instVsNow },
})
