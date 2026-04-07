const PROJECT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

export function isValidProjectId(value: string): boolean {
	return PROJECT_ID_RE.test(value)
}

const RESERVED_SEGMENTS = new Set([
	'node_modules',
	'.next',
	'.git',
	'.turbo',
	'dist',
	'.vercel',
	'.env',
	'.env.local',
	'.env.development',
	'.env.production',
])

const MAX_PATH_LENGTH = 512
const MAX_PATH_DEPTH = 16

export function isSafeRelativePath(path: string): boolean {
	if (typeof path !== 'string' || path.length === 0) return false
	if (path.length > MAX_PATH_LENGTH) return false
	if (path.includes('\0')) return false
	// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control chars in user paths
	if (/[\x00-\x1f\x7f]/.test(path)) return false
	if (path.includes('\\')) return false
	if (path.startsWith('/')) return false

	const segments = path.split('/')
	if (segments.length > MAX_PATH_DEPTH) return false

	for (const seg of segments) {
		if (seg === '' || seg === '.' || seg === '..') return false
		if (RESERVED_SEGMENTS.has(seg)) return false
		if (seg.startsWith('.env.')) return false
	}
	return true
}

export function sanitizeFilePath(path: string): string {
	return path.replace(/^\/+/, '')
}
