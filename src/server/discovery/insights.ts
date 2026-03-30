import type { Insight, ScreenTimeExtraction } from '@/entities/xray-result/model/types'

export function generateInsights(extraction: ScreenTimeExtraction): Insight[] {
	const insights: Insight[] = []
	const totalHours = extraction.totalScreenTimeMinutes / 60

	// Top app insight (always)
	const topApp = extraction.apps[0]
	if (topApp) {
		const hours = (topApp.usageMinutes / 60).toFixed(1)
		const weeklyHours = Math.round((topApp.usageMinutes / 60) * 7)
		insights.push({
			headline: `${hours} hours on ${topApp.name}`,
			comparison: `That's ${weeklyHours} hours a week`,
			suggestion: `Want us to build something to help?`,
			severity: topApp.usageMinutes > 120 ? 'high' : topApp.usageMinutes > 60 ? 'medium' : 'low',
		})
	}

	// Total screen time (if >4h)
	if (totalHours > 4) {
		insights.push({
			headline: `${totalHours.toFixed(1)} hours of screen time`,
			comparison: 'More than a full work day',
			suggestion: 'A Time Audit can show you where to cut',
			severity: totalHours > 7 ? 'high' : 'medium',
		})
	}

	// Social media dominance (if >2h social)
	const socialMinutes = extraction.apps
		.filter((a) => a.category === 'social')
		.reduce((sum, a) => sum + a.usageMinutes, 0)
	if (socialMinutes > 120) {
		const socialHours = (socialMinutes / 60).toFixed(1)
		insights.push({
			headline: `${socialHours} hours on social media`,
			comparison: 'Most people underestimate this by half',
			suggestion: 'We can build a social scheduler for you',
			severity: 'high',
		})
	}

	// Pickup frequency (if >60)
	if (extraction.pickups && extraction.pickups > 60) {
		const wakeHours = 16
		const interval = Math.round((wakeHours * 60) / extraction.pickups)
		insights.push({
			headline: `${extraction.pickups} pickups`,
			comparison: `Once every ${interval} minutes while you're awake`,
			suggestion: 'That pattern is worth examining',
			severity: extraction.pickups > 100 ? 'high' : 'medium',
		})
	}

	return insights
}
