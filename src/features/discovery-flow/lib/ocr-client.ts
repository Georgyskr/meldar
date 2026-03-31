/**
 * Client-side OCR using Tesseract.js v7 (WebAssembly).
 *
 * Lazy-loaded: call `preloadOcr()` during quiz phase so WASM is cached
 * by the time user reaches uploads. Falls back to raw image upload if OCR fails.
 */

import type { Worker } from 'tesseract.js'

let worker: Worker | null = null
let loadingPromise: Promise<Worker> | null = null
let loadFailed = false

/** Start downloading Tesseract WASM in the background. Safe to call multiple times. */
export function preloadOcr(): void {
	if (worker || loadingPromise || loadFailed) return
	loadingPromise = initWorker().catch((err) => {
		console.warn('[ocr] Preload failed, will use Vision fallback:', err)
		loadFailed = true
		loadingPromise = null
		return null as unknown as Worker
	})
}

/**
 * Extract text from an image file. Awaits worker if still loading.
 * Returns null if OCR is unavailable (triggers Vision fallback).
 */
export async function extractText(file: File): Promise<string | null> {
	try {
		const w = await getWorker()
		if (!w) return null

		const { data } = await w.recognize(file)
		const text = data.text.trim()

		// Empty or too short = OCR couldn't read the image (dark mode, low contrast, etc.)
		if (text.length < 20) return null

		return text
	} catch (err) {
		console.warn('[ocr] Extraction failed, falling back to Vision:', err)
		return null
	}
}

/** Terminate the worker and free WASM memory. Call when uploads are done. */
export async function terminateOcr(): Promise<void> {
	if (worker) {
		await worker.terminate()
		worker = null
	}
	loadingPromise = null
}

/**
 * Wait for OCR to be ready. Returns true if worker loaded, false if it failed.
 * Use this instead of isOcrReady() to avoid the preload race condition.
 */
export async function waitForOcr(): Promise<boolean> {
	if (worker) return true
	if (loadFailed) return false
	if (loadingPromise) {
		await loadingPromise
		return worker !== null
	}
	return false
}

async function initWorker(): Promise<Worker> {
	const { createWorker } = await import('tesseract.js')
	// eng + rus for multi-locale support (user's phone may be in Russian/Cyrillic)
	const w = await createWorker('eng+rus')
	worker = w
	loadingPromise = null
	return w
}

async function getWorker(): Promise<Worker | null> {
	if (worker) return worker
	if (loadFailed) return null
	if (loadingPromise) return loadingPromise
	loadingPromise = initWorker()
	return loadingPromise
}
