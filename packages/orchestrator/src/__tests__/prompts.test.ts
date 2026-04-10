import { describe, expect, it } from 'vitest'
import type { ResolvedWishes } from '../prompts'
import { BUILD_SYSTEM_PROMPT, buildUserPromptBlock } from '../prompts'

describe('BUILD_SYSTEM_PROMPT', () => {
	describe('import allowlist section', () => {
		it('lists react as an available import', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain("'react'")
		})

		it('lists styled-system/jsx primitives', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain('styled-system/jsx')
			expect(BUILD_SYSTEM_PROMPT).toContain('Box')
			expect(BUILD_SYSTEM_PROMPT).toContain('Flex')
			expect(BUILD_SYSTEM_PROMPT).toContain('VStack')
		})

		it('lists styled-system/css utilities', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain('styled-system/css')
		})

		it('lists next.js imports', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain('next/link')
			expect(BUILD_SYSTEM_PROMPT).toContain('next/image')
			expect(BUILD_SYSTEM_PROMPT).toContain('next/navigation')
		})

		it('explicitly bans common hallucinated packages', () => {
			expect(BUILD_SYSTEM_PROMPT).toMatch(/no other packages/i)
			expect(BUILD_SYSTEM_PROMPT).toContain('framer-motion')
			expect(BUILD_SYSTEM_PROMPT).toContain('tailwindcss')
		})
	})

	describe('Panda CSS token reference', () => {
		it('includes color tokens', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain('sand.1')
			expect(BUILD_SYSTEM_PROMPT).toContain('bg.canvas')
			expect(BUILD_SYSTEM_PROMPT).toContain('fg.default')
		})

		it('includes radius tokens', () => {
			expect(BUILD_SYSTEM_PROMPT).toMatch(/radii|border.*radius/i)
		})

		it('includes font size tokens', () => {
			expect(BUILD_SYSTEM_PROMPT).toMatch(/font.*size/i)
		})
	})

	describe('canonical examples', () => {
		it('includes a server component example', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain('Server Component')
			expect(BUILD_SYSTEM_PROMPT).toContain('export default function')
		})

		it('includes a client component example with use client', () => {
			expect(BUILD_SYSTEM_PROMPT).toContain("'use client'")
			expect(BUILD_SYSTEM_PROMPT).toContain('useState')
		})
	})
})

describe('buildUserPromptBlock', () => {
	it('returns the same format without wishes', () => {
		const result = buildUserPromptBlock('Build a todo app')
		expect(result).toBe('# User request\n\nBuild a todo app')
	})

	it('includes all wish fields when wishes are provided', () => {
		const wishes: ResolvedWishes = {
			appType: 'Task tracker',
			style: 'Minimalist',
			palette: 'Ocean blue',
			sections: ['Dashboard', 'Tasks', 'Settings'],
			tone: 'Professional',
		}
		const result = buildUserPromptBlock('Build a todo app', wishes)
		expect(result).toContain('App: Task tracker')
		expect(result).toContain('Style: Minimalist')
		expect(result).toContain('Palette: Ocean blue')
		expect(result).toContain('Sections: Dashboard, Tasks, Settings')
		expect(result).toContain('Tone: Professional')
	})

	it('puts wish block before user request', () => {
		const wishes: ResolvedWishes = {
			appType: 'Task tracker',
			style: 'Minimalist',
			palette: 'Ocean blue',
			sections: ['Dashboard', 'Tasks'],
			tone: 'Professional',
		}
		const result = buildUserPromptBlock('Build a todo app', wishes)
		const wishIndex = result.indexOf('# Project creative direction')
		const requestIndex = result.indexOf('# User request')
		expect(wishIndex).toBeGreaterThanOrEqual(0)
		expect(requestIndex).toBeGreaterThan(wishIndex)
	})
})
