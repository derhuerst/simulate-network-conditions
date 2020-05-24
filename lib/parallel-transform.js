'use strict'

const {ok, strictEqual} = require('assert')
const {Transform} = require('stream')

const defer = () => {
	let resolve, reject
	const p = new Promise((yay, nay) => {
		resolve = yay
		reject = nay
	})
	return {p, resolve, reject}
}
ok(defer().p, 'defer().p')
strictEqual(typeof defer().resolve, 'function', 'defer().resolve')
strictEqual(typeof defer().reject, 'function', 'defer().reject')

// this is essentially `require('parallel-stream').transform` 😬
const parallelTransformStream = (transforms, opt = {}) => {
	ok(Array.isArray(transforms), 'transforms must be an array')
	const lTransforms = transforms.length
	ok(lTransforms > 0, 'transforms must not be empty')

	let active = 0
	const cbs = [] // FIFO queue

	const write = (chunk, _, cb) => {
		// If the nr of currently processed chunks is >= than the high
		// water mark, we delay the cb() call of this chunk. If we
		// called cb() here directly, we wouldn't communicate the
		// "pressure" to the stream. If we called cb() in the
		// processChunk callback, we would only ever process 1 chunk,
		// because Node.js streams preserve the order of chunks.
		// todo: this is working around the stream mechanics, rewrite
		active++

		const done = (err) => {
			if (err) {
				out.destroy(err)
				return;
			}

			active--
			if (cbs.length === 0) {
				const cb = cbs.shift()
				cb()
			}
			if (active === 0) out.emit('empty')
		}

		let i = 0
		const work = (chunk) => {
			const transform = transforms[i]
			try {
				transform(chunk, push, (err, nChunk) => {
					if (err) {
						done(err)
						return;
					}

					const hasNew = nChunk !== null && nChunk !== undefined
					if (++i < lTransforms) {
						work(hasNew ? nChunk : chunk) // todo: setImmediate?
					} else {
						if (hasNew) out.push(chunk)
						done()
					}
				})
			} catch (err) {
				done(err)
			}
		}
		work(chunk)

		if (active >= out.writableHighWaterMark) {
			console.error('queueing cb() call', active)
			// If the nr of currently processed chunks is >= than the
			// high water mark, we delay the cb() call of this chunk.
			// If we called cb() here directly, we wouldn't communicate
			// the "pressure" to the stream. If we called cb() in the
			// processChunk callback, we would only ever process 1 chunk,
			// because Node.js streams preserve the order of chunks.
			cbs.push(cb)
		} else {
			console.error('calling cb()', active)
			cb()
		}
	}

	const out = new Transform({
		...opt,
		objectMode: true,
		write,
	})

	const origEnd = out.end.bind(out)
	out.end = (chunk, _, cb) => {
		out.write(chunk, _, () => {})
		if (active <= 0) origEnd(cb)
		else out.once('empty', () => origEnd(cb))
	}
	const push = out.push.bind(out)

	return out
}

module.exports = parallelTransformStream
