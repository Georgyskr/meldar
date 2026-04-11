import { getDb } from '@meldar/db/client'
import { projectDomains } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import { appendCollisionSuffix, generateSlug, generateSubdomain } from './slug'

const MAX_COLLISION_RETRIES = 5

export async function provisionSubdomain(projectId: string, projectName: string): Promise<string> {
	const db = getDb()
	let slug = generateSlug(projectName)

	for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
		const subdomain = generateSubdomain(slug)

		const existing = await db
			.select({ id: projectDomains.id })
			.from(projectDomains)
			.where(eq(projectDomains.domain, subdomain))
			.limit(1)

		if (existing.length === 0) {
			await db.insert(projectDomains).values({
				projectId,
				type: 'subdomain',
				domain: subdomain,
				state: 'active',
			})
			return subdomain
		}

		slug = appendCollisionSuffix(generateSlug(projectName))
	}

	throw new Error(`Failed to provision subdomain after ${MAX_COLLISION_RETRIES} attempts`)
}
