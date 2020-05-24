# simulate-network-conditions

**Simulate [lossy](https://en.wikipedia.org/wiki/Packet_loss) or high-latency network conditions.** Like the [throttling option in the Chrome/Chromium DevTools](https://developers.google.com/web/tools/chrome-devtools/network#throttle).

[![npm version](https://img.shields.io/npm/v/simulate-network-conditions.svg)](https://www.npmjs.com/package/simulate-network-conditions)
[![build status](https://api.travis-ci.org/derhuerst/simulate-network-conditions.svg?branch=master)](https://travis-ci.org/derhuerst/simulate-network-conditions)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/simulate-network-conditions.svg)
![minimum Node.js version](https://img.shields.io/node/v/simulate-network-conditions.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)


## Installation

```shell
npm install simulate-network-conditions
```


## Usage

Let's simulate an unreliable transport protocol (like UDP, unlike TCP) over a bad 2G connection:

```js
const {pipeline} = require('stream')
const simulate = require('simulate-network-conditions')

const signalStrenth = t => t % 20_000 / 20_000

const lossy = simulate.lossByTime((t, i) => {
	if (signalStrenth(t) <= .3) {
		// packet loss from now on, for 3s
		return {from: t, length: 3000}
	}
	return null // no packet loss
})

const slow = simulate.latency(() => {
	const s = signalStrenth(Date.now())
	const jitter = Date.now() % 100 / 100
	return Math.floor((6 + jitter - s) * 50)
})

// A -> 2G network -> B
pipeline(peerA, simulate(lossy), simulate(slow), peerB)
// B -> 2G network -> A
pipeline(peerB, simulate(lossy), simulate(slow), peerA)
```

`simulate()` returns a [transform stream](https://nodejs.org/docs/latest-v10.x/api/stream.html#stream_class_stream_transform) in [object mode](https://nodejs.org/docs/latest-v10.x/api/stream.html#stream_object_mode).

The stream only represents *one-way* of network traffic. **If you want two-way network traffic as usually required, use *two* `emulate()` streams and [`duplexer3`](https://www.npmjs.com/package/duplexer3)**:

```js
const duplexer = require('duplexer3')

const aToB = simulate([ /* … */ ])
const bToA = simulate([ /* … */ ])

// A end of the connection
const aEnd = duplexer3(aToB, bToA)
// B end of the connection
const bEnd = duplexer3(bToA, aToB)
```

### packet processors

A

```js
// every packet delayed by exactly .2s
simulate.constantLatency(200)

// jitter: packets randomly delayed by .1-.25s (breaks order!)
simulate.latency(() => 100 + Math.ceil(Math.random() * 150))

// 2% lost (randomly)
simulate.constantLoss(.02)

// 3 packets lost, every 20 packets
simulate.lossByIdx((idx) => ({from: idx + 17, length: 3}))
simulate.lossByIdx((idx, lossPeriodIdx) => {
	return {from: lossPeriodIdx * 20, length: 3}
})

// 500ms loss every 3s
simulate.lossByTime(() => ({from: Date.now() + 3_000, length: 500}))
```


## Related

The great [Mininet](http://mininet.org/overview/) [allows you to specify bandwidth, latency & loss](https://github.com/mininet/mininet/blob/dfb297901fd4bf0ad0cad317973180392dafa277/examples/simpleperf.py#L33-L36), and probably works in a much more accurate way. You can use the [`mininet` npm package](https://github.com/mafintosh/mininet) from Node.js.


## Contributing

If you have a question or need support using `simulate-network-conditions`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/simulate-network-conditions/issues).
