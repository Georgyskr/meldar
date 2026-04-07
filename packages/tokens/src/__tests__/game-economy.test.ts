import { describe, expect, it, vi } from 'vitest'
import {
	creditTokens,
	debitTokens,
	getTokenBalance,
	getTransactionHistory,
	InsufficientBalanceError,
} from '../game-economy'

function mockSelectChain(result: unknown[]) {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue(result),
			}),
		}),
	}
}

function mockOrderedSelectChain(result: unknown[]) {
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				orderBy: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	}
}

describe('assertPositiveInteger (via debitTokens)', () => {
	it('rejects negative amounts', async () => {
		const db = {} as never
		await expect(debitTokens(db, 'user_1', -5, 'build')).rejects.toThrow(
			'amount must be a positive integer',
		)
	})

	it('rejects zero amount', async () => {
		const db = {} as never
		await expect(debitTokens(db, 'user_1', 0, 'build')).rejects.toThrow(
			'amount must be a positive integer',
		)
	})

	it('rejects non-integer amounts', async () => {
		const db = {} as never
		await expect(debitTokens(db, 'user_1', 1.5, 'build')).rejects.toThrow(
			'amount must be a positive integer',
		)
	})
})

describe('getTokenBalance', () => {
	it('returns balance from the user row', async () => {
		const selectChain = mockSelectChain([{ tokenBalance: 150 }])
		const db = { select: vi.fn().mockReturnValue(selectChain) }

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		const balance = await getTokenBalance(db as any, 'user_1')
		expect(balance).toBe(150)
	})

	it('returns 0 when user not found', async () => {
		const selectChain = mockSelectChain([])
		const db = { select: vi.fn().mockReturnValue(selectChain) }

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		const balance = await getTokenBalance(db as any, 'nonexistent')
		expect(balance).toBe(0)
	})
})

describe('debitTokens', () => {
	it('executes CTE and returns the new balance', async () => {
		const db = {
			execute: vi.fn().mockResolvedValue({ rows: [{ balance_after: 190 }] }),
		}

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		const result = await debitTokens(db as any, 'user_1', 10, 'build', 'build_123')
		expect(result.balance).toBe(190)
		expect(db.execute).toHaveBeenCalledTimes(1)
	})

	it('throws InsufficientBalanceError when CTE returns no rows', async () => {
		const selectChain = mockSelectChain([{ tokenBalance: 5 }])
		const db = {
			execute: vi.fn().mockResolvedValue({ rows: [] }),
			select: vi.fn().mockReturnValue(selectChain),
		}

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		await expect(debitTokens(db as any, 'user_1', 10, 'build')).rejects.toThrow(
			InsufficientBalanceError,
		)
	})

	it('reports current balance and attempted debit in error', async () => {
		const selectChain = mockSelectChain([{ tokenBalance: 3 }])
		const db = {
			execute: vi.fn().mockResolvedValue({ rows: [] }),
			select: vi.fn().mockReturnValue(selectChain),
		}

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		const err = await debitTokens(db as any, 'user_1', 100, 'build').catch((e) => e)
		expect(err).toBeInstanceOf(InsufficientBalanceError)
		expect((err as InsufficientBalanceError).currentBalance).toBe(3)
		expect((err as InsufficientBalanceError).attemptedDebit).toBe(100)
	})
})

describe('creditTokens', () => {
	it('executes CTE and returns the new balance', async () => {
		const db = {
			execute: vi.fn().mockResolvedValue({ rows: [{ balance_after: 215 }] }),
		}

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		const result = await creditTokens(db as any, 'user_1', 15, 'daily_bonus')
		expect(result.balance).toBe(215)
		expect(db.execute).toHaveBeenCalledTimes(1)
	})

	it('throws when user not found (CTE returns no rows)', async () => {
		const db = {
			execute: vi.fn().mockResolvedValue({ rows: [] }),
		}

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		await expect(creditTokens(db as any, 'nonexistent', 10, 'daily_bonus')).rejects.toThrow(
			'User not found',
		)
	})
})

describe('getTransactionHistory', () => {
	it('returns mapped transaction rows', async () => {
		const now = new Date()
		const rows = [
			{
				id: 'txn_1',
				userId: 'user_1',
				amount: -10,
				reason: 'build',
				referenceId: 'build_1',
				balanceAfter: 190,
				createdAt: now,
			},
			{
				id: 'txn_2',
				userId: 'user_1',
				amount: 15,
				reason: 'daily_bonus',
				referenceId: null,
				balanceAfter: 215,
				createdAt: now,
			},
		]
		const chain = mockOrderedSelectChain(rows)
		const db = { select: vi.fn().mockReturnValue(chain) }

		// biome-ignore lint/suspicious/noExplicitAny: test mock
		const result = await getTransactionHistory(db as any, 'user_1')
		expect(result).toHaveLength(2)
		expect(result[0].amount).toBe(-10)
		expect(result[0].reason).toBe('build')
		expect(result[1].amount).toBe(15)
		expect(result[1].reason).toBe('daily_bonus')
	})
})
