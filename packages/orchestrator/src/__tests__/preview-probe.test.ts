import { describe, expect, it, vi } from 'vitest'
import { type PreviewProbeFetch, probePreviewUrl } from '../preview-probe'

function makeFetch(
	impl: (
		url: string,
		init: { signal: AbortSignal },
	) => Promise<{
		status: number
		text: () => Promise<string>
	}>,
): PreviewProbeFetch {
	return vi.fn(impl)
}

describe('probePreviewUrl', () => {
	it('captures status, body length, and first 256 chars of body on a 200 response', async () => {
		const body = 'a'.repeat(1000)
		const fetchImpl = makeFetch(async () => ({
			status: 200,
			text: async () => body,
		}))

		const probe = await probePreviewUrl('https://sandbox.example.com/preview', { fetchImpl })

		expect(probe.status).toBe(200)
		expect(probe.bodyLength).toBe(1000)
		expect(probe.bodyPreview).toHaveLength(256)
		expect(probe.bodyPreview).toBe('a'.repeat(256))
	})

	it('captures non-2xx status without throwing', async () => {
		const fetchImpl = makeFetch(async () => ({
			status: 502,
			text: async () => 'Bad Gateway',
		}))

		const probe = await probePreviewUrl('https://sandbox.example.com/preview', { fetchImpl })

		expect(probe.status).toBe(502)
		expect(probe.bodyLength).toBe(11)
		expect(probe.bodyPreview).toBe('Bad Gateway')
	})

	it('preserves the full body when shorter than 256 chars', async () => {
		const fetchImpl = makeFetch(async () => ({
			status: 200,
			text: async () => '<html><body>OK</body></html>',
		}))

		const probe = await probePreviewUrl('https://x.example.com', { fetchImpl })

		expect(probe.bodyPreview).toBe('<html><body>OK</body></html>')
		expect(probe.bodyLength).toBe(28)
	})

	it('returns status: -1 when fetch throws (network error)', async () => {
		const fetchImpl = makeFetch(async () => {
			throw new Error('ECONNREFUSED')
		})

		const probe = await probePreviewUrl('https://x.example.com', { fetchImpl })

		expect(probe.status).toBe(-1)
		expect(probe.bodyLength).toBe(0)
		expect(probe.bodyPreview).toBe('ECONNREFUSED')
	})

	it('returns status: -1 when the request is aborted by timeout', async () => {
		const fetchImpl: PreviewProbeFetch = (_url, init) =>
			new Promise((_resolve, reject) => {
				init.signal.addEventListener('abort', () => {
					const err = new Error('The operation was aborted due to timeout')
					err.name = 'TimeoutError'
					reject(err)
				})
			})

		const probe = await probePreviewUrl('https://x.example.com', { fetchImpl, timeoutMs: 5 })

		expect(probe.status).toBe(-1)
		expect(probe.bodyLength).toBe(0)
		expect(probe.bodyPreview).toContain('aborted')
	})

	it('truncates an error message that exceeds 256 chars', async () => {
		const longMessage = 'X'.repeat(500)
		const fetchImpl = makeFetch(async () => {
			throw new Error(longMessage)
		})

		const probe = await probePreviewUrl('https://x.example.com', { fetchImpl })

		expect(probe.status).toBe(-1)
		expect(probe.bodyPreview).toHaveLength(256)
	})

	it('passes the AbortSignal from AbortSignal.timeout to fetch', async () => {
		const fetchImpl = makeFetch(async (_url, init) => {
			expect(init.signal).toBeInstanceOf(AbortSignal)
			return { status: 200, text: async () => 'ok' }
		})

		await probePreviewUrl('https://x.example.com', { fetchImpl })

		expect(fetchImpl).toHaveBeenCalledTimes(1)
	})
})
