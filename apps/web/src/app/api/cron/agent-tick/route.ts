import { getDb } from '@meldar/db/client'
import type { AgentTaskStatus } from '@meldar/db/schema'
import { agentTasks } from '@meldar/db/schema'
import { eq, sql } from 'drizzle-orm'
import {
	type BookingConfirmationPayload,
	executeBookingConfirmation,
} from '@/server/agents/executors/booking-confirmation'
import { checkGlobalSpendCeiling, recordGlobalSpend } from '@/server/lib/spend-ceiling'

const INVOCATION_SPEND_CAP_CENTS = 15

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TaskRow {
	id: string
	agentType: string
	payload: unknown
}

interface TickResult {
	taskId: string
	agentType: string
	status: AgentTaskStatus
	error?: string
}

async function transitionStatus(
	db: ReturnType<typeof getDb>,
	taskId: string,
	status: AgentTaskStatus,
	result?: unknown,
): Promise<void> {
	const timestampField =
		status === 'executing'
			? { executedAt: new Date() }
			: status === 'verifying' || status === 'done'
				? { verifiedAt: new Date() }
				: {}

	await db
		.update(agentTasks)
		.set({ status, result: result ?? undefined, ...timestampField })
		.where(eq(agentTasks.id, taskId))
}

async function executeTask(db: ReturnType<typeof getDb>, task: TaskRow): Promise<TickResult> {
	switch (task.agentType) {
		case 'booking_confirmation': {
			const payload = task.payload as BookingConfirmationPayload
			const executorResult = await executeBookingConfirmation(payload)
			const costCents = 1
			await recordGlobalSpend(costCents)

			if (executorResult.success) {
				await transitionStatus(db, task.id, 'verifying', {
					resendId: executorResult.resendId,
				})
				return { taskId: task.id, agentType: task.agentType, status: 'verifying' }
			}

			await transitionStatus(db, task.id, 'failed', { error: executorResult.error })
			return {
				taskId: task.id,
				agentType: task.agentType,
				status: 'failed',
				error: executorResult.error,
			}
		}
		default: {
			const error = `Unknown agent type: ${task.agentType}`
			await transitionStatus(db, task.id, 'failed', { error })
			return { taskId: task.id, agentType: task.agentType, status: 'failed', error }
		}
	}
}

async function processTasks(db: ReturnType<typeof getDb>, tasks: TaskRow[]): Promise<TickResult[]> {
	let spentCents = 0
	const results: TickResult[] = []

	for (const task of tasks) {
		if (spentCents >= INVOCATION_SPEND_CAP_CENTS) {
			results.push({ taskId: task.id, agentType: task.agentType, status: 'approved' })
			continue
		}

		try {
			const result = await executeTask(db, task)
			spentCents += 1
			results.push(result)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'unknown error'
			await transitionStatus(db, task.id, 'failed', { error: errorMessage })
			results.push({
				taskId: task.id,
				agentType: task.agentType,
				status: 'failed',
				error: errorMessage,
			})
		}
	}

	return results
}

export async function GET(request: Request) {
	const authHeader = request.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const spendCheck = await checkGlobalSpendCeiling()
	if (!spendCheck.allowed) {
		return Response.json({ skipped: 'spend_ceiling', reason: spendCheck.reason })
	}

	const db = getDb()

	const approvedTasks: TaskRow[] = await db
		.update(agentTasks)
		.set({ status: 'executing', executedAt: new Date() })
		.where(
			sql`${agentTasks.id} IN (
				SELECT ${agentTasks.id} FROM ${agentTasks}
				WHERE ${agentTasks.status} = 'approved'
				LIMIT 10
				FOR UPDATE SKIP LOCKED
			)`,
		)
		.returning({
			id: agentTasks.id,
			agentType: agentTasks.agentType,
			payload: agentTasks.payload,
		})

	if (approvedTasks.length === 0) {
		return Response.json({ processed: 0, results: [] })
	}

	const results = await processTasks(db, approvedTasks)

	return Response.json({ processed: results.length, results })
}
