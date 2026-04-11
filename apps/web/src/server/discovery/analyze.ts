import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'
import { MODELS } from '@/server/lib/anthropic'
import { guardedAnthropicCallOrThrow } from '@/server/lib/guarded-anthropic'
import type { AiChatPattern, DiscoveryAnalysis, GooglePattern } from './parsers/types'

export type SubscriptionsData = {
	subscriptions: { name: string; price: string; frequency: string }[]
}
export type BatteryData = {
	apps: { name: string; percentage: number }[]
}
export type StorageData = {
	apps: { name: string; size: string }[]
}
export type CalendarData = {
	events: {
		title: string
		day: string
		startTime: string
		durationMinutes: number
		category: string
	}[]
	totalEventsCount: number
	totalMeetingMinutes: number
	freeBlocksCount?: number
	busiestDay?: string
}
export type HealthData = {
	metrics: { name: string; value: string; unit: string; trend?: string }[]
	dailySteps?: number | null
	sleepHours?: number | null
	activeMinutes?: number | null
}
export type AdaptiveDataEntry = {
	appName: string | null
	sourceType: string
	extraction: unknown
}

export type AnalysisInput = {
	quizPicks: string[]
	aiComfort: number
	aiToolsUsed: string[]
	screenTime?: ScreenTimeExtraction
	chatgptData?: AiChatPattern
	claudeData?: AiChatPattern
	googleData?: GooglePattern
	subscriptionsData?: SubscriptionsData
	batteryData?: BatteryData
	storageData?: StorageData
	calendarData?: CalendarData
	healthData?: HealthData
	adaptiveData?: AdaptiveDataEntry[]
}

const BASE_LEARNING_MODULES = [
	{
		id: 'coding-2026',
		title: "Coding in 2026 isn't scary",
		description:
			'A gentle intro for non-developers. What code actually is, why AI changed everything, and how to read (not write) your first program.',
	},
	{
		id: 'prompting-rules',
		title: '5 rules to level up your prompts',
		description:
			'The prompting SOP. How to get consistent, useful results from any AI tool — not just ChatGPT.',
	},
	{
		id: 'claude-code',
		title: 'Claude Code: your new co-pilot',
		description:
			'Advanced Claude Code usage. How to go from chatting to actually building things with AI as your pair programmer.',
	},
	{
		id: 'perfect-setup',
		title: 'Your perfect app setup',
		description:
			'Tailored to your recommended app. The exact tools, structure, and first steps to get it running.',
	},
]

