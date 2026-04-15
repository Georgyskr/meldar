import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/server/identity/require-auth'
import { isPipelineActive } from '@/server/lib/pipeline-lock'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

type RouteContext = { params: Promise<{ projectId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params
	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response
	const project = await verifyProjectOwnership(projectId, auth.userId)
	if (!project) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Project not found' } },
			{ status: 404 },
		)
	}

	const active = await isPipelineActive(projectId)
	return NextResponse.json({ active })
}
