import { getDb } from '@meldar/db/client'
import { kanbanCards } from '@meldar/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { getTokenCostRange } from '@/features/project-onboarding/lib/schemas'

type Milestone = {
	readonly title: string
	readonly description: string
	readonly whatYouLearn: string
	readonly taskType: string
	readonly subtasks: ReadonlyArray<{
		readonly title: string
		readonly description: string
		readonly whatYouLearn: string
		readonly taskType: string
		readonly componentType: string
		readonly acceptanceCriteria: readonly string[]
	}>
}

export async function insertPlanCards(
	projectId: string,
	milestones: readonly Milestone[],
	generatedBy: 'haiku' | 'template',
) {
	const db = getDb()
	const now = new Date()

	const [maxPos] = await db
		.select({ maxPosition: sql<number>`COALESCE(MAX(${kanbanCards.position}), -1)` })
		.from(kanbanCards)
		.where(and(eq(kanbanCards.projectId, projectId), isNull(kanbanCards.parentId)))

	let milestonePosition = (maxPos?.maxPosition ?? -1) + 1

	const allValues: (typeof kanbanCards.$inferInsert)[] = []

	for (const milestone of milestones) {
		const milestoneId = crypto.randomUUID()

		allValues.push({
			id: milestoneId,
			projectId,
			parentId: null,
			position: milestonePosition++,
			title: milestone.title,
			description: milestone.description,
			taskType: milestone.taskType,
			explainerText: milestone.whatYouLearn,
			generatedBy,
			dependsOn: [],
			createdAt: now,
			updatedAt: now,
		})

		for (let subtaskIdx = 0; subtaskIdx < milestone.subtasks.length; subtaskIdx++) {
			const subtask = milestone.subtasks[subtaskIdx]
			const tokenCost = getTokenCostRange(subtask.componentType)

			allValues.push({
				id: crypto.randomUUID(),
				projectId,
				parentId: milestoneId,
				position: subtaskIdx,
				title: subtask.title,
				description: subtask.description,
				taskType: subtask.taskType,
				acceptanceCriteria: [...subtask.acceptanceCriteria],
				explainerText: subtask.whatYouLearn,
				generatedBy,
				tokenCostEstimateMin: tokenCost.min,
				tokenCostEstimateMax: tokenCost.max,
				dependsOn: [],
				createdAt: now,
				updatedAt: now,
			})
		}
	}

	if (allValues.length === 0) return []

	return db.insert(kanbanCards).values(allValues).returning()
}

export async function insertPersonalizationCard(
	projectId: string,
	prompt: string,
): Promise<string> {
	const db = getDb()
	const now = new Date()
	const milestoneId = crypto.randomUUID()
	const subtaskId = crypto.randomUUID()

	await db.insert(kanbanCards).values([
		{
			id: milestoneId,
			projectId,
			parentId: null,
			position: 0,
			title: 'Set up your page',
			description: 'Meldar is personalizing your booking page.',
			taskType: 'page',
			generatedBy: 'template',
			dependsOn: [],
			createdAt: now,
			updatedAt: now,
		},
		{
			id: subtaskId,
			projectId,
			parentId: milestoneId,
			position: 0,
			title: 'Personalizing your page',
			description: prompt,
			taskType: 'page',
			state: 'ready',
			generatedBy: 'template',
			explainerText: 'Meldar is tailoring the copy and details to your business.',
			dependsOn: [],
			createdAt: now,
			updatedAt: now,
		},
	])

	return subtaskId
}
