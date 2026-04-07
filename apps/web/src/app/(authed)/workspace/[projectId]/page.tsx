import { buildProjectStorageFromEnv, ProjectNotFoundError } from '@meldar/storage'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { PLACEHOLDER_STEP } from '@/entities/project-step'
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

	const storage = buildProjectStorageFromEnv()

	const cutoff = new Date(Date.now() - STUCK_BUILD_THRESHOLD_MS)
	try {
		await storage.reapStuckBuilds(projectId, cutoff)
	} catch (err) {
		console.error('[workspace/page] reapStuckBuilds failed', err)
	}

	let project: Awaited<ReturnType<typeof storage.getProject>>
	let currentFiles: Awaited<ReturnType<typeof storage.getCurrentFiles>>
	let activeBuildId: Awaited<ReturnType<typeof storage.getActiveStreamingBuild>>
	try {
		;[project, currentFiles, activeBuildId] = await Promise.all([
			storage.getProject(projectId, session.userId),
			storage.getCurrentFiles(projectId),
			storage.getActiveStreamingBuild(projectId),
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

	return (
		<WorkspaceShell
			projectId={project.id}
			projectName={project.name}
			tier={project.tier}
			initialPreviewUrl={initialPreviewUrl}
			currentFiles={currentFiles}
			step={PLACEHOLDER_STEP}
			activeBuildId={activeBuildId}
		/>
	)
}
