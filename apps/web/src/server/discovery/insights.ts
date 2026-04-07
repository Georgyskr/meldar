import type { AppUsage, Insight, ScreenTimeExtraction } from '@/entities/xray-result/model/types'

type Platform = ScreenTimeExtraction['platform']

function topAppFixSteps(app: AppUsage, platform: Platform): string[] {
	const name = app.name

	if (app.category === 'social') {
		return socialAppFixSteps(name, platform)
	}
	if (app.category === 'gaming') {
		return gamingAppFixSteps(name, platform)
	}
	if (app.category === 'communication' && /mail|gmail|outlook/i.test(name)) {
		return emailAppFixSteps(name, platform)
	}
	if (app.category === 'entertainment') {
		return entertainmentAppFixSteps(name, platform)
	}

	if (platform === 'ios') {
		return [
			`Settings → Screen Time → App Limits → Add ${name} → set a daily limit`,
			`Settings → Focus → create a custom Focus that blocks ${name} during work hours`,
		]
	}
	if (platform === 'android') {
		return [
			`Settings → Digital Wellbeing → Dashboard → ${name} → set a daily timer`,
			`Settings → Digital Wellbeing → Focus mode → select ${name} → schedule it during work hours`,
		]
	}
	return [
		`Use your phone's screen time settings to add a daily limit for ${name}`,
		`Schedule "do not disturb" or focus mode during work hours to block ${name}`,
	]
}

function socialAppFixSteps(name: string, platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`Turn off notifications: Settings → ${name} → Notifications → toggle off`,
			`Set a daily limit: Settings → Screen Time → App Limits → Add ${name} → 30 min/day`,
			`Move ${name} off your home screen into the App Library so you open it intentionally`,
		]
	}
	if (platform === 'android') {
		return [
			`Turn off notifications: Settings → Apps → ${name} → Notifications → toggle off`,
			`Set a daily timer: Settings → Digital Wellbeing → Dashboard → ${name} → 30 min/day`,
			`Remove ${name} from your home screen so you open it intentionally, not by habit`,
		]
	}
	return [
		`Turn off all notifications for ${name} in your phone settings`,
		`Set a 30-minute daily limit using your phone's screen time controls`,
		`Move ${name} off your home screen so you open it intentionally`,
	]
}

function gamingAppFixSteps(name: string, platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`If gaming helps you focus or unwind, no fix needed — just make sure it's intentional`,
			`To limit it: Settings → Screen Time → App Limits → Add ${name} → 2 hours/day`,
			`Turn off notifications: Settings → ${name} → Notifications → toggle off`,
		]
	}
	if (platform === 'android') {
		return [
			`If gaming helps you focus or unwind, no fix needed — just make sure it's intentional`,
			`To limit it: Settings → Digital Wellbeing → Dashboard → ${name} → set 2-hour timer`,
			`Turn off notifications: Settings → Apps → ${name} → Notifications → toggle off`,
		]
	}
	return [
		`If gaming helps you focus or unwind, no fix needed — just make sure it's intentional`,
		`To limit it: set a 2-hour daily limit using your phone's screen time controls`,
		`Turn off push notifications for ${name} to avoid being pulled back in`,
	]
}

function emailAppFixSteps(name: string, platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`Disable push: Settings → Mail → Accounts → Fetch New Data → set to Manual or Hourly`,
			`Turn off badges: Settings → ${name} → Notifications → toggle off Badge`,
			`Check email 3x/day (morning, after lunch, before end of day) instead of reacting to every ping`,
		]
	}
	if (platform === 'android') {
		return [
			`Disable push: open ${name} → Settings → your account → toggle off Sync`,
			`Turn off badges: Settings → Apps → ${name} → Notifications → toggle off`,
			`Check email 3x/day (morning, after lunch, before end of day) instead of reacting to every ping`,
		]
	}
	return [
		`Disable push notifications for ${name} — switch to manual or hourly fetch`,
		`Turn off notification badges so your inbox count stops pulling you in`,
		`Check email 3x/day (morning, after lunch, before end of day) instead of reacting to every ping`,
	]
}

function entertainmentAppFixSteps(name: string, platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`Set a reminder: Settings → Screen Time → App Limits → Add ${name} → 1 hour/day`,
			`Turn off autoplay: open ${name} → your profile → Settings → toggle off Autoplay`,
		]
	}
	if (platform === 'android') {
		return [
			`Set a timer: Settings → Digital Wellbeing → Dashboard → ${name} → 1 hour/day`,
			`Turn off autoplay: open ${name} → your profile → Settings → toggle off Autoplay`,
		]
	}
	return [
		`Set a 1-hour daily limit for ${name} using your phone's screen time controls`,
		`Turn off autoplay in ${name}'s settings to stop binge-watching by default`,
	]
}

function focusGameSteps(name: string): string[] {
	return [
		`${name} can be a great focus tool — short sessions between tasks help your brain reset`,
		`Tip: set a gentle reminder after 20-30 min so it stays a tool, not a drift`,
		`If it feels intentional, it's working for you`,
	]
}

