import { describe, expect, it } from 'vitest'
import { parsePromptAnatomy } from '../lib/parse-prompt-anatomy'

describe('parsePromptAnatomy', () => {
	it('returns score 0 and all 5 missing for empty string', () => {
		const result = parsePromptAnatomy('')
		expect(result.score).toBe(0)
		expect(result.missing).toEqual(['role', 'context', 'task', 'constraints', 'format'])
		expect(result.segments).toEqual([])
	})

	it('returns score 0 and all 5 missing for whitespace-only string', () => {
		const result = parsePromptAnatomy('   \n\t  ')
		expect(result.score).toBe(0)
		expect(result.missing).toEqual(['role', 'context', 'task', 'constraints', 'format'])
	})

	it('detects role and task in a simple prompt', () => {
		const result = parsePromptAnatomy('You are a chef. Create a meal plan.')
		expect(result.score).toBe(2)
		expect(result.segments.map((s) => s.type)).toContain('role')
		expect(result.segments.map((s) => s.type)).toContain('task')
		expect(result.missing).toContain('context')
		expect(result.missing).toContain('constraints')
		expect(result.missing).toContain('format')
	})

	it('detects all 5 segments in a full prompt', () => {
		const prompt = [
			'You are a data analyst.',
			'Given that we have sales data for Q1.',
			'Generate a summary report.',
			'Do not include personal information.',
			'Return as JSON.',
		].join(' ')

		const result = parsePromptAnatomy(prompt)
		expect(result.score).toBe(5)
		expect(result.missing).toEqual([])
		expect(result.segments).toHaveLength(5)
	})

	it('detects constraints without role', () => {
		const result = parsePromptAnatomy('Never use profanity. Build a chatbot that helps users.')
		expect(result.segments.map((s) => s.type)).toContain('constraints')
		expect(result.segments.map((s) => s.type)).toContain('task')
		expect(result.missing).toContain('role')
	})

	it('matches case-insensitively', () => {
		const result = parsePromptAnatomy('you ARE a helpful assistant')
		expect(result.segments.map((s) => s.type)).toContain('role')
	})

	it('only captures the first match per segment type', () => {
		const prompt = 'Create a plan. Generate a report. Build a dashboard.'
		const result = parsePromptAnatomy(prompt)
		const taskSegments = result.segments.filter((s) => s.type === 'task')
		expect(taskSegments).toHaveLength(1)
		expect(taskSegments[0].text).toMatch(/^Create/)
	})

	it('returns correct startIndex and endIndex', () => {
		const prompt = 'Hello world. You are a robot.'
		const result = parsePromptAnatomy(prompt)
		const role = result.segments.find((s) => s.type === 'role')
		expect(role).toBeDefined()
		if (role) {
			expect(prompt.slice(role.startIndex, role.endIndex)).toBe(role.text)
		}
	})

	it('detects context with "Based on" trigger', () => {
		const result = parsePromptAnatomy('Based on the user profile data, write a bio.')
		expect(result.segments.map((s) => s.type)).toContain('context')
		expect(result.segments.map((s) => s.type)).toContain('task')
	})

	it('detects format with "as a list" trigger', () => {
		const result = parsePromptAnatomy('Show me the top items as a list.')
		expect(result.segments.map((s) => s.type)).toContain('format')
	})
})
