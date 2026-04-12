import {
	type AnthropicCreateHandler,
	makeAnthropicMessage,
	makeTextBlock,
	makeToolUseBlock,
} from '@meldar/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockMessagesCreate } = vi.hoisted(() => ({
	mockMessagesCreate: vi.fn<AnthropicCreateHandler>(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { create: mockMessagesCreate }
	},
}))

import type { AnalysisInput } from '../analyze'
import { runCrossAnalysis } from '../analyze'


const minimalInput: AnalysisInput = {
	quizPicks: ['meal_planning', 'email_overload'],
	aiComfort: 2,
	aiToolsUsed: ['ChatGPT'],
}

const validAnalysisToolOutput = {
	recommendedApp: {
		name: 'MealMate',
		description: 'A meal planning app with auto-generated shopping lists',
		whyThisUser: 'You asked ChatGPT about meal planning 12 times',
		complexity: 'beginner' as const,
		estimatedBuildTime: '1 day',
	},
	additionalApps: [
		{
			name: 'InboxZero',
			description: 'Email triage automation',
			whyThisUser: 'Email overload is one of your top pain points',
		},
	],
	personalizedModules: [
		{
			id: 'meal-api',
			title: 'Connecting to recipe APIs',
			description: 'Learn to pull recipe data into your app',
		},
	],
	keyInsights: [
		{
			headline: 'You asked about meal planning 12 times',
			detail: 'This is your most frequent ChatGPT topic by far',
			source: 'chatgpt',
		},
	],
	dataProfile: {
		totalSourcesAnalyzed: 3,
		topProblemAreas: ['meal planning', 'email overload'],
		aiUsageLevel: 'Getting started',
	},
}

function mockAnalysisToolResponse(input: Record<string, unknown>): void {
	mockMessagesCreate.mockResolvedValue(
		makeAnthropicMessage({ content: [makeToolUseBlock('generate_analysis', input)] }),
	)
}


describe('buildDataContext — verified via runCrossAnalysis user message content', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('always includes ## Quiz Picks and ## AI Comfort Level sections', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis(minimalInput)

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Quiz Picks')
		expect(userContent).toContain('## AI Comfort Level')
	})

	it('formats aiComfort label as "Never touched AI" for value 1', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({ ...minimalInput, aiComfort: 1 })

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('Never touched AI')
	})

	it('formats aiComfort label as "Use it daily" for value 4', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({ ...minimalInput, aiComfort: 4 })

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('Use it daily')
	})

	it('includes ## Screen Time Data section only when screenTime is defined', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			screenTime: {
				apps: [{ name: 'Instagram', usageMinutes: 90, category: 'social' }],
				totalScreenTimeMinutes: 360,
				pickups: 42,
				platform: 'ios',
				confidence: 'high',
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Screen Time Data')
		expect(userContent).toContain('Instagram')
	})

	it('includes ## ChatGPT Usage section with topic count and repeated question list', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			chatgptData: {
				totalConversations: 50,
				topTopics: [{ topic: 'meal planning', count: 12, examples: ['weekly meals'] }],
				repeatedQuestions: [
					{ pattern: 'How to plan meals', frequency: 5, lastAsked: '2026-03-20' },
				],
				timePatterns: { mostActiveHour: 14, weekdayVsWeekend: 'weekday_heavy' },
				platform: 'chatgpt',
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## ChatGPT Usage (50 conversations)')
		expect(userContent).toContain('meal planning')
		expect(userContent).toContain('"How to plan meals" (5x)')
	})

	it('includes ## Claude Usage section independently of chatgpt', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			claudeData: {
				totalConversations: 20,
				topTopics: [{ topic: 'Python debugging', count: 8, examples: ['fix error'] }],
				repeatedQuestions: [],
				timePatterns: { mostActiveHour: 10, weekdayVsWeekend: 'balanced' },
				platform: 'claude',
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Claude Usage (20 conversations)')
		expect(userContent).toContain('Python debugging')
	})

	it('includes ## Google Search Topics section', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			googleData: {
				searchTopics: [{ topic: 'cooking', queryCount: 25, examples: ['pasta recipe'] }],
				youtubeTopCategories: null,
				emailVolume: null,
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Google Search Topics')
		expect(userContent).toContain('cooking')
	})

	it('includes ## YouTube Watch Categories section only when youtubeTopCategories is non-empty', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			googleData: {
				searchTopics: [],
				youtubeTopCategories: [{ category: 'Cooking', watchCount: 10, totalMinutes: 100 }],
				emailVolume: null,
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## YouTube Watch Categories')
		expect(userContent).toContain('Cooking')
	})

	it('includes ## App Subscriptions section', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			subscriptionsData: {
				subscriptions: [{ name: 'Notion', price: '$10/mo', frequency: 'monthly' }],
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## App Subscriptions')
		expect(userContent).toContain('Notion')
	})

	it('includes ## Battery Usage section', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			batteryData: { apps: [{ name: 'Spotify', percentage: 15 }] },
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Battery Usage')
		expect(userContent).toContain('Spotify: 15%')
	})

	it('includes ## Storage Usage section', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			storageData: { apps: [{ name: 'Photos', size: '12.3 GB' }] },
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Storage Usage')
		expect(userContent).toContain('Photos: 12.3 GB')
	})

	it('includes ## Calendar Week View section with events capped at first 15', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		const events = Array.from({ length: 20 }, (_, i) => ({
			title: `Meeting ${i}`,
			day: 'Monday',
			startTime: '09:00',
			durationMinutes: 30,
			category: 'work',
		}))

		await runCrossAnalysis({
			...minimalInput,
			calendarData: {
				events,
				totalEventsCount: 20,
				totalMeetingMinutes: 600,
				freeBlocksCount: 3,
				busiestDay: 'Monday',
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Calendar Week View')
		expect(userContent).toContain('Meeting 14')
		expect(userContent).not.toContain('Meeting 15')
		expect(userContent).toContain('Free 1h+ blocks: 3')
		expect(userContent).toContain('Busiest day: Monday')
	})

	it('includes ## Health Data section with highlights line', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			healthData: {
				metrics: [{ name: 'Heart Rate', value: '72', unit: 'bpm', trend: 'stable' }],
				dailySteps: 8500,
				sleepHours: 7.5,
				activeMinutes: 45,
			},
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Health Data')
		expect(userContent).toContain('Steps: 8500')
		expect(userContent).toContain('Sleep: 7.5h')
		expect(userContent).toContain('Active: 45min')
	})

	it('includes ## Adaptive Follow-Up Data section', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis({
			...minimalInput,
			adaptiveData: [
				{
					appName: 'Notion',
					sourceType: 'screenshot',
					extraction: { pages: 12 },
				},
			],
		})

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).toContain('## Adaptive Follow-Up Data')
		expect(userContent).toContain('Notion (screenshot)')
	})

	it('omits all optional sections when their data fields are undefined', async () => {
		mockAnalysisToolResponse(validAnalysisToolOutput)

		await runCrossAnalysis(minimalInput)

		const userContent = mockMessagesCreate.mock.calls[0][0].messages[0].content as string
		expect(userContent).not.toContain('## Screen Time Data')
		expect(userContent).not.toContain('## ChatGPT Usage')
		expect(userContent).not.toContain('## Claude Usage')
		expect(userContent).not.toContain('## Google Search Topics')
		expect(userContent).not.toContain('## YouTube Watch Categories')
		expect(userContent).not.toContain('## App Subscriptions')
		expect(userContent).not.toContain('## Battery Usage')
		expect(userContent).not.toContain('## Storage Usage')
		expect(userContent).not.toContain('## Calendar Week View')
		expect(userContent).not.toContain('## Health Data')
		expect(userContent).not.toContain('## Adaptive Follow-Up Data')
	})
})


