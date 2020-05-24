'use strict'

const {PassThrough} = require('stream')
const {transform: parallelTransform} = require('parallel-stream')

const parallelTransformStream = (transforms, opt = {}) => {
	const lTransforms = transforms.length
	if (lTransforms === 0) {
		return new PassThrough(opt)
	}

	// This is similar to require('async/waterfall').
	const work = (chunk, _, done) => {
		let i = 0
		const step = (chunk) => {
			const transform = transforms[i]
			try {
				transform(chunk, push, (err, nChunk) => {
					if (err) {
						done(err)
						return;
					}

					const hasNew = nChunk !== null && nChunk !== undefined
					if (++i < lTransforms) {
						step(hasNew ? nChunk : chunk) // todo: setImmediate?
					} else {
						if (hasNew) out.push(chunk)
						done()
					}
				})
			} catch (err) {
				done(err)
			}
		}
		step(chunk)
	}

	const out = parallelTransform(work, {
		...opt,
		objectMode: true,
	})
	const push = out.push.bind(out)

	return out
}

module.exports = parallelTransformStream
