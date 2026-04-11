import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
	approveTask,
	getPendingTasks,
	InvalidTaskTransitionError,
	rejectTask,
	TaskNotFoundError,
} from '@/server/agents/agent-task-service'
import { verifyToken } from '@/server/identity/jwt'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const actionSchema = z.object({
	taskId: z.string().uuid(),
	action: z.enum(['approve', 'reject']),
})

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	try {
		const tasks = await getPendingTasks(projectId)
		return NextResponse.json({ tasks })
	} catch (err) {
		console.error('[agent/tasks] list failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load tasks' } },
			{ status: 500 },
		)
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: { code: 'INVALID_JSON', message: 'Request body must be JSON' } },
			{ status: 400 },
		)
	}

	const parsed = actionSchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request body',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	try {
		const { taskId, action } = parsed.data
		const task =
			action === 'approve'
				? await approveTask(taskId, session.userId, projectId)
				: await rejectTask(taskId, session.userId, projectId)
		return NextResponse.json({ task })
	} catch (err) {
		if (err instanceof TaskNotFoundError) {
			return NextResponse.json(
				{ error: { code: 'NOT_FOUND', message: err.message } },
				{ status: 404 },
			)
		}
		if (err instanceof InvalidTaskTransitionError) {
			return NextResponse.json(
				{ error: { code: 'INVALID_TRANSITION', message: err.message } },
				{ status: 409 },
			)
		}
		console.error('[agent/tasks] action failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to process task action' } },
			{ status: 500 },
		)
	}
}