describe('runCrossAnalysis', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('happy path', () => {
		it('calls Sonnet with ANALYSIS_TOOL and tool_choice forced to generate_analysis', async () => {
			mockAnalysisToolResponse(validAnalysisToolOutput)

			await runCrossAnalysis(minimalInput)

			const callArgs = mockMessagesCreate.mock.calls[0][0]
			expect(callArgs.model).toBe('claude-sonnet-4-6')
			expect(callArgs.tool_choice).toEqual({
				type: 'tool',
				name: 'generate_analysis',
			})
			expect(callArgs.tools).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'generate_analysis' })]),
			)
		})

		it('returns DiscoveryAnalysis with all required fields: recommendedApp, additionalApps, learningModules, keyInsights, dataProfile', async () => {
			mockAnalysisToolResponse(validAnalysisToolOutput)

			const result = await runCrossAnalysis(minimalInput)

			expect(result.recommendedApp.name).toBe('MealMate')
			expect(result.additionalApps).toHaveLength(1)
			expect(result.learningModules.length).toBeGreaterThan(0)
			expect(result.keyInsights).toHaveLength(1)
			expect(result.dataProfile.totalSourcesAnalyzed).toBe(3)
		})

		it('merges BASE_LEARNING_MODULES with locked: false and personalizedModules with locked: true', async () => {
			mockAnalysisToolResponse(validAnalysisToolOutput)

			const result = await runCrossAnalysis(minimalInput)

			const baseModules = result.learningModules.filter((m) => !m.locked)
			const personalizedModules = result.learningModules.filter((m) => m.locked)

			// 4 base modules
			expect(baseModules).toHaveLength(4)
			expect(baseModules[0].id).toBe('coding-2026')
			expect(baseModules.every((m) => m.locked === false)).toBe(true)

			// 1 personalized module from the AI output
			expect(personalizedModules).toHaveLength(1)
			expect(personalizedModules[0].id).toBe('meal-api')
			expect(personalizedModules[0].locked).toBe(true)
		})
	})

	describe('error cases', () => {
		it('throws "Analysis failed: no tool response from Claude" when no tool_use in response.content', async () => {
			mockMessagesCreate.mockResolvedValue(
				makeAnthropicMessage({ content: [makeTextBlock('I cannot analyze')] }),
			)

			await expect(runCrossAnalysis(minimalInput)).rejects.toThrow(
				'Analysis failed: no tool response from Claude',
			)
		})

		it('throws with Zod message when tool output fails analysisToolOutputSchema', async () => {
			mockAnalysisToolResponse({
				recommendedApp: 'not an object',
				additionalApps: [],
				personalizedModules: [],
				keyInsights: [],
				dataProfile: {},
			})

			await expect(runCrossAnalysis(minimalInput)).rejects.toThrow(
				'Analysis output failed validation',
			)
		})

		it('throws when recommendedApp.complexity is not "beginner" or "intermediate"', async () => {
			mockAnalysisToolResponse({
				...validAnalysisToolOutput,
				recommendedApp: {
					...validAnalysisToolOutput.recommendedApp,
					complexity: 'expert',
				},
			})

			await expect(runCrossAnalysis(minimalInput)).rejects.toThrow(
				'Analysis output failed validation',
			)
		})
	})
})
