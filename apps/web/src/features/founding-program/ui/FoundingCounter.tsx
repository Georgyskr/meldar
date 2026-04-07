import { getDb } from '@meldar/db/client'
import { subscribers } from '@meldar/db/schema'
import { styled } from '@styled-system/jsx'
import { count, eq } from 'drizzle-orm'

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
			<styled.span textStyle="body.sm" color="onSurfaceVariant" fontWeight="150">
				Founding spots are full. Join the waitlist.
			</styled.span>
		)
	}

	return (
		<styled.span textStyle="body.sm" color="primary" fontWeight="600">
			{spotsLeft} of {FOUNDING_MEMBER_CAP} spots remaining
		</styled.span>
	)
}
