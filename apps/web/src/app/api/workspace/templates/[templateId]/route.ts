import { TEMPLATE_PLANS } from '@meldar/orchestrator'
import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/server/identity/jwt'

export const runtime = 'nodejs'

type RouteContext = {
	params: Promise<{ templateId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
	const session = verifyToken(request.cookies.get('meldar-auth')?.value ?? '')
	if (!session) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	const { templateId } = await context.params
	const plan = TEMPLATE_PLANS.find((t) => t.id === templateId)
	if (!plan) {
		return NextResponse.json(
			{ error: { code: 'NOT_FOUND', message: 'Template not found' } },
			{ status: 404 },
		)
	}
	return NextResponse.json(plan)
}
