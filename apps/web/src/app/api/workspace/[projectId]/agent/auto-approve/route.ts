import { getDb } from '@meldar/db/client'
import { agentTasks, projects } from '@meldar/db/schema'
import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_APPROVED_FOR_AUTO = 10

const bodySchema = z.object({
	enabled: z.boolean(),
	agentType: z.enum(['booking_confirmation', 'booking_reminder', 'lead_research', 'email_drip']),
})

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	const session = verifyToken(_request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	const db = getDb()
	const [stats] = await db
		.select({
			totalApproved: sql<number>`count(*) filter (where ${agentTasks.status} = 'done' and ${agentTasks.autoApproved} = false)`,
			totalRejected: sql<number>`count(*) filter (where ${agentTasks.status} = 'rejected')`,
		})
		.from(agentTasks)
		.where(eq(agentTasks.projectId, projectId))

	const approvedCount = Number(stats?.totalApproved ?? 0)
	const rejectedCount = Number(stats?.totalRejected ?? 0)
	const eligible = approvedCount >= MIN_APPROVED_FOR_AUTO && rejectedCount === 0

	return NextResponse.json({
		eligible,
		approvedCount,
		rejectedCount,
		threshold: MIN_APPROVED_FOR_AUTO,
	})
}

export async function POST(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
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

	const parsed = bodySchema.safeParse(body)
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	try {
		const db = getDb()
		const [row] = await db
			.select({ wishes: projects.wishes })
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1)
		const currentWishes = (row?.wishes as Record<string, unknown>) ?? {}
		const autoApproveConfig = (currentWishes.autoApprove as Record<string, boolean>) ?? {}
		autoApproveConfig[parsed.data.agentType] = parsed.data.enabled

		await db
			.update(projects)
			.set({ wishes: { ...currentWishes, autoApprove: autoApproveConfig }, updatedAt: new Date() })
			.where(eq(projects.id, projectId))

		return NextResponse.json({ autoApprove: parsed.data.enabled, agentType: parsed.data.agentType })
	} catch (err) {
		console.error('[auto-approve] update failed:', err instanceof Error ? err.message : err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to update setting' } },
			{ status: 500 },
		)
	}
}
