import { getDb } from '@meldar/db/client'
import { type AiCallKind, type AiCallStatus, aiCallLog } from '@meldar/db/schema'

let setupWarnedOnce = false
let writeWarnedOnce = false

export type RecordAiCallArgs = {
	readonly userId: string | null
	readonly projectId?: string | null
	readonly sessionId?: string | null
	readonly kind: AiCallKind
	readonly model: string
	readonly inputTokens: number
	readonly cachedReadTokens?: number
	readonly cachedWriteTokens?: number
	readonly outputTokens: number
	readonly centsCharged: number
	readonly latencyMs: number
	readonly stopReason?: string | null
	readonly status: AiCallStatus
	readonly errorCode?: string | null
}

export function recordAiCall(args: RecordAiCallArgs): void {
	try {
		const cacheRead = args.cachedReadTokens ?? 0
		const cacheWrite = args.cachedWriteTokens ?? 0
		const totalInput = args.inputTokens + cacheRead + cacheWrite
		const cacheHitRatePct = totalInput > 0 ? Math.round((cacheRead / totalInput) * 100) : null

		void getDb()
			.insert(aiCallLog)
			.values({
				userId: args.userId,
				projectId: args.projectId ?? null,
				sessionId: args.sessionId ?? null,
				kind: args.kind,
				model: args.model,
				inputTokens: args.inputTokens,
				cachedReadTokens: cacheRead,
				cachedWriteTokens: cacheWrite,
				outputTokens: args.outputTokens,
				centsCharged: args.centsCharged,
				latencyMs: args.latencyMs,
				stopReason: args.stopReason ?? null,
				status: args.status,
				errorCode: args.errorCode ?? null,
				cacheHitRatePct,
			})
			.catch((err) => {
				if (!writeWarnedOnce) {
					writeWarnedOnce = true
					console.error(
						'[ai-call-log] write failed (non-fatal, subsequent failures suppressed):',
						err,
					)
				}
			})
	} catch (err) {
		if (!setupWarnedOnce) {
			setupWarnedOnce = true
			console.error('[ai-call-log] setup failed (non-fatal, subsequent failures suppressed):', err)
		}
	}
}
