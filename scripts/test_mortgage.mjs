import assert from 'node:assert/strict'
import { monthlyInstalment, ltvVerdicts, cashVsRent, clampLtv, DEFAULT_RATE, DEFAULT_YEARS, DEFAULT_LTV, LTV_MIN, LTV_MAX } from '../src/lib/mortgage.js'
import { typRentPsf, default as LAUNCHES } from '../src/data/launches.js'
import { typYields } from '../src/lib/launchYield.js'

// Published check: RM450,000 at 4.10% over 35 years ≈ RM2,020 (RHB first-home illustration, Nov 2026).
const sample = monthlyInstalment(450000, 4.10, 35)
assert.ok(Math.abs(sample - 2020) < 2, `expected ~2020, got ${sample}`)

assert.equal(DEFAULT_RATE, 4.3)
assert.equal(DEFAULT_YEARS, 35)
assert.equal(DEFAULT_LTV, 90)
assert.equal(monthlyInstalment(0, 4.3, 35), null)
assert.equal(clampLtv(87), 87)
assert.equal(clampLtv(40), LTV_MIN)
assert.equal(clampLtv(99), LTV_MAX)
assert.equal(clampLtv('x'), DEFAULT_LTV)

const rows = ltvVerdicts({ price: 1000000, rentMo: 3000, rate: 4.3, years: 35 })
assert.equal(rows.length, 1)
assert.equal(rows[0].ltv, 90)
assert.equal(rows[0].down, 100000)
assert.ok(Math.abs(rows[0].grossCash - (3000 - rows[0].inst)) < 1e-6)
// Net cash = rent − vacancy (1/12) − assessment (4%) − maintenance − RM250/yr − instalment.
const hold = 3000 / 12 + 3000 * 0.04 + 0 + 250 / 12
assert.ok(Math.abs(rows[0].holdMo - hold) < 1e-6, `hold ${rows[0].holdMo}`)
assert.ok(Math.abs(rows[0].cash - (3000 - hold - rows[0].inst)) < 1e-6)
const withMaint = cashVsRent({ price: 1000000, rentMo: 3000, rate: 4.3, years: 35, maintMo: 400 })
assert.ok(Math.abs(withMaint.cash - (rows[0].cash - 400)) < 1e-6)
assert.equal(withMaint.cashAfterMaint, withMaint.cash)
// Principal + interest add up to the instalment; net yield below the rate flags negative leverage.
assert.ok(Math.abs(withMaint.principalMo + withMaint.interestMo - withMaint.inst) < 1e-6)
assert.equal(withMaint.negativeLeverage, withMaint.netYield < 4.3)
// Net yield here matches typYields' net (same holding-cost assumptions).
{
  const ty = typYields({ size: 1000, price: 1000000, rentPsf: 3, maintPsf: 0.4 })
  const v = cashVsRent({ price: 1000000, rentMo: 3000, rate: 4.3, years: 35, maintMo: 400 })
  assert.ok(Math.abs(ty.net - v.netYield) < 1e-9, `${ty.net} vs ${v.netYield}`)
}

const both = ltvVerdicts({ price: 1000000, rentMo: 3000, rate: 4.3, years: 35, ltvs: [90, 70] })
assert.equal(both.length, 2)
assert.ok(both[0].inst > both[1].inst)
assert.equal(both[1].down, 300000)

const v70 = cashVsRent({ price: 1000000, rentMo: 3000, ltv: 70, rate: 4.3, years: 35 })
assert.equal(v70.ltv, 70)
assert.equal(v70.down, 300000)

console.log('mortgage unit tests ok')
console.log('\n=== 90% / 70% vs asking-rent estimate @ 4.3% p.a., 35 years, list price ===')
for (const p of LAUNCHES) {
  console.log(`\n${p.name}`)
  for (const typ of p.typologies) {
    const { psf, source, band } = typRentPsf(typ)
    const y = typ.price_from ? typYields({ size: typ.size, price: typ.price_from, rentPsf: psf, maintPsf: p.maint_psf }) : null
    const maintMo = (p.maint_psf || 0) * typ.size
    const line = {
      typ: typ.type,
      size: typ.size,
      list: typ.price_from ?? null,
      rent_psf: +psf.toFixed(2),
      rent_source: source,
      rent_n: band?.n ?? null,
      rent_mo: y ? Math.round(y.rentMo) : null,
      gross: y ? +y.gross.toFixed(2) : null,
    }
    if (typ.price_from && y) {
      for (const ltv of [90, 70]) {
        const r = cashVsRent({ price: typ.price_from, rentMo: y.rentMo, ltv, rate: 4.3, years: 35, maintMo })
        line[`ltv${ltv}_loan`] = Math.round(r.loan)
        line[`ltv${ltv}_down`] = Math.round(r.down)
        line[`ltv${ltv}_inst`] = Math.round(r.inst)
        line[`ltv${ltv}_cash`] = Math.round(r.cash)
        line[`ltv${ltv}_after_maint`] = Math.round(r.cashAfterMaint)
        line[`ltv${ltv}_ok`] = r.covers
      }
    }
    console.log(JSON.stringify(line))
  }
}
