import { assertSafeSandboxPath } from '@meldar/sandbox'
import { type BlobStorage, sha256Hex } from './blob'
import {
	BuildFileLimitError,
	BuildNotFoundError,
	BuildNotStreamingError,
	FileTooLargeError,
	InvalidRollbackTargetError,
	ProjectNotFoundError,
} from './errors'
import type { BuildContext, CreatedProject, ProjectStorage } from './provider'
import {
	type BeginBuildOptions,
	type BuildRow,
	type CreateKanbanCardInput,
	type CreateProjectOptions,
	type KanbanCardRow,
	MAX_FILE_CONTENT_BYTES,
	MAX_FILES_PER_BUILD,
	type ProjectFileRow,
	type ProjectRow,
	type StorageFile,
	type UpdateKanbanCardInput,
} from './types'

type InternalBuildFile = {
	buildId: string
	path: string
	contentHash: string
	sizeBytes: number
	r2Key: string
}

type InternalProjectFile = {
	id: string
	projectId: string
	path: string
	contentHash: string
	sizeBytes: number
	r2Key: string
	version: number
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

export class InMemoryProjectStorage implements ProjectStorage {
	private readonly projects = new Map<string, ProjectRow>()
	private readonly builds = new Map<string, BuildRow>()
	private readonly buildFiles = new Map<string, InternalBuildFile[]>()
	private readonly projectFiles = new Map<string, InternalProjectFile[]>()
	private readonly kanbanCards = new Map<string, KanbanCardRow>()

	constructor(private readonly blob: BlobStorage) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				'InMemoryProjectStorage may not be constructed in production — use PostgresProjectStorage instead',
			)
		}
	}

	async createProject(options: CreateProjectOptions): Promise<CreatedProject> {
		this.validateFileBatch(options.initialFiles)

		const projectId = crypto.randomUUID()
		const genesisBuildId = crypto.randomUUID()
		const now = new Date()

		const project: ProjectRow = {
			id: projectId,
			userId: options.userId,
			name: options.name,
			templateId: options.templateId,
			tier: options.tier ?? 'builder',
			currentBuildId: genesisBuildId,
			lastBuildAt: now,
			previewUrl: null,
			previewUrlUpdatedAt: null,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
		}

		const genesisBuild: BuildRow = {
			id: genesisBuildId,
			projectId,
			parentBuildId: null,
			status: 'completed',
			triggeredBy: 'template',
			kanbanCardId: null,
			modelVersion: options.modelVersion ?? null,
			promptHash: null,
			tokenCost: null,
			errorMessage: null,
			createdAt: now,
			completedAt: now,
		}

		const fileRows: InternalProjectFile[] = []
		const buildFileRows: InternalBuildFile[] = []

		for (const file of options.initialFiles) {
			const contentHash = await sha256Hex(file.content)
			const sizeBytes = byteLength(file.content)
			const r2Key = `projects/${projectId}/content/${contentHash}`

			await this.blob.put(projectId, contentHash, file.content)

			const buildFile: InternalBuildFile = {
				buildId: genesisBuildId,
				path: file.path,
				contentHash,
				sizeBytes,
				r2Key,
			}
			buildFileRows.push(buildFile)

			fileRows.push({
				id: crypto.randomUUID(),
				projectId,
				path: file.path,
				contentHash,
				sizeBytes,
				r2Key,
				version: 1,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
			})
		}

		this.projects.set(projectId, project)
		this.builds.set(genesisBuildId, genesisBuild)
		this.buildFiles.set(genesisBuildId, buildFileRows)
		this.projectFiles.set(projectId, fileRows)

		return {
			project,
			genesisBuild,
			files: fileRows.map(toProjectFileRow),
		}
	}

	async getProject(projectId: string, userId: string): Promise<ProjectRow> {
		const project = this.projects.get(projectId)
		if (!project || project.userId !== userId || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		return project
	}

	async getCurrentFiles(projectId: string): Promise<readonly ProjectFileRow[]> {
		if (!this.projects.has(projectId)) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		const files = this.projectFiles.get(projectId) ?? []
		return files
			.filter((f) => f.deletedAt === null)
			.map(toProjectFileRow)
			.sort((a, b) => a.path.localeCompare(b.path))
	}

	async readFile(projectId: string, path: string): Promise<string> {
		const files = this.projectFiles.get(projectId) ?? []
		const file = files.find((f) => f.path === path && f.deletedAt === null)
		if (!file) {
			throw new ProjectNotFoundError(`file not found: ${path}`, { projectId })
		}
		return this.blob.get(projectId, file.contentHash, { verify: true })
	}

	async beginBuild(options: BeginBuildOptions): Promise<BuildContext> {
		const project = this.projects.get(options.projectId)
		if (!project || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${options.projectId}`, {
				projectId: options.projectId,
			})
		}

		const buildId = crypto.randomUUID()
		const now = new Date()

		const build: BuildRow = {
			id: buildId,
			projectId: options.projectId,
			parentBuildId: project.currentBuildId,
			status: 'streaming',
			triggeredBy: options.triggeredBy,
			kanbanCardId: options.kanbanCardId ?? null,
			modelVersion: options.modelVersion ?? null,
			promptHash: options.promptHash ?? null,
			tokenCost: null,
			errorMessage: null,
			createdAt: now,
			completedAt: null,
		}

		this.builds.set(buildId, build)
		this.buildFiles.set(buildId, [])

		return new InMemoryBuildContext(this, buildId, options.projectId)
	}

	async rollback(projectId: string, targetBuildId: string): Promise<BuildRow> {
		const project = this.projects.get(projectId)
		if (!project || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		const target = this.builds.get(targetBuildId)
		if (!target || target.projectId !== projectId) {
			throw new InvalidRollbackTargetError(
				targetBuildId,
				`build ${targetBuildId} does not belong to project ${projectId}`,
				{ projectId },
			)
		}
		if (project.currentBuildId === targetBuildId) {
			throw new InvalidRollbackTargetError(
				targetBuildId,
				`build ${targetBuildId} is already the current HEAD`,
				{ projectId },
			)
		}
		if (target.status !== 'completed' && target.status !== 'rolled_back') {
			throw new InvalidRollbackTargetError(
				targetBuildId,
				`cannot roll back to a ${target.status} build`,
				{ projectId },
			)
		}

		const targetFiles = this.buildFiles.get(targetBuildId) ?? []
		const now = new Date()
		const rollbackBuildId = crypto.randomUUID()

		const rollbackBuild: BuildRow = {
			id: rollbackBuildId,
			projectId,
			parentBuildId: project.currentBuildId,
			status: 'completed',
			triggeredBy: 'rollback',
			kanbanCardId: null,
			modelVersion: null,
			promptHash: null,
			tokenCost: null,
			errorMessage: null,
			createdAt: now,
			completedAt: now,
		}

		const rollbackBuildFiles: InternalBuildFile[] = targetFiles.map((f) => ({
			...f,
			buildId: rollbackBuildId,
		}))

		const currentFiles = this.projectFiles.get(projectId) ?? []
		const targetPathsToHashes = new Map(
			targetFiles.map((f) => [
				f.path,
				{ contentHash: f.contentHash, r2Key: f.r2Key, sizeBytes: f.sizeBytes },
			]),
		)
		const nextFiles: InternalProjectFile[] = []

		for (const current of currentFiles) {
			const targetEntry = targetPathsToHashes.get(current.path)
			if (current.deletedAt !== null) {
				if (targetEntry) {
					nextFiles.push({
						...current,
						contentHash: targetEntry.contentHash,
						sizeBytes: targetEntry.sizeBytes,
						r2Key: targetEntry.r2Key,
						version: current.version + 1,
						updatedAt: now,
						deletedAt: null,
					})
					targetPathsToHashes.delete(current.path)
				} else {
					nextFiles.push(current)
				}
			} else if (targetEntry) {
				nextFiles.push({
					...current,
					contentHash: targetEntry.contentHash,
					sizeBytes: targetEntry.sizeBytes,
					r2Key: targetEntry.r2Key,
					version: current.version + 1,
					updatedAt: now,
				})
				targetPathsToHashes.delete(current.path)
			} else {
				nextFiles.push({ ...current, deletedAt: now, updatedAt: now })
			}
		}

		for (const [path, entry] of targetPathsToHashes) {
			nextFiles.push({
				id: crypto.randomUUID(),
				projectId,
				path,
				contentHash: entry.contentHash,
				sizeBytes: entry.sizeBytes,
				r2Key: entry.r2Key,
				version: 1,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
			})
		}

		this.builds.set(rollbackBuildId, rollbackBuild)
		this.buildFiles.set(rollbackBuildId, rollbackBuildFiles)
		this.projectFiles.set(projectId, nextFiles)
		this.projects.set(projectId, {
			...project,
			currentBuildId: rollbackBuildId,
			lastBuildAt: now,
			updatedAt: now,
		})

		return rollbackBuild
	}

	async getBuild(projectId: string, buildId: string): Promise<BuildRow> {
		const build = this.builds.get(buildId)
		if (!build || build.projectId !== projectId) {
			throw new BuildNotFoundError(buildId, undefined, { projectId })
		}
		return build
	}

	async setPreviewUrl(projectId: string, url: string | null): Promise<void> {
		const project = this.projects.get(projectId)
		if (!project || project.deletedAt !== null) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		const now = new Date()
		this.projects.set(projectId, {
			...project,
			previewUrl: url,
			previewUrlUpdatedAt: url === null ? null : now,
			updatedAt: now,
		})
	}

	async reapStuckBuilds(projectId: string, olderThan: Date): Promise<number> {
		const now = new Date()
		let reaped = 0
		for (const build of this.builds.values()) {
			if (build.projectId !== projectId) continue
			if (build.status !== 'streaming') continue
			if (build.createdAt.getTime() >= olderThan.getTime()) continue
			this.builds.set(build.id, {
				...build,
				status: 'failed',
				errorMessage: 'reaper: stuck streaming',
				completedAt: now,
			})
			reaped += 1
		}
		return reaped
	}

	async getActiveStreamingBuild(projectId: string): Promise<string | null> {
		let latest: BuildRow | null = null
		for (const build of this.builds.values()) {
			if (build.projectId !== projectId) continue
			if (build.status !== 'streaming') continue
			if (!latest || build.createdAt.getTime() > latest.createdAt.getTime()) {
				latest = build
			}
		}
		return latest?.id ?? null
	}

	async getKanbanCards(projectId: string): Promise<KanbanCardRow[]> {
		const cards: KanbanCardRow[] = []
		for (const card of this.kanbanCards.values()) {
			if (card.projectId === projectId) {
				cards.push(card)
			}
		}
		return cards.sort((a, b) => {
			if (a.parentId === null && b.parentId !== null) return -1
			if (a.parentId !== null && b.parentId === null) return 1
			return a.position - b.position
		})
	}

	async createKanbanCard(card: CreateKanbanCardInput): Promise<KanbanCardRow> {
		const now = new Date()
		const id = crypto.randomUUID()

		let maxPos = -1
		for (const existing of this.kanbanCards.values()) {
			if (
				existing.projectId === card.projectId &&
				existing.parentId === (card.parentId ?? null) &&
				existing.position > maxPos
			) {
				maxPos = existing.position
			}
		}

		const row: KanbanCardRow = {
			id,
			projectId: card.projectId,
			parentId: card.parentId ?? null,
			position: maxPos + 1,
			state: 'draft',
			required: card.required ?? false,
			title: card.title,
			description: card.description ?? null,
			taskType: card.taskType ?? 'feature',
			acceptanceCriteria: card.acceptanceCriteria ?? null,
			explainerText: card.explainerText ?? null,
			generatedBy: card.generatedBy ?? 'user',
			tokenCostEstimateMin: card.tokenCostEstimateMin ?? null,
			tokenCostEstimateMax: card.tokenCostEstimateMax ?? null,
			tokenCostActual: null,
			dependsOn: card.dependsOn ?? [],
			blockedReason: null,
			lastBuildId: null,
			createdAt: now,
			updatedAt: now,
			builtAt: null,
		}

		this.kanbanCards.set(id, row)
		return row
	}

	async createKanbanCards(
		projectId: string,
		cards: CreateKanbanCardInput[],
	): Promise<KanbanCardRow[]> {
		const now = new Date()
		const parentGroups = new Map<string | null, number>()
		const results: KanbanCardRow[] = []

		for (const card of cards) {
			const parentKey = card.parentId ?? null
			const pos = parentGroups.get(parentKey) ?? 0
			parentGroups.set(parentKey, pos + 1)

			const row: KanbanCardRow = {
				id: crypto.randomUUID(),
				projectId,
				parentId: parentKey,
				position: pos,
				state: 'draft',
				required: card.required ?? false,
				title: card.title,
				description: card.description ?? null,
				taskType: card.taskType ?? 'feature',
				acceptanceCriteria: card.acceptanceCriteria ?? null,
				explainerText: card.explainerText ?? null,
				generatedBy: card.generatedBy ?? 'user',
				tokenCostEstimateMin: card.tokenCostEstimateMin ?? null,
				tokenCostEstimateMax: card.tokenCostEstimateMax ?? null,
				tokenCostActual: null,
				dependsOn: card.dependsOn ?? [],
				blockedReason: null,
				lastBuildId: null,
				createdAt: now,
				updatedAt: now,
				builtAt: null,
			}

			this.kanbanCards.set(row.id, row)
			results.push(row)
		}

		return results
	}

	async updateKanbanCard(cardId: string, updates: UpdateKanbanCardInput): Promise<KanbanCardRow> {
		const existing = this.kanbanCards.get(cardId)
		if (!existing) {
			throw new Error(`kanban card not found: ${cardId}`)
		}

		const updated: KanbanCardRow = {
			...existing,
			...updates,
			dependsOn: updates.dependsOn ?? existing.dependsOn,
			updatedAt: new Date(),
		}

		this.kanbanCards.set(cardId, updated)
		return updated
	}

	async deleteKanbanCard(cardId: string): Promise<void> {
		const card = this.kanbanCards.get(cardId)
		if (card) {
			this.kanbanCards.delete(cardId)
			if (card.parentId === null) {
				for (const child of this.kanbanCards.values()) {
					if (child.parentId === cardId) {
						this.kanbanCards.delete(child.id)
					}
				}
			}
		}
	}

	async reorderKanbanCards(
		projectId: string,
		parentId: string | null,
		cardIds: string[],
	): Promise<void> {
		const now = new Date()
		for (let i = 0; i < cardIds.length; i++) {
			const card = this.kanbanCards.get(cardIds[i])
			if (card && card.projectId === projectId && card.parentId === parentId) {
				this.kanbanCards.set(card.id, { ...card, position: i, updatedAt: now })
			}
		}
	}

	/** @internal */
	_softDeleteProject(projectId: string): void {
		const project = this.projects.get(projectId)
		if (!project) {
			throw new ProjectNotFoundError(`project not found: ${projectId}`, { projectId })
		}
		const now = new Date()
		this.projects.set(projectId, { ...project, deletedAt: now, updatedAt: now })
	}

	/** @internal */
	_getBuildOrThrow(buildId: string): BuildRow {
		const build = this.builds.get(buildId)
		if (!build) {
			throw new BuildNotFoundError(buildId)
		}
		return build
	}

	/** @internal */
	_setBuild(build: BuildRow): void {
		this.builds.set(build.id, build)
	}

	/** @internal */
	_getBuildFiles(buildId: string): InternalBuildFile[] {
		return this.buildFiles.get(buildId) ?? []
	}

	/** @internal */
	async _writeFileToBuild(buildId: string, projectId: string, file: StorageFile): Promise<void> {
		const build = this._getBuildOrThrow(buildId)
		if (build.status !== 'streaming') {
			throw new BuildNotStreamingError(buildId, build.status, { projectId })
		}
		assertSafeSandboxPath(file.path, { projectId })
		if (byteLength(file.content) > MAX_FILE_CONTENT_BYTES) {
			throw new FileTooLargeError(file.path, byteLength(file.content), MAX_FILE_CONTENT_BYTES, {
				projectId,
			})
		}
		const existing = this.buildFiles.get(buildId) ?? []
		const uniquePaths = new Set(existing.filter((f) => f.path !== file.path).map((f) => f.path))
		uniquePaths.add(file.path)
		if (uniquePaths.size > MAX_FILES_PER_BUILD) {
			throw new BuildFileLimitError(uniquePaths.size, MAX_FILES_PER_BUILD, { projectId })
		}

		const contentHash = await sha256Hex(file.content)
		const sizeBytes = byteLength(file.content)
		const r2Key = `projects/${projectId}/content/${contentHash}`

		// MUST NOT touch project_files here — a mid-build mutation would be visible
		// via getCurrentFiles before commit, breaking the atomicity invariant.
		await this.blob.put(projectId, contentHash, file.content)

		const filtered = existing.filter((f) => f.path !== file.path)
		filtered.push({ buildId, path: file.path, contentHash, sizeBytes, r2Key })
		this.buildFiles.set(buildId, filtered)
	}

	/** @internal */
	_commitBuild(buildId: string, tokenCost: number | undefined): BuildRow {
		const build = this._getBuildOrThrow(buildId)
		if (build.status !== 'streaming') {
			throw new BuildNotStreamingError(buildId, build.status, {
				projectId: build.projectId,
			})
		}
		const now = new Date()

		const stagedFiles = this.buildFiles.get(buildId) ?? []
		const liveFiles = this.projectFiles.get(build.projectId) ?? []
		for (const staged of stagedFiles) {
			const existingFile = liveFiles.find((f) => f.path === staged.path && f.deletedAt === null)
			if (existingFile) {
				existingFile.contentHash = staged.contentHash
				existingFile.sizeBytes = staged.sizeBytes
				existingFile.r2Key = staged.r2Key
				existingFile.version += 1
				existingFile.updatedAt = now
			} else {
				liveFiles.push({
					id: crypto.randomUUID(),
					projectId: build.projectId,
					path: staged.path,
					contentHash: staged.contentHash,
					sizeBytes: staged.sizeBytes,
					r2Key: staged.r2Key,
					version: 1,
					createdAt: now,
					updatedAt: now,
					deletedAt: null,
				})
			}
		}
		this.projectFiles.set(build.projectId, liveFiles)

		const committed: BuildRow = {
			...build,
			status: 'completed',
			tokenCost: tokenCost ?? build.tokenCost,
			completedAt: now,
		}
		this.builds.set(buildId, committed)

		const project = this.projects.get(build.projectId)
		if (project) {
			this.projects.set(build.projectId, {
				...project,
				currentBuildId: buildId,
				lastBuildAt: now,
				updatedAt: now,
			})
		}

		return committed
	}

	/** @internal */
	_failBuild(buildId: string, reason: string, tokenCost: number | undefined): BuildRow {
		const build = this._getBuildOrThrow(buildId)
		if (build.status !== 'streaming') {
			throw new BuildNotStreamingError(buildId, build.status, {
				projectId: build.projectId,
			})
		}
		const now = new Date()
		const failed: BuildRow = {
			...build,
			status: 'failed',
			tokenCost: tokenCost ?? build.tokenCost,
			errorMessage: reason,
			completedAt: now,
		}
		this.builds.set(buildId, failed)
		return failed
	}

	private validateFileBatch(files: readonly StorageFile[]): void {
		if (files.length > MAX_FILES_PER_BUILD) {
			throw new BuildFileLimitError(files.length, MAX_FILES_PER_BUILD)
		}
		const paths = new Set<string>()
		for (const file of files) {
			assertSafeSandboxPath(file.path)
			if (paths.has(file.path)) {
				throw new Error(`duplicate path in initial file set: ${file.path}`)
			}
			paths.add(file.path)
			if (byteLength(file.content) > MAX_FILE_CONTENT_BYTES) {
				throw new FileTooLargeError(file.path, byteLength(file.content), MAX_FILE_CONTENT_BYTES)
			}
		}
	}
}

class InMemoryBuildContext implements BuildContext {
	constructor(
		private readonly storage: InMemoryProjectStorage,
		readonly buildId: string,
		readonly projectId: string,
	) {}

	get fileCount(): number {
		return this.storage._getBuildFiles(this.buildId).length
	}

	async writeFile(file: StorageFile): Promise<void> {
		await this.storage._writeFileToBuild(this.buildId, this.projectId, file)
	}

	async commit(options?: { tokenCost?: number }): Promise<BuildRow> {
		return this.storage._commitBuild(this.buildId, options?.tokenCost)
	}

	async fail(reason: string, options?: { tokenCost?: number }): Promise<BuildRow> {
		return this.storage._failBuild(this.buildId, reason, options?.tokenCost)
	}
}

function toProjectFileRow(f: InternalProjectFile): ProjectFileRow {
	return {
		projectId: f.projectId,
		path: f.path,
		contentHash: f.contentHash,
		sizeBytes: f.sizeBytes,
		r2Key: f.r2Key,
		version: f.version,
	}
}

function byteLength(content: string): number {
	return new TextEncoder().encode(content).length
}
