import { describe, expect, it } from 'vitest'
import {
	createInitialState,
	type OnboardingState,
	onboardingReducer,
	TOTAL_QUESTIONS,
} from '../model/onboarding-state'

describe('createInitialState', () => {
	it('creates state with the initial intent as the first user message', () => {
		const state = createInitialState('I want a weight loss tracker')
		expect(state.messages).toEqual([{ role: 'user', content: 'I want a weight loss tracker' }])
		expect(state.currentStep).toBe(0)
		expect(state.isGenerating).toBe(false)
		expect(state.isAskingQuestion).toBe(false)
		expect(state.planGenerated).toBe(false)
	})
})

describe('onboardingReducer', () => {
	const baseState: OnboardingState = {
		messages: [{ role: 'user', content: 'I want an app' }],
		currentStep: 0,
		isGenerating: false,
		isAskingQuestion: false,
		planGenerated: false,
	}

	it('adds assistant question and clears asking flag', () => {
		const state = { ...baseState, isAskingQuestion: true }
		const next = onboardingReducer(state, {
			type: 'add_question',
			content: 'What do you want to see?',
		})
		expect(next.messages).toHaveLength(2)
		expect(next.messages[1]).toEqual({
			role: 'assistant',
			content: 'What do you want to see?',
		})
		expect(next.isAskingQuestion).toBe(false)
	})

	it('adds user answer and increments currentStep', () => {
		const state: OnboardingState = {
			...baseState,
			messages: [
				{ role: 'user', content: 'I want an app' },
				{ role: 'assistant', content: 'What do you want?' },
			],
		}
		const next = onboardingReducer(state, {
			type: 'add_answer',
			content: 'A chart',
		})
		expect(next.messages).toHaveLength(3)
		expect(next.messages[2]).toEqual({ role: 'user', content: 'A chart' })
		expect(next.currentStep).toBe(1)
	})

	it('sets asking question flag', () => {
		const next = onboardingReducer(baseState, {
			type: 'set_asking_question',
			value: true,
		})
		expect(next.isAskingQuestion).toBe(true)
	})

	it('sets generating flag', () => {
		const next = onboardingReducer(baseState, {
			type: 'set_generating',
			value: true,
		})
		expect(next.isGenerating).toBe(true)
	})

	it('marks plan as generated and clears generating flag', () => {
		const state = { ...baseState, isGenerating: true }
		const next = onboardingReducer(state, { type: 'plan_generated' })
		expect(next.planGenerated).toBe(true)
		expect(next.isGenerating).toBe(false)
	})
})

describe('TOTAL_QUESTIONS', () => {
	it('is 5', () => {
		expect(TOTAL_QUESTIONS).toBe(5)
	})
})
