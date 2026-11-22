import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { launchScore, rankedLaunches, areaCompletedStats, confidencePts, takeaway, railChip, headlineVerdict } from '../src/lib/launchScore.js'
import { typRentPsf } from '../src/data/launches.js'
import { typYields } from '../src/lib/launchYield.js'
import { cashVsRent } from '../src/lib/mortgage.js'

const area = areaCompletedStats('bss')
assert.equal(area.n, 13)
assert.ok(Math.abs(area.medianGross - 5.94) < 0.01, `median gross ${area.medianGross}`)
assert.equal(area.medianPsf, 756)

assert.equal(confidencePts('band', 34), 1)
assert.equal(confidencePts('band', 5), 0.7)
assert.equal(confidencePts('area_fallback', 0), 0.2)

const at90 = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35, ltv: 90 })
const at70 = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35, ltv: 70 })
assert.equal(at90[0].p.id, 'nl-river-park-2b', 'River Park should rank first at 90%')
assert.ok(at90[0].s.score > at90[1].s.score)

for (const { p, s } of at90) {
  assert.ok(s.score != null, p.name)
  const sum = s.parts.yield + s.parts.cash + s.parts.vsArea + s.parts.confidence
  assert.ok(Math.abs(sum - s.score) < 0.06, `${p.name} parts ${sum} vs ${s.score}`)
  assert.ok(s.parts.yield >= 0 && s.parts.yield <= 4)
  assert.ok(s.parts.cash >= 0 && s.parts.cash <= 3)
  assert.ok(s.parts.vsArea >= 0 && s.parts.vsArea <= 2)
  assert.ok(s.parts.confidence >= 0 && s.parts.confidence <= 1)
  assert.ok(s.score >= 0 && s.score <= 10)
  assert.equal(s.ltv, 90)
  assert.ok(s.v, 'has current-LTV verdict')
  assert.equal(s.v.ltv, 90)
  assert.ok(s.down != null)
}

// Coverage at 70% should score the cash component higher (or equal) than at 90%.
for (let i = 0; i < at90.length; i++) {
  assert.ok(at70[i].s.parts.cash >= at90.find(r => r.p.id === at70[i].p.id).s.parts.cash - 1e-9)
  assert.ok(at70.find(r => r.p.id === at90[i].p.id).s.score >= at90[i].s.score - 1e-9)
}

const t = (zh, en) => zh
const te = (zh, en) => en
for (const { p, s } of at90) {
  const line = takeaway(s, t)
  assert.ok(line && line.includes('sqft'), line)
  assert.ok(!line.includes('第1'), line)
  assert.ok(!line.includes('第3'), line)
  const rail = railChip(p, t)
  assert.ok(rail, p.name)
  const hv = headlineVerdict(s, t)
  const hve = headlineVerdict(s, te)
  assert.ok(hv.includes('贷90%'), hv)
  assert.ok(hve.includes('90% loan'), hve)
  assert.ok(!hv.includes('第'), hv)
  console.log(p.name, 'score90', s.score, 'score70', at70.find(r => r.p.id === p.id).s.score, 'parts90', s.parts, 'gross', s.yields.gross.toFixed(2), 'delta', s.yieldDelta.toFixed(2), 'cov90', s.coverage.toFixed(3), 'rail', rail, 'takeaway', line, 'verdict', hv)
}

console.log('area', area)
console.log('launch score tests ok')

console.log('\n=== loan % vs asking-rent estimate @ 4.3% p.a., 35 years, list price ===')
for (const p of LAUNCHES) {
  console.log('\n' + p.name)
  for (const typ of p.typologies) {
    const { psf, source, band } = typRentPsf(typ)
    const y = typ.price_from ? typYields({ size: typ.size, price: typ.price_from, rentPsf: psf, maintPsf: p.maint_psf }) : null
    const maintMo = (p.maint_psf || 0) * typ.size
    const line = { typ: typ.type, size: typ.size, list: typ.price_from ?? null, rent_mo: y ? Math.round(y.rentMo) : Math.round(psf * typ.size), rent_source: source, n: band?.n ?? null, gross: y ? +y.gross.toFixed(2) : null }
    if (typ.price_from && y) {
      for (const ltv of [90, 70]) {
        const r = cashVsRent({ price: typ.price_from, rentMo: y.rentMo, ltv, rate: 4.3, years: 35, maintMo })
        line[`ltv${ltv}_inst`] = Math.round(r.inst)
        line[`ltv${ltv}_cash`] = Math.round(r.cash)
        line[`ltv${ltv}_down`] = Math.round(r.down)
        line[`ltv${ltv}_after_maint`] = Math.round(r.cashAfterMaint)
        line[`ltv${ltv}_ok`] = r.covers
      }
    } else {
      line.note = 'no list price — instalment after a sales quote'
    }
    console.log(JSON.stringify(line))
  }
}
