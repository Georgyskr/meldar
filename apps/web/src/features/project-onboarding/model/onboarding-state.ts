import type { OnboardingMessage } from '../lib/schemas'

export type OnboardingState = {
	messages: OnboardingMessage[]
	currentStep: number
	isGenerating: boolean
	isAskingQuestion: boolean
	planGenerated: boolean
}

export const TOTAL_QUESTIONS = 5

export function createInitialState(initialIntent: string): OnboardingState {
	return {
		messages: [{ role: 'user', content: initialIntent }],
		currentStep: 0,
		isGenerating: false,
		isAskingQuestion: false,
		planGenerated: false,
	}
}

export type OnboardingAction =
	| { type: 'add_question'; content: string }
	| { type: 'add_answer'; content: string }
	| { type: 'set_asking_question'; value: boolean }
	| { type: 'set_generating'; value: boolean }
	| { type: 'plan_generated' }

export function onboardingReducer(
	state: OnboardingState,
	action: OnboardingAction,
): OnboardingState {
	switch (action.type) {
		case 'add_question':
			return {
				...state,
				messages: [...state.messages, { role: 'assistant', content: action.content }],
				isAskingQuestion: false,
			}
		case 'add_answer':
			return {
				...state,
				messages: [...state.messages, { role: 'user', content: action.content }],
				currentStep: state.currentStep + 1,
			}
		case 'set_asking_question':
			return { ...state, isAskingQuestion: action.value }
		case 'set_generating':
			return { ...state, isGenerating: action.value }
		case 'plan_generated':
			return { ...state, planGenerated: true, isGenerating: false }
	}
}
