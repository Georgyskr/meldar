import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getAnthropicClient } from '@/server/lib/anthropic'

type ExtractionResult = { data: unknown } | { error: string }

const sourceValidationSchemas: Record<string, z.ZodType> = {
	subscriptions: z.object({
		subscriptions: z.array(
			z.object({
				name: z.string(),
				price: z.string(),
				frequency: z.string(),
			}),
		),
	}),
	battery: z.object({
		apps: z.array(z.object({ name: z.string(), percentage: z.number() })),
	}),
	storage: z.object({
		apps: z.array(z.object({ name: z.string(), size: z.string() })),
	}),
	calendar: z.object({
		events: z.array(
			z.object({
				title: z.string(),
				day: z.string(),
				startTime: z.string(),
				durationMinutes: z.number(),
				category: z.string(),
			}),
		),
		totalEventsCount: z.number(),
		totalMeetingMinutes: z.number(),
	}),
	health: z.object({
		metrics: z.array(
			z.object({
				name: z.string(),
				value: z.string(),
				unit: z.string(),
			}),
		),
	}),
}

const SOURCE_PROMPTS: Record<
	string,
	{ system: string; toolName: string; toolSchema: Anthropic.Messages.Tool.InputSchema }
> = {
	subscriptions: {
		system:
			'You extract subscription data from App Store or Google Play subscription screenshots. Extract every visible subscription with its name, price, and billing frequency.',
		toolName: 'extract_subscriptions',
		toolSchema: {
			type: 'object' as const,
			properties: {
				subscriptions: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'App or service name' },
							price: { type: 'string', description: 'Price as shown, e.g. "9.99 EUR/mo"' },
							frequency: {
								type: 'string',
								description: 'Billing frequency: monthly, yearly, weekly, or one-time',
							},
						},
						required: ['name', 'price', 'frequency'],
					},
				},
				error: {
					type: 'string',
					enum: ['not_subscriptions', 'unreadable'],
					description: 'Set only if the image is not a subscriptions screenshot',
				},
			},
			required: ['subscriptions'],
		},
	},
	battery: {
		system:
			'You extract battery usage data from iPhone Battery settings or Android Battery screenshots. Extract every visible app with its battery usage percentage.',
		toolName: 'extract_battery',
		toolSchema: {
			type: 'object' as const,
			properties: {
				apps: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'App name exactly as shown' },
							percentage: { type: 'number', description: 'Battery usage percentage' },
						},
						required: ['name', 'percentage'],
					},
				},
				error: {
					type: 'string',
					enum: ['not_battery', 'unreadable'],
					description: 'Set only if the image is not a battery screenshot',
				},
			},
			required: ['apps'],
		},
	},
	storage: {
		system:
			'You extract storage usage data from iPhone/Android Storage settings screenshots. Extract every visible app with its storage size.',
		toolName: 'extract_storage',
		toolSchema: {
			type: 'object' as const,
			properties: {
				apps: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string', description: 'App name exactly as shown' },
							size: {
								type: 'string',
								description: 'Storage size as shown, e.g. "1.2 GB", "350 MB"',
							},
						},
						required: ['name', 'size'],
					},
				},
				error: {
					type: 'string',
					enum: ['not_storage', 'unreadable'],
					description: 'Set only if the image is not a storage screenshot',
				},
			},
			required: ['apps'],
		},
	},
	calendar: {
		system:
			'Extract meeting/event titles, times, duration, and count from this calendar week view screenshot. Identify meeting density, free time blocks, and work-life balance indicators.',
		toolName: 'extract_calendar',
		toolSchema: {
			type: 'object' as const,
			properties: {
				events: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							title: { type: 'string', description: 'Event/meeting title as shown' },
							day: { type: 'string', description: 'Day of the week (Mon, Tue, etc.)' },
							startTime: { type: 'string', description: 'Start time, e.g. "09:00"' },
							durationMinutes: {
								type: 'number',
								description: 'Duration in minutes, estimate from visual block size if not explicit',
							},
							category: {
								type: 'string',
								enum: ['meeting', 'focus', 'personal', 'commute', 'break', 'other'],
							},
						},
						required: ['title', 'day', 'startTime', 'durationMinutes', 'category'],
					},
				},
				totalEventsCount: {
					type: 'number',
					description: 'Total number of events visible in the week',
				},
				totalMeetingMinutes: {
					type: 'number',
					description: 'Total minutes spent in meetings across the visible week',
				},
				freeBlocksCount: {
					type: 'number',
					description: 'Number of 1h+ free blocks during work hours (9-17)',
				},
				busiestDay: {
					type: 'string',
					description: 'Day with the most events',
				},
				error: {
					type: 'string',
					enum: ['not_calendar', 'unreadable'],
					description: 'Set only if the image is not a calendar screenshot',
				},
			},
			required: ['events', 'totalEventsCount', 'totalMeetingMinutes'],
		},
	},
	health: {
		system:
			'Extract health metrics from this Apple Health/Google Fit dashboard screenshot: steps, sleep hours, activity minutes, heart rate, and any other visible health data.',
		toolName: 'extract_health',
		toolSchema: {
			type: 'object' as const,
			properties: {
				metrics: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: {
								type: 'string',
								description: 'Metric name, e.g. "Steps", "Sleep", "Active Energy"',
							},
							value: { type: 'string', description: 'Value as shown, e.g. "8,432", "7h 23m"' },
							unit: {
								type: 'string',
								description: 'Unit of measurement, e.g. "steps", "hours", "kcal", "bpm"',
							},
							trend: {
								type: 'string',
								enum: ['up', 'down', 'stable', 'unknown'],
								description: 'Trend direction if a comparison or arrow is visible',
							},
						},
						required: ['name', 'value', 'unit'],
					},
				},
				dailySteps: {
					type: 'number',
					nullable: true,
					description: 'Daily steps if visible',
				},
				sleepHours: {
					type: 'number',
					nullable: true,
					description: 'Sleep hours if visible',
				},
				activeMinutes: {
					type: 'number',
					nullable: true,
					description: 'Active/exercise minutes if visible',
				},
				error: {
					type: 'string',
					enum: ['not_health', 'unreadable'],
					description: 'Set only if the image is not a health app screenshot',
				},
			},
			required: ['metrics'],
		},
	},
}

