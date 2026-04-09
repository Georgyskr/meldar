import type Anthropic from '@anthropic-ai/sdk'
import {
	type ScreenTimeExtraction,
	screenTimeExtractionSchema,
} from '@/entities/xray-result/model/types'
import { MODELS } from '@/server/lib/anthropic'
import {
	GuardedCallBlockedError,
	guardedAnthropicCallOrThrow,
} from '@/server/lib/guarded-anthropic'
import { FOCUS_MODE_PROMPT_ADDENDUM, SCREEN_TIME_SYSTEM_PROMPT } from './prompts'

type ExtractionResult = { data: ScreenTimeExtraction } | { error: string }

type ExtractionOptions = {
	focusMode?: boolean
}

export async function extractScreenTime(
	imageBase64: string,
	mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
	options: ExtractionOptions = {},
): Promise<ExtractionResult> {
	const systemPrompt = options.focusMode
		? `${SCREEN_TIME_SYSTEM_PROMPT}\n\n${FOCUS_MODE_PROMPT_ADDENDUM}`
		: SCREEN_TIME_SYSTEM_PROMPT

	let response: Anthropic.Messages.Message
	try {
		response = await guardedAnthropicCallOrThrow({
			kind: 'discovery_ocr',
			model: MODELS.HAIKU,
			params: {
				model: MODELS.HAIKU,
				max_tokens: 1024,
				system: systemPrompt,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: { type: 'base64', media_type: mediaType, data: imageBase64 },
							},
							{
								type: 'text',
								text: 'Extract all screen time data from this screenshot. Use the extract_screen_time tool.',
							},
						],
					},
				],
				tools: [
					{
						name: 'extract_screen_time',
						description: 'Extract structured screen time data from a screenshot',
						input_schema: {
							type: 'object' as const,
							properties: {
								apps: {
									type: 'array',
									items: {
										type: 'object',
										properties: {
											name: { type: 'string', description: 'App name exactly as shown' },
											usageMinutes: { type: 'number', description: 'Usage time in minutes' },
											category: {
												type: 'string',
												enum: [
													'social',
													'entertainment',
													'productivity',
													'communication',
													'browser',
													'health',
													'finance',
													'education',
													'gaming',
													'utility',
												],
											},
										},
										required: ['name', 'usageMinutes', 'category'],
									},
								},
								totalScreenTimeMinutes: {
									type: 'number',
									description: 'Total screen time in minutes',
								},
								pickups: {
									type: 'number',
									description: 'Number of pickups, null if not visible',
									nullable: true,
								},
								firstAppOpenTime: {
									type: 'string',
									description: 'First app open time, null if not visible',
									nullable: true,
								},
								date: {
									type: 'string',
									description: 'Date shown on the screenshot, null if not visible',
									nullable: true,
								},
								platform: { type: 'string', enum: ['ios', 'android', 'unknown'] },
								confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
								error: {
									type: 'string',
									enum: ['not_screen_time', 'unreadable'],
									description: 'Set only if the image is not a valid screen time screenshot',
								},
							},
							required: ['apps', 'totalScreenTimeMinutes', 'platform', 'confidence'],
						},
					},
				],
				tool_choice: { type: 'tool', name: 'extract_screen_time' },
			},
		})
	} catch (err) {
		if (err instanceof GuardedCallBlockedError) return { error: err.message }
		throw err
	}

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use') {
		throw new Error('No tool use in response')
	}

	const input = toolUse.input as Record<string, unknown>

	if (input.error) {
		return { error: input.error as string }
	}

	const parsed = screenTimeExtractionSchema.safeParse(input)
	if (!parsed.success) {
		throw new Error(`Invalid extraction: ${parsed.error.message}`)
	}

	return { data: parsed.data }
}
