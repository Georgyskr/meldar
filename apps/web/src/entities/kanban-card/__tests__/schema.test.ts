import { describe, expect, it } from 'vitest'
import { kanbanCardSchema } from '../types'

function makeCard(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: crypto.randomUUID(),
		projectId: crypto.randomUUID(),
		parentId: null,
		position: 0,
		state: 'draft',
		required: true,
		title: 'Personalizing your page',
		description: 'short description',
		taskType: 'page',
		acceptanceCriteria: null,
		explainerText: null,
		generatedBy: 'template',
		tokenCostEstimateMin: null,
		tokenCostEstimateMax: null,
		tokenCostActual: null,
		dependsOn: [],
		blockedReason: null,
		lastBuildId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		builtAt: null,
		...overrides,
	}
}

describe('kanbanCardSchema.description', () => {
	it('accepts a 5000-character LLM prompt (personalization card worst case)', () => {
		const longPrompt = 'x'.repeat(5000)
		const parsed = kanbanCardSchema.parse(makeCard({ description: longPrompt }))
		expect(parsed.description).toBe(longPrompt)
	})

	it('accepts a 7999-character description (just under cap)', () => {
		const almostMax = 'x'.repeat(7999)
		const parsed = kanbanCardSchema.parse(makeCard({ description: almostMax }))
		expect(parsed.description?.length).toBe(7999)
	})

	it('accepts null description', () => {
		const parsed = kanbanCardSchema.parse(makeCard({ description: null }))
		expect(parsed.description).toBeNull()
	})
})
