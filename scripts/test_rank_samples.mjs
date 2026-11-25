import assert from 'node:assert/strict'
import { REAL, isThinSample, rentSampleN, RANK_MIN_SAMPLES } from '../src/data/real.js'

assert.equal(RANK_MIN_SAMPLES, 3)
const tpr = REAL.find(p => p.id === 'real-the-park-residences-1')
assert.ok(tpr, 'The Park Residences 1 exists')
assert.equal(rentSampleN(tpr), 1)
assert.ok(isThinSample(tpr), 'a 1-ad project is thin')

// The default "yield high → low" ranking must not be led by a 1–2 ad project.
const ranked = REAL.filter(p => p.gross != null && !isThinSample(p)).sort((a, b) => b.gross - a.gross)
for (const p of ranked.slice(0, 10)) assert.ok(rentSampleN(p) >= 3, `${p.name} has ${rentSampleN(p)} ads`)
console.log('top ranked:', ranked.slice(0, 5).map(p => `${p.name} ${p.gross}% (${rentSampleN(p)} ads)`).join(' | '))
console.log('rank sample tests ok')
