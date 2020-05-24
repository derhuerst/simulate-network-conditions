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

const duplicate = (n = 2) => {
	ok(Number.isInteger(n), 'n must be an integer')
	ok(n > 1, 'n must be > 1')
	const withDuplication = (chunk, push, done) => {
		for (let i = 1; i < n; i++) push(chunk) // n -1
		done(null, chunk) // 1
	}
	return withDuplication
}

const emulateNetworkConditions = (fns, opt = {}) => {
	return parallelTransform(fns, opt) // todo: make configurable
}

emulateNetworkConditions.delay = delay
emulateNetworkConditions.basicLoss = basicLoss
emulateNetworkConditions.duplicate = duplicate
module.exports = emulateNetworkConditions
