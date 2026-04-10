const ADJECTIVES = [
	'quiet',
	'happy',
	'bright',
	'calm',
	'clever',
	'cozy',
	'crisp',
	'curious',
	'eager',
	'fancy',
	'fast',
	'fierce',
	'fluffy',
	'fresh',
	'gentle',
	'giant',
	'glad',
	'golden',
	'graceful',
	'grand',
	'honest',
	'hungry',
	'icy',
	'jolly',
	'keen',
	'kind',
	'lively',
	'loud',
	'lucky',
	'merry',
	'mighty',
	'mild',
	'noble',
	'nimble',
	'peaceful',
	'plucky',
	'proud',
	'quick',
	'rapid',
	'rare',
	'rosy',
	'royal',
	'shiny',
	'silent',
	'silly',
	'sleepy',
	'smart',
	'snappy',
	'snug',
	'soft',
	'sparkly',
	'speedy',
	'spicy',
	'steady',
	'stormy',
	'sturdy',
	'sunny',
	'swift',
	'tame',
	'tidy',
	'tiny',
	'vivid',
	'warm',
	'wild',
	'wise',
	'witty',
	'young',
	'zesty',
] as const

const NOUNS = [
	'forest',
	'river',
	'meadow',
	'harbor',
	'valley',
	'mountain',
	'garden',
	'cabin',
	'island',
	'canyon',
	'summit',
	'beach',
	'cloud',
	'star',
	'moon',
	'comet',
	'aurora',
	'brook',
	'lagoon',
	'orchard',
	'grove',
	'trail',
	'ridge',
	'delta',
	'bay',
	'fjord',
	'lake',
	'creek',
	'dune',
	'plateau',
	'crest',
	'glade',
	'marsh',
	'pond',
	'reef',
	'shore',
	'spring',
	'stream',
	'tide',
	'wave',
	'wind',
	'panda',
	'otter',
	'fox',
	'badger',
	'hedgehog',
	'rabbit',
	'robin',
	'finch',
	'heron',
	'owl',
	'dolphin',
	'seal',
	'squirrel',
	'sparrow',
	'wolf',
	'bear',
	'cat',
	'whale',
	'eagle',
] as const

const RESERVED_SLUGS = new Set([
	'admin',
	'api',
	'app',
	'apps',
	'auth',
	'billing',
	'cdn',
	'dashboard',
	'dev',
	'docs',
	'email',
	'ftp',
	'help',
	'login',
	'mail',
	'meldar',
	'oauth',
	'production',
	'prod',
	'root',
	'security',
	'signup',
	'smtp',
	'staging',
	'static',
	'status',
	'support',
	'system',
	'test',
	'www',
	'vercel',
	'claude',
	'anthropic',
	'openai',
	'gpt',
	'ai',
	'bot',
	'abuse',
	'legal',
	'privacy',
	'terms',
	'tos',
	'gdpr',
	'dpo',
	'founder',
	'ceo',
	'cto',
])

export function generateSlug(rand: () => number = Math.random): string {
	const adjIndex = Math.floor(rand() * ADJECTIVES.length)
	const nounIndex = Math.floor(rand() * NOUNS.length)
	const digits = Math.floor(rand() * 10_000)
		.toString()
		.padStart(4, '0')
	const adjective = ADJECTIVES[adjIndex]
	const noun = NOUNS[nounIndex]
	return `${adjective}-${noun}-${digits}`
}

export function slugForProjectId(projectId: string): string {
	let h1 = 0
	let h2 = 0x9e3779b9 | 0
	for (let i = 0; i < projectId.length; i++) {
		const c = projectId.charCodeAt(i)
		h1 = ((h1 << 5) - h1 + c) | 0
		h2 = ((h2 * 31) | 0) + c
	}
	const adjIndex = Math.abs(h1) % ADJECTIVES.length
	const nounIndex = Math.abs(h2) % NOUNS.length
	const digits = Math.abs(h1 ^ h2) % 10_000
	return `${ADJECTIVES[adjIndex]}-${NOUNS[nounIndex]}-${String(digits).padStart(4, '0')}`
}

export function generateSafeSlug(rand: () => number = Math.random): string {
	for (let attempt = 0; attempt < 8; attempt++) {
		const slug = generateSlug(rand)
		if (isValidSlug(slug)) return slug
	}
	return generateSlug(rand)
}

export function isValidSlug(slug: string): boolean {
	if (typeof slug !== 'string') return false
	if (slug.length === 0 || slug.length > 63) return false
	if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) return false
	const firstSegment = slug.split('-')[0]
	if (RESERVED_SLUGS.has(firstSegment)) return false
	if (RESERVED_SLUGS.has(slug)) return false
	return true
}

export function isReservedSlug(slug: string): boolean {
	return RESERVED_SLUGS.has(slug)
}
