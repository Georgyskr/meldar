import type {
	BeginBuildOptions,
	BuildRow,
	CreateKanbanCardInput,
	CreateProjectOptions,
	KanbanCardRow,
	PreviewProbeData,
	ProjectFileRow,
	ProjectRow,
	StorageFile,
	UpdateKanbanCardInput,
} from './types'

export type CreatedProject = {
	readonly project: ProjectRow
	readonly genesisBuild: BuildRow
	readonly files: readonly ProjectFileRow[]
}

/**
 * Callers MUST call exactly one of `commit()` or `fail()` to terminate the
 * build. Forgetting either leaves the build in `streaming` status until the
 * orphaned-build reaper marks it failed.
 */
export interface BuildContext {
	readonly buildId: string
	readonly projectId: string
	readonly fileCount: number

	writeFile(file: StorageFile): Promise<void>

	/** Flips current_build_id to this build and updates last_build_at. */
	commit(options?: { tokenCost?: number }): Promise<BuildRow>

	/** Does NOT flip current_build_id; build_files stays in place as partial state. */
	fail(reason: string, options?: { tokenCost?: number }): Promise<BuildRow>

	recordPreviewProbe(probe: PreviewProbeData): Promise<void>
}

export interface ProjectStorage {
	createProject(options: CreateProjectOptions): Promise<CreatedProject>

	/** Throws ProjectNotFoundError on wrong user — no existence leak. */
	getProject(projectId: string, userId: string): Promise<ProjectRow>

	/** Returns rows ordered by path. */
	getCurrentFiles(projectId: string): Promise<readonly ProjectFileRow[]>

	readFile(projectId: string, path: string): Promise<string>

	beginBuild(options: BeginBuildOptions): Promise<BuildContext>

	/**
	 * Records the rollback as its own Build event for lineage; flips HEAD to
	 * the new rollback build, not directly to the target.
	 */
	rollback(projectId: string, targetBuildId: string): Promise<BuildRow>

	getBuild(projectId: string, buildId: string): Promise<BuildRow>

	setPreviewUrl(projectId: string, url: string | null): Promise<void>

	reapStuckBuilds(projectId: string, olderThan: Date): Promise<number>

	getActiveStreamingBuild(projectId: string): Promise<string | null>

	getKanbanCards(projectId: string): Promise<KanbanCardRow[]>

	createKanbanCard(card: CreateKanbanCardInput): Promise<KanbanCardRow>

	createKanbanCards(projectId: string, cards: CreateKanbanCardInput[]): Promise<KanbanCardRow[]>

	updateKanbanCard(cardId: string, updates: UpdateKanbanCardInput): Promise<KanbanCardRow>

	deleteKanbanCard(cardId: string): Promise<void>

	reorderKanbanCards(projectId: string, parentId: string | null, cardIds: string[]): Promise<void>
}
