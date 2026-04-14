import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import {
	builds,
	cleanupTestProject,
	cleanupTestUser,
	createTestProject,
	createTestUser,
	db,
	HAS_DATABASE,
	projects,
} from './setup'

const SCRIPT_PATH = join(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'scripts',
	'reset-orphan-previews.sql',
)

async function runCleanupScript() {
	const script = readFileSync(SCRIPT_PATH, 'utf8')
	const statements = script
		.split(/;\s*$/m)
		.map((s) => s.replace(/--[^\n]*/g, '').trim())
		.filter((s) => s.length > 0 && !/^(BEGIN|COMMIT)$/i.test(s))

	for (const statement of statements) {
		await db().execute(sql.raw(statement))
	}
}

describe.skipIf(!HAS_DATABASE)('P1-13 orphan reset — real DB', () => {
	let userId: string | undefined
	let projectId: string | undefined

	afterEach(async () => {
		if (projectId) await cleanupTestProject(projectId)
		if (userId) await cleanupTestUser(userId)
		userId = undefined
		projectId = undefined
	})

	it('cleans orphan DO URLs and wedged streaming builds, freeing the partial unique slot', async () => {
		const user = await createTestUser()
		userId = user.id
		const project = await createTestProject(userId)
		projectId = project.id

		const orphanHost = `3000-project-${projectId}-abc123.sandbox.example.dev`
		await db()
			.update(projects)
			.set({
				previewUrl: `https://${orphanHost}`,
				previewUrlUpdatedAt: new Date(),
			})
			.where(sql`${projects.id} = ${projectId}`)

		await db().insert(builds).values({
			projectId,
			status: 'streaming',
			triggeredBy: 'user_prompt',
		})

		const [beforeProject] = await db()
			.select({ previewUrl: projects.previewUrl })
			.from(projects)
			.where(sql`${projects.id} = ${projectId}`)
		expect(beforeProject.previewUrl).toContain('project-')

		const beforeStreaming = await db()
			.select({ id: builds.id })
			.from(builds)
			.where(sql`${builds.projectId} = ${projectId} AND ${builds.status} = 'streaming'`)
		expect(beforeStreaming).toHaveLength(1)

		await runCleanupScript()

		const [afterProject] = await db()
			.select({
				previewUrl: projects.previewUrl,
				previewUrlUpdatedAt: projects.previewUrlUpdatedAt,
			})
			.from(projects)
			.where(sql`${projects.id} = ${projectId}`)
		expect(afterProject.previewUrl).toBeNull()
		expect(afterProject.previewUrlUpdatedAt).toBeNull()

		const stillStreaming = await db()
			.select({ id: builds.id })
			.from(builds)
			.where(sql`${builds.projectId} = ${projectId} AND ${builds.status} = 'streaming'`)
		expect(stillStreaming).toHaveLength(0)

		const [failed] = await db()
			.select({ status: builds.status, errorMessage: builds.errorMessage })
			.from(builds)
			.where(sql`${builds.projectId} = ${projectId} AND ${builds.status} = 'failed'`)
		expect(failed.status).toBe('failed')
		expect(failed.errorMessage).toContain('P1-13')

		await db().insert(builds).values({
			projectId,
			status: 'streaming',
			triggeredBy: 'user_prompt',
		})
		const freshStreaming = await db()
			.select({ id: builds.id })
			.from(builds)
			.where(sql`${builds.projectId} = ${projectId} AND ${builds.status} = 'streaming'`)
		expect(freshStreaming).toHaveLength(1)
	})

	it('is idempotent — a second run changes nothing', async () => {
		const user = await createTestUser()
		userId = user.id
		const project = await createTestProject(userId)
		projectId = project.id

		await runCleanupScript()
		await runCleanupScript()

		const [row] = await db()
			.select({ previewUrl: projects.previewUrl })
			.from(projects)
			.where(sql`${projects.id} = ${projectId}`)
		expect(row.previewUrl).toBeNull()
	})
})
