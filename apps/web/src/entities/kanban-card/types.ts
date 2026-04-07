import { z } from 'zod'

export const kanbanCardStateSchema = z.enum([
	'draft',
	'ready',
	'queued',
	'building',
	'built',
	'needs_rework',
	'failed',
])
export type KanbanCardState = z.infer<typeof kanbanCardStateSchema>

export const kanbanCardTaskTypeSchema = z.enum([
	'feature',
	'page',
	'integration',
	'data',
	'fix',
	'polish',
])
export type KanbanCardTaskType = z.infer<typeof kanbanCardTaskTypeSchema>

export const kanbanCardGeneratedBySchema = z.enum(['template', 'haiku', 'user'])
export type KanbanCardGeneratedBy = z.infer<typeof kanbanCardGeneratedBySchema>

export const kanbanCardSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string().uuid(),
	parentId: z.string().uuid().nullable(),
	position: z.number().int(),
	state: kanbanCardStateSchema,
	required: z.boolean(),
	title: z.string().min(1).max(80),
	description: z.string().max(500).nullable(),
	taskType: kanbanCardTaskTypeSchema,
	acceptanceCriteria: z.array(z.string()).max(5).nullable(),
	explainerText: z.string().max(500).nullable(),
	generatedBy: kanbanCardGeneratedBySchema,
	tokenCostEstimateMin: z.number().int().nullable(),
	tokenCostEstimateMax: z.number().int().nullable(),
	tokenCostActual: z.number().int().nullable(),
	dependsOn: z.array(z.string().uuid()),
	blockedReason: z.string().nullable(),
	lastBuildId: z.string().uuid().nullable(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	builtAt: z.coerce.date().nullable(),
})
export type KanbanCard = z.infer<typeof kanbanCardSchema>

export const milestoneStateSchema = z.enum([
	'not_started',
	'in_progress',
	'complete',
	'needs_attention',
])
export type MilestoneState = z.infer<typeof milestoneStateSchema>
