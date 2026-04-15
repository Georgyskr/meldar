export type StorageFile = {
	readonly path: string
	readonly content: string
}

export type ProjectFileRow = {
	readonly projectId: string
	readonly path: string
	readonly contentHash: string
	readonly sizeBytes: number
	readonly r2Key: string
	readonly version: number
}

export type BuildFileRow = {
	readonly buildId: string
	readonly path: string
	readonly contentHash: string
	readonly sizeBytes: number
	readonly r2Key: string
}

export type BuildRow = {
	readonly id: string
	readonly projectId: string
	readonly parentBuildId: string | null
	readonly status: BuildStatus
	readonly triggeredBy: BuildTrigger
	readonly kanbanCardId: string | null
	readonly modelVersion: string | null
	readonly promptHash: string | null
	readonly tokenCost: number | null
	readonly errorMessage: string | null
	readonly previewProbeStatus: number | null
	readonly previewProbeBodyLength: number | null
	readonly previewProbeBodyPreview: string | null
	readonly createdAt: Date
	readonly completedAt: Date | null
}

export type PreviewProbeData = {
	readonly status: number
	readonly bodyLength: number
	readonly bodyPreview: string
}

export const PREVIEW_PROBE_BODY_PREVIEW_MAX = 256 as const

export type BuildStatus = 'streaming' | 'completed' | 'failed' | 'rolled_back'
export type BuildTrigger = 'template' | 'user_prompt' | 'kanban_card' | 'rollback' | 'upload'

/**
 * `previewUrl` is a CACHE; the sandbox provider is the source of truth.
 */
export type ProjectRow = {
	readonly id: string
	readonly userId: string
	readonly name: string
	readonly templateId: string
	readonly tier: ProjectTier
	readonly currentBuildId: string | null
	readonly lastBuildAt: Date | null
	readonly previewUrl: string | null
	readonly previewUrlUpdatedAt: Date | null
	readonly createdAt: Date
	readonly updatedAt: Date
	readonly deletedAt: Date | null
}

export type ProjectTier = 'builder' | 'pro' | 'vip'

export type CreateProjectOptions = {
	readonly userId: string
	readonly name: string
	readonly templateId: string
	readonly tier?: ProjectTier
	readonly initialFiles: readonly StorageFile[]
	readonly modelVersion?: string
}

export type BeginBuildOptions = {
	readonly projectId: string
	readonly triggeredBy: BuildTrigger
	readonly kanbanCardId?: string
	readonly modelVersion?: string
	readonly promptHash?: string
}

export const MAX_FILES_PER_BUILD = 200 as const

export const MAX_FILE_CONTENT_BYTES = 10 * 1024 * 1024

export type KanbanCardState =
	| 'draft'
	| 'ready'
	| 'queued'
	| 'building'
	| 'built'
	| 'needs_rework'
	| 'failed'

export type KanbanCardRow = {
	readonly id: string
	readonly projectId: string
	readonly parentId: string | null
	readonly position: number
	readonly state: KanbanCardState
	readonly required: boolean
	readonly title: string
	readonly description: string | null
	readonly taskType: string
	readonly acceptanceCriteria: string[] | null
	readonly explainerText: string | null
	readonly generatedBy: string
	readonly tokenCostEstimateMin: number | null
	readonly tokenCostEstimateMax: number | null
	readonly tokenCostActual: number | null
	readonly dependsOn: string[]
	readonly blockedReason: string | null
	readonly lastBuildId: string | null
	readonly createdAt: Date
	readonly updatedAt: Date
	readonly builtAt: Date | null
}

export type CreateKanbanCardInput = {
	readonly projectId: string
	readonly parentId?: string | null
	readonly title: string
	readonly description?: string | null
	readonly taskType?: string
	readonly acceptanceCriteria?: string[] | null
	readonly explainerText?: string | null
	readonly generatedBy?: string
	readonly tokenCostEstimateMin?: number | null
	readonly tokenCostEstimateMax?: number | null
	readonly dependsOn?: string[]
	readonly required?: boolean
}

export type UpdateKanbanCardInput = Partial<
	Pick<
		KanbanCardRow,
		| 'title'
		| 'description'
		| 'taskType'
		| 'state'
		| 'acceptanceCriteria'
		| 'explainerText'
		| 'tokenCostEstimateMin'
		| 'tokenCostEstimateMax'
		| 'tokenCostActual'
		| 'dependsOn'
		| 'blockedReason'
		| 'lastBuildId'
		| 'builtAt'
		| 'required'
	>
>
