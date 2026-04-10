import { describe, expect, it } from 'vitest'
import {
	askQuestionRequestSchema,
	generatePlanRequestSchema,
	getTokenCostRange,
	planOutputSchema,
} from '../lib/schemas'

describe('generatePlanRequestSchema', () => {
	it('accepts a valid messages array', () => {
		const result = generatePlanRequestSchema.safeParse({
			messages: [
				{ role: 'user', content: 'I want an app' },
				{ role: 'assistant', content: 'What kind?' },
			],
		})
		expect(result.success).toBe(true)
	})

	it('accepts messages array with 1 item (new propose-and-go flow)', () => {
		const result = generatePlanRequestSchema.safeParse({
			messages: [{ role: 'user', content: 'hi' }],
		})
		expect(result.success).toBe(true)
	})

	it('rejects empty messages array', () => {
		const result = generatePlanRequestSchema.safeParse({ messages: [] })
		expect(result.success).toBe(false)
	})

	it('rejects messages with empty content', () => {
		const result = generatePlanRequestSchema.safeParse({
			messages: [
				{ role: 'user', content: '' },
				{ role: 'assistant', content: 'hi' },
			],
		})
		expect(result.success).toBe(false)
	})
})

describe('planOutputSchema', () => {
	it('accepts a valid plan output', () => {
		const result = planOutputSchema.safeParse({
			milestones: [
				{
					title: 'Dashboard',
					description: 'Main screen',
					whatYouLearn: 'How layouts work',
					taskType: 'page',
					subtasks: [
						{
							title: 'Header',
							description: 'Top nav',
							whatYouLearn: 'Navigation patterns',
							taskType: 'feature',
							componentType: 'layout',
							acceptanceCriteria: ['Has logo'],
						},
					],
				},
				{
					title: 'Form',
					description: 'Input form',
					whatYouLearn: 'How forms work',
					taskType: 'feature',
					subtasks: [
						{
							title: 'Input field',
							description: 'Text input',
							whatYouLearn: 'Data entry',
							taskType: 'feature',
							componentType: 'form',
							acceptanceCriteria: ['Validates input'],
						},
					],
				},
			],
		})
		expect(result.success).toBe(true)
	})

	it('rejects fewer than 2 milestones', () => {
		const result = planOutputSchema.safeParse({
			milestones: [
				{
					title: 'Only one',
					description: 'Not enough',
					whatYouLearn: 'Nothing',
					taskType: 'feature',
					subtasks: [
						{
							title: 'Sub',
							description: 'D',
							whatYouLearn: 'L',
							taskType: 'feature',
							componentType: 'form',
							acceptanceCriteria: ['c'],
						},
					],
				},
			],
		})
		expect(result.success).toBe(false)
	})

	it('rejects subtasks with no acceptance criteria', () => {
		const result = planOutputSchema.safeParse({
			milestones: [
				{
					title: 'M1',
					description: 'D',
					whatYouLearn: 'L',
					taskType: 'feature',
					subtasks: [
						{
							title: 'Sub',
							description: 'D',
							whatYouLearn: 'L',
							taskType: 'feature',
							componentType: 'form',
							acceptanceCriteria: [],
						},
					],
				},
				{
					title: 'M2',
					description: 'D',
					whatYouLearn: 'L',
					taskType: 'feature',
					subtasks: [
						{
							title: 'Sub',
							description: 'D',
							whatYouLearn: 'L',
							taskType: 'feature',
							componentType: 'form',
							acceptanceCriteria: ['c'],
						},
					],
				},
			],
		})
		expect(result.success).toBe(false)
	})
})

describe('askQuestionRequestSchema', () => {
	it('accepts valid request', () => {
		const result = askQuestionRequestSchema.safeParse({
			messages: [{ role: 'user', content: 'hi' }],
			questionIndex: 1,
		})
		expect(result.success).toBe(true)
	})

	it('rejects questionIndex out of range', () => {
		const result = askQuestionRequestSchema.safeParse({
			messages: [{ role: 'user', content: 'hi' }],
			questionIndex: 6,
		})
		expect(result.success).toBe(false)
	})
})

describe('getTokenCostRange', () => {
	it('returns known ranges for known component types', () => {
		expect(getTokenCostRange('chart')).toEqual({ min: 3, max: 10 })
		expect(getTokenCostRange('form')).toEqual({ min: 3, max: 8 })
	})

	it('returns default range for unknown component types', () => {
		expect(getTokenCostRange('unknown-widget')).toEqual({ min: 3, max: 10 })
	})
})
