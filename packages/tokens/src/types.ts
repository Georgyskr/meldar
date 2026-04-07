export type DebitResult =
	| {
			readonly ok: true
			readonly spentCentsToday: number
			readonly remainingCentsToday: number
	  }
	| {
			readonly ok: false
			readonly reason: 'ceiling_exceeded'
			readonly spentCentsToday: number
			readonly attemptedCents: number
			readonly ceilingCentsPerDay: number
	  }

export type SpendSnapshot = {
	readonly userId: string
	readonly spentCentsToday: number
	readonly ceilingCentsPerDay: number
	readonly remainingCentsToday: number
	readonly day: string
}

export const DEFAULT_CEILING_CENTS_PER_DAY = 200 as const
