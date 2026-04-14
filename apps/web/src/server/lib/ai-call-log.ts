import { getDb } from '@meldar/db/client'
import { type AiCallKind, type AiCallStatus, aiCallLog } from '@meldar/db/schema'

let setupFailureCount = 0
let writeFailureCount = 0

function shouldLog(count: number): boolean {
	return count <= 3 || count % 100 === 0
}

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
				writeFailureCount += 1
				if (shouldLog(writeFailureCount)) {
					console.error(
						`[ai-call-log] write failed (count=${writeFailureCount}, sampled 1st-3rd then every 100th):`,
						err,
					)
				}
			})
	} catch (err) {
		setupFailureCount += 1
		if (shouldLog(setupFailureCount)) {
			console.error(
				`[ai-call-log] setup failed (count=${setupFailureCount}, sampled 1st-3rd then every 100th):`,
				err,
			)
		}
	}
}

// Test-only accessors for failure counters (useful in vitest + prod diagnostics).
export function __getAiCallLogFailureCounts(): { setup: number; write: number } {
	return { setup: setupFailureCount, write: writeFailureCount }
}

export function __resetAiCallLogFailureCounts(): void {
	setupFailureCount = 0
	writeFailureCount = 0
}
