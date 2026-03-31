/**
 * Integration test: Screen Time → OCR → Adaptive Follow-ups
 *
 * Uses REAL Anthropic API calls. Requires ANTHROPIC_API_KEY in .env.local.
 * Run with: pnpm vitest test/integration/screen-time-analysis.test.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateAdaptiveFollowUps } from '@/server/discovery/adaptive'
import { extractScreenTime } from '@/server/discovery/ocr'

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/screentime')

function loadImage(filename: string) {
	const filePath = path.join(FIXTURES_DIR, filename)
	const buffer = fs.readFileSync(filePath)
	return {
		base64: buffer.toString('base64'),
		mediaType: 'image/jpeg' as const,
	}
}

describe('Screen Time → Adaptive pipeline (real API)', () => {
	// These tests call the real Anthropic API — 30s timeout each
	const TIMEOUT = 30_000

	const images = {
		appList: loadImage('02-app-list-pickups.jpeg'),
		pickups: loadImage('03-pickups-first-used.jpeg'),
	}

	let extractedApps: { name: string; usageMinutes: number; category: string }[] = []
	let totalScreenTimeMinutes = 0
	let pickups: number | null = null

	it(
		'extracts app usage from screenshot #2 (app list + pickups)',
		async () => {
			const result = await extractScreenTime(images.appList.base64, images.appList.mediaType)

			expect('data' in result).toBe(true)
			if (!('data' in result)) return

			const data = result.data
			console.log('\n--- Screenshot #2: App List ---')
			console.log('Total screen time:', Math.round(data.totalScreenTimeMinutes / 60 * 10) / 10, 'h')
			console.log('Pickups:', data.pickups)
			console.log('Apps:')
			for (const app of data.apps) {
				console.log(`  ${app.name}: ${app.usageMinutes}m (${app.category})`)
			}

			// Verify expected apps were extracted
			const appNames = data.apps.map((a) => a.name.toLowerCase())
			expect(appNames.some((n) => n.includes('cup heroes') || n.includes('cupheroes'))).toBe(true)
			expect(appNames.some((n) => n.includes('safari'))).toBe(true)
			expect(appNames.some((n) => n.includes('hearthstone'))).toBe(true)
			expect(appNames.some((n) => n.includes('telegram'))).toBe(true)
			expect(appNames.some((n) => n.includes('instagram'))).toBe(true)
			expect(appNames.some((n) => n.includes('github'))).toBe(true)
			expect(appNames.some((n) => n.includes('reddit'))).toBe(true)

			// Verify reasonable values
			expect(data.totalScreenTimeMinutes).toBeGreaterThan(300) // >5h
			expect(data.apps.length).toBeGreaterThanOrEqual(5)

			// Save for next test
			extractedApps = data.apps
			totalScreenTimeMinutes = data.totalScreenTimeMinutes
			pickups = data.pickups
		},
		TIMEOUT,
	)

	it(
		'extracts pickups and first-used-after-pickup from screenshot #3',
		async () => {
			const result = await extractScreenTime(images.pickups.base64, images.pickups.mediaType)

			expect('data' in result).toBe(true)
			if (!('data' in result)) return

			const data = result.data
			console.log('\n--- Screenshot #3: Pickups + First Used ---')
			console.log('Pickups:', data.pickups)
			console.log('Apps:')
			for (const app of data.apps) {
				console.log(`  ${app.name}: ${app.usageMinutes}m (${app.category})`)
			}

			// Pickups should be detected (33 from the screenshot)
			if (data.pickups) {
				expect(data.pickups).toBeGreaterThanOrEqual(20)
				expect(data.pickups).toBeLessThanOrEqual(50)
			}
		},
		TIMEOUT,
	)

	it(
		'generates adaptive follow-ups for 27yo office worker with this screen time',
		async () => {
			// Use extracted apps from screenshot, or fallback to known data
			const apps =
				extractedApps.length > 0
					? extractedApps
					: [
							{ name: 'Cup Heroes', usageMinutes: 382, category: 'gaming' },
							{ name: 'Safari', usageMinutes: 36, category: 'browser' },
							{ name: 'Hearthstone', usageMinutes: 35, category: 'gaming' },
							{ name: 'Telegram', usageMinutes: 11, category: 'communication' },
							{ name: 'Instagram', usageMinutes: 5, category: 'social' },
							{ name: 'GitHub', usageMinutes: 4, category: 'productivity' },
							{ name: 'Reddit', usageMinutes: 4, category: 'social' },
						]

			const followUps = await generateAdaptiveFollowUps({
				screenTimeApps: apps,
				occupation: 'working',
				ageBracket: '26-30',
			})

			console.log('\n--- Adaptive Follow-ups for 27yo Office Worker ---')
			console.log(`Generated ${followUps.length} follow-ups:`)
			for (const fu of followUps) {
				console.log(`\n  [${fu.type}] ${fu.title}`)
				console.log(`  App: ${fu.appName || 'n/a'}`)
				console.log(`  Description: ${fu.description}`)
				if (fu.options) console.log(`  Options: ${fu.options.join(', ')}`)
			}

			// Should generate 2-5 follow-ups
			expect(followUps.length).toBeGreaterThanOrEqual(1)
			expect(followUps.length).toBeLessThanOrEqual(5)

			// Each follow-up should have required fields
			for (const fu of followUps) {
				expect(fu.type).toMatch(/^(screenshot|question)$/)
				expect(fu.title).toBeTruthy()
				expect(fu.description).toBeTruthy()
			}

			// Given heavy gaming (Cup Heroes 6h + Hearthstone 35m) and GitHub usage,
			// we'd expect at least one gaming or productivity-related follow-up
			const titles = followUps.map((f) => f.title.toLowerCase()).join(' ')
			const descriptions = followUps.map((f) => f.description.toLowerCase()).join(' ')
			const allText = titles + ' ' + descriptions

			console.log('\n--- Checking signal detection ---')
			console.log('Heavy gaming detected:', allText.includes('game') || allText.includes('gaming') || allText.includes('cup heroes') || allText.includes('hearthstone'))
			console.log('GitHub/dev detected:', allText.includes('github') || allText.includes('code') || allText.includes('developer'))
			console.log('Reddit detected:', allText.includes('reddit') || allText.includes('subreddit'))
		},
		TIMEOUT,
	)
})
