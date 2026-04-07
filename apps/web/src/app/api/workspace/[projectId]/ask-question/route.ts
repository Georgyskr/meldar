import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAskQuestionSystemPrompt } from '@/features/project-onboarding/lib/prompts'
import { askQuestionRequestSchema } from '@/features/project-onboarding/lib/schemas'
import { verifyToken } from '@/server/identity/jwt'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'
import { adaptiveLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const limiter = mustHaveRateLimit(adaptiveLimit, 'ask-question')

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

	if (limiter) {
		const { success } = await limiter.limit(session.userId)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
				{ status: 429 },
			)
		}
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

	const parsed = askQuestionRequestSchema.safeParse(body)
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

	const { messages, questionIndex } = parsed.data
	const systemPrompt = buildAskQuestionSystemPrompt(questionIndex)

	try {
		const client = getAnthropicClient()
		const response = await client.messages.create({
			model: MODELS.HAIKU,
			max_tokens: 256,
			system: systemPrompt,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
		})

		const textBlock = response.content.find((block) => block.type === 'text')
		if (!textBlock || textBlock.type !== 'text') {
			return NextResponse.json(
				{ error: { code: 'GENERATION_FAILED', message: 'AI returned no response' } },
				{ status: 500 },
			)
		}

		return NextResponse.json({ question: textBlock.text.trim() })
	} catch (err) {
		console.error('[ask-question] Haiku call failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate question' } },
			{ status: 500 },
		)
	}
}
