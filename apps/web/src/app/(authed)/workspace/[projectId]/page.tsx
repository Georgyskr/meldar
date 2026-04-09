import { getDb } from '@meldar/db/client'
import {
	buildProjectStorageFromEnv,
	buildProjectStorageWithoutR2,
	ProjectNotFoundError,
} from '@meldar/storage'
import { getTokenBalance } from '@meldar/tokens'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { kanbanCardSchema } from '@/entities/kanban-card'
import { deriveProjectStep } from '@/entities/project-step'
import { verifyToken } from '@/server/identity/jwt'
import { WorkspaceShell } from '@/widgets/workspace'

const projectIdSchema = z.string().uuid()

const STUCK_BUILD_THRESHOLD_MS = 5 * 60 * 1000
const PREVIEW_STALENESS_MS = 2 * 60 * 1000

export const metadata: Metadata = {
	title: 'Workspace · Meldar',
	robots: { index: false, follow: false },
}

type PageProps = {
	params: Promise<{ projectId: string }>
}

export default async function WorkspacePage({ params }: PageProps) {
	const { projectId } = await params

	if (!projectIdSchema.safeParse(projectId).success) {
		notFound()
	}

	const cookieStore = await cookies()
	const session = verifyToken(cookieStore.get('meldar-auth')?.value ?? '')
	if (!session) {
		throw new Error(
			'Workspace project page reached without a session — layout should have redirected',
		)
	}

	let storage: ReturnType<typeof buildProjectStorageFromEnv>
	try {
		storage = buildProjectStorageFromEnv()
	} catch (err) {
		// TODO: replace console.warn with structured logging + alert (Victoria Metrics / Grafana)
		console.warn(
			'[workspace/project] R2 not configured, running in degraded mode:',
			err instanceof Error ? err.message : 'Unknown',
		)
		storage = buildProjectStorageWithoutR2()
	}

	const db = getDb()
	let project: Awaited<ReturnType<typeof storage.getProject>>
	try {
		project = await storage.getProject(projectId, session.userId)
	} catch (err) {
		if (err instanceof ProjectNotFoundError) {
			notFound()
		}
		throw err
	}

	const cutoff = new Date(Date.now() - STUCK_BUILD_THRESHOLD_MS)
	try {
		await storage.reapStuckBuilds(projectId, cutoff)
	} catch (err) {
		console.error('[workspace/page] reapStuckBuilds failed', err)
	}

	let kanbanCards: Awaited<ReturnType<typeof storage.getKanbanCards>>
	let tokenBalance: number
	try {
		;[kanbanCards, tokenBalance] = await Promise.all([
			storage.getKanbanCards(projectId),
			getTokenBalance(db, session.userId),
		])
	} catch (err) {
		if (err instanceof ProjectNotFoundError) {
			notFound()
		}
		throw err
	}

	const isPreviewStale =
		!project.previewUrlUpdatedAt ||
		Date.now() - project.previewUrlUpdatedAt.getTime() > PREVIEW_STALENESS_MS
	const initialPreviewUrl = isPreviewStale ? null : project.previewUrl
	const parsedCards = kanbanCards.map((c) => kanbanCardSchema.parse(c))
	const step = deriveProjectStep(parsedCards)

	return (
		<WorkspaceShell
			projectId={project.id}
			projectName={project.name}
			tier={project.tier}
			tokenBalance={tokenBalance}
			initialPreviewUrl={initialPreviewUrl}
			step={step}
			initialKanbanCards={parsedCards}
		/>
	)
}
