import { getDb } from '@meldar/db/client'
import { subscribers } from '@meldar/db/schema'
import { count, eq } from 'drizzle-orm'
import { Text } from '@/shared/ui'

const FOUNDING_MEMBER_CAP = 15

export async function FoundingCounter() {
	const db = getDb()
	const result = await db
		.select({ count: count() })
		.from(subscribers)
		.where(eq(subscribers.foundingMember, true))
	const memberCount = result[0]?.count || 0
	const spotsLeft = Math.max(0, FOUNDING_MEMBER_CAP - memberCount)

	if (spotsLeft === 0) {
		return (
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				Founding spots are full. Join the waitlist.
			</Text>
		)
	}

	return (
		<Text textStyle="secondary.sm" color="primary">
			{spotsLeft} of {FOUNDING_MEMBER_CAP} spots remaining
		</Text>
	)
}
