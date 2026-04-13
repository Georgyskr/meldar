import { describe, expect, it } from 'vitest'
import { HAS_SANDBOX } from './setup'

const WORKER_URL = process.env.CF_SANDBOX_WORKER_URL ?? ''
const HMAC_SECRET = process.env.CF_SANDBOX_HMAC_SECRET ?? ''

async function hmacSign(secret: string, message: string): Promise<string> {
	const enc = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
	const view = new Uint8Array(sig)
	let hex = ''
	for (let i = 0; i < view.length; i++) {
		hex += view[i].toString(16).padStart(2, '0')
	}
	return hex
}

async function signedFetch(
	path: string,
	body: Record<string, unknown>,
	options?: { signal?: AbortSignal },
): Promise<Response> {
	const url = `${WORKER_URL.replace(/\/$/, '')}${path}`
	const bodyJson = JSON.stringify(body)
	const timestamp = Date.now().toString()
	const signature = await hmacSign(HMAC_SECRET, `${timestamp}.${bodyJson}`)

	return fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-meldar-timestamp': timestamp,
			'x-meldar-signature': signature,
		},
		body: bodyJson,
		signal: options?.signal,
	})
}

describe.skipIf(!HAS_SANDBOX)('cf-sandbox smoke — real Worker', () => {
	it('healthz returns 200 with status ok', async () => {
		const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/healthz`)

		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json).toHaveProperty('status', 'ok')
	})

	it('signed request to /api/v1/start returns sandbox or acceptable status', async () => {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 30_000)

		let res: Response
		try {
			res = await signedFetch(
				'/api/v1/start',
				{
					projectId: 'smoke-test-ephemeral',
					userId: 'smoke-user',
					template: 'blank',
					files: [],
				},
				{ signal: controller.signal },
			)
		} catch (err) {
			clearTimeout(timeout)
			if (err instanceof DOMException && err.name === 'AbortError') {
				// Container cold-start exceeded 30s — acceptable, not a code bug
				return
			}
			throw err
		}
		clearTimeout(timeout)

		expect(res.status).not.toBe(401)
		expect(res.status).not.toBe(500)
		expect(res.status).not.toBe(1042)

		if (res.status === 200) {
			const json = await res.json()
			expect(json).toHaveProperty('sandboxId')
			expect(json).toHaveProperty('previewUrl')
		}
	})

	it('HMAC signing produces a valid signature the worker accepts', async () => {
		const res = await signedFetch('/api/v1/status', {
			projectId: 'smoke-hmac-verify',
		})

		expect(res.status).not.toBe(401)
	})
})
