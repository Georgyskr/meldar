import { getDb } from '@meldar/db/client'
import { kanbanCards, projects } from '@meldar/db/schema'
import { TEMPLATE_PLANS } from '@meldar/orchestrator'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { insertPlanCards } from '@/server/lib/insert-plan-cards'
import { checkRateLimit, mustHaveRateLimit, templateApplyLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()
const bodySchema = z.object({ templateId: z.string().min(1) })

const DEFAULT_PROJECT_NAMES = ['My project', 'Untitled project']

const limiter = mustHaveRateLimit(templateApplyLimit, 'apply-template')

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
		const db = getDb()
		const existingCards = await db
			.select({ id: kanbanCards.id })
			.from(kanbanCards)
			.where(eq(kanbanCards.projectId, projectId))
			.limit(1)

		if (existingCards.length > 0) {
			const allCards = await db
				.select()
				.from(kanbanCards)
				.where(eq(kanbanCards.projectId, projectId))
			return NextResponse.json({ cards: allCards }, { status: 200 })
		}

		const cards = await insertPlanCards(projectId, template.milestones, 'template')

		const firstMilestone = cards.find((c) => c.parentId === null)
		if (firstMilestone) {
			const firstSubtask = cards.find((c) => c.parentId === firstMilestone.id)
			if (firstSubtask) {
				await db
					.update(kanbanCards)
					.set({ state: 'ready', updatedAt: new Date() })
					.where(and(eq(kanbanCards.id, firstSubtask.id), eq(kanbanCards.projectId, projectId)))
			}
		}

		if (DEFAULT_PROJECT_NAMES.includes(project.name)) {
			await db
				.update(projects)
				.set({ name: template.name, updatedAt: new Date() })
				.where(eq(projects.id, projectId))
		}

		return NextResponse.json({ cards }, { status: 201 })
	} catch (err) {
		console.error('[apply-template] card insertion failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to save template plan' } },
			{ status: 500 },
		)
	}
}
