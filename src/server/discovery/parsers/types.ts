import { z } from 'zod'

// ── Unified shape for parsed AI chat data (ChatGPT / Claude / DeepSeek) ────

export const aiChatPatternSchema = z.object({
	totalConversations: z.number(),
	topTopics: z.array(
		z.object({
			topic: z.string(),
			count: z.number(),
			examples: z.array(z.string()),
		}),
	),
	repeatedQuestions: z.array(
		z.object({
			pattern: z.string(),
			frequency: z.number(),
			lastAsked: z.string().nullable(),
		}),
	),
	timePatterns: z.object({
		mostActiveHour: z.number(),
		weekdayVsWeekend: z.enum(['weekday_heavy', 'weekend_heavy', 'balanced']),
	}),
	platform: z.enum(['chatgpt', 'claude', 'deepseek']),
})

export type AiChatPattern = z.infer<typeof aiChatPatternSchema>

// Raw messages attached during parsing, consumed by the analysis engine
export type AiChatParseResult = AiChatPattern & {
	_rawMessages: { text: string; timestamp: number }[]
}

// ── Google Takeout parsed data ─────────────────────────────────────────────

export const googlePatternSchema = z.object({
	searchTopics: z.array(
		z.object({
			topic: z.string(),
			queryCount: z.number(),
			examples: z.array(z.string()),
		}),
	),
	youtubeTopCategories: z
		.array(
			z.object({
				category: z.string(),
				watchCount: z.number(),
				totalMinutes: z.number(),
			}),
		)
		.nullable(),
	emailVolume: z
		.object({
			dailyAverage: z.number(),
			topSenders: z.array(z.string()),
		})
		.nullable(),
})

export type GooglePattern = z.infer<typeof googlePatternSchema>

export type GoogleParseResult = GooglePattern & {
	_rawSearches: string[]
	_rawYoutubeWatches: string[]
}

// ── Cross-reference analysis output ────────────────────────────────────────

export const discoveryAnalysisSchema = z.object({
	recommendedApp: z.object({
		name: z.string(),
		description: z.string(),
		whyThisUser: z.string(),
		complexity: z.enum(['beginner', 'intermediate']),
		estimatedBuildTime: z.string(),
	}),
	additionalApps: z.array(
		z.object({
			name: z.string(),
			description: z.string(),
			whyThisUser: z.string(),
		}),
	),
	learningModules: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			description: z.string(),
			locked: z.boolean(),
		}),
	),
	keyInsights: z.array(
		z.object({
			headline: z.string(),
			detail: z.string(),
			source: z.string(),
		}),
	),
	dataProfile: z.object({
		totalSourcesAnalyzed: z.number(),
		topProblemAreas: z.array(z.string()),
		aiUsageLevel: z.string(),
	}),
})

export type DiscoveryAnalysis = z.infer<typeof discoveryAnalysisSchema>
