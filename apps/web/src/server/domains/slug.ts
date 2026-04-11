const BASE_DOMAIN = 'meldar.ai'

const RESERVED_SLUGS = new Set([
	'api', 'admin', 'www', 'mail', 'app', 'workspace', 'ns1', 'ns2',
	'localhost', 'ftp', 'smtp', 'staging', 'dev', 'test', 'status',
	'help', 'support', 'billing', 'dashboard', 'login', 'signup',
	'onboarding', 'settings', 'account', 'cdn', 'assets', 'static',
])

export function generateSlug(name: string): string {
	const slug =
		name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '') || 'project'

	if (RESERVED_SLUGS.has(slug)) {
		return appendCollisionSuffix(slug)
	}
	return slug
}

export function generateSubdomain(slug: string): string {
	return `${slug}.${BASE_DOMAIN}`
}

export function appendCollisionSuffix(slug: string): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let suffix = ''
	for (let i = 0; i < 4; i++) {
		suffix += chars[Math.floor(Math.random() * chars.length)]
	}
	return `${slug}-${suffix}`
}
