import { TEMPLATE_PLANS } from '@meldar/orchestrator'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { insertPlanCards } from '@/server/lib/insert-plan-cards'
import { checkRateLimit, mustHaveRateLimit, projectsCreateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()
const bodySchema = z.object({ templateId: z.string().min(1) })

const limiter = mustHaveRateLimit(projectsCreateLimit, 'apply-template')

type RouteContext = { params: Promise<{ projectId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
	const { projectId } = await context.params

	if (!projectIdSchema.safeParse(projectId).success) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'projectId must be a UUID' } },
			{ status: 400 },
		)
	}

	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { success } = await checkRateLimit(limiter, session.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a few minutes.' } },
			{ status: 429 },
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
					message: 'Invalid request body',
					issues: parsed.error.issues,
				},
			},
			{ status: 400 },
		)
	}

	const template = TEMPLATE_PLANS.find((t) => t.id === parsed.data.templateId)
	if (!template) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Template not found' } },
			{ status: 404 },
		)
	}

	try {
		const cards = await insertPlanCards(projectId, template.milestones, 'template')
		return NextResponse.json({ cards }, { status: 201 })
	} catch (err) {
		console.error('[apply-template] card insertion failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to save template plan' } },
			{ status: 500 },
		)
	}
}
