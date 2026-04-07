import { COMPONENT_VOCABULARY, type ComponentTypeId } from '@meldar/orchestrator'
import { z } from 'zod'

const COMPONENT_TYPE_IDS = COMPONENT_VOCABULARY.map((c) => c.id) as [
	ComponentTypeId,
	...ComponentTypeId[],
]

export const onboardingMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().min(1).max(2000),
})
export type OnboardingMessage = z.infer<typeof onboardingMessageSchema>

export const generatePlanRequestSchema = z.object({
	messages: z.array(onboardingMessageSchema).min(2).max(12),
})
export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>

export const subtaskOutputSchema = z.object({
	title: z.string().min(1).max(80),
	description: z.string().max(300),
	whatYouLearn: z.string().max(300),
	taskType: z.enum(['feature', 'page', 'integration', 'data', 'fix', 'polish']),
	componentType: z.enum(COMPONENT_TYPE_IDS),
	acceptanceCriteria: z.array(z.string()).min(1).max(3),
})
export type SubtaskOutput = z.infer<typeof subtaskOutputSchema>

export const milestoneOutputSchema = z.object({
	title: z.string().min(1).max(80),
	description: z.string().max(300),
	whatYouLearn: z.string().max(300),
	taskType: z.enum(['feature', 'page', 'integration', 'data', 'fix', 'polish']),
	subtasks: z.array(subtaskOutputSchema).min(1).max(5),
})
export type MilestoneOutput = z.infer<typeof milestoneOutputSchema>

export const planOutputSchema = z.object({
	milestones: z.array(milestoneOutputSchema).min(2).max(6),
})
export type PlanOutput = z.infer<typeof planOutputSchema>

export const askQuestionRequestSchema = z.object({
	messages: z.array(onboardingMessageSchema).min(1).max(10),
	questionIndex: z.number().int().min(1).max(5),
})
export type AskQuestionRequest = z.infer<typeof askQuestionRequestSchema>

export const askQuestionResponseSchema = z.object({
	question: z.string().min(1).max(500),
})
export type AskQuestionResponse = z.infer<typeof askQuestionResponseSchema>

export function getTokenCostRange(componentType: string): { min: number; max: number } {
	const match = COMPONENT_VOCABULARY.find((c) => c.id === componentType)
	if (!match) return { min: 3, max: 10 }
	return { min: match.tokenCostRange[0], max: match.tokenCostRange[1] }
}
