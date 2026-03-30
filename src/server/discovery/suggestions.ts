import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'

const APP_TO_PAIN: Record<string, string> = {
	instagram: 'social-posting',
	tiktok: 'social-posting',
	twitter: 'social-posting',
	x: 'social-posting',
	facebook: 'social-posting',
	gmail: 'email-chaos',
	mail: 'email-chaos',
	outlook: 'email-chaos',
	youtube: 'entertainment-drain',
	netflix: 'entertainment-drain',
	safari: 'browser-rabbit-holes',
	chrome: 'browser-rabbit-holes',
	messages: 'communication-overload',
	whatsapp: 'communication-overload',
	telegram: 'communication-overload',
	slack: 'communication-overload',
}

export function mapToPainPoints(extraction: ScreenTimeExtraction): string[] {
	const pains = new Set<string>()

	for (const app of extraction.apps) {
		const key = app.name.toLowerCase()
		for (const [pattern, painId] of Object.entries(APP_TO_PAIN)) {
			if (key.includes(pattern)) {
				pains.add(painId)
			}
		}
	}

	return [...pains]
}
