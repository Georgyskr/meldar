import { z } from 'zod'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'

const topicExtractionSchema = z.object({
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
})

type TopicExtractionResult = z.infer<typeof topicExtractionSchema>

/**
 * Call Haiku to extract structured topics from raw user messages.
 * Used during upload before raw messages are stripped for privacy.
 */
export async function extractTopicsFromMessages(
	messages: { text: string; timestamp: number }[],
	platform: string,
): Promise<TopicExtractionResult> {
	if (messages.length === 0) {
		return { topTopics: [], repeatedQuestions: [] }
	}

	// Send at most 300 messages to keep within token limits
	const sample = messages.slice(0, 300)
	const messageDump = sample.map((m) => m.text).join('\n---\n')

	const response = await getAnthropicClient().messages.create({
		model: MODELS.HAIKU,
		max_tokens: 2048,
		system: `You are a topic extraction engine. Given user messages from ${platform}, extract the most common topics and identify repeated questions. Be specific — "meal planning" not "food", "Python debugging" not "coding".`,
		messages: [
			{
				role: 'user',
				content: `Here are ${sample.length} user messages from ${platform}. Extract the top 5-8 topics they ask about most, and identify repeated questions (same topic asked 3+ times).\n\n${messageDump}`,
			},
		],
		tools: [
			{
				name: 'extract_topics',
				description: 'Extract structured topic data from user messages',
				input_schema: {
					type: 'object' as const,
					properties: {
						topTopics: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									topic: {
										type: 'string',
										description: 'Specific topic name, e.g. "meal planning", "Python debugging"',
									},
									count: {
										type: 'number',
										description: 'Approximate number of messages about this topic',
									},
									examples: {
										type: 'array',
										items: { type: 'string' },
										description:
											'2-3 representative short summaries of what they asked (not verbatim messages)',
									},
								},
								required: ['topic', 'count', 'examples'],
							},
							description: 'Top 5-8 topics by frequency',
						},
						repeatedQuestions: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									pattern: {
										type: 'string',
										description:
											'The repeated question pattern, e.g. "How to format dates in Python"',
									},
									frequency: {
										type: 'number',
										description: 'How many times this pattern appeared',
									},
									lastAsked: {
										type: 'string',
										nullable: true,
										description: 'Approximate date of last occurrence, or null if unknown',
									},
								},
								required: ['pattern', 'frequency', 'lastAsked'],
							},
							description:
								'Questions asked 3+ times about the same topic — signals real pain points',
						},
					},
					required: ['topTopics', 'repeatedQuestions'],
				},
			},
		],
		tool_choice: { type: 'tool', name: 'extract_topics' },
	})

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use') {
		return { topTopics: [], repeatedQuestions: [] }
	}

	const validated = topicExtractionSchema.safeParse(toolUse.input)
	if (!validated.success) {
		console.warn(`Topic extraction output failed validation: ${validated.error.message}`)
		return { topTopics: [], repeatedQuestions: [] }
	}
	return {
		topTopics: validated.data.topTopics,
		repeatedQuestions: validated.data.repeatedQuestions,
	}
}

const searchTopicExtractionSchema = z.object({
	searchTopics: z.array(
		z.object({
			topic: z.string(),
			queryCount: z.number(),
			examples: z.array(z.string()),
		}),
	),
	youtubeTopCategories: z.array(
		z.object({
			category: z.string(),
			watchCount: z.number(),
			totalMinutes: z.number(),
		}),
	),
})

type SearchTopicExtractionResult = z.infer<typeof searchTopicExtractionSchema>

/**
 * Call Haiku to extract structured topics from raw Google searches and YouTube watches.
 */
export async function extractGoogleTopics(
	searches: string[],
	youtubeWatches: string[],
): Promise<SearchTopicExtractionResult> {
	if (searches.length === 0 && youtubeWatches.length === 0) {
		return { searchTopics: [], youtubeTopCategories: [] }
	}

	const parts: string[] = []
	if (searches.length > 0) {
		parts.push(
			`Google Searches (${searches.length} total, showing ${Math.min(searches.length, 300)}):\n${searches.slice(0, 300).join('\n')}`,
		)
	}
	if (youtubeWatches.length > 0) {
		parts.push(
			`YouTube Watches (${youtubeWatches.length} total, showing ${Math.min(youtubeWatches.length, 300)}):\n${youtubeWatches.slice(0, 300).join('\n')}`,
		)
	}

	const response = await getAnthropicClient().messages.create({
		model: MODELS.HAIKU,
		max_tokens: 2048,
		system:
			'You are a topic extraction engine for Google Takeout data. Categorize searches and YouTube watches into meaningful topics.',
		messages: [
			{
				role: 'user',
				content: `Analyze this Google data and extract structured topics.\n\n${parts.join('\n\n')}`,
			},
		],
		tools: [
			{
				name: 'extract_google_topics',
				description: 'Extract structured topics from Google search and YouTube data',
				input_schema: {
					type: 'object' as const,
					properties: {
						searchTopics: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									topic: {
										type: 'string',
										description: 'Topic name',
									},
									queryCount: {
										type: 'number',
										description: 'Number of searches about this topic',
									},
									examples: {
										type: 'array',
										items: { type: 'string' },
										description: '2-3 representative search queries',
									},
								},
								required: ['topic', 'queryCount', 'examples'],
							},
						},
						youtubeTopCategories: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									category: {
										type: 'string',
										description: 'Category name',
									},
									watchCount: {
										type: 'number',
										description: 'Number of videos watched in this category',
									},
									totalMinutes: {
										type: 'number',
										description:
											'Estimated total watch time in minutes (estimate 10 min per video if unknown)',
									},
								},
								required: ['category', 'watchCount', 'totalMinutes'],
							},
						},
					},
					required: ['searchTopics', 'youtubeTopCategories'],
				},
			},
		],
		tool_choice: { type: 'tool', name: 'extract_google_topics' },
	})

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use') {
		return { searchTopics: [], youtubeTopCategories: [] }
	}

	const validated = searchTopicExtractionSchema.safeParse(toolUse.input)
	if (!validated.success) {
		console.warn(`Google topic extraction output failed validation: ${validated.error.message}`)
		return { searchTopics: [], youtubeTopCategories: [] }
	}
	return {
		searchTopics: validated.data.searchTopics,
		youtubeTopCategories: validated.data.youtubeTopCategories,
	}
}
