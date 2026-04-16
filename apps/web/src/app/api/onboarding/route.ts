import {
	buildPersonalizationPrompt,
	renderBookingPageTemplate,
	STARTER_FILES,
} from '@meldar/orchestrator'
import { CloudflareSandboxProvider } from '@meldar/sandbox'
import { buildProjectStorageFromEnv, buildProjectStorageWithoutR2 } from '@meldar/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BOOKING_VERTICALS, getVerticalById } from '@/entities/booking-verticals'
import { provisionSubdomain } from '@/server/domains'
import { requireAuth } from '@/server/identity/require-auth'
import { insertPersonalizationCard } from '@/server/lib/insert-plan-cards'
import { checkRateLimit, mustHaveRateLimit, projectsCreateLimit } from '@/server/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const validVerticalIds = BOOKING_VERTICALS.map((v) => v.id)

const bodySchema = z.object({
	verticalId: z.string().refine((id) => validVerticalIds.includes(id), {
		message: 'Unknown business type',
	}),
	businessName: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.regex(/^[\p{L}\p{N}\p{Zs}\-'.&,!()]+$/u, {
			message: 'Business name contains invalid characters',
		})
		.optional(),
	freeformDescription: z.string().max(500).optional(),
})

const limiter = mustHaveRateLimit(projectsCreateLimit, 'projectsCreate')

const LOCKED_STARTER_FILES = STARTER_FILES.filter((f) =>
	[
		'package.json',
		'tsconfig.json',
		'next.config.ts',
		'panda.config.ts',
		'postcss.config.cjs',
		'src/app/layout.tsx',
		'.gitignore',
	].includes(f.path),
).map((f) => ({ path: f.path, content: f.content }))

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
		const templateFiles = renderBookingPageTemplate({
			businessName: projectName,
			verticalLabel: vertical.label,
			services: vertical.defaultServices,
			hours: vertical.defaultHours,
		})

		const initialFiles = [...LOCKED_STARTER_FILES, ...templateFiles]

		const created = await storage.createProject({
			userId: auth.userId,
			name: projectName,
			templateId: 'booking-page',
			initialFiles: hasR2 ? initialFiles : [],
		})

		const personalizationPrompt = buildPersonalizationPrompt(
			{
				businessName: projectName,
				verticalLabel: vertical.label,
				services: vertical.defaultServices,
				hours: vertical.defaultHours,
			},
			parsed.data.freeformDescription,
		)
		await insertPersonalizationCard(created.project.id, personalizationPrompt)

		let previewUrl: string | null = null
		try {
			const sandbox = CloudflareSandboxProvider.fromEnv()
			const handle = await sandbox.writeFiles({
				projectId: created.project.id,
				userId: auth.userId,
				files: initialFiles,
			})
			previewUrl = handle.previewUrl

			if (previewUrl) {
				await storage.setPreviewUrl(created.project.id, previewUrl).catch((err) => {
					console.warn('[api/onboarding] setPreviewUrl failed:', err)
				})
			}
		} catch (sandboxErr) {
			console.warn(
				'[api/onboarding] sandbox writeFiles failed (non-fatal):',
				sandboxErr instanceof Error ? sandboxErr.message : sandboxErr,
			)
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
			previewUrl,
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
