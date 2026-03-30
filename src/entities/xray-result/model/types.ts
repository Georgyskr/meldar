import { z } from 'zod'

export const appCategorySchema = z.enum([
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
])

export type AppCategory = z.infer<typeof appCategorySchema>

export const appUsageSchema = z.object({
	name: z.string(),
	usageMinutes: z.number(),
	category: appCategorySchema,
})

export type AppUsage = z.infer<typeof appUsageSchema>

export const screenTimeExtractionSchema = z.object({
	apps: z.array(appUsageSchema),
	totalScreenTimeMinutes: z.number(),
	pickups: z.number().nullable(),
	firstAppOpenTime: z.string().nullable(),
	date: z.string().nullable(),
	platform: z.enum(['ios', 'android', 'unknown']),
	confidence: z.enum(['high', 'medium', 'low']),
})

export type ScreenTimeExtraction = z.infer<typeof screenTimeExtractionSchema>

export const insightSchema = z.object({
	headline: z.string(),
	comparison: z.string(),
	suggestion: z.string(),
	severity: z.enum(['low', 'medium', 'high']),
})

export type Insight = z.infer<typeof insightSchema>

export const upsellHookSchema = z.object({
	trigger: z.string(),
	tierTarget: z.enum(['audit', 'starter', 'app_build', 'concierge']),
	message: z.string(),
	urgency: z.enum(['low', 'medium', 'high']),
})

export type UpsellHook = z.infer<typeof upsellHookSchema>

export const xrayResponseSchema = z.object({
	extraction: screenTimeExtractionSchema,
	insights: z.array(insightSchema),
	upsells: z.array(upsellHookSchema),
	painPoints: z.array(z.string()),
})

export type XRayResponse = z.infer<typeof xrayResponseSchema>
