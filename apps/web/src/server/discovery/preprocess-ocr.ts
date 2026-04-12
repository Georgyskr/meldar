/**
 * Preprocesses raw Tesseract OCR text into clean, structured format
 * optimized for Haiku parsing. Extracts what regex can handle (numbers,
 * app names, time values) and formats the rest for minimal token usage.
 */

export type AppCategory =
	| 'social'
	| 'entertainment'
	| 'productivity'
	| 'communication'
	| 'browser'
	| 'health'
	| 'finance'
	| 'education'
	| 'gaming'
	| 'utility'

export type ExtractedApp = {
	name: string
	minutes: number
	category: AppCategory
}

export type ExtractedPickupApp = {
	name: string
	count: number
}

export type ExtractedData = {
	totalScreenTimeMinutes?: number
	pickups?: number
	notifications?: number
	apps?: ExtractedApp[]
	firstUsedAfterPickup?: ExtractedPickupApp[]
	platform?: 'ios' | 'android' | 'unknown'
}

type PreprocessResult = {
	cleanedText: string
	extracted: ExtractedData
}

const CATEGORY_MAP: Record<string, AppCategory> = {
	instagram: 'social',
	tiktok: 'social',
	twitter: 'social',
	x: 'social',
	snapchat: 'social',
	facebook: 'social',
	threads: 'social',
	linkedin: 'social',
	pinterest: 'social',
	reddit: 'social',
	tumblr: 'social',
	mastodon: 'social',
	bluesky: 'social',
	youtube: 'entertainment',
	netflix: 'entertainment',
	spotify: 'entertainment',
	'apple music': 'entertainment',
	'youtube music': 'entertainment',
	twitch: 'entertainment',
	disney: 'entertainment',
	hulu: 'entertainment',
	'hbo max': 'entertainment',
	'prime video': 'entertainment',
	tidal: 'entertainment',
	soundcloud: 'entertainment',
	podcasts: 'entertainment',
	telegram: 'communication',
	whatsapp: 'communication',
	messages: 'communication',
	imessage: 'communication',
	messenger: 'communication',
	signal: 'communication',
	discord: 'communication',
	slack: 'communication',
	teams: 'communication',
	zoom: 'communication',
	facetime: 'communication',
	viber: 'communication',
	line: 'communication',
	gmail: 'communication',
	mail: 'communication',
	outlook: 'communication',
	safari: 'browser',
	chrome: 'browser',
	firefox: 'browser',
	edge: 'browser',
	opera: 'browser',
	brave: 'browser',
	hearthstone: 'gaming',
	'cup heroes': 'gaming',
	roblox: 'gaming',
	'clash royale': 'gaming',
	'candy crush': 'gaming',
	'genshin impact': 'gaming',
	minecraft: 'gaming',
	'among us': 'gaming',
	fortnite: 'gaming',
	'call of duty': 'gaming',
	pubg: 'gaming',
	'pokemon go': 'gaming',
	sudoku: 'gaming',
	chess: 'gaming',
	'2048': 'gaming',
	wordle: 'gaming',
	notion: 'productivity',
	obsidian: 'productivity',
	todoist: 'productivity',
	trello: 'productivity',
	asana: 'productivity',
	evernote: 'productivity',
	notes: 'productivity',
	reminders: 'productivity',
	calendar: 'productivity',
	'google calendar': 'productivity',
	sheets: 'productivity',
	docs: 'productivity',
	github: 'productivity',
	'vs code': 'productivity',
	terminal: 'productivity',
	xcode: 'productivity',
	robinhood: 'finance',
	revolut: 'finance',
	'cash app': 'finance',
	venmo: 'finance',
	paypal: 'finance',
	coinbase: 'finance',
	health: 'health',
	strava: 'health',
	'nike run': 'health',
	fitbit: 'health',
	myfitnesspal: 'health',
	duolingo: 'education',
	coursera: 'education',
	udemy: 'education',
	khan: 'education',
	amazon: 'utility',
	temu: 'utility',
	shein: 'utility',
	'uber eats': 'utility',
	wolt: 'utility',
	doordash: 'utility',
}

