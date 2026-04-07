/**
 * NextRequest test factory. A plain `Request` is structurally sufficient for
 * the URL / method / headers / body surface route handlers read in unit
 * tests, so the unsafe `as unknown as NextRequest` cast is confined here
 * rather than repeated in every route test. If a test needs a Next-specific
 * property (`cookies`, `nextUrl`, …), upgrade this helper.
 */

import type { NextRequest } from 'next/server'

export function makeNextRequest(url: string, init?: RequestInit): NextRequest {
	return new Request(url, init) as unknown as NextRequest
}

/**
 * Build a `NextRequest` for the common JSON-POST case. Defaults to
 * `method: 'POST'` and `Content-Type: application/json`. Extra headers from
 * `init.headers` are merged on top.
 */
export function makeNextJsonRequest(
	url: string,
	body: unknown,
	init: Omit<RequestInit, 'body'> = {},
): NextRequest {
	const headers = new Headers(init.headers)
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json')
	}
	return makeNextRequest(url, {
		method: 'POST',
		...init,
		headers,
		body: JSON.stringify(body),
	})
}
