import { getDb } from '@meldar/db/client'
import { kanbanCards, projects, users } from '@meldar/db/schema'
import {
	buildOrchestratorDeps,
	formatSseDone,
	formatSseEvent,
	type OrchestratorEvent,
	orchestrateBuild,
	routeModel,
	slugForProjectId,
} from '@meldar/orchestrator'
import type { ProjectStorage } from '@meldar/storage'
import { creditTokens, debitTokens, InsufficientBalanceError } from '@meldar/tokens'
import { and, eq, isNull } from 'drizzle-orm'
import { guardedDeployCall } from '@/server/deploy/guarded-deploy-call'
import { sendFirstBuildEmail } from '@/server/email'
import { recordAiCall } from '@/server/lib/ai-call-log'
import { createSpendGuardForUser } from '@/server/lib/spend-ceiling'

export type RunBuildInput = {
	readonly projectId: string
	readonly userId: string
	readonly prompt: string
	readonly kanbanCardId?: string
	readonly signal?: AbortSignal
	readonly source: 'http_route' | 'chat'
}

export type RunBuildResult =
	| {
			ok: true
			stream: ReadableStream<Uint8Array>
	  }
	| {
			ok: false
			code: 'CARD_NOT_FOUND_IN_PROJECT' | 'BUILD_IN_PROGRESS' | 'INSUFFICIENT_BALANCE' | 'INTERNAL_ERROR'
			message: string
			status: number
			activeBuildId?: string
	  }

export async function runBuildForUser(input: RunBuildInput): Promise<RunBuildResult> {
	const db = getDb()
	let card:
		| {
				taskType: string | null
				tokenCostEstimateMin: number | null
		  }
		| undefined

	if (input.kanbanCardId) {
		const [row] = await db
			.select({
				taskType: kanbanCards.taskType,
				tokenCostEstimateMin: kanbanCards.tokenCostEstimateMin,
			})
			.from(kanbanCards)
			.innerJoin(projects, eq(projects.id, kanbanCards.projectId))
			.where(
				and(
					eq(kanbanCards.id, input.kanbanCardId),
					eq(kanbanCards.projectId, input.projectId),
					eq(projects.userId, input.userId),
				),
			)
			.limit(1)

		if (!row) {
			return {
				ok: false,
				code: 'CARD_NOT_FOUND_IN_PROJECT',
				message: "Card not found or doesn't belong to this project.",
				status: 404,
			}
		}
		card = row
	}

	const routedModel = routeModel(card?.taskType ?? undefined)
	const estimatedCost = card?.tokenCostEstimateMin ?? 5

	let deps: ReturnType<typeof buildOrchestratorDeps>
	try {
		deps = buildOrchestratorDeps({
			globalSpendGuard: createSpendGuardForUser(input.userId),
			aiCallLogger: recordAiCall,
		})
	} catch (err) {
		console.error('[run-build] failed to construct orchestrator deps', err)
		return {
			ok: false,
			code: 'INTERNAL_ERROR',
			message: 'Workspace is unavailable',
			status: 500,
		}
	}

	const activeBuildId = await deps.storage.getActiveStreamingBuild(input.projectId)
	if (activeBuildId) {
		return {
			ok: false,
			code: 'BUILD_IN_PROGRESS',
			message: 'A build is already running for this project. Wait for it to finish.',
			activeBuildId,
			status: 409,
		}
	}

	try {
		await debitTokens(db, input.userId, estimatedCost, 'build', input.kanbanCardId)
	} catch (err) {
		if (err instanceof InsufficientBalanceError) {
			return {
				ok: false,
				code: 'INSUFFICIENT_BALANCE',
				message: 'Not enough tokens',
				status: 402,
			}
		}
		throw err
	}

	const rawGenerator = orchestrateBuild(
		{
			projectId: input.projectId,
			userId: input.userId,
			prompt: input.prompt,
			kanbanCardId: input.kanbanCardId,
			model: routedModel,
			signal: input.signal,
		},
		deps,
	)

	const generator = withTokenRefund(
		withVercelDeploy(
			withFirstBuildEmail(rawGenerator, input.userId, input.projectId),
			{
				userId: input.userId,
				projectId: input.projectId,
				storage: deps.storage,
				signal: input.signal,
			},
		),
		input.userId,
		estimatedCost,
		input.kanbanCardId,
	)
	const stream = sseStreamFromGenerator(generator, input.signal)

	return { ok: true, stream }
}

type VercelDeployContext = {
	readonly userId: string
	readonly projectId: string
	readonly storage: ProjectStorage
	readonly signal?: AbortSignal
}