function categorizeApp(name: string): AppCategory {
	const lower = name.toLowerCase()
	if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower]
	for (const [key, category] of Object.entries(CATEGORY_MAP)) {
		if (lower.includes(key) || key.includes(lower)) return category
	}
	return 'utility'
}

function detectPlatform(text: string): 'ios' | 'android' | 'unknown' {
	if (/screen time|pickups|most used|show categories/i.test(text)) return 'ios'
	if (/digital wellbeing|focus mode|dashboard/i.test(text)) return 'android'
	return 'unknown'
}

const TIME_PATTERN = /(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in)?/i
const HOURS_ONLY = /(\d+)\s*h(?:ours?)?(?!\s*\d)/i
const MINUTES_ONLY = /\b(\d+)\s*m(?:in)?(?!\w)/i // \b anchor prevents matching notification counts like "123m"
const RU_TIME_PATTERN = /(\d+)\s*ч\s*(\d+)\s*мин/i
const RU_HOURS_ONLY = /(\d+)\s*ч(?!\s*\d)/i
const RU_MINUTES_ONLY = /\b(\d+)\s*мин/i

function parseTimeToMinutes(text: string): number | null {
	const hm = text.match(TIME_PATTERN)
	if (hm) return Number.parseInt(hm[1], 10) * 60 + Number.parseInt(hm[2], 10)

	const h = text.match(HOURS_ONLY)
	if (h) return Number.parseInt(h[1], 10) * 60

	const m = text.match(MINUTES_ONLY)
	if (m) return Number.parseInt(m[1], 10)

	const ruHm = text.match(RU_TIME_PATTERN)
	if (ruHm) return Number.parseInt(ruHm[1], 10) * 60 + Number.parseInt(ruHm[2], 10)

	const ruH = text.match(RU_HOURS_ONLY)
	if (ruH) return Number.parseInt(ruH[1], 10) * 60

	const ruM = text.match(RU_MINUTES_ONLY)
	if (ruM) return Number.parseInt(ruM[1], 10)

	return null
}

function cleanText(raw: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally removing control chars from OCR
	let text = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

	text = text
		.split('\n')
		.map((line) => line.trim())
		.join('\n')

	text = text.replace(/\n{3,}/g, '\n\n')
	text = text.replace(/ {2,}/g, ' ')

	return text.trim()
}

