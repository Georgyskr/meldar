import { getDb } from '@meldar/db/client'
import { agentEvents } from '@meldar/db/schema'

export async function logEmailSent(opts: {
	projectId: string
	userId: string
	recipient: string
	subject: string
	resendId?: string
	agentTaskId?: string
}): Promise<void> {
	const db = getDb()
	await db.insert(agentEvents).values({
		projectId: opts.projectId,
		userId: opts.userId,
		eventType: 'execution',
		payload: {
			action: 'email_sent',
			recipient: opts.recipient,
			subject: opts.subject,
			resendId: opts.resendId ?? null,
			agentTaskId: opts.agentTaskId ?? null,
			timestamp: new Date().toISOString(),
		},
	})
}
