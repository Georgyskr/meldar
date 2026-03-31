import Anthropic from '@anthropic-ai/sdk'
import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'
import type { AiChatParseResult, DiscoveryAnalysis, GoogleParseResult } from './parsers/types'

const client = new Anthropic()

export type AnalysisInput = {
	quizPicks: string[]
	aiComfort: number
	aiToolsUsed: string[]
	screenTime?: ScreenTimeExtraction
	chatgptData?: AiChatParseResult
	claudeData?: AiChatParseResult
	googleData?: GoogleParseResult
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

You have access to some or all of these data sources:
- Quiz picks: pain points the user selected (e.g. "meal_planning", "email_overload")
- AI comfort level: 1 = never touched AI, 4 = uses it daily
- AI tools used: which AI tools they already use
- Screen time: what apps eat their time and how much
- AI chat history: what they keep asking ChatGPT/Claude about (repeated problems = real pain)
- Google search/YouTube: what they research and watch online

YOUR JOB: Cross-reference all available data. The overlap between what they keep asking AI about, what apps eat their time, and what they search for online = the problem worth solving.

RULES:
- The recommended app must be SPECIFIC and PERSONAL — not "a to-do app" but "a meal prep planner that auto-generates shopping lists from your fridge inventory" based on their actual data
- Complexity must match their AI comfort level: comfort 1-2 = beginner only, comfort 3-4 = can be intermediate
- Additional apps should be genuinely different from the main recommendation
- Key insights must reference SPECIFIC data from their uploads ("You asked ChatGPT about meal planning 12 times last month")
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

	// Quiz picks
	sections.push(`## Quiz Picks (pain points selected)\n${input.quizPicks.join(', ') || 'None'}`)

	// AI comfort
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

	// AI tools
	sections.push(`## AI Tools Already Used\n${input.aiToolsUsed.join(', ') || 'None'}`)

	// Screen time
	if (input.screenTime) {
		const st = input.screenTime
		const appList = st.apps
			.slice(0, 10)
			.map((a) => `- ${a.name}: ${a.usageMinutes} min (${a.category})`)
			.join('\n')
		sections.push(
			`## Screen Time Data\nTotal: ${Math.round((st.totalScreenTimeMinutes / 60) * 10) / 10}h\nPickups: ${st.pickups ?? 'unknown'}\n\nTop apps:\n${appList}`,
		)
	}

	// ChatGPT data
	if (input.chatgptData?._rawMessages.length) {
		const msgs = input.chatgptData._rawMessages
			.slice(0, 100)
			.map((m) => `- "${m.text}"`)
			.join('\n')
		sections.push(
			`## ChatGPT Conversation History (${input.chatgptData.totalConversations} conversations, showing ${Math.min(input.chatgptData._rawMessages.length, 100)} recent messages)\n${msgs}`,
		)
	}

	// Claude data
	if (input.claudeData?._rawMessages.length) {
		const msgs = input.claudeData._rawMessages
			.slice(0, 100)
			.map((m) => `- "${m.text}"`)
			.join('\n')
		sections.push(
			`## Claude Conversation History (${input.claudeData.totalConversations} conversations, showing ${Math.min(input.claudeData._rawMessages.length, 100)} recent messages)\n${msgs}`,
		)
	}

	// Google data
	if (input.googleData?._rawSearches.length) {
		const searches = input.googleData._rawSearches
			.slice(0, 100)
			.map((s) => `- "${s}"`)
			.join('\n')
		sections.push(
			`## Google Search History (${input.googleData._rawSearches.length} searches)\n${searches}`,
		)
	}
	if (input.googleData?._rawYoutubeWatches.length) {
		const watches = input.googleData._rawYoutubeWatches
			.slice(0, 100)
			.map((w) => `- "${w}"`)
			.join('\n')
		sections.push(
			`## YouTube Watch History (${input.googleData._rawYoutubeWatches.length} videos)\n${watches}`,
		)
	}

	return sections.join('\n\n')
}

export async function runCrossAnalysis(input: AnalysisInput): Promise<DiscoveryAnalysis> {
	const dataContext = buildDataContext(input)

	const response = await client.messages.create({
		model: 'claude-sonnet-4-5-20250514',
		max_tokens: 4000,
		system: ANALYSIS_SYSTEM_PROMPT,
		messages: [{ role: 'user', content: dataContext }],
		tools: [ANALYSIS_TOOL],
		tool_choice: { type: 'tool', name: 'generate_analysis' },
	})

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use' || toolUse.name !== 'generate_analysis') {
		throw new Error('Analysis failed: no tool response from Claude')
	}

	const result = toolUse.input as {
		recommendedApp: DiscoveryAnalysis['recommendedApp']
		additionalApps: DiscoveryAnalysis['additionalApps']
		personalizedModules: { id: string; title: string; description: string }[]
		keyInsights: DiscoveryAnalysis['keyInsights']
		dataProfile: DiscoveryAnalysis['dataProfile']
	}

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