export async function extractFromScreenshot(
	base64: string,
	mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
	sourceType: string,
): Promise<ExtractionResult> {
	const config = SOURCE_PROMPTS[sourceType]
	if (!config) {
		return { error: `Unknown source type: ${sourceType}` }
	}

	const response = await getAnthropicClient().messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 1024,
		system: config.system,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: { type: 'base64', media_type: mediaType, data: base64 },
					},
					{
						type: 'text',
						text: `Extract all data from this ${sourceType} screenshot. Use the ${config.toolName} tool.`,
					},
				],
			},
		],
		tools: [
			{
				name: config.toolName,
				description: `Extract structured ${sourceType} data from a screenshot`,
				input_schema: config.toolSchema,
			},
		],
		tool_choice: { type: 'tool', name: config.toolName },
	})

	const toolUse = response.content.find((c) => c.type === 'tool_use')
	if (!toolUse || toolUse.type !== 'tool_use') {
		return { error: 'No tool response from extraction' }
	}

	const input = toolUse.input as Record<string, unknown>

	if (input.error) {
		return { error: input.error as string }
	}

	const schema = sourceValidationSchemas[sourceType]
	if (schema) {
		const validated = schema.safeParse(input)
		if (!validated.success) {
			console.warn(
				`Screenshot extraction validation failed for ${sourceType}: ${validated.error.message}`,
			)
			return { error: `Extraction output failed validation for ${sourceType}` }
		}
		return { data: validated.data }
	}

	return { data: input }
}
