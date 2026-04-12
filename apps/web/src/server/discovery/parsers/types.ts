import { z } from 'zod'


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

export type AiChatRawParseResult = AiChatPattern & {
	_rawMessages: { text: string; timestamp: number }[]
}


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

export type GoogleRawParseResult = GooglePattern & {
	_rawSearches: string[]
	_rawYoutubeWatches: string[]
	/** Whole-file parse failures (bad JSON or non-array root). */
	_skippedFileCount: number
	/** Per-item schema validation failures inside otherwise-valid files. */
	_skippedItemCount: number
}

export { type DiscoveryAnalysis, discoveryAnalysisSchema } from '@/shared/types/discovery'