async function* withVercelDeploy(
	generator: AsyncGenerator<OrchestratorEvent, void, unknown>,
	ctx: VercelDeployContext,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	let committedBuildId: string | undefined
	for await (const event of generator) {
		yield event
		if (event.type === 'committed') {
			committedBuildId = event.buildId
		}
	}

	if (!committedBuildId) return

	const slug = slugForProjectId(ctx.projectId)
	const appsDomain = process.env.VERCEL_APPS_DOMAIN ?? 'apps.meldar.ai'
	const hostname = `${slug}.${appsDomain}`

	yield { type: 'deploying', slug, hostname }

	let files: Array<{ path: string; content: string }>
	try {
		const rows = await ctx.storage.getCurrentFiles(ctx.projectId)
		files = await Promise.all(
			rows.map(async (row) => ({
				path: row.path,
				content: await ctx.storage.readFile(ctx.projectId, row.path),
			})),
		)
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error('[run-build] failed to load project files for deploy', message)
		yield {
			type: 'deploy_failed',
			reason: 'Could not read the project files to deploy.',
			code: 'storage_read_failed',
			rejected: false,
		}
		return
	}

	const result = await guardedDeployCall({
		userId: ctx.userId,
		projectId: ctx.projectId,
		buildId: committedBuildId,
		slug,
		files,
		signal: ctx.signal,
	})

	if (result.ok) {
		yield {
			type: 'deployed',
			url: result.deploy.url,
			vercelDeploymentId: result.deploy.vercelDeploymentId,
			buildDurationMs: result.deploy.buildDurationMs,
		}
		try {
			const db = getDb()
			await db
				.update(projects)
				.set({
					previewUrl: result.deploy.url,
					previewUrlUpdatedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(projects.id, ctx.projectId))
		} catch (err) {
			console.error(
				'[run-build] failed to persist preview URL',
				err instanceof Error ? err.message : 'Unknown',
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
		reason: formatDeployErrorMessage(result.deploy.error),
		code: result.deploy.error.kind,
		rejected: false,
	}
}

function formatDeployErrorMessage(
	err: { kind: string; [k: string]: unknown },
): string {
	if (err.kind === 'deployment_timeout') {
		return 'The deploy is taking longer than expected. It may still finish — refresh in a minute.'
	}
	if (err.kind === 'deployment_build_failed') {
		return "Vercel couldn't build your app. Usually the code has an error — try the step again."
	}
	if (err.kind === 'network_error') {
		return 'Network hiccup talking to Vercel. Try again in a moment.'
	}
	return 'Something went wrong deploying your app.'
}

async function* withFirstBuildEmail(
	generator: AsyncGenerator<OrchestratorEvent, void, unknown>,
	userId: string,
	projectId: string,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	for await (const event of generator) {
		yield event
		if (event.type === 'committed') {
			triggerFirstBuildEmail(userId, projectId).catch((err) => {
				console.error(
					'First build email failed:',
					err instanceof Error ? err.message : 'Unknown',
				)
			})
		}
	}
}

async function* withTokenRefund(
	generator: AsyncGenerator<OrchestratorEvent, void, unknown>,
	userId: string,
	amount: number,
	kanbanCardId?: string,
): AsyncGenerator<OrchestratorEvent, void, unknown> {
	let committed = false
	try {
		for await (const event of generator) {
			if (event.type === 'committed') committed = true
			yield event
		}
	} finally {
		// file_written alone doesn't count -- only `committed` means the user got value
		if (!committed && amount > 0) {
			creditTokens(getDb(), userId, amount, 'refund', kanbanCardId).catch((err) => {
				console.error(
					`Token refund failed for user ${userId}, amount ${amount}:`,
					err instanceof Error ? err.message : 'Unknown',
				)
			})
		}
	}
}

export async function triggerFirstBuildEmail(userId: string, projectId: string): Promise<void> {
	const db = getDb()
	const [user] = await db
		.select({
			email: users.email,
			name: users.name,
			firstBuildEmailSentAt: users.firstBuildEmailSentAt,
		})
		.from(users)
		.where(and(eq(users.id, userId), isNull(users.firstBuildEmailSentAt)))
		.limit(1)

	if (!user) return

	const [project] = await db
		.select({ name: projects.name })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1)

	const result = await db
		.update(users)
		.set({ firstBuildEmailSentAt: new Date() })
		.where(and(eq(users.id, userId), isNull(users.firstBuildEmailSentAt)))

	if ((result as { rowCount?: number }).rowCount === 0) return

	await sendFirstBuildEmail(user.email, project?.name ?? 'your project')
}

export function sseStreamFromGenerator(
	generator: AsyncGenerator<OrchestratorEvent, void, unknown>,
	signal?: AbortSignal,
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()

	return new ReadableStream<Uint8Array>({
		async start(controller) {
			const safeEnqueue = (chunk: string): boolean => {
				try {
					controller.enqueue(encoder.encode(chunk))
					return true
				} catch {
					return false
				}
			}

			try {
				for await (const event of generator) {
					if (signal?.aborted) break
					if (!safeEnqueue(formatSseEvent(event))) break
				}
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err)
				safeEnqueue(
					formatSseEvent({
						type: 'failed',
						reason: `route streaming error: ${reason}`,
						code: 'route_stream_error',
					}),
				)
			} finally {
				safeEnqueue(formatSseDone())
				try {
					controller.close()
				} catch {
					// already closed
				}
			}
		},
		async cancel() {
			try {
				await generator.return()
			} catch {
				// noop
			}
		},
	})
}
