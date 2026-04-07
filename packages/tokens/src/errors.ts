export abstract class TokenLedgerError extends Error {
	abstract readonly code: string
	readonly userId?: string

	constructor(message: string, options?: { cause?: unknown; userId?: string }) {
		super(message, { cause: options?.cause })
		this.name = this.constructor.name
		this.userId = options?.userId
	}
}

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

export class TokenLedgerBackendError extends TokenLedgerError {
	readonly code = 'token_ledger_backend_error'
}