function totalScreenTimeFixSteps(platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`Enable Downtime: Settings → Screen Time → Downtime → schedule phone-free hours (e.g. 10 PM – 7 AM)`,
			`Review all limits: Settings → Screen Time → App Limits to see what's uncapped`,
			`Turn on Screen Distance: Settings → Screen Time → Screen Distance to get break reminders`,
		]
	}
	if (platform === 'android') {
		return [
			`Set a Bedtime mode: Settings → Digital Wellbeing → Bedtime mode → schedule it`,
			`Review your dashboard: Settings → Digital Wellbeing → Dashboard to see what's uncapped`,
			`Enable Heads Up: Settings → Digital Wellbeing → Heads Up to get walking reminders`,
		]
	}
	return [
		`Schedule phone-free hours (e.g. 10 PM – 7 AM) using your phone's screen time settings`,
		`Review which apps have no daily limit and add caps for the biggest ones`,
		`Put your phone in another room during meals and focused work`,
	]
}

function highPickupsFixSteps(platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`Turn on Focus Mode: Settings → Focus → Personal → schedule it during your peak hours`,
			`Reduce lock screen notifications: Settings → Notifications → Show Previews → set to "When Unlocked"`,
			`Try leaving your phone face-down or in a drawer during work blocks`,
		]
	}
	if (platform === 'android') {
		return [
			`Turn on Focus mode: Settings → Digital Wellbeing → Focus mode → schedule during peak hours`,
			`Reduce lock screen notifications: Settings → Notifications → Notifications on lock screen → hide content`,
			`Try leaving your phone face-down or in a drawer during work blocks`,
		]
	}
	return [
		`Schedule "focus" or "do not disturb" mode during your most productive hours`,
		`Hide notification previews on your lock screen so they stop pulling you in`,
		`Try leaving your phone face-down or in a drawer during work blocks`,
	]
}

function socialDominanceFixSteps(platform: Platform): string[] {
	if (platform === 'ios') {
		return [
			`Batch your social time: Settings → Screen Time → App Limits → add all social apps → 1 hour total/day`,
			`Turn off all social notifications: Settings → Notifications → toggle off each social app`,
			`Move all social apps into one folder on your last home screen page`,
		]
	}
	if (platform === 'android') {
		return [
			`Batch your social time: Settings → Digital Wellbeing → Dashboard → set timers for each social app`,
			`Turn off all social notifications: Settings → Apps → toggle off notifications for each social app`,
			`Move all social apps into one folder on your last home screen page`,
		]
	}
	return [
		`Set a combined 1-hour daily limit for all social apps using your screen time settings`,
		`Turn off notifications for every social app — check them on your schedule`,
		`Move all social apps into one folder away from your home screen`,
	]
}

const FOCUS_GAMES = new Set([
	'2048',
	'cup heroes',
	'hearthstone',
	'sudoku',
	'tetris',
	'cookie clicker',
	'solitaire',
	'minesweeper',
	'wordle',
	'chess',
])

function isFocusGame(appName: string): boolean {
	return FOCUS_GAMES.has(appName.toLowerCase())
}

type InsightOptions = {
	focusMode?: boolean
}

export function generateInsights(
	extraction: ScreenTimeExtraction,
	options: InsightOptions = {},
): Insight[] {
	const insights: Insight[] = []
	const totalHours = extraction.totalScreenTimeMinutes / 60
	const platform = extraction.platform
	const { focusMode } = options

	const topApp = extraction.apps[0]
	if (topApp) {
		const hours = (topApp.usageMinutes / 60).toFixed(1)
		const weeklyHours = Math.round((topApp.usageMinutes / 60) * 7)

		const isRegulationTool = focusMode && topApp.category === 'gaming' && isFocusGame(topApp.name)

		insights.push({
			headline: isRegulationTool
				? `${hours} hours on ${topApp.name} (focus tool)`
				: `${hours} hours on ${topApp.name}`,
			comparison: isRegulationTool
				? `You use this to regulate focus. ${weeklyHours}h/week — just keep it intentional.`
				: `That's ${weeklyHours} hours a week`,
			suggestion: isRegulationTool
				? 'This looks like a healthy focus pattern.'
				: 'Want us to build something to help?',
			severity: isRegulationTool
				? 'low'
				: topApp.usageMinutes > 120
					? 'high'
					: topApp.usageMinutes > 60
						? 'medium'
						: 'low',
			fixSteps: isRegulationTool ? focusGameSteps(topApp.name) : topAppFixSteps(topApp, platform),
		})
	}

	if (totalHours > 4) {
		insights.push({
			headline: `${totalHours.toFixed(1)} hours of screen time`,
			comparison: 'More than a full work day',
			suggestion: 'A Time Audit can show you where to cut',
			severity: totalHours > 7 ? 'high' : 'medium',
			fixSteps: totalScreenTimeFixSteps(platform),
		})
	}

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
			fixSteps: socialDominanceFixSteps(platform),
		})
	}

	if (extraction.pickups && extraction.pickups > 60) {
		const wakeHours = 16
		const interval = Math.round((wakeHours * 60) / extraction.pickups)
		insights.push({
			headline: `${extraction.pickups} pickups`,
			comparison: `Once every ${interval} minutes while you're awake`,
			suggestion: 'That pattern is worth examining',
			severity: extraction.pickups > 100 ? 'high' : 'medium',
			fixSteps: highPickupsFixSteps(platform),
		})
	}

	return insights
}
