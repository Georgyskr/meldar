import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectQueue: unknown[][] = []
const insertedValues: unknown[] = []

function pushSelectResult(rows: unknown[]) {
	selectQueue.push(rows)
}

function nextSelect() {
	return selectQueue.shift() ?? []
}

function makeSelectChain() {
	const chain: Record<string, unknown> = {
		from: () => chain,
		where: () => chain,
		limit: async () => nextSelect(),
	}
	return chain
}

function makeInsertChain() {
	const chain: Record<string, unknown> = {
		values: (vals: unknown) => {
			insertedValues.push(vals)
			return chain
		},
		returning: async () => [],
	}
	return chain
}

const mockDb = {
	select: () => makeSelectChain(),
	insert: () => makeInsertChain(),
}

vi.mock('@meldar/db/client', () => ({
	getDb: () => mockDb,
}))

vi.mock('@meldar/db/schema', () => ({
	projectDomains: {
		id: 'id',
		projectId: 'project_id',
		type: 'type',
		domain: 'domain',
		state: 'state',
	},
}))

import { provisionSubdomain } from '../provision-subdomain'

describe('provisionSubdomain', () => {
	beforeEach(() => {
		selectQueue.length = 0
		insertedValues.length = 0
	})

	it('generates a subdomain from the project name and inserts it', async () => {
		pushSelectResult([])

		const result = await provisionSubdomain('proj-123', "Elif's Studio")

		expect(result).toBe('elifs-studio.meldar.ai')
		expect(insertedValues).toHaveLength(1)
		expect(insertedValues[0]).toEqual({
			projectId: 'proj-123',
			type: 'subdomain',
			domain: 'elifs-studio.meldar.ai',
			state: 'active',
		})
	})

	it('appends a collision suffix when the slug already exists', async () => {
		pushSelectResult([{ id: 'existing-id' }])
		pushSelectResult([])

		const result = await provisionSubdomain('proj-456', 'My Project')

		expect(result).toMatch(/^my-project-[a-z0-9]{4}\.meldar\.ai$/)
		expect(insertedValues).toHaveLength(1)
	})

	it('retries up to 5 times on repeated collisions', async () => {
		for (let i = 0; i < 5; i++) {
			pushSelectResult([{ id: `existing-${i}` }])
		}

		await expect(provisionSubdomain('proj-789', 'Taken Name')).rejects.toThrow(
			'Failed to provision subdomain after 5 attempts',
		)
		expect(insertedValues).toHaveLength(0)
	})

	it('handles names that normalize to "project"', async () => {
		pushSelectResult([])

		const result = await provisionSubdomain('proj-abc', '!!!')

		expect(result).toBe('project.meldar.ai')
		expect(insertedValues).toHaveLength(1)
	})

	it('succeeds on the third attempt after two collisions', async () => {
		pushSelectResult([{ id: 'a' }])
		pushSelectResult([{ id: 'b' }])
		pushSelectResult([])

		const result = await provisionSubdomain('proj-xyz', 'Popular Name')

		expect(result).toMatch(/\.meldar\.ai$/)
		expect(insertedValues).toHaveLength(1)
		expect((insertedValues[0] as { state: string }).state).toBe('active')
	})
})
