import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import {
	completeTask,
	escalateTask,
	failTask,
	findTaskByResendId,
} from '@/server/agents/agent-task-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ResendWebhookData {
	email_id: string
	to: string[]
	from: string
	subject: string
}

interface ResendWebhookEvent {
	type: string
	data: ResendWebhookData
}

function isValidPayload(body: unknown): body is ResendWebhookEvent {
	if (typeof body !== 'object' || body === null) return false
	const obj = body as Record<string, unknown>
	if (typeof obj.type !== 'string') return false
	if (typeof obj.data !== 'object' || obj.data === null) return false
	const data = obj.data as Record<string, unknown>
	return typeof data.email_id === 'string'
}

export async function POST(request: Request) {
	const signingSecret = process.env.RESEND_WEBHOOK_SECRET
	if (!signingSecret) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Webhook secret not configured' } },
			{ status: 401 },
		)
	}

	const svixId = request.headers.get('svix-id')
	const svixTimestamp = request.headers.get('svix-timestamp')
	const svixSignature = request.headers.get('svix-signature')

	if (!svixId || !svixTimestamp || !svixSignature) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Missing webhook signature headers' } },
			{ status: 401 },
		)
	}

	const body = await request.text()

	let event: ResendWebhookEvent
	try {
		const wh = new Webhook(signingSecret)
		event = wh.verify(body, {
			'svix-id': svixId,
			'svix-timestamp': svixTimestamp,
			'svix-signature': svixSignature,
		}) as ResendWebhookEvent
	} catch {
		return NextResponse.json(
			{ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } },
			{ status: 401 },
		)
	}

	if (!isValidPayload(event)) {
		return NextResponse.json(
			{ error: { code: 'BAD_REQUEST', message: 'Invalid payload structure' } },
			{ status: 400 },
		)
	}

	const resendId = event.data.email_id
	const task = await findTaskByResendId(resendId)

	if (!task) {
		return NextResponse.json({ received: true, matched: false })
	}

	switch (event.type) {
		case 'email.delivered': {
			if (task.status === 'verifying') {
				await completeTask(task.id, {
					...((task.result as Record<string, unknown>) ?? {}),
					deliveryEvent: 'delivered',
				})
			}
			break
		}
		case 'email.bounced':
		case 'email.complained': {
			if (task.status === 'verifying') {
				await failTask(task.id, `${event.type}: ${resendId}`)
			} else if (task.status === 'failed') {
				await escalateTask(task.id, `${event.type} after failure: ${resendId}`)
			}
			break
		}
	}

	return NextResponse.json({ received: true, matched: true })
}
