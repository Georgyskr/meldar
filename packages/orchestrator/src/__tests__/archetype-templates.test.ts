import { describe, expect, it } from 'vitest'
import { renderArchetypeTemplate } from '../archetype-templates'
import {
	type BookingPageParams,
	escapeForJsxSource,
	renderBookingPageTemplate,
} from '../archetype-templates/booking-page'
import { buildPersonalizationPrompt } from '../archetype-templates/booking-page-prompt'
import { validateBuildFiles, validatePandaCss } from '../validate-files'

const VERTICALS: Array<{ label: string; params: BookingPageParams }> = [
	{
		label: 'Hair / Beauty',
		params: {
			businessName: 'Studio Lux',
			verticalLabel: 'Hair / Beauty',
			services: [
				{ name: 'Haircut', durationMinutes: 45, priceEur: 45 },
				{ name: 'Color', durationMinutes: 90, priceEur: 85 },
				{ name: 'Blowout', durationMinutes: 30, priceEur: 35 },
			],
			hours: { days: ['tue', 'wed', 'thu', 'fri', 'sat'], start: '10:00', end: '18:00' },
		},
	},
	{
		label: 'Tattoo / Piercing',
		params: {
			businessName: 'Irka Tattoo',
			verticalLabel: 'Tattoo / Piercing',
			services: [
				{ name: 'Small tattoo (under 5cm)', durationMinutes: 60, priceEur: 80 },
				{ name: 'Medium tattoo (5-15cm)', durationMinutes: 120, priceEur: 200 },
				{ name: 'Piercing', durationMinutes: 30, priceEur: 40 },
			],
			hours: { days: ['tue', 'wed', 'thu', 'fri', 'sat'], start: '11:00', end: '19:00' },
		},
	},
	{
		label: 'Consulting',
		params: {
			businessName: 'Acme Advisory',
			verticalLabel: 'Consulting',
			services: [
				{ name: 'Discovery call (15 min)', durationMinutes: 15, priceEur: 0 },
				{ name: 'Strategy session (60 min)', durationMinutes: 60, priceEur: 120 },
			],
			hours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '17:00' },
		},
	},
	{
		label: 'PT / Wellness',
		params: {
			businessName: 'FitSpace',
			verticalLabel: 'PT / Wellness',
			services: [
				{ name: 'Personal training (60 min)', durationMinutes: 60, priceEur: 65 },
				{ name: 'Massage therapy', durationMinutes: 60, priceEur: 70 },
			],
			hours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '08:00', end: '20:00' },
		},
	},
]

describe('archetype-templates: booking-page', () => {
	for (const vertical of VERTICALS) {
		describe(`vertical: ${vertical.label}`, () => {
			const files = renderBookingPageTemplate(vertical.params)

			it('produces at least page.tsx', () => {
				const paths = files.map((f) => f.path)
				expect(paths).toContain('src/app/page.tsx')
			})

			it('passes validateBuildFiles', () => {
				const existingPaths = new Set<string>()
				const result = validateBuildFiles(files, existingPaths)
				if (!result.ok) {
					const detail = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n')
					expect.fail(`validateBuildFiles failed:\n${detail}`)
				}
			})

			it('passes validatePandaCss', () => {
				const result = validatePandaCss(files)
				if (!result.ok) {
					const detail = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n')
					expect.fail(`validatePandaCss failed:\n${detail}`)
				}
			})

			it('contains the business name in page output', () => {
				const page = files.find((f) => f.path === 'src/app/page.tsx')
				expect(page?.content).toContain(vertical.params.businessName)
			})

			it('contains service names in page output', () => {
				const page = files.find((f) => f.path === 'src/app/page.tsx')
				for (const service of vertical.params.services) {
					expect(page?.content).toContain(service.name)
				}
			})

			it('has a default export', () => {
				const page = files.find((f) => f.path === 'src/app/page.tsx')
				expect(page?.content).toMatch(/export\s+default\s+function/)
			})
		})
	}
})

describe('escapeForJsxSource', () => {
	it('escapes template literal breakout characters', () => {
		const escaped = escapeForJsxSource('`; process.exit(1); `')
		expect(escaped).toContain('\\`')
		expect(escaped).not.toMatch(/(?<!\\)`/)
		expect(escapeForJsxSource('${process.env.SECRET}')).toContain('\\$')
	})

	it('escapes JSX structural characters', () => {
		expect(escapeForJsxSource('<script>alert(1)</script>')).not.toContain('<')
		expect(escapeForJsxSource('{require("fs")}')).not.toContain('{')
	})

	it('escapes attribute breakout quotes', () => {
		expect(escapeForJsxSource('" onError={alert(1)} x="')).not.toContain('"')
	})

	it('preserves safe characters', () => {
		const safe = "O'Brien & Sons"
		const escaped = escapeForJsxSource(safe)
		expect(escaped).toContain("O'Brien")
		expect(escaped).toContain('Sons')
	})
})

describe('adversarial business names pass validation', () => {
	const adversarialNames = ["O'Brien's Salon", 'Joe & Jane', 'Café Résumé', 'Тату-студия']

	for (const name of adversarialNames) {
		it(`"${name}" produces valid template output`, () => {
			const files = renderBookingPageTemplate({
				businessName: name,
				verticalLabel: 'Consulting',
				services: [{ name: 'Session', durationMinutes: 60, priceEur: 50 }],
				hours: { days: ['mon'], start: '09:00', end: '17:00' },
			})
			expect(validateBuildFiles(files, new Set()).ok).toBe(true)
			expect(validatePandaCss(files).ok).toBe(true)
		})
	}
})

describe('renderArchetypeTemplate dispatch', () => {
	it('dispatches booking-page to renderBookingPageTemplate', () => {
		const files = renderArchetypeTemplate('booking-page', {
			businessName: 'Test',
			verticalLabel: 'Other',
			services: [{ name: 'Appt', durationMinutes: 30, priceEur: 30 }],
			hours: { days: ['mon'], start: '09:00', end: '17:00' },
		})
		expect(files.some((f) => f.path === 'src/app/page.tsx')).toBe(true)
	})

	it('throws on unknown archetype', () => {
		expect(() =>
			renderArchetypeTemplate('nonexistent' as 'booking-page', {} as BookingPageParams),
		).toThrow('Unknown archetype')
	})
})

describe('buildPersonalizationPrompt', () => {
	it('produces a prompt with business context', () => {
		const prompt = buildPersonalizationPrompt(VERTICALS[0].params)
		expect(prompt).toContain('Studio Lux')
		expect(prompt).toContain('Hair / Beauty')
		expect(prompt).toContain('Haircut')
	})

	it('includes user description when provided', () => {
		const prompt = buildPersonalizationPrompt(VERTICALS[1].params, 'I do Japanese-style tattoos')
		expect(prompt).toContain('Japanese-style tattoos')
	})

	it('omits user description section when not provided', () => {
		const prompt = buildPersonalizationPrompt(VERTICALS[0].params)
		expect(prompt).not.toContain('described their business')
	})
})
