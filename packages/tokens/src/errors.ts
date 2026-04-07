/**
 * Typed errors emitted by the TokenLedger.
 */

export abstract class TokenLedgerError extends Error {
	abstract readonly code: string
	readonly userId?: string

	constructor(message: string, options?: { cause?: unknown; userId?: string }) {
		super(message, { cause: options?.cause })
		this.name = this.constructor.name
		this.userId = options?.userId
	}
}

/**
 * The user's daily spend ceiling has been hit. The orchestrator should
 * surface a friendly "you've hit your daily limit, come back tomorrow"
 * message in the workspace UI rather than silently failing the Build.
 */
export class CeilingExceededError extends TokenLedgerError {
	readonly code = 'ceiling_exceeded'
	readonly spentCentsToday: number
	readonly attemptedCents: number
	readonly ceilingCentsPerDay: number

	constructor(
		userId: string,
		spentCentsToday: number,
		attemptedCents: number,
		ceilingCentsPerDay: number,
	) {
		super(
			`user ${userId} hit daily ceiling: spent=${spentCentsToday}c attempted=${attemptedCents}c ceiling=${ceilingCentsPerDay}c`,
			{ userId },
		)
		this.spentCentsToday = spentCentsToday
		this.attemptedCents = attemptedCents
		this.ceilingCentsPerDay = ceilingCentsPerDay
	}
}

/**
 * The Redis backend failed. Caller should fail-closed: if we can't track
 * spend, we don't allow more spend.
 */
export class TokenLedgerBackendError extends TokenLedgerError {
	readonly code = 'token_ledger_backend_error'
}
