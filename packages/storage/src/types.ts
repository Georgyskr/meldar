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
	readonly createdAt: Date
	readonly completedAt: Date | null
}

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
