'use strict'

const from2 = require('from2')
const {pipeline} = require('stream')
const simulate = require('..')
const {lossByTime, latency} = simulate

// generate 5k fake packets, emit 1 every 3ms
let i = 0
const fake = from2({objectMode: true}, (_, cb) => {
	if (i >= 5_000) return cb(null, null) // end
	const packet = i++
	return setTimeout(cb, 3, null, packet)
})

// signal drops every 5s
const signalStrenth = t => t % 5_000 / 5_000

// weak signal -> packet loss
const lossy = lossByTime((t, i) => {
	if (signalStrenth(t) <= .3) {
		// packet loss from now on, for 1s
		return {from: t, length: 1000}
	}
	return null // no packet loss
})
const simLossy = simulate(lossy)

// weak signal -> high latency
const slow = latency(() => {
	const s = signalStrenth(Date.now())
	const jitter = Date.now() % 100 / 100
	return Math.floor((6 + jitter - s) * 50)
})
const simSlow = simulate(slow)

simSlow.on('data', console.log)
pipeline(fake, simLossy, simSlow, (err) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}
})
