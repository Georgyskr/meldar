import type { ScreenTimeExtraction, UpsellHook } from '@/entities/xray-result/model/types'

export function generateUpsells(extraction: ScreenTimeExtraction): UpsellHook[] {
	const upsells: UpsellHook[] = []
	const totalHours = extraction.totalScreenTimeMinutes / 60

	if (totalHours > 5) {
		upsells.push({
			trigger: 'high_screen_time',
			tierTarget: 'audit',
			message:
				'Your screen time is above average. A personal audit will show exactly where to cut.',
			urgency: 'high',
		})
	}

	const socialApps = extraction.apps.filter((a) => a.category === 'social')
	const topSocial = socialApps[0]
	if (topSocial && topSocial.usageMinutes > 120) {
		upsells.push({
			trigger: 'social_dominance',
			tierTarget: 'app_build',
			message: `We can build a ${topSocial.name} scheduler that posts for you — so you stop doom-scrolling.`,
			urgency: 'high',
		})
	}

	const emailApp = extraction.apps.find(
		(a) => a.category === 'communication' && /mail|gmail|outlook/i.test(a.name),
	)
	if (emailApp && emailApp.usageMinutes > 30) {
		upsells.push({
			trigger: 'email_detected',
			tierTarget: 'app_build',
			message: 'We can build an email triage bot that sorts your inbox automatically.',
			urgency: 'medium',
		})
	}

	if (extraction.apps.length >= 5) {
		upsells.push({
			trigger: 'many_apps',
			tierTarget: 'starter',
			message: 'You use a lot of apps. Our automation toolkit can streamline your workflow.',
			urgency: 'low',
		})
	}

	if (extraction.pickups && extraction.pickups > 80) {
		upsells.push({
			trigger: 'high_pickups',
			tierTarget: 'audit',
			message: 'That many pickups signals a habit loop. A time audit can break the pattern.',
			urgency: 'high',
		})
	}

	return upsells
}