function extractScreenTimeData(text: string): ExtractedData {
	const extracted: ExtractedData = {}
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)

	extracted.platform = detectPlatform(text)

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		if (/total\s+screen\s+time/i.test(line) || /общее\s+время/i.test(line)) {
			const mins = parseTimeToMinutes(line)
			if (mins) {
				extracted.totalScreenTimeMinutes = mins
				continue
			}
			if (i + 1 < lines.length) {
				const nextMins = parseTimeToMinutes(lines[i + 1])
				if (nextMins) extracted.totalScreenTimeMinutes = nextMins
			}
		}

		if (/daily\s+average/i.test(line) && !extracted.totalScreenTimeMinutes) {
			if (i + 1 < lines.length) {
				const nextMins = parseTimeToMinutes(lines[i + 1])
				if (nextMins) extracted.totalScreenTimeMinutes = nextMins
			}
		}
	}

	const pickupsIdx = lines.findIndex((l) => /^pickups$/i.test(l))
	if (pickupsIdx >= 0) {
		for (let i = pickupsIdx + 1; i < Math.min(pickupsIdx + 4, lines.length); i++) {
			const num = lines[i].match(/^(\d{1,4})$/)
			if (num) {
				extracted.pickups = Number.parseInt(num[1], 10)
				break
			}
		}
	}

	const notifIdx = lines.findIndex((l) => /^notifications$/i.test(l))
	if (notifIdx >= 0) {
		for (let i = notifIdx + 1; i < Math.min(notifIdx + 4, lines.length); i++) {
			const num = lines[i].match(/^(\d{1,5})$/)
			if (num) {
				extracted.notifications = Number.parseInt(num[1], 10)
				break
			}
		}
	}

	const apps: ExtractedApp[] = []
	const appTimePattern =
		/^(\d+\s*h\s*\d+\s*m|\d+\s*h|\d+\s*m|\d+\s*ч\s*\d+\s*мин|\d+\s*ч|\d+\s*мин)\s*>?\s*$/i

	for (let i = 0; i < lines.length - 1; i++) {
		const line = lines[i]
		const nextLine = lines[i + 1]

		if (
			/most used|show categories|updated|total screen time|daily average|pickups|notifications|first used/i.test(
				line,
			)
		)
			continue

		const timeMatch = nextLine.match(appTimePattern)
		if (timeMatch) {
			const name = line.replace(/[<>]/g, '').trim()
			if (name && name.length > 1 && name.length < 50 && !/^\d/.test(name)) {
				const mins = parseTimeToMinutes(nextLine)
				if (mins !== null) {
					apps.push({ name, minutes: mins, category: categorizeApp(name) })
					i++
				}
			}
		}
	}

	if (apps.length > 0) extracted.apps = apps

	const firstUsedIdx = lines.findIndex((l) => /first used after pickup/i.test(l))
	if (firstUsedIdx >= 0) {
		const pickupApps: ExtractedPickupApp[] = []
		for (let i = firstUsedIdx + 1; i < lines.length - 1; i++) {
			const name = lines[i].replace(/[<>]/g, '').trim()
			const countMatch = lines[i + 1]?.match(/^(\d{1,4})\s*>?\s*$/)
			if (name && countMatch && name.length > 1 && !/^\d/.test(name)) {
				pickupApps.push({ name, count: Number.parseInt(countMatch[1], 10) })
				i++
			}
		}
		if (pickupApps.length > 0) extracted.firstUsedAfterPickup = pickupApps
	}

	return extracted
}

function formatStructuredOutput(
	cleaned: string,
	extracted: ExtractedData,
	includeRaw: boolean,
): string {
	const parts: string[] = []

	if (extracted.totalScreenTimeMinutes || extracted.pickups || extracted.notifications) {
		parts.push('--- EXTRACTED DATA ---')
		if (extracted.platform && extracted.platform !== 'unknown') {
			parts.push(`Platform: ${extracted.platform}`)
		}
		if (extracted.totalScreenTimeMinutes) {
			parts.push(`Total: ${extracted.totalScreenTimeMinutes} minutes/day`)
		}
		if (extracted.pickups) {
			parts.push(`Pickups: ${extracted.pickups}/day`)
		}
		if (extracted.notifications) {
			parts.push(`Notifications: ${extracted.notifications}/day`)
		}
	}

	if (extracted.apps && extracted.apps.length > 0) {
		parts.push('Apps:')
		for (const app of extracted.apps) {
			parts.push(`${app.name}: ${app.minutes}m (${app.category})`)
		}
	}

	if (extracted.firstUsedAfterPickup && extracted.firstUsedAfterPickup.length > 0) {
		parts.push('First Used After Pickup:')
		for (const app of extracted.firstUsedAfterPickup) {
			parts.push(`${app.name}: ${app.count} times`)
		}
	}

	if (parts.length > 0) {
		if (includeRaw) {
			parts.push('')
			parts.push('--- RAW OCR ---')
			parts.push(cleaned)
		}
		return parts.join('\n')
	}

	return cleaned
}

export function preprocessOcrText(raw: string, sourceType: string): PreprocessResult {
	const cleaned = cleanText(raw)

	if (!cleaned) {
		return { cleanedText: '', extracted: {} }
	}

	if (sourceType === 'screentime') {
		const extracted = extractScreenTimeData(cleaned)
		const isComplete = !!(
			extracted.totalScreenTimeMinutes &&
			extracted.apps &&
			extracted.apps.length >= 3
		)
		const formatted = formatStructuredOutput(cleaned, extracted, !isComplete)
		return { cleanedText: formatted, extracted }
	}

	return { cleanedText: cleaned, extracted: {} }
}
