import { getDb } from '@meldar/db/client'
import { projects } from '@meldar/db/schema'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { SettingsPanel } from '@/features/booking-admin'
import { verifyToken } from '@/server/identity/jwt'
import { verifyProjectOwnership } from '@/server/lib/verify-project-ownership'

const projectIdSchema = z.string().uuid()

export const metadata: Metadata = {
	title: 'Settings · Meldar',
	robots: { index: false, follow: false },
}

type PageProps = {
	params: Promise<{ projectId: string }>
}

export default async function AdminSettingsPage({ params }: PageProps) {
	const { projectId } = await params

	if (!projectIdSchema.safeParse(projectId).success) {
		notFound()
	}

	const cookieStore = await cookies()
	const session = verifyToken(cookieStore.get('meldar-auth')?.value ?? '')
	if (!session) {
		throw new Error('Settings page reached without a session — layout should have redirected')
	}

	const project = await verifyProjectOwnership(projectId, session.userId)
	if (!project) {
		notFound()
	}

	const db = getDb()
	const [row] = await db
		.select({ wishes: projects.wishes })
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1)

	const settings = (row?.wishes as Record<string, unknown>) ?? {}

	const businessName =
		typeof settings.businessName === 'string' ? settings.businessName : project.name
	const services = Array.isArray(settings.services) ? settings.services : []
	const hours =
		settings.availableHours &&
		typeof settings.availableHours === 'object' &&
		!Array.isArray(settings.availableHours)
			? (settings.availableHours as { days: string[]; start: string; end: string })
			: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '17:00' }

	const initialServices = services.map((s: unknown, i: number) =>
		typeof s === 'object' && s !== null
			? (s as { id: string; name: string; durationMinutes: number; priceEur: number })
			: { id: `seed-${i}`, name: String(s), durationMinutes: 60, priceEur: 0 },
	)

	return (
		<SettingsPanel
			projectId={projectId}
			initialBusinessName={businessName}
			initialServices={initialServices}
			initialHours={hours}
		/>
	)
}
