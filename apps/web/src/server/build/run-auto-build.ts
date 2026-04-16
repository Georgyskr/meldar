import { getDb } from '@meldar/db/client'
import { kanbanCards, projects } from '@meldar/db/schema'
import {
	buildOrchestratorDeps,
	composeAbortSignals,
	type OrchestratorEvent,
	orchestrateBuild,
	resolveWishes,
	routeModel,
	slugForProjectId,
} from '@meldar/orchestrator'
import { and, eq, inArray } from 'drizzle-orm'
import { guardedDeployCall } from '@/server/deploy/guarded-deploy-call'
import { recordAiCall } from '@/server/lib/ai-call-log'
import { appendPipelineEvent } from '@/server/lib/pipeline-event-log'
import {
	endPipelineRun,
	heartbeatPipelineRun,
	transitionToDeploying,
} from '@/server/lib/pipeline-lock'
import { createSpendGuardForUser } from '@/server/lib/spend-ceiling'
import { sseStreamFromGenerator } from './run-build'

export type RunAutoBuildInput = {
	readonly projectId: string
	readonly userId: string
	readonly pipelineId?: string
	readonly signal?: AbortSignal
}

import { PIPELINE_HEARTBEAT_INTERVAL_MS, PIPELINE_SOFT_DEADLINE_MS } from './timing'

const HEARTBEAT_INTERVAL_MS = PIPELINE_HEARTBEAT_INTERVAL_MS

export async function* runAutoBuild(
	input: RunAutoBuildInput,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	let heartbeat: ReturnType<typeof setInterval> | null = null
	const pipelineId = input.pipelineId
	if (pipelineId) {
		heartbeat = setInterval(() => {
			void heartbeatPipelineRun(pipelineId).catch((err) => {
				console.error('[run-auto-build] heartbeat failed', err)
			})
		}, HEARTBEAT_INTERVAL_MS)
	}

	// Fire 20s before Vercel's 300s SIGKILL so the finally block below runs
	// to completion — releases lock, writes terminal state. setTimeout + JS
	// finally both die with SIGKILL, so reclaim-cron is the backup safety net.
	const composed = composeAbortSignals([input.signal], PIPELINE_SOFT_DEADLINE_MS)

	let terminalState: 'succeeded' | 'failed' | 'cancelled' = 'cancelled'
	try {
		for await (const event of runAutoBuildInner({ ...input, signal: composed.signal })) {
			if (composed.signal.aborted) {
				terminalState = 'failed'
				yield {
					type: 'pipeline_failed',
					reason: 'pipeline exceeded soft deadline before completion',
					cardId: 'deadline',
				}
				break
			}
			if (pipelineId) {
				if (event.type === 'deploying') {
					await transitionToDeploying(pipelineId).catch((err) => {
						console.error('[run-auto-build] transitionToDeploying failed', err)
					})
				}
				let seq: number | null = null
				try {
					seq = await appendPipelineEvent({
						runId: pipelineId,
						type: event.type,
						payload: event,
					})
				} catch (err) {
					console.error('[run-auto-build] appendPipelineEvent failed', err)
					terminalState = 'failed'
					yield {
						type: 'pipeline_failed',
						reason: 'event log unavailable',
						cardId: 'unknown',
					}
					return
				}
				const yielded = { ...event, seq }
				if (event.type === 'deployed') terminalState = 'succeeded'
				else if (event.type === 'deploy_failed' || event.type === 'pipeline_failed')
					terminalState = 'failed'
				yield yielded
				continue
			}
			if (event.type === 'deployed') terminalState = 'succeeded'
			else if (event.type === 'deploy_failed' || event.type === 'pipeline_failed')
				terminalState = 'failed'
			yield event
		}
	} finally {
		if (heartbeat) clearInterval(heartbeat)
		composed.dispose()
		if (pipelineId) {
			await endPipelineRun(pipelineId, terminalState).catch((err) => {
				console.error('[run-auto-build] endPipelineRun failed', err)
			})
		}
	}
}

