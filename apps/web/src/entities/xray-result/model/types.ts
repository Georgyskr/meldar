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
	name: z.string().min(1).max(200),
	usageMinutes: z.number().nonnegative(),
	category: appCategorySchema,
})

export type AppUsage = z.infer<typeof appUsageSchema>

export const screenTimeExtractionSchema = z.object({
	apps: z.array(appUsageSchema).max(200),
	totalScreenTimeMinutes: z.number().nonnegative(),
	pickups: z.number().nonnegative().nullable(),
	firstAppOpenTime: z.string().max(32).nullable().optional(),
	date: z.string().max(64).nullable().optional(),
	platform: z.enum(['ios', 'android', 'unknown']),
	confidence: z.enum(['high', 'medium', 'low']),
})

export type ScreenTimeExtraction = z.infer<typeof screenTimeExtractionSchema>

export const insightSchema = z.object({
	headline: z.string().min(1).max(500),
	comparison: z.string().min(1).max(500),
	suggestion: z.string().min(1).max(500),
	severity: z.enum(['low', 'medium', 'high']),
	fixSteps: z.array(z.string().min(1).max(1000)).max(10),
})

export type Insight = z.infer<typeof insightSchema>

export const upsellHookSchema = z.object({
	trigger: z.string().min(1).max(500),
	tierTarget: z.enum(['audit', 'starter', 'app_build', 'concierge']),
	message: z.string().min(1).max(500),
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
