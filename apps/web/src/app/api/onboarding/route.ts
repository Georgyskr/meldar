import { STARTER_FILES, TEMPLATE_PLANS } from '@meldar/orchestrator'
import { buildProjectStorageFromEnv, buildProjectStorageWithoutR2 } from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BOOKING_VERTICALS, getVerticalById } from '@/entities/booking-verticals'
import { provisionSubdomain } from '@/server/domains'
import { requireAuth } from '@/server/identity/require-auth'
import { insertPlanCards } from '@/server/lib/insert-plan-cards'
import { checkRateLimit, mustHaveRateLimit, projectsCreateLimit } from '@/server/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const validVerticalIds = BOOKING_VERTICALS.map((v) => v.id)

const bodySchema = z.object({
	verticalId: z.string().refine((id) => validVerticalIds.includes(id), {
		message: 'Unknown business type',
	}),
	businessName: z.string().trim().min(1).max(80).optional(),
})

const limiter = mustHaveRateLimit(projectsCreateLimit, 'projectsCreate')

const STARTER_INITIAL_FILES = STARTER_FILES.map((f) => ({ path: f.path, content: f.content }))

export async function POST(request: NextRequest) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

	const { success } = await checkRateLimit(limiter, auth.userId)
	if (!success) {
		return NextResponse.json(
			{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a few minutes.' } },
			{ status: 429 },
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

	const vertical = getVerticalById(parsed.data.verticalId)
	if (!vertical) {
		return NextResponse.json(
			{ error: { code: 'VALIDATION_ERROR', message: 'Unknown business type' } },
			{ status: 400 },
		)
	}

	const projectName = parsed.data.businessName ?? `My ${vertical.label} business`

	let storage: ReturnType<typeof buildProjectStorageFromEnv>
	let hasR2 = true
	try {
		storage = buildProjectStorageFromEnv()
	} catch {
		hasR2 = false
		storage = buildProjectStorageWithoutR2()
	}

	try {
		const created = await storage.createProject({
			userId: auth.userId,
			name: projectName,
			templateId: 'booking-page',
			initialFiles: hasR2 ? STARTER_INITIAL_FILES : [],
		})

		const bookingTemplate = TEMPLATE_PLANS.find((t) => t.id === 'booking-page')
		if (bookingTemplate) {
			await insertPlanCards(created.project.id, bookingTemplate.milestones, 'template')
		}

		let subdomain: string | undefined
		try {
			subdomain = await provisionSubdomain(created.project.id, projectName)
		} catch (subErr) {
			console.error(
				'[api/onboarding] subdomain provisioning failed:',
				subErr instanceof Error ? subErr.message : subErr,
			)
		}

		return NextResponse.json({
			projectId: created.project.id,
			subdomain,
			vertical: {
				id: vertical.id,
				label: vertical.label,
				services: vertical.defaultServices,
				hours: vertical.defaultHours,
			},
		})
	} catch (err) {
		console.error('[api/onboarding] failed:', err instanceof Error ? err.message : err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to create your business' } },
			{ status: 500 },
		)
	}
}
