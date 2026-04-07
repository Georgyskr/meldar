import { type TokenTransactionReason, tokenTransactions, users } from '@meldar/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'

export type TokenEconomyConfig = {
	signupBonus: number
	dailyEarnCap: number
	referralBonus: number
	freeMonthlyAllowance: number
}

export const DEFAULT_TOKEN_ECONOMY: TokenEconomyConfig = {
	signupBonus: 200,
	dailyEarnCap: 15,
	referralBonus: 50,
	freeMonthlyAllowance: 200,
}

export type TokenTransaction = {
	id: string
	userId: string
	amount: number
	reason: TokenTransactionReason
	referenceId: string | null
	balanceAfter: number
	createdAt: Date
}

export class InsufficientBalanceError extends Error {
	readonly code = 'insufficient_balance'
	readonly currentBalance: number
	readonly attemptedDebit: number

	constructor(currentBalance: number, attemptedDebit: number) {
		super(`Insufficient balance: have ${currentBalance}, need ${attemptedDebit}`)
		this.name = 'InsufficientBalanceError'
		this.currentBalance = currentBalance
		this.attemptedDebit = attemptedDebit
	}
}

// biome-ignore lint/suspicious/noExplicitAny: Drizzle schema generic is not constrained here
type Db = NeonHttpDatabase<any>

export async function getTokenBalance(db: Db, userId: string): Promise<number> {
	const [row] = await db
		.select({ tokenBalance: users.tokenBalance })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
	return row?.tokenBalance ?? 0
}

export async function debitTokens(
	db: Db,
	userId: string,
	amount: number,
	reason: TokenTransactionReason,
	referenceId?: string,
): Promise<{ balance: number }> {
	assertPositiveInteger(amount)

	const txnId = crypto.randomUUID()
	const ref = referenceId ?? null

	const result = await db.execute(sql`
		WITH updated AS (
			UPDATE users
			SET token_balance = token_balance - ${amount}
			WHERE id = ${userId} AND token_balance >= ${amount}
			RETURNING token_balance
		)
		INSERT INTO token_transactions (id, user_id, amount, reason, reference_id, balance_after)
		SELECT ${txnId}, ${userId}, ${-amount}, ${reason}, ${ref}, token_balance
		FROM updated
		RETURNING balance_after
	`)

	if (!result.rows.length) {
		const currentBalance = await getTokenBalance(db, userId)
		throw new InsufficientBalanceError(currentBalance, amount)
	}

	return { balance: result.rows[0].balance_after as number }
}

export async function creditTokens(
	db: Db,
	userId: string,
	amount: number,
	reason: TokenTransactionReason,
	referenceId?: string,
): Promise<{ balance: number }> {
	assertPositiveInteger(amount)

	const txnId = crypto.randomUUID()
	const ref = referenceId ?? null
	const isEarning = reason !== 'refund'

	const result = await db.execute(sql`
		WITH updated AS (
			UPDATE users
			SET token_balance = token_balance + ${amount}
				${isEarning ? sql`, lifetime_tokens_earned = lifetime_tokens_earned + ${amount}` : sql``}
			WHERE id = ${userId}
			RETURNING token_balance
		)
		INSERT INTO token_transactions (id, user_id, amount, reason, reference_id, balance_after)
		SELECT ${txnId}, ${userId}, ${amount}, ${reason}, ${ref}, token_balance
		FROM updated
		RETURNING balance_after
	`)

	if (!result.rows.length) {
		throw new Error(`User not found: ${userId}`)
	}

	return { balance: result.rows[0].balance_after as number }
}

export async function getTransactionHistory(
	db: Db,
	userId: string,
	limit = 20,
): Promise<TokenTransaction[]> {
	const rows = await db
		.select()
		.from(tokenTransactions)
		.where(eq(tokenTransactions.userId, userId))
		.orderBy(desc(tokenTransactions.createdAt))
		.limit(limit)

	return rows.map((r) => ({
		id: r.id,
		userId: r.userId,
		amount: r.amount,
		reason: r.reason as TokenTransactionReason,
		referenceId: r.referenceId,
		balanceAfter: r.balanceAfter,
		createdAt: r.createdAt,
	}))
}

function assertPositiveInteger(n: number): void {
	if (!Number.isInteger(n) || n <= 0) {
		throw new Error(`amount must be a positive integer (got: ${n})`)
	}
}
