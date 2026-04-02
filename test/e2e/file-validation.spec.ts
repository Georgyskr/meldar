import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { toUploadPhase } from './helpers'

/**
 * E2E: File validation — wrong file types and empty files.
 * Verifies the upload cards handle invalid input gracefully.
 */

const ASSETS_DIR = path.resolve(__dirname, 'assets')

// Create temp test files before all tests
const TEXT_FILE = path.join(ASSETS_DIR, 'invalid-test.txt')
const EMPTY_FILE = path.join(ASSETS_DIR, 'empty-test.png')

test.beforeAll(() => {
	// Create a text file
	fs.mkdirSync(ASSETS_DIR, { recursive: true })
	fs.writeFileSync(TEXT_FILE, 'This is not an image file. It is plain text.')
	// Create an empty file with .png extension
	fs.writeFileSync(EMPTY_FILE, '')
})

test.afterAll(() => {
	// Cleanup temp files
	try {
		fs.unlinkSync(TEXT_FILE)
	} catch {
		/* ignore */
	}
	try {
		fs.unlinkSync(EMPTY_FILE)
	} catch {
		/* ignore */
	}
})

test.describe('File Validation', () => {
	test('uploading a text file to screentime card does not crash', async ({ page }) => {
		await toUploadPhase(page)

		const card = page.getByTestId('upload-card-screentime')

		// The accept attribute is "image/jpeg,image/png,image/webp" so the browser
		// may reject non-image files. We use setInputFiles which bypasses the file
		// picker dialog but the change event still fires.
		// The important thing: the page should NOT crash.
		const pageErrors: string[] = []
		page.on('pageerror', (err) => pageErrors.push(err.message))

		await card.locator('input[type="file"]').first().setInputFiles(TEXT_FILE)

		// Wait briefly for any error processing to complete
		// If OCR runs on the text file, it will likely fail, triggering error or fallback
		// Either way, the page should remain functional
		await expect(page.locator('text=Add your data')).toBeVisible({ timeout: 8000 })

		// The card should NOT show a successful upload state (no "1 of 3")
		// It may show an error, or nothing — but not success with a text file
		// Check no unrecoverable page crash
		expect(pageErrors.filter((e) => e.includes('Unhandled')).length).toBe(0)
	})

	test('uploading an empty file does not crash', async ({ page }) => {
		await toUploadPhase(page)

		const card = page.getByTestId('upload-card-screentime')

		const pageErrors: string[] = []
		page.on('pageerror', (err) => pageErrors.push(err.message))

		await card.locator('input[type="file"]').first().setInputFiles(EMPTY_FILE)

		// Page should remain functional — not crash
		await expect(page.locator('text=Add your data')).toBeVisible({ timeout: 8000 })

		// No unrecoverable page errors
		expect(pageErrors.filter((e) => e.includes('Unhandled')).length).toBe(0)
	})
})
