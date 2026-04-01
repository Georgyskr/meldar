import { describe, expect, it } from 'vitest'

/**
 * Tests for OCR text preprocessing — transforms raw Tesseract output
 * into clean, structured text optimized for Haiku parsing.
 *
 * The preprocessor should:
 * 1. Strip garbled characters and artifacts from OCR
 * 2. Collapse excessive whitespace
 * 3. Extract structured data via regex where possible (total time, pickups)
 * 4. Group app entries (name + time) onto single logical lines
 * 5. Output a clean, readable summary that Haiku can parse with minimal tokens
 */

import { preprocessOcrText } from '../preprocess-ocr'

describe('preprocessOcrText', () => {
	describe('basic cleanup', () => {
		it('strips non-printable characters except newlines and tabs', () => {
			const dirty = 'Instagram\x00\x01\x02 5m\x03'
			const result = preprocessOcrText(dirty, 'screentime')
			expect(result.cleanedText).not.toContain('\x00')
			expect(result.cleanedText).not.toContain('\x01')
			expect(result.cleanedText).toContain('Instagram')
		})

		it('collapses multiple blank lines into single newlines', () => {
			const spaced = 'Cup Heroes\n\n\n\n6h 22m\n\n\nSafari\n\n36m'
			const result = preprocessOcrText(spaced, 'screentime')
			expect(result.cleanedText).not.toContain('\n\n\n')
		})

		it('trims leading and trailing whitespace per line', () => {
			const padded = '   Instagram   \n   5m   '
			const result = preprocessOcrText(padded, 'screentime')
			const lines = result.cleanedText.split('\n').filter(Boolean)
			for (const line of lines) {
				expect(line).toBe(line.trim())
			}
		})

		it('returns empty cleanedText for blank input', () => {
			const result = preprocessOcrText('', 'screentime')
			expect(result.cleanedText).toBe('')
			expect(result.extracted).toEqual({})
		})

		it('handles null-like whitespace-only input', () => {
			const result = preprocessOcrText('   \n\n\t  ', 'screentime')
			expect(result.cleanedText).toBe('')
		})
	})

	describe('screen time regex extraction', () => {
		it('extracts total screen time in hours and minutes format', () => {
			const text = 'Total Screen Time 9h 50m\nMost Used'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.totalScreenTimeMinutes).toBe(590) // 9*60 + 50
		})

		it('extracts total screen time with only hours', () => {
			const text = 'Total Screen Time 7h\nUpdated today'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.totalScreenTimeMinutes).toBe(420)
		})

		it('extracts total screen time with only minutes', () => {
			const text = 'Total Screen Time 45m\nMost Used'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.totalScreenTimeMinutes).toBe(45)
		})

		it('extracts daily average format', () => {
			const text = 'Daily Average\n9h 50m\nsome other text'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.totalScreenTimeMinutes).toBe(590)
		})

		it('extracts pickups count', () => {
			const text = 'Pickups\nDaily Average\n33\nsome chart'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.pickups).toBe(33)
		})

		it('extracts notification count', () => {
			const text = 'Notifications\nDaily Average\n232\n42 % from last week'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.notifications).toBe(232)
		})

		it('extracts app entries with hours and minutes', () => {
			const text = 'Cup Heroes\n6h 22m\nSafari\n36m\nHearthstone\n35m'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.apps).toBeDefined()
			expect(result.extracted.apps?.length).toBeGreaterThanOrEqual(2)

			const cupHeroes = result.extracted.apps?.find((a) => a.name.includes('Cup Heroes'))
			expect(cupHeroes?.minutes).toBe(382)
			expect(cupHeroes?.category).toBe('gaming')

			const safari = result.extracted.apps?.find((a) => a.name.includes('Safari'))
			expect(safari?.minutes).toBe(36)
			expect(safari?.category).toBe('browser')
		})

		it('extracts app entries with pickup counts (first used after pickup)', () => {
			const text = 'First Used After Pickup\nCup Heroes\n7\nInstagram\n7\nTelegram\n6'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.firstUsedAfterPickup).toBeDefined()
			expect(result.extracted.firstUsedAfterPickup?.length).toBeGreaterThanOrEqual(2)
		})

		it('handles Cyrillic app names', () => {
			const text = 'Время экрана\nОбщее время 5ч 30мин\nInstagram\n2h 15m'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.cleanedText).toContain('Instagram')
			// Should not break on Cyrillic characters
			expect(result.cleanedText).toContain('Время экрана')
		})

		it('handles messy Tesseract output from real screenshot', () => {
			// Simulating actual Tesseract output from the test fixture
			const messyText = `23.59 al 5G 68

< Iphone-Go

Games Social Productivity & Finance
6h 58m 18m 10m

Total Screen Time 9h 50m

Updated today at 23.57

Most Used Show Categories

Cup Heroes
6h 22m >

Safari
36m >

Hearthstone
35m >

Telegram
11m >

Instagram
5m >

GitHub
4m >

Reddit
4m >`
			const result = preprocessOcrText(messyText, 'screentime')

			// Should extract total time
			expect(result.extracted.totalScreenTimeMinutes).toBe(590)

			// Should extract apps
			expect(result.extracted.apps?.length).toBeGreaterThanOrEqual(5)

			// The cleaned text should include the structured summary
			expect(result.cleanedText).toContain('--- EXTRACTED DATA ---')
			expect(result.cleanedText).toContain('Apps:')
		})
	})

	describe('output format for AI consumption', () => {
		it('includes a structured summary section when regex extracted data', () => {
			const text = 'Total Screen Time 9h 50m\nCup Heroes\n6h 22m\nSafari\n36m'
			const result = preprocessOcrText(text, 'screentime')

			// The cleaned text should start with or contain a structured summary
			expect(result.cleanedText).toContain('Total:')
			expect(result.cleanedText).toContain('590')
		})

		it('includes app list in clean format when apps were extracted', () => {
			const text = 'Cup Heroes\n6h 22m\nSafari\n36m\nTelegram\n11m'
			const result = preprocessOcrText(text, 'screentime')

			// Apps should be on single lines in clean format
			expect(result.cleanedText).toMatch(/Cup Heroes.*382|Cup Heroes.*6h\s*22m/)
		})

		it('preserves original text as fallback when no regex matches', () => {
			const text = 'Some random text that has no phone data patterns at all but is long enough'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.cleanedText).toContain('Some random text')
			expect(result.extracted.totalScreenTimeMinutes).toBeUndefined()
			expect(result.extracted.apps).toBeUndefined()
		})
	})

	describe('platform detection', () => {
		it('detects iOS from Screen Time keywords', () => {
			const text = 'Screen Time\nTotal Screen Time 5h\nMost Used\nSafari\n2h'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.platform).toBe('ios')
		})

		it('detects Android from Digital Wellbeing keywords', () => {
			const text = 'Digital Wellbeing\nDashboard\nChrome\n3h'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.platform).toBe('android')
		})

		it('returns unknown when no platform indicators found', () => {
			const text = 'Some App\n2h\nAnother App\n1h'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.platform).toBe('unknown')
		})
	})

	describe('app categorization', () => {
		it('categorizes social apps correctly', () => {
			const text = 'Instagram\n2h\nTikTok\n1h\nReddit\n30m'
			const result = preprocessOcrText(text, 'screentime')
			const instagram = result.extracted.apps?.find((a) => a.name === 'Instagram')
			const tiktok = result.extracted.apps?.find((a) => a.name === 'TikTok')
			const reddit = result.extracted.apps?.find((a) => a.name === 'Reddit')
			expect(instagram?.category).toBe('social')
			expect(tiktok?.category).toBe('social')
			expect(reddit?.category).toBe('social')
		})

		it('categorizes communication apps correctly', () => {
			const text = 'Telegram\n30m\nWhatsApp\n20m'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.apps?.find((a) => a.name === 'Telegram')?.category).toBe(
				'communication',
			)
			expect(result.extracted.apps?.find((a) => a.name === 'WhatsApp')?.category).toBe(
				'communication',
			)
		})

		it('falls back to utility for unknown apps', () => {
			const text = 'SomeRandomApp\n1h\nAnotherApp\n30m'
			const result = preprocessOcrText(text, 'screentime')
			expect(result.extracted.apps?.every((a) => a.category === 'utility')).toBe(true)
		})
	})

	describe('non-screentime source types', () => {
		it('cleans text for subscriptions without screen time regex', () => {
			const text = 'Spotify Premium\n$9.99/month\nNetflix\n$15.99/month'
			const result = preprocessOcrText(text, 'subscriptions')
			expect(result.cleanedText).toContain('Spotify Premium')
			expect(result.cleanedText).toContain('Netflix')
			// Should not attempt screen time extraction
			expect(result.extracted.totalScreenTimeMinutes).toBeUndefined()
		})

		it('cleans text for battery source', () => {
			const text = 'Instagram   45%\nSafari    22%\nMail      8%'
			const result = preprocessOcrText(text, 'battery')
			expect(result.cleanedText).toContain('Instagram')
			expect(result.extracted.totalScreenTimeMinutes).toBeUndefined()
		})
	})
})
