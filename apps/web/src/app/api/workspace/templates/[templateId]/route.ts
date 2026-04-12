import { TEMPLATE_PLANS } from '@meldar/orchestrator'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/server/identity/require-auth'

export const runtime = 'nodejs'

type RouteContext = {
	params: Promise<{ templateId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
	const auth = await requireAuth(request)
	if (!auth.ok) return auth.response

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
