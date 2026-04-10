import { vi } from 'vitest'

vi.mock('@/server/lib/spend-ceiling', () => ({
	checkAllSpendCeilings: vi.fn().mockResolvedValue({ allowed: true }),
	checkGlobalSpendCeiling: vi
		.fn()
		.mockResolvedValue({ allowed: true, spentToday: 0, ceiling: 3000 }),
	checkUserHourlySpend: vi.fn().mockResolvedValue({ allowed: true, spentThisHour: 0, ceiling: 80 }),
	checkUserDailySpend: vi.fn().mockResolvedValue({ allowed: true, spentToday: 0, ceiling: 200 }),
	recordGlobalSpend: vi.fn().mockResolvedValue(undefined),
	recordUserHourlySpend: vi.fn().mockResolvedValue(undefined),
	recordUserDailySpend: vi.fn().mockResolvedValue(undefined),
	getGlobalSpendToday: vi.fn().mockResolvedValue({ spent: 0, ceiling: 3000 }),
	createSpendGuardForUser: vi.fn(() => ({
		check: vi.fn().mockResolvedValue({ allowed: true }),
		record: vi.fn().mockResolvedValue(undefined),
	})),
}))
