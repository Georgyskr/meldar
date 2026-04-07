export function isSafePreviewUrl(value: string | null): value is string {
	if (!value) return false
	try {
		const u = new URL(value)
		return u.protocol === 'https:' || u.protocol === 'http:'
	} catch {
		return false
	}
}