const ANALYSIS_SYSTEM_PROMPT = `You are Meldar's discovery engine. You analyze a user's digital footprint to recommend the ONE personal app they should build first, plus a learning path.

## Data Sources Available

You may receive some or all of these:
- Quiz picks: pain points the user selected (e.g. "meal_planning", "email_overload")
- AI comfort level: 1 = never touched AI, 4 = uses it daily
- AI tools used: which AI tools they already use
- Screen time: what apps eat their time and how much
- AI chat topics: top topics extracted from ChatGPT/Claude conversations (with frequency counts)
- Google search topics: categorized search and YouTube interests
- App subscriptions: what SaaS they pay for monthly
- Battery usage: which apps drain their battery (correlates with background activity)
- Storage usage: which apps take up space (correlates with heavy usage or hoarding)
- Calendar: meeting/event density, free time blocks, work-life balance from a week view
- Health: steps, sleep, activity minutes from Apple Health or Google Fit
- Adaptive follow-up data: additional screenshots and answers from personalized follow-up questions

## Your Job

Cross-reference all available data. The overlap between what they keep asking AI about, what apps eat their time, and what they pay for = the problem worth solving.

## Three Motivation Categories

Most recommendations fall into one of these:
1. "I track X manually and I'm sick of it" → recommend dashboards, trackers, personal tools
2. "I do X repetitively and it's boring" → recommend automation, schedulers, workflows
3. "I pay for X and it's overkill" → recommend SaaS replacements they build themselves

## Signal-to-Recommendation Mapping

Use these specific data signals to drive recommendations:

| Signal | Where detected | Recommended build |
|--------|---------------|-------------------|
| Food delivery app high usage + no cooking apps | Screen Time | Meal planning app with shopping lists |
| 3+ productivity app subscriptions | Subscriptions | "Build your own simple Notion/Todoist" |
| Trading app installed + daily usage | Screen Time | Custom stock dashboard with alerts |
| High email time + many notifications | Screen Time | Email triage automation |
| Fitness app with inconsistent usage | Screen Time + Battery | Custom fitness tracker/accountability app |
| 20+ meetings/week in calendar | Screen Time | Meeting summarizer |
| Learning app with broken streak | Screen Time | Study accountability tool |
| Instagram/TikTok 2h+ daily | Screen Time | Content scheduler (if creator) or usage limiter (if consumer) |
| Multiple subscriptions in same category | Subscriptions | "Replace X + Y with one custom tool" |
| High pickup count + social first-used | Screen Time | Digital detox / notification manager |

## What Vibe-Coders Actually Build (align recommendations to these)

1. **Personal dashboards & trackers** — weight, habits, finance, mood, reading lists
2. **Content & social media tools** — schedulers, generators, analytics, bookmark managers
3. **Workflow automation** — email triage, invoices, CRM, meeting summaries, expense reports
4. **Niche life tools** — meal planners, apartment hunters, price alerts, pet reminders, class schedules
5. **SaaS replacements** — "I'm tired of paying for X" → Notion alt, Calendly clone, link-in-bio page
6. **AI wrappers** — custom ChatGPT with baked prompts, PDF summarizers, writing assistants

## Rules

- The recommended app must be SPECIFIC and PERSONAL — not "a to-do app" but "a meal prep planner that auto-generates shopping lists from your fridge inventory" based on their actual data
- Complexity must match their AI comfort level: comfort 1-2 = beginner only, comfort 3-4 = can be intermediate
- Additional apps should be genuinely different from the main recommendation
- Key insights must reference SPECIFIC data from their uploads ("You asked ChatGPT about meal planning 12 times")
- If subscription data is available, ALWAYS check for SaaS replacement opportunities
- If battery/storage data shows a heavy app, cross-reference with screen time to confirm it's a real pain point
- Learning modules beyond the 4 base ones should be personalized to their recommended app
- Be direct, warm, zero jargon. Write like talking to a smart friend, not a developer.`

const ANALYSIS_TOOL: Anthropic.Messages.Tool = {
	name: 'generate_analysis',
	description:
		'Generate the cross-referenced discovery analysis with app recommendation and learning path',
	input_schema: {
		type: 'object' as const,
		properties: {
			recommendedApp: {
				type: 'object',
				properties: {
					name: { type: 'string', description: 'Catchy name for the app' },
					description: {
						type: 'string',
						description: 'One-paragraph description of what it does',
					},
					whyThisUser: {
						type: 'string',
						description: 'Personalized reason based on their data',
					},
					complexity: { type: 'string', enum: ['beginner', 'intermediate'] },
					estimatedBuildTime: {
						type: 'string',
						description: 'e.g. "1 day", "2 hours", "a weekend"',
					},
				},
				required: ['name', 'description', 'whyThisUser', 'complexity', 'estimatedBuildTime'],
			},
			additionalApps: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						description: { type: 'string' },
						whyThisUser: { type: 'string' },
					},
					required: ['name', 'description', 'whyThisUser'],
				},
				description: '2 more app recommendations (paywalled)',
			},
			personalizedModules: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						title: { type: 'string' },
						description: { type: 'string' },
					},
					required: ['id', 'title', 'description'],
				},
				description:
					'1-3 extra learning modules personalized to their app and data. These will be locked (paywalled).',
			},
			keyInsights: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						headline: {
							type: 'string',
							description: 'Short punchy headline, e.g. "You asked about meal planning 12 times"',
						},
						detail: { type: 'string', description: 'One-sentence explanation' },
						source: {
							type: 'string',
							description: 'Data source: quiz, screentime, chatgpt, claude, google, youtube',
						},
					},
					required: ['headline', 'detail', 'source'],
				},
			},
			dataProfile: {
				type: 'object',
				properties: {
					totalSourcesAnalyzed: { type: 'number' },
					topProblemAreas: {
						type: 'array',
						items: { type: 'string' },
						description: '2-4 problem areas identified',
					},
					aiUsageLevel: {
						type: 'string',
						description: 'e.g. "Power user", "Getting started", "AI-curious"',
					},
				},
				required: ['totalSourcesAnalyzed', 'topProblemAreas', 'aiUsageLevel'],
			},
		},
		required: [
			'recommendedApp',
			'additionalApps',
			'personalizedModules',
			'keyInsights',
			'dataProfile',
		],
	},
}

