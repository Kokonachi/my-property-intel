import { entryYield, launchBounds } from '../src/lib/launchEntry.js'
import { LAUNCHES } from '../src/data/launches.js'
import assert from 'assert'

const av = LAUNCHES.find(p => p.id === 'nl-aviera')
const rp = LAUNCHES.find(p => p.id === 'nl-river-park-2b')
assert.ok(av.lat && av.lng, 'Aviera has coords')
assert.ok(rp.lat && rp.lng, 'River Park has coords')
assert.notEqual(av.lat, rp.lat)
// headline typ prefers a sufficient size-band
const a = entryYield(av)
assert.equal(a.typ.id, 'aviera-b', `Aviera headline typ should be Type B, got ${a.typ.id}`)
assert.ok(a.y && Math.abs(a.y.gross - 4.94) < 0.05, `Aviera B gross ~4.94, got ${a.y?.gross}`)
const r = entryYield(rp)
assert.equal(r.typ.id, 'rp-a12')
assert.ok(r.y && Math.abs(r.y.gross - 5.14) < 0.05, `River A1/A2 gross ~5.14, got ${r.y?.gross}`)
const b = launchBounds(LAUNCHES)
assert.ok(b)
assert.ok(b[0][0] < Math.min(av.lat, rp.lat), 'bounds padded south')
assert.ok(b[0][1] < Math.min(av.lng, rp.lng), 'bounds padded west')
assert.ok(b[1][0] > Math.max(av.lat, rp.lat), 'bounds padded north')
assert.ok(b[1][1] > Math.max(av.lng, rp.lng), 'bounds padded east')
assert.equal(rp.card_name, 'River Park 2B')
assert.ok(av.render.pin && rp.render.pin, 'pin thumbnails are set')
console.log('ok', { aviera: a.y.gross.toFixed(2), river: r.y.gross.toFixed(2), av: [av.lat, av.lng], rp: [rp.lat, rp.lng] })

import { REAL } from '../src/data/real.js'
import { exploreBounds, NEARBY_DEG } from '../src/lib/exploreFit.js'

const eb = exploreBounds(LAUNCHES, REAL)
assert.ok(eb)
const r38 = REAL.find(p => p.name === 'Residensi 38 Bangsar')
const permai = REAL.find(p => p.name === 'Bangsar Permai')
const sri = REAL.find(p => p.name === 'Sri Penaga')
assert.ok(r38 && permai && sri)
assert.ok(eb[0][0] <= r38.lat && eb[1][0] >= r38.lat, 'Residensi 38 (4.7%) inside explore bounds')
assert.ok(eb[0][0] <= permai.lat && eb[1][0] >= permai.lat, 'Bangsar Permai inside explore bounds')
assert.ok(sri.lat > eb[1][0], 'Sri Penaga stays outside so the map does not zoom out too far')
assert.ok(NEARBY_DEG === 0.016)
console.log('explore bounds ok', { north: eb[1][0], r38: r38.lat, sri: sri.lat })
