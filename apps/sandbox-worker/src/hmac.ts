export interface VerifyHmacOptions {
	secret: string
	timestampHeader: string
	signatureHeader: string
	rawBody: string
	now: number
	windowMs: number
}

export type VerifyHmacResult = { ok: true } | { ok: false; reason: string }

export async function verifyHmac(opts: VerifyHmacOptions): Promise<VerifyHmacResult> {
	if (!opts.secret) return { ok: false, reason: 'missing_secret' }
	if (!opts.timestampHeader) return { ok: false, reason: 'missing_timestamp' }
	if (!opts.signatureHeader) return { ok: false, reason: 'missing_signature' }

	if (!/^\d{10,16}$/.test(opts.timestampHeader)) return { ok: false, reason: 'bad_timestamp' }
	const ts = Number.parseInt(opts.timestampHeader, 10)
	if (Math.abs(opts.now - ts) > opts.windowMs) return { ok: false, reason: 'stale_timestamp' }

	const expected = await hmacSha256Hex(opts.secret, `${opts.timestampHeader}.${opts.rawBody}`)
	if (!constantTimeEqualHex(expected, opts.signatureHeader)) {
		return { ok: false, reason: 'signature_mismatch' }
	}
	return { ok: true }
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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

export function constantTimeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let mismatch = 0
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
	}
	return mismatch === 0
}
