import { z } from 'zod'

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
