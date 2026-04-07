/**
 * /workspace/[projectId] — the Meldar v3 workspace route.
 *
 * Server component: fetches the project + current file set inside the RSC and
 * hands the result to <WorkspaceShell>. Authentication is the meldar-auth JWT
 * cookie used by the rest of the app; unauthenticated users get bounced to
 * /login. Project ownership is enforced inside PostgresProjectStorage —
 * `getProject(projectId, userId)` throws ProjectNotFoundError when the
 * caller doesn't own it, which we surface as a 404 to avoid leaking which
 * project IDs exist.
 *
 * Sprint 1 deliberately keeps this thin: no preview URL wiring (sandbox
 * provider lands in a follow-up), no streaming SSE (BuildLog is a scaffold).
 * The shape of the data flow is what matters here.
 */

import { buildProjectStorageFromEnv, ProjectNotFoundError } from '@meldar/storage'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyToken } from '@/server/identity/jwt'
import { WorkspaceShell } from '@/widgets/workspace'

const projectIdSchema = z.string().uuid()

export const metadata: Metadata = {
	title: 'Workspace · Meldar',
	robots: { index: false, follow: false },
}

type PageProps = {
	params: Promise<{ projectId: string }>
}

export default async function WorkspacePage({ params }: PageProps) {
	const { projectId } = await params

	// Reject malformed projectIds with a 404 (same outcome as "exists but not
	// yours") to avoid leaking which IDs are valid shapes.
	if (!projectIdSchema.safeParse(projectId).success) {
		notFound()
	}

	// ── Auth ──────────────────────────────────────────────────────────────
	const cookieStore = await cookies()
	const tokenCookie = cookieStore.get('meldar-auth')
	if (!tokenCookie) {
		redirect(`/login?next=/workspace/${projectId}`)
	}
	const session = verifyToken(tokenCookie.value)
	if (!session) {
		redirect(`/login?next=/workspace/${projectId}`)
	}

	// ── Storage handle ────────────────────────────────────────────────────
	// Throws at runtime if R2 / DB env vars are missing — that is intentional:
	// the workspace route is gated behind auth and a 500 here is a deployment
	// misconfiguration we want to see loudly.
	const storage = buildProjectStorageFromEnv()

	let project: Awaited<ReturnType<typeof storage.getProject>>
	try {
		project = await storage.getProject(projectId, session.userId)
	} catch (err) {
		if (err instanceof ProjectNotFoundError) {
			notFound()
		}
		throw err
	}

	const currentFiles = await storage.getCurrentFiles(projectId)

	return (
		<WorkspaceShell
			projectId={project.id}
			projectName={project.name}
			previewUrl={null}
			fileCount={currentFiles.length}
			currentFiles={currentFiles}
		/>
	)
}
