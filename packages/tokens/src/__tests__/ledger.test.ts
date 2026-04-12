import { makeRedisMock } from '@meldar/test-utils'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CeilingExceededError, TokenLedgerBackendError } from '../errors'
import { InMemoryTokenLedger, type TokenLedger, UpstashTokenLedger } from '../ledger'

describe('TokenLedger contract', () => {
	for (const impl of [
		{ name: 'InMemory', factory: () => new InMemoryTokenLedger({ ceilingCentsPerDay: 200 }) },
		{
			name: 'Upstash (mocked)',
			factory: () => {
				const store = new Map<string, number>()
				const mockRedis = makeRedisMock({
					eval: vi.fn(async (_script, keys, args) => {
						const key = keys[0]
						const cents = Number(args[0])
						const ceiling = Number(args[1])
						const current = store.get(key) ?? 0
						if (current + cents > ceiling) return [0, current]
						store.set(key, current + cents)
						return [1, current + cents]
					}),
					get: vi.fn(async (key: string) => {
						const v = store.get(key)
						return v == null ? null : v.toString()
					}),
				})
				return new UpstashTokenLedger({ redis: mockRedis, ceilingCentsPerDay: 200 })
			},
		},
	]) {
		describe(impl.name, () => {
			let ledger: TokenLedger

			beforeEach(() => {
				ledger = impl.factory()
			})

			it('starts at zero spent for a fresh user', async () => {
				const snap = await ledger.getSnapshot('user_1')
				expect(snap.spentCentsToday).toBe(0)
				expect(snap.remainingCentsToday).toBe(200)
				expect(snap.ceilingCentsPerDay).toBe(200)
			})

			it('successful debit reduces remaining by the debit amount', async () => {
				const r = await ledger.tryDebit('user_1', 50)
				expect(r.ok).toBe(true)
				if (r.ok) {
					expect(r.spentCentsToday).toBe(50)
					expect(r.remainingCentsToday).toBe(150)
				}
			})

			it('multiple debits accumulate', async () => {
				await ledger.tryDebit('user_1', 30)
				await ledger.tryDebit('user_1', 70)
				const snap = await ledger.getSnapshot('user_1')
				expect(snap.spentCentsToday).toBe(100)
			})

			it('debit exactly at the ceiling succeeds', async () => {
				const r = await ledger.tryDebit('user_1', 200)
				expect(r.ok).toBe(true)
				if (r.ok) expect(r.remainingCentsToday).toBe(0)
			})

			it('debit one cent past the ceiling is rejected', async () => {
				await ledger.tryDebit('user_1', 199)
				const r = await ledger.tryDebit('user_1', 2) // 199+2=201 > 200
				expect(r.ok).toBe(false)
				if (!r.ok) {
					expect(r.reason).toBe('ceiling_exceeded')
					expect(r.spentCentsToday).toBe(199) // unchanged from before the rejected debit
					expect(r.attemptedCents).toBe(2)
				}
			})

			it('rejected debit does NOT change spent total', async () => {
				await ledger.tryDebit('user_1', 199)
				await ledger.tryDebit('user_1', 100) // rejected
				const snap = await ledger.getSnapshot('user_1')
				expect(snap.spentCentsToday).toBe(199)
			})

			it('debits are isolated per user', async () => {
				await ledger.tryDebit('user_1', 199)
				const r = await ledger.tryDebit('user_2', 199)
				expect(r.ok).toBe(true)
			})

			it('debitOrThrow throws CeilingExceededError on rejection', async () => {
				await ledger.tryDebit('user_1', 200)
				await expect(ledger.debitOrThrow('user_1', 1)).rejects.toThrow(CeilingExceededError)
			})

			it('debitOrThrow does NOT throw on success', async () => {
				await expect(ledger.debitOrThrow('user_1', 50)).resolves.toBeUndefined()
				const snap = await ledger.getSnapshot('user_1')
				expect(snap.spentCentsToday).toBe(50)
			})

			it('rejects negative debit amounts', async () => {
				await expect(ledger.tryDebit('user_1', -1)).rejects.toThrow()
			})

			it('rejects zero debit amounts', async () => {
				await expect(ledger.tryDebit('user_1', 0)).rejects.toThrow()
			})

			it('rejects non-integer debit amounts', async () => {
				await expect(ledger.tryDebit('user_1', 1.5)).rejects.toThrow()
			})
		})
	}
})

describe('TokenLedger day boundary', () => {
	let day = '2026-04-06'

	it('isolates spend between UTC days', async () => {
		const ledger = new InMemoryTokenLedger({
			ceilingCentsPerDay: 100,
			nowDay: () => day,
		})
		await ledger.tryDebit('user_1', 100)
		expect((await ledger.getSnapshot('user_1')).spentCentsToday).toBe(100)

		day = '2026-04-07'
		const snap = await ledger.getSnapshot('user_1')
		expect(snap.spentCentsToday).toBe(0)
		expect(snap.remainingCentsToday).toBe(100)

		const r = await ledger.tryDebit('user_1', 100)
		expect(r.ok).toBe(true)
	})
})

describe('UpstashTokenLedger error handling', () => {
	it('wraps Redis errors in TokenLedgerBackendError', async () => {
		const ledger = new UpstashTokenLedger({
			redis: makeRedisMock({ eval: vi.fn().mockRejectedValue(new Error('ECONNRESET')) }),
		})
		await expect(ledger.tryDebit('user_1', 10)).rejects.toThrow(TokenLedgerBackendError)
	})

	it('rejects malformed Lua replies', async () => {
		const ledger = new UpstashTokenLedger({
			redis: makeRedisMock({ eval: vi.fn().mockResolvedValue('not an array') }),
		})
		await expect(ledger.tryDebit('user_1', 10)).rejects.toThrow(TokenLedgerBackendError)
	})

	it('rejects non-numeric Lua reply values', async () => {
		const ledger = new UpstashTokenLedger({
			redis: makeRedisMock({ eval: vi.fn().mockResolvedValue([1, 'NaN']) }),
		})
		await expect(ledger.tryDebit('user_1', 10)).rejects.toThrow(TokenLedgerBackendError)
	})
})

describe('InMemoryTokenLedger production guard', () => {
	afterAll(() => {
		vi.unstubAllEnvs()
	})

	it('refuses to construct in production', () => {
		// vi.stubEnv because process.env.NODE_ENV is read-only under TS 5.x.
		vi.stubEnv('NODE_ENV', 'production')
		expect(() => new InMemoryTokenLedger()).toThrow(/production/)
		vi.unstubAllEnvs()
	})
})
