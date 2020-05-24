'use strict'

const {ok} = require('assert')
const parallelTransform = require('./lib/parallel-transform')

const delay = (ms) => {
	ok(Number.isInteger(ms), 'ms must be an integer')
	ok(ms > 0, 'ms must be > 0')
	const withDelay = (chunk, push, done) => {
		setTimeout(() => {
			done(null, chunk)
		}, ms)
	}
	return withDelay
}

const basicLoss = (rate) => {
	ok(Number.isFinite(ms), 'rate must be a finite number')
	ok(ms >= 0, 'ms must be >= 0')
	ok(ms <= 1, 'ms must be <= 1')
	const withBasicLoss = (chunk, push, done) => {
		const lost = Math.random() <= rate
		done(null, lost ? null : chunk)
	}
	return withBasicLoss
}

const emulateNetworkConditions = (processChunk, opt = {}) => {
	return parallelTransform(processChunk, opt)
}

emulateNetworkConditions.delay = delay
module.exports = emulateNetworkConditions