function buildDataContext(input: AnalysisInput): string {
	const sections: string[] = []

	sections.push(`## Quiz Picks (pain points selected)\n${input.quizPicks.join(', ') || 'None'}`)

	const comfortLabels = [
		'',
		'Never touched AI',
		'Tried it a few times',
		'Use it regularly',
		'Use it daily',
	]
	sections.push(
		`## AI Comfort Level\n${input.aiComfort}/4 — ${comfortLabels[input.aiComfort] || 'Unknown'}`,
	)

	sections.push(`## AI Tools Already Used\n${input.aiToolsUsed.join(', ') || 'None'}`)

	if (input.screenTime) {
		const st = input.screenTime
		const appList = [...st.apps]
			.sort((a, b) => b.usageMinutes - a.usageMinutes)
			.slice(0, 10)
			.map((a) => `- ${a.name}: ${a.usageMinutes} min (${a.category})`)
			.join('\n')
		sections.push(
			`## Screen Time Data\nTotal: ${Math.round((st.totalScreenTimeMinutes / 60) * 10) / 10}h\nPickups: ${st.pickups ?? 'unknown'}\n\nTop apps:\n${appList}`,
		)
	}

	if (input.chatgptData) {
		const topicList =
			input.chatgptData.topTopics.length > 0
				? input.chatgptData.topTopics
						.map((t) => `- ${t.topic} (asked ~${t.count} times): ${t.examples.join('; ')}`)
						.join('\n')
				: 'No topics extracted'
		const repeatedList =
			input.chatgptData.repeatedQuestions.length > 0
				? input.chatgptData.repeatedQuestions
						.map((q) => `- "${q.pattern}" (${q.frequency}x)`)
						.join('\n')
				: 'None detected'
		sections.push(
			`## ChatGPT Usage (${input.chatgptData.totalConversations} conversations)\n\nTop topics:\n${topicList}\n\nRepeated questions (real pain points):\n${repeatedList}`,
		)
	}

	if (input.claudeData) {
		const topicList =
			input.claudeData.topTopics.length > 0
				? input.claudeData.topTopics
						.map((t) => `- ${t.topic} (asked ~${t.count} times): ${t.examples.join('; ')}`)
						.join('\n')
				: 'No topics extracted'
		const repeatedList =
			input.claudeData.repeatedQuestions.length > 0
				? input.claudeData.repeatedQuestions
						.map((q) => `- "${q.pattern}" (${q.frequency}x)`)
						.join('\n')
				: 'None detected'
		sections.push(
			`## Claude Usage (${input.claudeData.totalConversations} conversations)\n\nTop topics:\n${topicList}\n\nRepeated questions (real pain points):\n${repeatedList}`,
		)
	}

	if (input.googleData) {
		if (input.googleData.searchTopics.length > 0) {
			const searchList = input.googleData.searchTopics
				.map((t) => `- ${t.topic} (${t.queryCount} searches): ${t.examples.join('; ')}`)
				.join('\n')
			sections.push(`## Google Search Topics\n${searchList}`)
		}
		if (input.googleData.youtubeTopCategories && input.googleData.youtubeTopCategories.length > 0) {
			const ytList = input.googleData.youtubeTopCategories
				.map((c) => `- ${c.category}: ${c.watchCount} videos (~${c.totalMinutes} min)`)
				.join('\n')
			sections.push(`## YouTube Watch Categories\n${ytList}`)
		}
	}

	if (input.subscriptionsData?.subscriptions.length) {
		const subList = input.subscriptionsData.subscriptions
			.map((s) => `- ${s.name}: ${s.price} (${s.frequency})`)
			.join('\n')
		sections.push(`## App Subscriptions\n${subList}`)
	}

	if (input.batteryData?.apps.length) {
		const battList = input.batteryData.apps.map((a) => `- ${a.name}: ${a.percentage}%`).join('\n')
		sections.push(`## Battery Usage\n${battList}`)
	}

	if (input.storageData?.apps.length) {
		const storeList = input.storageData.apps.map((a) => `- ${a.name}: ${a.size}`).join('\n')
		sections.push(`## Storage Usage\n${storeList}`)
	}

	if (input.calendarData?.events.length) {
		const eventList = input.calendarData.events
			.slice(0, 15)
			.map((e) => `- ${e.day} ${e.startTime}: ${e.title} (${e.durationMinutes}min, ${e.category})`)
			.join('\n')
		const summary = [
			`Total events: ${input.calendarData.totalEventsCount}`,
			`Total meeting minutes: ${input.calendarData.totalMeetingMinutes}`,
			input.calendarData.freeBlocksCount != null
				? `Free 1h+ blocks: ${input.calendarData.freeBlocksCount}`
				: null,
			input.calendarData.busiestDay ? `Busiest day: ${input.calendarData.busiestDay}` : null,
		]
			.filter(Boolean)
			.join('\n')
		sections.push(`## Calendar Week View\n${summary}\n\nEvents:\n${eventList}`)
	}

	if (input.healthData?.metrics.length) {
		const metricList = input.healthData.metrics
			.map(
				(m) =>
					`- ${m.name}: ${m.value} ${m.unit}${m.trend && m.trend !== 'unknown' ? ` (trending ${m.trend})` : ''}`,
			)
			.join('\n')
		const highlights = [
			input.healthData.dailySteps != null ? `Steps: ${input.healthData.dailySteps}` : null,
			input.healthData.sleepHours != null ? `Sleep: ${input.healthData.sleepHours}h` : null,
			input.healthData.activeMinutes != null
				? `Active: ${input.healthData.activeMinutes}min`
				: null,
		]
			.filter(Boolean)
			.join(', ')
		sections.push(
			`## Health Data${highlights ? `\nHighlights: ${highlights}` : ''}\n\nMetrics:\n${metricList}`,
		)
	}

	if (input.adaptiveData?.length) {
		const adaptiveList = input.adaptiveData
			.map((entry) => {
				const label = entry.appName ? `${entry.appName} (${entry.sourceType})` : entry.sourceType
				return `- ${label}: ${JSON.stringify(entry.extraction)}`
			})
			.join('\n')
		sections.push(`## Adaptive Follow-Up Data\n${adaptiveList}`)
	}

	return sections.join('\n\n')
}

