'use strict'

const {ok, strictEqual} = require('assert')
const parallelTransform = require('./lib/parallel-transform')

const basicLatency = (ms) => {
	ok(Number.isInteger(ms), 'ms must be an integer')
	ok(ms > 0, 'ms must be > 0')

	const withBasicLatency = (chunk, push, done) => {
		setTimeout(() => {
			done(null, chunk)
		}, ms)
	}
	return withBasicLatency
}

const latency = (getLatency) => {
	strictEqual(typeof getLatency, 'function', 'getLatency must be a function')
	const l = getLatency(0)
	ok(Number.isInteger(l), 'getLatency() must return an integer')
	ok(l > 0, 'latency must be > 0')

	let i = 0
	const withLatency = (chunk, push, done) => {
		setTimeout(done, getLatency(i++), null, chunk)
	}
	return withLatency
}

const basicLoss = (rate) => {
	ok(Number.isFinite(rate), 'rate must be a finite number')
	ok(rate >= 0, 'rate must be >= 0')
	ok(rate <= 1, 'rate must be <= 1')

	const withBasicLoss = (chunk, push, done) => {
		const lost = Math.random() <= rate
		done(null, lost ? null : chunk)
	}
	return withBasicLoss
}

const _lossBy = (frame, getT) => {
	strictEqual(typeof frame, 'function', 'frame must be a function')
	let i = 0
	let f = frame(getT(), i++)
	ok(Number.isInteger(f.from), 'frame(i).from must be a finite number')
	ok(Number.isInteger(f.length), 'frame(i).length must be a finit number')

	const withLossByTime = (chunk, push, done) => {
		const t = getT()
		// frame over? -> generate new
		if (f && t >= f.from + f.length) f = frame(t, i++)

		// within frame? -> drop chunk
		if (f && t >= f.from && t < f.from + f.length) done()
		// outside of frame? -> pass chunk on
		else done(null, chunk)
	}
	return withLossByTime
}

const lossByTime = (frame) => {
	return _lossBy(frame, () => Date.now())
}

const lossByPacketIdx = (frame) => {
	let idx = -1
	return _lossBy(frame, () => idx++)
}

const simulateNetworkConditions = (transforms, opt = {}) => {
	ok(Array.isArray(transforms), 'transforms must be an array')
	const lTransforms = transforms.length
	ok(lTransforms > 0, 'transforms must not be empty')

	return parallelTransform(transforms, {
		concurrency: 50, // todo: this is hacky
		...opt,
	})
}

simulateNetworkConditions.basicLatency = basicLatency
simulateNetworkConditions.latency = latency
simulateNetworkConditions.basicLoss = basicLoss
simulateNetworkConditions.lossByTime = lossByTime
simulateNetworkConditions.lossByPacketIdx = lossByPacketIdx
module.exports = simulateNetworkConditions
