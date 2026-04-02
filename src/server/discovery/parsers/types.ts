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

// Raw parse result — returned by parsers, consumed by upload route.
// Raw messages are extracted by Haiku, then discarded before DB storage.
export type AiChatRawParseResult = AiChatPattern & {
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

// Raw parse result — returned by Google parser, consumed by upload route.
// Raw searches/watches are extracted by Haiku, then discarded.
export type GoogleRawParseResult = GooglePattern & {
	_rawSearches: string[]
	_rawYoutubeWatches: string[]
}

// Cross-reference analysis — shared between client and server
export { type DiscoveryAnalysis, discoveryAnalysisSchema } from '@/shared/types/discovery'
