import { TEMPLATE_PLANS } from './index'

export const TEMPLATE_SUMMARIES = TEMPLATE_PLANS.map((t) => ({
	id: t.id,
	name: t.name,
	description: t.description,
	category: t.category,
	milestoneCount: t.milestones.length,
}))

export type TemplateSummary = (typeof TEMPLATE_SUMMARIES)[number]