async function* runAutoBuildInner(
	input: RunAutoBuildInput,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	const db = getDb()

	const [project] = await db
		.select({ id: projects.id, wishes: projects.wishes })
		.from(projects)
		.where(and(eq(projects.id, input.projectId), eq(projects.userId, input.userId)))
		.limit(1)

	if (!project) return

	const resolvedWishes = resolveWishes(project.wishes as Record<string, unknown> | null)

	const cards = await db
		.select()
		.from(kanbanCards)
		.where(
			and(
				eq(kanbanCards.projectId, input.projectId),
				inArray(kanbanCards.state, ['ready', 'draft']),
			),
		)
		.orderBy(kanbanCards.position)

	const subtasks = cards.filter((c) => c.parentId !== null)

	if (subtasks.length === 0) {
		yield { type: 'pipeline_complete', totalBuilt: 0, totalCards: 0 }
		return
	}

	let deps: ReturnType<typeof buildOrchestratorDeps>
	try {
		deps = buildOrchestratorDeps({
			globalSpendGuard: createSpendGuardForUser(input.userId),
			aiCallLogger: recordAiCall,
		})
	} catch {
		yield { type: 'pipeline_failed', cardId: subtasks[0].id, reason: 'Workspace is unavailable' }
		return
	}

	let totalBuilt = 0

	for (let i = 0; i < subtasks.length; i++) {
		const card = subtasks[i]

		if (input.signal?.aborted) {
			yield { type: 'pipeline_failed', cardId: card.id, reason: 'Aborted' }
			return
		}

		yield {
			type: 'card_started',
			cardId: card.id,
			cardIndex: i,
			totalCards: subtasks.length,
		}

		const model = routeModel(card.taskType ?? undefined)
		let buildFailed = false

		const generator = orchestrateBuild(
			{
				projectId: input.projectId,
				userId: input.userId,
				prompt: card.description ?? card.title,
				kanbanCardId: card.id,
				model,
				signal: input.signal,
				wishes: resolvedWishes,
			},
			deps,
		)

		for await (const event of generator) {
			yield event
			if (event.type === 'failed') {
				buildFailed = true
			}
		}

		if (buildFailed) {
			yield { type: 'pipeline_failed', cardId: card.id, reason: `Build failed for "${card.title}"` }
			return
		}

		totalBuilt++
	}

	yield { type: 'pipeline_complete', totalBuilt, totalCards: subtasks.length }

	const slug = slugForProjectId(input.projectId)
	const appsDomain = process.env.VERCEL_APPS_DOMAIN ?? 'apps.meldar.ai'
	const hostname = `${slug}.${appsDomain}`

	yield { type: 'deploying', slug, hostname }

	let files: Array<{ path: string; content: string }>
	try {
		const rows = await deps.storage.getCurrentFiles(input.projectId)
		files = await Promise.all(
			rows.map(async (row) => ({
				path: row.path,
				content: await deps.storage.readFile(input.projectId, row.path),
			})),
		)
	} catch {
		yield {
			type: 'deploy_failed',
			reason: 'Could not read project files for deploy.',
			code: 'storage_read_failed',
			rejected: false,
		}
		return
	}

	const result = await guardedDeployCall({
		userId: input.userId,
		projectId: input.projectId,
		slug,
		files,
		signal: input.signal,
	})

	if (result.ok) {
		yield {
			type: 'deployed',
			url: result.deploy.url,
			vercelDeploymentId: result.deploy.vercelDeploymentId,
			buildDurationMs: result.deploy.buildDurationMs,
		}
		try {
			await db
				.update(projects)
				.set({
					previewUrl: result.deploy.url,
					previewUrlUpdatedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(projects.id, input.projectId))
		} catch (err) {
			console.error(
				'[auto-build] preview URL update failed',
				err instanceof Error ? err.message : err,
			)
		}
		return
	}

	if (result.rejected) {
		yield {
			type: 'deploy_failed',
			reason: result.message,
			code: result.reason,
			rejected: true,
		}
		return
	}

	yield {
		type: 'deploy_failed',
		reason: 'Something went wrong deploying your app.',
		code: result.deploy.error.kind,
		rejected: false,
	}
}

export { sseStreamFromGenerator }
