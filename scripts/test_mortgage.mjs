import assert from 'node:assert/strict'
import { monthlyInstalment, ltvVerdicts, DEFAULT_RATE, DEFAULT_YEARS } from '../src/lib/mortgage.js'
import { typRentPsf, default as LAUNCHES } from '../src/data/launches.js'
import { typYields } from '../src/lib/launchYield.js'

// Published check: RM450,000 at 4.10% over 35 years ≈ RM2,020 (RHB first-home illustration, Nov 2026).
const sample = monthlyInstalment(450000, 4.10, 35)
assert.ok(Math.abs(sample - 2020) < 2, `expected ~2020, got ${sample}`)

assert.equal(DEFAULT_RATE, 4.3)
assert.equal(DEFAULT_YEARS, 35)
assert.equal(monthlyInstalment(0, 4.3, 35), null)

const rows = ltvVerdicts({ price: 1000000, rentMo: 3000, rate: 4.3, years: 35 })
assert.equal(rows.length, 2)
assert.equal(rows[0].ltv, 90)
assert.equal(rows[1].ltv, 70)
assert.ok(rows[0].inst > rows[1].inst)
assert.ok(Math.abs(rows[0].cash - (3000 - rows[0].inst)) < 1e-6)

console.log('mortgage unit tests ok')
console.log('\n=== 90%/70% vs asking-rent estimate @ 4.3% p.a., 35 years, list price ===')
for (const p of LAUNCHES) {
  console.log(`\n${p.name}`)
  for (const typ of p.typologies) {
    const { psf, source, band } = typRentPsf(typ)
    const y = typ.price_from ? typYields({ size: typ.size, price: typ.price_from, rentPsf: psf, maintPsf: p.maint_psf }) : null
    const maintMo = (p.maint_psf || 0) * typ.size
    const v = typ.price_from && y ? ltvVerdicts({ price: typ.price_from, rentMo: y.rentMo, rate: 4.3, years: 35, maintMo }) : null
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
    if (v) {
      for (const r of v) {
        line[`ltv${r.ltv}_loan`] = Math.round(r.loan)
        line[`ltv${r.ltv}_inst`] = Math.round(r.inst)
        line[`ltv${r.ltv}_cash`] = Math.round(r.cash)
        line[`ltv${r.ltv}_after_maint`] = Math.round(r.cashAfterMaint)
        line[`ltv${r.ltv}_ok`] = r.covers
      }
    }
    console.log(JSON.stringify(line))
  }
}
