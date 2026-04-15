import { getDb } from '@meldar/db/client'
import { kanbanCards, projects, users } from '@meldar/db/schema'
import {
	buildOrchestratorDeps,
	formatSseDone,
	formatSseEvent,
	type OrchestratorEvent,
	orchestrateBuild,
	type ResolvedWishes,
	resolveWishes,
	routeModel,
} from '@meldar/orchestrator'
import { creditTokens, debitTokens, InsufficientBalanceError } from '@meldar/tokens'
import { and, eq, isNull } from 'drizzle-orm'
import { sendFirstBuildEmail } from '@/server/email'
import { recordAiCall } from '@/server/lib/ai-call-log'
import { createSpendGuardForUser } from '@/server/lib/spend-ceiling'
import { withSandboxPreview } from './sandbox-preview'
import { tryCreateSandboxProvider } from './sandbox-provider-factory'

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
			code:
				| 'CARD_NOT_FOUND_IN_PROJECT'
				| 'BUILD_IN_PROGRESS'
				| 'INSUFFICIENT_BALANCE'
				| 'INTERNAL_ERROR'
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

	let resolvedWishes: ResolvedWishes | undefined
	try {
		const [proj] = await db
			.select({ wishes: projects.wishes })
			.from(projects)
			.where(eq(projects.id, input.projectId))
			.limit(1)
		resolvedWishes = resolveWishes(proj?.wishes as Record<string, unknown> | null)
	} catch (err) {
		console.error('[run-build] wishes lookup failed', err instanceof Error ? err.message : err)
	}

	const rawGenerator = orchestrateBuild(
		{
			projectId: input.projectId,
			userId: input.userId,
			prompt: input.prompt,
			kanbanCardId: input.kanbanCardId,
			model: routedModel,
			signal: input.signal,
			wishes: resolvedWishes,
		},
		deps,
	)

	const generator = withTokenRefund(
		withSandboxPreview(withFirstBuildEmail(rawGenerator, input.userId, input.projectId), {
			projectId: input.projectId,
			userId: input.userId,
			storage: deps.storage,
			sandbox: tryCreateSandboxProvider(),
		}),
		input.userId,
		estimatedCost,
		input.kanbanCardId,
	)
	const stream = sseStreamFromGenerator(generator, input.signal)

	return { ok: true, stream }
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
				console.error('First build email failed:', err instanceof Error ? err.message : 'Unknown')
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
				console.error('[sse-stream] error:', err instanceof Error ? err.message : err)
				safeEnqueue(
					formatSseEvent({
						type: 'failed',
						reason: 'Something went wrong. Try the step again.',
						code: 'route_stream_error',
					}),
				)
			} finally {
				safeEnqueue(formatSseDone())
				try {
					controller.close()
				} catch {}
			}
		},
		async cancel() {
			try {
				await generator.return()
			} catch {}
		},
	})
}
