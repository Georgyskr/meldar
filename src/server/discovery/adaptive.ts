import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getAnthropicClient } from '@/server/lib/anthropic'

const adaptiveFollowUpSchema = z.object({
	followUps: z.array(
		z.object({
			type: z.enum(['screenshot', 'question']),
			appName: z.string().optional(),
			title: z.string(),
			description: z.string(),
			accept: z.string().optional(),
			options: z.array(z.string()).optional(),
		}),
	),
})

export type AdaptiveFollowUp = {
	type: 'screenshot' | 'question'
	appName?: string
	title: string
	description: string
	accept?: string
	options?: string[]
}

type AdaptiveInput = {
	screenTimeApps: { name: string; usageMinutes: number; category: string }[]
	occupation: string
	ageBracket: string
}

const APP_TO_SCREENSHOT_MAP: Record<
	string,
	{ apps: string[]; screenshotRequest: string; reason: string }
> = {
	trading: {
		apps: ['Robinhood', 'eToro', 'Trading 212', 'Revolut', 'Webull', 'Interactive Brokers'],
		screenshotRequest: 'Screenshot your watchlist or portfolio',
		reason: 'Reveals investment interests and active trading patterns',
	},
	notes: {
		apps: ['Notion', 'Obsidian', 'Bear', 'Apple Notes', 'Evernote'],
		screenshotRequest: 'Screenshot your sidebar or home page',
		reason: 'Shows how they organize knowledge and active projects',
	},
	food_delivery: {
		apps: ['UberEats', 'Uber Eats', 'Wolt', 'DoorDash', 'Bolt Food', 'Deliveroo', 'Grubhub'],
		screenshotRequest: 'Screenshot your recent orders',
		reason: 'Reveals meal patterns and cooking vs ordering frequency',
	},
	fitness: {
		apps: ['Strava', 'Nike Run Club', 'Strong', 'Hevy', 'Fitbit', 'MyFitnessPal', 'WHOOP'],
		screenshotRequest: 'Screenshot your weekly summary',
		reason: 'Shows activity level, what they track, and consistency',
	},
	learning: {
		apps: ['Duolingo', 'Coursera', 'Udemy', 'Khan Academy', 'Brilliant', 'Skillshare'],
		screenshotRequest: 'Screenshot your current courses or streak',
		reason: 'Reveals what they are learning and commitment level',
	},
	reddit: {
		apps: ['Reddit'],
		screenshotRequest: 'Screenshot your subreddit list or home feed',
		reason: 'Shows interest communities and problem domains',
	},
	linkedin: {
		apps: ['LinkedIn'],
		screenshotRequest: 'Screenshot your notifications tab',
		reason: 'Reveals job hunting activity and networking intensity',
	},
	shopping: {
		apps: ['Amazon', 'Temu', 'Shein', 'Wish', 'AliExpress', 'eBay'],
		screenshotRequest: 'Screenshot your recent orders',
		reason: 'Shows spending habits and impulse patterns',
	},
	banking: {
		apps: [
			'Chase',
			'Bank of America',
			'Revolut',
			'N26',
			'Wise',
			'Venmo',
			'Cash App',
			'PayPal',
			'Nordea',
			'OP',
			'S-Pankki',
		],
		screenshotRequest: 'Screenshot last 2 weeks of transactions',
		reason: 'Full spending picture for budget and automation recommendations',
	},
	music: {
		apps: ['Spotify', 'Apple Music', 'YouTube Music', 'Tidal', 'SoundCloud'],
		screenshotRequest: 'Screenshot your Recently Played',
		reason: 'Reveals podcast interests and study/focus music habits',
	},
}

const ADAPTIVE_SYSTEM_PROMPT = `You are Meldar's adaptive follow-up engine. Given a user's screen time data, occupation, and age, you pick the MOST VALUABLE follow-up requests from a structured mapping.

## App-to-Screenshot Mapping

${Object.entries(APP_TO_SCREENSHOT_MAP)
	.map(
		([category, info]) =>
			`### ${category}\nApps: ${info.apps.join(', ')}\nScreenshot request: "${info.screenshotRequest}"\nWhy: ${info.reason}`,
	)
	.join('\n\n')}

## Rules

1. Pick TOP 2-3 screenshot requests based on:
   - Highest usage minutes among matched apps
   - Most signal NOT already captured from Screen Time alone
   - Relevance to the user's occupation and age bracket
2. Generate 1-2 targeted QUESTIONS (not screenshots) based on detected patterns
   - Questions should have 2-4 answer options
   - Focus on confirming hypotheses from Screen Time data
3. NEVER request screenshots for apps with < 5 minutes of usage
4. NEVER generate more than 5 follow-ups total (screenshots + questions)
5. Each follow-up must have a clear, friendly title and a short description explaining why it helps
6. For screenshot requests, include the correct file accept string: "image/jpeg,image/png,image/webp"
7. Order by value: most informative follow-ups first`

const ADAPTIVE_TOOL: Anthropic.Messages.Tool = {
	name: 'generate_follow_ups',
	description:
		'Generate personalized follow-up requests based on screen time data and user profile',
	input_schema: {
		type: 'object' as const,
		properties: {
			followUps: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							enum: ['screenshot', 'question'],
							description: 'Whether this is a screenshot request or a question',
						},
						appName: {
							type: 'string',
							description: 'Which app triggered this follow-up (for screenshots)',
						},
						title: {
							type: 'string',
							description:
								'Short, friendly title shown to user, e.g. "Screenshot your Notion sidebar"',
						},
						description: {
							type: 'string',
							description: 'One sentence explaining why this helps their results',
						},
						accept: {
							type: 'string',
							description:
								'File input accept string for screenshots: "image/jpeg,image/png,image/webp"',
						},
						options: {
							type: 'array',
							items: { type: 'string' },
							description: 'For questions only: the answer options (2-4 choices)',
						},
					},
					required: ['type', 'title', 'description'],
				},
				description: '2-5 personalized follow-up requests',
			},
		},
		required: ['followUps'],
	},
}

export async function generateAdaptiveFollowUps(input: AdaptiveInput): Promise<AdaptiveFollowUp[]> {
	const appList = input.screenTimeApps
		.map((a) => `- ${a.name}: ${a.usageMinutes} min (${a.category})`)
		.join('\n')

	const userMessage = `User profile:
- Occupation: ${input.occupation}
- Age bracket: ${input.ageBracket}

Screen Time apps:
${appList}

Based on their screen time and profile, generate the most valuable follow-up requests. Pick from the app-to-screenshot mapping where their apps match, and add 1-2 targeted questions about detected patterns.`

	const response = await getAnthropicClient().messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 1024,
		system: ADAPTIVE_SYSTEM_PROMPT,
		messages: [{ role: 'user', content: userMessage }],
		tools: [ADAPTIVE_TOOL],
		tool_choice: { type: 'tool', name: 'generate_follow_ups' },
	})

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use') {
		return []
	}

	const validated = adaptiveFollowUpSchema.safeParse(toolUse.input)
	if (!validated.success) {
		console.warn(`Adaptive follow-up output failed validation: ${validated.error.message}`)
		return []
	}
	return validated.data.followUps.slice(0, 5)
}
