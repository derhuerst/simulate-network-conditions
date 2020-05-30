'use strict'

const {ok, strictEqual} = require('assert')
const {transform: parallelTransform} = require('parallel-stream')

const constantLatency = (ms) => {
	ok(Number.isInteger(ms), 'ms must be an integer')
	ok(ms > 0, 'ms must be > 0')

	const withConstantLatency = (chunk, push, done) => {
		setTimeout(() => {
			done(null, chunk)
		}, ms)
	}
	return withConstantLatency
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

const constantLoss = (rate) => {
	ok(Number.isFinite(rate), 'rate must be a finite number')
	ok(rate >= 0, 'rate must be >= 0')
	ok(rate <= 1, 'rate must be <= 1')

	const withConstantLoss = (chunk, push, done) => {
		const lost = Math.random() <= rate
		done(null, lost ? null : chunk)
	}
	return withConstantLoss
}

const _lossBy = (frame, getT) => {
	strictEqual(typeof frame, 'function', 'frame must be a function')

	let f = {from: getT(), length: 1}, i = 0
	// console.error('first frame', f)
	const withLossByTime = (chunk, push, done) => {
		const t = getT()
		// frame over? -> generate new
		if (!f || (f && t >= f.from + f.length)) {
			f = frame(t, i++)
			// console.error('new frame', f, t, chunk)
		}

		// within frame? -> drop chunk
		if (f && t >= f.from && t < f.from + f.length) {
			// console.error('drop', t, chunk)
			done()
		}
		// outside of frame? -> pass chunk on
		else {
			// console.error('pass', t, chunk)
			done(null, chunk)
		}
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

const simulateNetworkConditions = (transform, opt = {}) => {
	strictEqual(typeof transform, 'function', 'transform must be a function')

	const work = (chunk, _, done) => {
		try {
			transform(chunk, push, (err, chunk) => {
				if (err) {
					done(err)
					return;
				}
				if (chunk !== null && chunk !== undefined) {
					out.push(chunk)
				}
				done()
			})
		} catch (err) {
			done(err)
		}
	}

	const out = parallelTransform(work, {
		concurrency: 50, // todo: this is hacky
		...opt,
		objectMode: true,
	})
	const push = out.push.bind(out)

	return out
}

simulateNetworkConditions.basicLatency = constantLatency
simulateNetworkConditions.constantLatency = constantLatency
simulateNetworkConditions.latency = latency
simulateNetworkConditions.basicLoss = constantLoss
simulateNetworkConditions.constantLoss = constantLoss
simulateNetworkConditions.lossByTime = lossByTime
simulateNetworkConditions.lossByPacketIdx = lossByPacketIdx
module.exports = simulateNetworkConditions
