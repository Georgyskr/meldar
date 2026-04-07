import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAskQuestionSystemPrompt } from '@/features/project-onboarding/lib/prompts'
import {
	askQuestionRequestSchema,
	askQuestionResponseSchema,
} from '@/features/project-onboarding/lib/schemas'
import { verifyToken } from '@/server/identity/jwt'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'
import { adaptiveLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const limiter = mustHaveRateLimit(adaptiveLimit, 'ask-question')

const FALLBACK_QUESTIONS = [
	'What do you want to see first when you open the app?',
	'How would you like to add your data into the app?',
	'Is this app just for you, or will others use it too?',
	'Would you like the app to send you any reminders or updates?',
	'Is there anything else you would like the app to do?',
] as const

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
		const response = await client.messages.create(
			{
				model: MODELS.HAIKU,
				max_tokens: 256,
				system: systemPrompt,
				messages: messages.map((m) => ({ role: m.role, content: m.content })),
			},
			{ signal: request.signal, timeout: 30_000 },
		)

		const textBlock = response.content.find((block) => block.type === 'text')
		if (!textBlock || textBlock.type !== 'text') {
			return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
		}

		const validated = askQuestionResponseSchema.safeParse({
			question: textBlock.text.trim(),
		})
		if (!validated.success) {
			return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
		}

		return NextResponse.json({ question: validated.data.question })
	} catch (err) {
		console.error('[ask-question] Haiku call failed', err)
		return NextResponse.json({ question: FALLBACK_QUESTIONS[questionIndex - 1] })
	}
}
