'use strict'

const test = require('tape')
const from2 = require('from2')
const {array: collect} = require('get-stream')
const pump = require('pump')
const simulate = require('.')

const monotonic = (n) => {
	let i = 0
	return from2({objectMode: true}, (_, cb) => {
		if (i >= n) return cb(null, null) // end
		return setTimeout(cb, 1, null, i++)
	})
}

test('works', async (t) => {
	let i = 0
	const dropEvery10th = (packet, pass, cb) => {
		if (i++ % 10 === 0) cb()
		else cb(null, packet)
	}
	let j = 0
	const dropFirst10 = (packet, pass, cb) => {
		if (j++ < 10) cb()
		else cb(null, packet)
	}
	let k = 0
	const delay3rd = (packet, pass, cb) => {
		if (++k === 3) setTimeout(cb, 70, null, packet)
		else cb(null, packet)
	}
	let l = 0
	const replace3rd = (packet, pass, cb) => {
		cb(null, ++l === 3 ? 'foo' : packet)
	}

	// takes out 0, 10, 20, 30, 40
	const s1 = simulate(dropEvery10th)
	// takes out 1-9 & 11
	const s2 = simulate(dropFirst10)
	const s3 = simulate(delay3rd)
	const s4 = simulate(replace3rd)
	await pump(monotonic(50), s1, s2, s3, s4, t.ifError)
	const res = await collect(s4)

	// filtered by dropEvery10th
	t.notOk(res.includes(0), '0 not filtered')
	t.notOk(res.includes(10), '10 not filtered')
	t.notOk(res.includes(20), '20 not filtered')
	t.notOk(res.includes(30), '30 not filtered')
	t.notOk(res.includes(40), '40 not filtered')
	// filtered by dropFirst10
	t.notOk(res.includes(1), '1 not filtered')
	t.notOk(res.includes(9), '9 not filtered')
	t.notOk(res.includes(11), '11 not filtered')
	// not filtered
	t.equal(res[0], 12, 'r[0] !== 12')
	t.equal(res[1], 13, 'r[1] !== 13')
	t.ok(res.includes(33), '33 filtered')
	t.ok(res.includes(49), '49 filtered')
	// replaced
	t.equal(res[2], 'foo', `r[2] !== 'foo'`)
	// delayed
	t.equal(res[res.length - 1], 14, '14 not last')
})

// todo: more specific tests
