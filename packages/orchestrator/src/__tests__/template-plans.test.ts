import { describe, expect, it } from 'vitest'
import { COMPONENT_VOCABULARY } from '../component-vocabulary'
import { TEMPLATE_PLANS } from '../template-plans'

const VALID_TASK_TYPES = ['feature', 'page', 'integration', 'data', 'fix', 'polish'] as const
const VALID_COMPONENT_TYPE_IDS = COMPONENT_VOCABULARY.map((c) => c.id)

describe('TEMPLATE_PLANS', () => {
	it('has at least 4 templates', () => {
		expect(TEMPLATE_PLANS.length).toBeGreaterThanOrEqual(4)
	})

	it('each template has a unique id', () => {
		const ids = TEMPLATE_PLANS.map((t) => t.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	for (const template of TEMPLATE_PLANS) {
		describe(`template: ${template.name}`, () => {
			it('has required top-level fields', () => {
				expect(template.id).toBeTruthy()
				expect(template.name).toBeTruthy()
				expect(template.description).toBeTruthy()
				expect(template.category).toBeTruthy()
			})

			it('has 3-5 milestones', () => {
				expect(template.milestones.length).toBeGreaterThanOrEqual(3)
				expect(template.milestones.length).toBeLessThanOrEqual(5)
			})

			for (const milestone of template.milestones) {
				describe(`milestone: ${milestone.title}`, () => {
					it('has a valid taskType', () => {
						expect(VALID_TASK_TYPES).toContain(milestone.taskType)
					})

					it('has required fields', () => {
						expect(milestone.title).toBeTruthy()
						expect(milestone.description).toBeTruthy()
						expect(milestone.whatYouLearn).toBeTruthy()
					})

					it('has 2-4 subtasks', () => {
						expect(milestone.subtasks.length).toBeGreaterThanOrEqual(2)
						expect(milestone.subtasks.length).toBeLessThanOrEqual(4)
					})

					for (const subtask of milestone.subtasks) {
						describe(`subtask: ${subtask.title}`, () => {
							it('has a valid taskType', () => {
								expect(VALID_TASK_TYPES).toContain(subtask.taskType)
							})

							it('has a componentType from the vocabulary', () => {
								expect(VALID_COMPONENT_TYPE_IDS).toContain(subtask.componentType)
							})

							it('has at least 1 acceptance criterion', () => {
								expect(subtask.acceptanceCriteria.length).toBeGreaterThanOrEqual(1)
							})

							it('has required fields', () => {
								expect(subtask.title).toBeTruthy()
								expect(subtask.description).toBeTruthy()
								expect(subtask.whatYouLearn).toBeTruthy()
							})
						})
					}
				})
			}
		})
	}
})
