import { usageToCents } from '@meldar/tokens'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { recordAiCall } from '@/server/lib/ai-call-log'
import { getAnthropicClient, MODELS } from '@/server/lib/anthropic'
import { checkRateLimit, generateProposalLimit, mustHaveRateLimit } from '@/server/lib/rate-limit'
import {
	checkAllSpendCeilings,
	recordGlobalSpend,
	recordUserDailySpend,
	recordUserHourlySpend,
} from '@/server/lib/spend-ceiling'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const projectIdSchema = z.string().uuid()

const bodySchema = z.object({
	description: z.string().min(1).max(500),
})

const proposalSchema = z.object({
	appType: z.string().max(80),
	style: z.string().max(60),
	palette: z.string().max(60),
	sections: z.array(z.string().max(60)).min(2).max(8),
	tone: z.string().max(60),
})

const SYSTEM_PROMPT = `You generate app proposals. Given a user's description, output a JSON object with exactly these fields:
- appType: what the app is (max 40 chars)
- style: visual style (max 30 chars)
- palette: color scheme (max 30 chars)
- sections: array of page sections (max 8 items, max 30 chars each)
- tone: overall feel (max 30 chars)

Pick strong, opinionated defaults. Never say "please choose" or "TBD". If the user is vague, make a confident choice.
Output ONLY the JSON object, nothing else.`

const limiter = mustHaveRateLimit(generateProposalLimit, 'generate-proposal')

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

	const { success, serviceError } = await checkRateLimit(limiter, session.userId, true)
	if (!success) {
		return NextResponse.json(
			{
				error: {
					code: serviceError ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMITED',
					message: serviceError
						? 'Rate limiter is temporarily unavailable. Try again shortly.'
						: 'Too many requests. Wait a few minutes.',
				},
			},
			{ status: serviceError ? 503 : 429 },
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

	const spendCheck = await checkAllSpendCeilings(session.userId)
	if (!spendCheck.allowed) {
		const status =
			spendCheck.reason === 'user_hourly' ? 429 : spendCheck.reason === 'user_daily' ? 402 : 503
		return NextResponse.json(
			{
				error: { code: spendCheck.reason.toUpperCase(), message: spendCheck.userMessage },
			},
			{ status },
		)
	}

	const startedAt = Date.now()

	try {
		const client = getAnthropicClient()
		const response = await client.messages
			.stream(
				{
					model: MODELS.HAIKU,
					max_tokens: 512,
					system: SYSTEM_PROMPT,
					messages: [{ role: 'user', content: parsed.data.description }],
				},
				{ signal: request.signal, timeout: 30_000 },
			)
			.finalMessage()

		const inputTokens = response.usage?.input_tokens ?? 0
		const outputTokens = response.usage?.output_tokens ?? 0
		const actualCents = usageToCents(MODELS.HAIKU, { inputTokens, outputTokens })

		Promise.all([
			recordGlobalSpend(actualCents),
			recordUserHourlySpend(session.userId, actualCents),
			recordUserDailySpend(session.userId, actualCents),
		]).catch((err) => {
			console.error('[generate-proposal] spend recording failed:', err)
		})

		const textBlock = response.content.find((block) => block.type === 'text')
		if (!textBlock || textBlock.type !== 'text') {
			recordAiCall({
				userId: session.userId,
				projectId,
				kind: 'generate_proposal',
				model: MODELS.HAIKU,
				inputTokens,
				outputTokens,
				centsCharged: actualCents,
				latencyMs: Date.now() - startedAt,
				stopReason: response.stop_reason ?? null,
				status: 'error',
				errorCode: 'no_text_content',
			})
			return NextResponse.json(
				{ error: { code: 'GENERATION_FAILED', message: 'No text in model response' } },
				{ status: 500 },
			)
		}

		let jsonContent: unknown
		try {
			jsonContent = JSON.parse(textBlock.text)
		} catch {
			const stripped = textBlock.text.replace(/```(?:json)?\n?/g, '').trim()
			try {
				jsonContent = JSON.parse(stripped)
			} catch {
				recordAiCall({
					userId: session.userId,
					projectId,
					kind: 'generate_proposal',
					model: MODELS.HAIKU,
					inputTokens,
					outputTokens,
					centsCharged: actualCents,
					latencyMs: Date.now() - startedAt,
					stopReason: response.stop_reason ?? null,
					status: 'error',
					errorCode: 'invalid_json',
				})
				return NextResponse.json(
					{ error: { code: 'GENERATION_FAILED', message: 'Model returned invalid JSON' } },
					{ status: 500 },
				)
			}
		}

		const validated = proposalSchema.safeParse(jsonContent)
		if (!validated.success) {
			recordAiCall({
				userId: session.userId,
				projectId,
				kind: 'generate_proposal',
				model: MODELS.HAIKU,
				inputTokens,
				outputTokens,
				centsCharged: actualCents,
				latencyMs: Date.now() - startedAt,
				stopReason: response.stop_reason ?? null,
				status: 'error',
				errorCode: 'schema_validation_failed',
			})
			return NextResponse.json(
				{ error: { code: 'GENERATION_FAILED', message: 'Model output did not pass validation' } },
				{ status: 500 },
			)
		}

		recordAiCall({
			userId: session.userId,
			projectId,
			kind: 'generate_proposal',
			model: MODELS.HAIKU,
			inputTokens,
			outputTokens,
			centsCharged: actualCents,
			latencyMs: Date.now() - startedAt,
			stopReason: response.stop_reason ?? null,
			status: 'ok',
		})

		return NextResponse.json({ proposal: validated.data })
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			return NextResponse.json(
				{ error: { code: 'ABORTED', message: 'Request was cancelled' } },
				{ status: 499 },
			)
		}
		console.error('[generate-proposal] Haiku call failed', err)
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate proposal' } },
			{ status: 500 },
		)
	}
}
