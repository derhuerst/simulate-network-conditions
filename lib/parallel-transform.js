'use strict'

const {Transform} = require('stream')

// this is essentially `require('parallel-stream').transform` 😬
const parallelTransformStream = (processChunk, opt = {}) => {
	let active = 0
	const cbs = [] // FIFO queue

	const write = (chunk, _, cb) => {
		active++
		processChunk(chunk, push, (err, chunk) => {
			if (err) {
				out.destroy(err)
				return;
			}

			active--
			if (chunk) out.push(chunk)
			if (cbs.length > 0) {
				const cb = cbs.shift()
				cb()
			}
		})

		if (active >= out.writableHighWaterMark) {
			// If the nr of currently processed chunks is >= than the
			// high water mark, we delay the cb() call of this chunk.
			// If we called cb() here directly, we wouldn't communicate
			// the "pressure" to the stream. If we called cb() in the
			// processChunk callback, we would only ever process 1 chunk,
			// because Node.js streams preserve the order of chunks.
			cbs.push(cb)
		} else {
			cb()
		}
	}

	const final = (cb) => {
		console.error('final')
		cb()
	}

	const out = new Transform({
		...opt,
		objectMode: true,
		write,
		final, // todo: remove
	})
	const push = out.push.bind(out)

	return out
}

module.exports = parallelTransformStream