export async function runCrossAnalysis(input: AnalysisInput): Promise<DiscoveryAnalysis> {
	const dataContext = buildDataContext(input)

	const response = await guardedAnthropicCallOrThrow({
		kind: 'discovery_analyze',
		model: MODELS.SONNET,
		params: {
			model: MODELS.SONNET,
			max_tokens: 4000,
			system: ANALYSIS_SYSTEM_PROMPT,
			messages: [{ role: 'user', content: dataContext }],
			tools: [ANALYSIS_TOOL],
			tool_choice: { type: 'tool', name: 'generate_analysis' },
		},
	})

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'generate_analysis') {
		throw new Error('Analysis failed: no tool response from Claude')
	}

	const analysisToolOutputSchema = z.object({
		recommendedApp: z.object({
			name: z.string().min(1).max(200),
			description: z.string().min(1).max(2000),
			whyThisUser: z.string().min(1).max(2000),
			complexity: z.enum(['beginner', 'intermediate']),
			estimatedBuildTime: z.string().min(1).max(100),
		}),
		additionalApps: z
			.array(
				z.object({
					name: z.string().min(1).max(200),
					description: z.string().min(1).max(2000),
					whyThisUser: z.string().min(1).max(2000),
				}),
			)
			.max(10),
		personalizedModules: z
			.array(
				z.object({
					id: z.string().min(1).max(100),
					title: z.string().min(1).max(200),
					description: z.string().min(1).max(2000),
				}),
			)
			.max(10),
		keyInsights: z
			.array(
				z.object({
					headline: z.string().min(1).max(500),
					detail: z.string().min(1).max(1000),
					source: z.string().min(1).max(100),
				}),
			)
			.max(20),
		dataProfile: z.object({
			totalSourcesAnalyzed: z.number().nonnegative(),
			topProblemAreas: z.array(z.string().min(1).max(200)).max(10),
			aiUsageLevel: z.string().min(1).max(100),
		}),
	})

	const validated = analysisToolOutputSchema.safeParse(toolUse.input)
	if (!validated.success) {
		throw new Error(`Analysis output failed validation: ${validated.error.message}`)
	}
	const result = validated.data

	// Combine base modules (unlocked) + personalized modules (locked)
	const learningModules = [
		...BASE_LEARNING_MODULES.map((m) => ({ ...m, locked: false })),
		...(result.personalizedModules || []).map((m) => ({ ...m, locked: true })),
	]

	return {
		recommendedApp: result.recommendedApp,
		additionalApps: result.additionalApps,
		learningModules,
		keyInsights: result.keyInsights,
		dataProfile: result.dataProfile,
	}
}
