import assert from 'node:assert/strict'
import { LAUNCHES } from '../src/data/launches.js'
import { launchScore, rankedLaunches, areaCompletedStats, confidencePts, takeaway, railChip } from '../src/lib/launchScore.js'
import { typRentPsf } from '../src/data/launches.js'
import { typYields } from '../src/lib/launchYield.js'
import { ltvVerdicts } from '../src/lib/mortgage.js'

const area = areaCompletedStats('bss')
assert.equal(area.n, 13)
assert.ok(Math.abs(area.medianGross - 5.94) < 0.01, `median gross ${area.medianGross}`)
assert.equal(area.medianPsf, 756)

assert.equal(confidencePts('band', 34), 1)
assert.equal(confidencePts('band', 5), 0.7)
assert.equal(confidencePts('area_fallback', 0), 0.2)

const rows = rankedLaunches(LAUNCHES, { rate: 4.3, years: 35 })
assert.equal(rows[0].p.id, 'nl-river-park-2b', 'River Park should rank first on list-price score')
assert.ok(rows[0].s.score > rows[1].s.score)

for (const { p, s } of rows) {
  assert.ok(s.score != null, p.name)
  const sum = s.parts.yield + s.parts.cash70 + s.parts.vsArea + s.parts.confidence
  assert.ok(Math.abs(sum - s.score) < 0.06, `${p.name} parts ${sum} vs ${s.score}`)
  assert.ok(s.parts.yield >= 0 && s.parts.yield <= 4)
  assert.ok(s.parts.cash70 >= 0 && s.parts.cash70 <= 3)
  assert.ok(s.parts.vsArea >= 0 && s.parts.vsArea <= 2)
  assert.ok(s.parts.confidence >= 0 && s.parts.confidence <= 1)
  assert.ok(s.score >= 0 && s.score <= 10)
}

const t = (zh, en) => zh
for (const { p, s } of rows) {
  const line = takeaway(s, t)
  assert.ok(line && line.includes('sqft'), line)
  const rail = railChip(p, t)
  assert.ok(rail, p.name)
  console.log(p.name, 'score', s.score, 'parts', s.parts, 'gross', s.yields.gross.toFixed(2), 'delta', s.yieldDelta.toFixed(2), 'cov70', s.coverage70.toFixed(3), 'rail', rail, 'takeaway', line)
}

console.log('area', area)
console.log('launch score tests ok')

console.log('\n=== 90%/70% vs asking-rent estimate @ 4.3% p.a., 35 years, list price ===')
for (const p of LAUNCHES) {
  console.log('\n' + p.name)
  for (const typ of p.typologies) {
    const { psf, source, band } = typRentPsf(typ)
    const y = typ.price_from ? typYields({ size: typ.size, price: typ.price_from, rentPsf: psf, maintPsf: p.maint_psf }) : null
    const maintMo = (p.maint_psf || 0) * typ.size
    const v = typ.price_from && y ? ltvVerdicts({ price: typ.price_from, rentMo: y.rentMo, rate: 4.3, years: 35, maintMo }) : null
    const line = { typ: typ.type, size: typ.size, list: typ.price_from ?? null, rent_mo: y ? Math.round(y.rentMo) : Math.round(psf * typ.size), rent_source: source, n: band?.n ?? null, gross: y ? +y.gross.toFixed(2) : null }
    if (v) {
      for (const r of v) {
        line[`ltv${r.ltv}_inst`] = Math.round(r.inst)
        line[`ltv${r.ltv}_cash`] = Math.round(r.cash)
        line[`ltv${r.ltv}_after_maint`] = Math.round(r.cashAfterMaint)
        line[`ltv${r.ltv}_ok`] = r.covers
      }
    } else {
      line.note = 'no list price — instalment after a sales quote'
    }
    console.log(JSON.stringify(line))
  }
}
