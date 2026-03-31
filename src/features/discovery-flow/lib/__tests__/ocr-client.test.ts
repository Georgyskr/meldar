// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockCreateWorker, mockRecognize, mockTerminate } = vi.hoisted(() => ({
	mockCreateWorker: vi.fn(),
	mockRecognize: vi.fn(),
	mockTerminate: vi.fn(),
}))

vi.mock('tesseract.js', () => ({
	createWorker: mockCreateWorker,
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFakeWorker(overrides?: {
	recognize?: typeof mockRecognize
	terminate?: typeof mockTerminate
}) {
	return {
		recognize: overrides?.recognize ?? mockRecognize,
		terminate: overrides?.terminate ?? mockTerminate,
	}
}

function makeFile(name = 'screen.png'): File {
	return new File(['fake-image-data'], name, { type: 'image/png' })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ocr-client', () => {
	let preloadOcr: typeof import('../ocr-client').preloadOcr
	let extractText: typeof import('../ocr-client').extractText
	let terminateOcr: typeof import('../ocr-client').terminateOcr
	let waitForOcr: typeof import('../ocr-client').waitForOcr

	beforeEach(async () => {
		vi.resetModules()
		vi.clearAllMocks()

		const fakeWorker = makeFakeWorker()
		mockCreateWorker.mockResolvedValue(fakeWorker)
		mockRecognize.mockResolvedValue({
			data: { text: 'Some recognized text that is long enough to pass validation' },
		})
		mockTerminate.mockResolvedValue(undefined)

		const mod = await import('../ocr-client')
		preloadOcr = mod.preloadOcr
		extractText = mod.extractText
		terminateOcr = mod.terminateOcr
		waitForOcr = mod.waitForOcr
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	// ── preloadOcr ──────────────────────────────────────────────────────────

	describe('preloadOcr', () => {
		it('starts worker load on first call when all state is clear', async () => {
			preloadOcr()
			// createWorker is called after dynamic import('tesseract.js') resolves
			await vi.waitFor(() => {
				expect(mockCreateWorker).toHaveBeenCalledOnce()
			})
			expect(mockCreateWorker).toHaveBeenCalledWith('eng+rus')
		})

		it('does nothing if worker is already loaded', async () => {
			preloadOcr()
			await waitForOcr()
			mockCreateWorker.mockClear()

			preloadOcr()
			expect(mockCreateWorker).not.toHaveBeenCalled()
		})

		it('does nothing if loadingPromise is already in progress', async () => {
			// Make createWorker never resolve so loadingPromise stays pending
			mockCreateWorker.mockReturnValue(new Promise(() => {}))

			preloadOcr()
			await vi.waitFor(() => {
				expect(mockCreateWorker).toHaveBeenCalledOnce()
			})

			preloadOcr()
			expect(mockCreateWorker).toHaveBeenCalledOnce()
		})

		it('does nothing if loadFailed is true from a previous attempt', async () => {
			mockCreateWorker.mockRejectedValue(new Error('WASM load failed'))

			preloadOcr()
			// Wait for the rejection to propagate
			await vi.waitFor(() => {
				expect(mockCreateWorker).toHaveBeenCalledOnce()
			})
			// Let the catch handler run
			await new Promise((r) => setTimeout(r, 0))

			mockCreateWorker.mockClear()
			preloadOcr()
			expect(mockCreateWorker).not.toHaveBeenCalled()
		})
	})

	// ── extractText ─────────────────────────────────────────────────────────

	describe('extractText', () => {
		it('returns extracted text when worker is loaded and text is >= 20 chars', async () => {
			const longText = 'Screen Time Report - Instagram 2h 30m, TikTok 1h 15m'
			mockRecognize.mockResolvedValue({ data: { text: longText } })
			preloadOcr()
			await waitForOcr()

			const result = await extractText(makeFile())
			expect(result).toBe(longText)
		})

		it('returns null when worker is null (not loaded)', async () => {
			mockCreateWorker.mockRejectedValue(new Error('WASM unavailable'))
			preloadOcr()
			await new Promise((r) => setTimeout(r, 0))

			const result = await extractText(makeFile())
			expect(result).toBeNull()
		})

		it('returns null when recognized text is shorter than 20 chars', async () => {
			mockRecognize.mockResolvedValue({ data: { text: 'too short' } })
			preloadOcr()
			await waitForOcr()

			const result = await extractText(makeFile())
			expect(result).toBeNull()
		})

		it('returns null and does not throw when worker.recognize() throws', async () => {
			mockRecognize.mockRejectedValue(new Error('Recognition failed'))
			preloadOcr()
			await waitForOcr()

			const result = await extractText(makeFile())
			expect(result).toBeNull()
		})

		it('awaits loadingPromise if worker is still loading (in-progress path)', async () => {
			let resolveWorker: ((w: ReturnType<typeof makeFakeWorker>) => void) | undefined
			mockCreateWorker.mockReturnValue(
				new Promise((resolve) => {
					resolveWorker = resolve
				}),
			)

			preloadOcr()

			const extractPromise = extractText(makeFile())

			// Resolve the worker now
			resolveWorker?.(makeFakeWorker())
			await new Promise((r) => setTimeout(r, 0))

			const result = await extractPromise
			expect(result).toBe('Some recognized text that is long enough to pass validation')
		})

		it('cold-start: initiates worker via getWorker() self-starting path when extractText called with no prior preloadOcr', async () => {
			// Don't call preloadOcr — extractText should self-start
			const result = await extractText(makeFile())

			expect(mockCreateWorker).toHaveBeenCalledOnce()
			expect(result).toBe('Some recognized text that is long enough to pass validation')
		})

		it('cold-start: returns null (not a hang) if initWorker() throws during getWorker() self-start', async () => {
			mockCreateWorker.mockRejectedValue(new Error('WASM unavailable'))

			// Don't call preloadOcr — getWorker will attempt initWorker directly
			const result = await extractText(makeFile())
			expect(result).toBeNull()
		})
	})

	// ── terminateOcr ────────────────────────────────────────────────────────

	describe('terminateOcr', () => {
		it('calls worker.terminate() and sets worker to null', async () => {
			preloadOcr()
			await waitForOcr()

			await terminateOcr()
			expect(mockTerminate).toHaveBeenCalledOnce()

			// After terminate, extractText should re-init (worker is null, loadFailed is false)
			mockCreateWorker.mockClear()
			await extractText(makeFile())
			expect(mockCreateWorker).toHaveBeenCalledOnce()
		})

		it('sets loadingPromise to null', async () => {
			// Start loading but don't wait
			mockCreateWorker.mockReturnValue(new Promise(() => {}))
			preloadOcr()

			await terminateOcr()

			// After terminate, waitForOcr should return false (no worker, no loadingPromise)
			const ready = await waitForOcr()
			expect(ready).toBe(false)
		})

		it('does nothing if no worker is loaded (idempotent call)', async () => {
			await terminateOcr()
			expect(mockTerminate).not.toHaveBeenCalled()
		})

		it('does NOT reset loadFailed — fail-once semantics: preloadOcr fails, terminateOcr called, preloadOcr called again, still returns early', async () => {
			mockCreateWorker.mockRejectedValue(new Error('WASM load failed'))
			preloadOcr()
			await new Promise((r) => setTimeout(r, 0))

			await terminateOcr()

			mockCreateWorker.mockClear()
			preloadOcr()
			expect(mockCreateWorker).not.toHaveBeenCalled()
		})
	})

	// ── waitForOcr ──────────────────────────────────────────────────────────

	describe('waitForOcr', () => {
		it('returns true immediately if worker is already loaded', async () => {
			preloadOcr()
			await waitForOcr()

			const result = await waitForOcr()
			expect(result).toBe(true)
		})

		it('returns false immediately if loadFailed is true', async () => {
			mockCreateWorker.mockRejectedValue(new Error('WASM load failed'))
			preloadOcr()
			await new Promise((r) => setTimeout(r, 0))

			const result = await waitForOcr()
			expect(result).toBe(false)
		})

		it('awaits loadingPromise and returns true when it resolves with a worker', async () => {
			let resolveWorker: ((w: ReturnType<typeof makeFakeWorker>) => void) | undefined
			mockCreateWorker.mockReturnValue(
				new Promise((resolve) => {
					resolveWorker = resolve
				}),
			)

			preloadOcr()

			const waitPromise = waitForOcr()

			resolveWorker?.(makeFakeWorker())

			const result = await waitPromise
			expect(result).toBe(true)
		})

		it('returns false when preloadOcr already failed and cleared loadingPromise before waitForOcr is called', async () => {
			mockCreateWorker.mockRejectedValue(new Error('WASM load failed'))
			preloadOcr()

			// Wait for the rejection + catch handler to fully propagate
			await new Promise((r) => setTimeout(r, 0))

			// loadingPromise is now null (cleared by catch), loadFailed is true
			const result = await waitForOcr()
			expect(result).toBe(false)
		})
	})
})
