const DEFAULT_AFTER_SIGN_IN = '/workspace'

export function sanitizeNextParam(
	raw: string | null | undefined,
	options?: { mustStartWith?: string; fallback?: string },
): string {
	const fallback = options?.fallback ?? DEFAULT_AFTER_SIGN_IN
	if (!raw) return fallback
	if (!raw.startsWith('/')) return fallback
	if (raw.startsWith('//')) return fallback
	const pathEnd = raw.search(/[?#]/)
	const pathPart = pathEnd === -1 ? raw : raw.slice(0, pathEnd)
	if (pathPart.includes(':')) return fallback
	if (options?.mustStartWith && !raw.startsWith(options.mustStartWith)) return fallback
	return raw
}
