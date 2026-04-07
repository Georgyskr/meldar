/**
 * Tests for the NextRequest test helper. The helper itself is one line of code,
 * but it's the canonical place where the unsafe `as unknown as NextRequest`
 * cast is allowed to live. These tests verify it round-trips the parts that
 * route handlers actually read (url, method, headers, body) — if any of those
 * break, every API route test that uses the helper would silently start
 * exercising a degraded request shape.
 */

import { describe, expect, it } from 'vitest'
import { makeNextJsonRequest, makeNextRequest } from '../make-request'

describe('makeNextRequest', () => {
	it('round-trips url, method, and body', async () => {
		const req = makeNextRequest('http://localhost/api/x', {
			method: 'POST',
			body: 'raw-payload',
		})
		expect(req.url).toBe('http://localhost/api/x')
		expect(req.method).toBe('POST')
		expect(await req.text()).toBe('raw-payload')
	})

	it('round-trips request headers', () => {
		const req = makeNextRequest('http://localhost/api/x', {
			method: 'POST',
			headers: { 'x-custom': 'yes' },
			body: '',
		})
		expect(req.headers.get('x-custom')).toBe('yes')
	})
})

describe('makeNextJsonRequest', () => {
	it('serializes the body and sets Content-Type by default', async () => {
		const req = makeNextJsonRequest('http://localhost/api/y', { hello: 'world' })
		expect(req.method).toBe('POST')
		expect(req.headers.get('Content-Type')).toBe('application/json')
		expect(await req.json()).toEqual({ hello: 'world' })
	})

	it('allows extra headers to be merged in', () => {
		const req = makeNextJsonRequest(
			'http://localhost/api/y',
			{ a: 1 },
			{ headers: { authorization: 'Bearer t' } },
		)
		expect(req.headers.get('authorization')).toBe('Bearer t')
		// Content-Type still defaulted
		expect(req.headers.get('Content-Type')).toBe('application/json')
	})
})
