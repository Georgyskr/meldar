const DEFAULT_AFTER_SIGN_IN = '/workspace'

export function sanitizeNextParam(
	raw: string | null | undefined,
	options?: { mustStartWith?: string },
): string {
	if (!raw) return DEFAULT_AFTER_SIGN_IN
	if (!raw.startsWith('/')) return DEFAULT_AFTER_SIGN_IN
	if (raw.startsWith('//')) return DEFAULT_AFTER_SIGN_IN
	const pathEnd = raw.search(/[?#]/)
	const pathPart = pathEnd === -1 ? raw : raw.slice(0, pathEnd)
	if (pathPart.includes(':')) return DEFAULT_AFTER_SIGN_IN
	if (options?.mustStartWith && !raw.startsWith(options.mustStartWith)) return DEFAULT_AFTER_SIGN_IN
	return raw
}
