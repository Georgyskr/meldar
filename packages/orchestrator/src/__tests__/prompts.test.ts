import { describe, expect, it } from 'vitest'
import { BUILD_SYSTEM_PROMPT } from '../prompts'

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
