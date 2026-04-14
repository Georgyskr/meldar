import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockInsert } = vi.hoisted(() => ({
	mockInsert: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({ insert: mockInsert }),
}))

vi.mock('@meldar/db/schema', () => ({
	aiCallLog: Symbol('aiCallLog'),
}))

import {
	__getAiCallLogFailureCounts,
	__resetAiCallLogFailureCounts,
	recordAiCall,
} from '../ai-call-log'

const baseArgs = {
	userId: 'u1',
	kind: 'build' as const,
	model: 'claude-sonnet-4-6',
	inputTokens: 100,
	outputTokens: 50,
	centsCharged: 5,
	latencyMs: 1234,
	status: 'ok' as const,
}

describe('recordAiCall — observability (sampled failure counter)', () => {
	let errorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		__resetAiCallLogFailureCounts()
		mockInsert.mockReset()
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		errorSpy.mockRestore()
		vi.restoreAllMocks()
	})

	it('increments setup counter when insert construction throws (does not blackhole after first)', () => {
		mockInsert.mockImplementation(() => {
			throw new Error('DATABASE_URL is not set')
		})

		for (let i = 0; i < 10; i++) recordAiCall(baseArgs)
		expect(__getAiCallLogFailureCounts().setup).toBe(10)
	})

	it('logs the first 3 setup failures, then samples every 100th', () => {
		mockInsert.mockImplementation(() => {
			throw new Error('boom')
		})

		for (let i = 0; i < 120; i++) recordAiCall(baseArgs)
		// Expected log indices: 1, 2, 3, 100. So 4 logs over 120 failures.
		expect(errorSpy).toHaveBeenCalledTimes(4)
		// Counter itself must still reflect EVERY failure.
		expect(__getAiCallLogFailureCounts().setup).toBe(120)
	})

	it('increments write counter when the insert promise rejects', async () => {
		mockInsert.mockReturnValue({
			values: () => ({ catch: (handler: (e: unknown) => void) => handler(new Error('rej')) }),
		})

		for (let i = 0; i < 5; i++) recordAiCall(baseArgs)
		expect(__getAiCallLogFailureCounts().write).toBe(5)
	})

	it('logs first 3 write failures then every 100th', async () => {
		mockInsert.mockReturnValue({
			values: () => ({ catch: (handler: (e: unknown) => void) => handler(new Error('rej')) }),
		})

		for (let i = 0; i < 205; i++) recordAiCall(baseArgs)
		// 1, 2, 3, 100, 200 → 5 logs
		expect(errorSpy).toHaveBeenCalledTimes(5)
		expect(__getAiCallLogFailureCounts().write).toBe(205)
	})

	it('does not count or log on successful writes', () => {
		mockInsert.mockReturnValue({
			values: () => ({ catch: () => undefined }),
		})
		for (let i = 0; i < 5; i++) recordAiCall(baseArgs)
		expect(__getAiCallLogFailureCounts()).toEqual({ setup: 0, write: 0 })
		expect(errorSpy).not.toHaveBeenCalled()
	})
})
