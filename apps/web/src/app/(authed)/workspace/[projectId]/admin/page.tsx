import { getDb } from '@meldar/db/client'
import { projectDomains } from '@meldar/db/schema'
import { and, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { AdminDashboard } from '@/features/booking-admin'
import { SharePanel } from '@/features/share-flow'
import { TeachingHint } from '@/features/teaching-hints'
import { verifyToken } from '@/server/identity/jwt'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

const projectIdSchema = z.string().uuid()

export const metadata: Metadata = {
	title: 'Admin · Meldar',
	robots: { index: false, follow: false },
}

type PageProps = {
	params: Promise<{ projectId: string }>
}

export default async function AdminPage({ params }: PageProps) {
	const { projectId } = await params

	if (!projectIdSchema.safeParse(projectId).success) {
		notFound()
	}

	const cookieStore = await cookies()
	const session = verifyToken(cookieStore.get('meldar-auth')?.value ?? '')
	if (!session) {
		throw new Error('Admin page reached without a session — layout should have redirected')
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		notFound()
	}

	const db = getDb()
	const [domainRow] = await db
		.select({ domain: projectDomains.domain })
		.from(projectDomains)
		.where(and(eq(projectDomains.projectId, projectId), eq(projectDomains.state, 'active')))
		.limit(1)

	const subdomain = domainRow?.domain ?? null

	return (
		<>
			<TeachingHint hintId="your-dashboard" />
			<AdminDashboard projectId={projectId} businessName={project.name} />
			{subdomain && (
				<>
					<SharePanel subdomain={subdomain} />
					<TeachingHint hintId="share-link" />
				</>
			)}
		</>
	)
}
