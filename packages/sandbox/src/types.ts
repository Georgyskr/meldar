/**
 * Shared types for the SandboxProvider abstraction.
 *
 * Meldar v3 uses Cloudflare Sandbox SDK (Durable Objects + Containers) as the
 * Day-1 primary implementation, but every piece of code that interacts with a
 * sandboxed Next.js dev server goes through this abstraction so we can swap
 * providers (Vercel Sandbox, E2B, CodeSandbox SDK) if a load-bearing assumption
 * about Cloudflare breaks.
 *
 * Validation record: spikes/cloudflare-sandbox/README.md proves the core loop
 * works (writeFile → Turbopack HMR → iframe update in ~12ms + 1-2s compile).
 */

/**
 * A single file to be written into a sandbox. Text-only at MVP; binary support
 * is deferred until user uploads images/fonts (tracked in the data-engineer
 * review §7 Q5).
 *
 * `path` must be POSIX-style, relative, and free of `..` components. The
 * provider's implementation MUST canonicalize and reject traversal attempts —
 * this is a hard security invariant.
 */
export type SandboxFile = {
	/** Relative POSIX path, e.g. "src/app/page.tsx". No leading slash. No "..". */
	readonly path: string
	/** UTF-8 text content. Max 10MB per file enforced at the orchestrator. */
	readonly content: string
}

/**
 * Options passed to {@link SandboxProvider.start}. `projectId` doubles as the
 * Durable Object ID (`project-${projectId}`) so the sandbox lifecycle is
 * automatically scoped per project.
 */
export type StartSandboxOptions = {
	readonly projectId: string
	readonly userId: string
	/** Which starter image to boot. Maps to a container image tag at the provider layer. */
	readonly template: string
	/**
	 * Optional initial file set to write before the dev server starts. Used on
	 * first-ever project creation (genesis build) and on Day-2 cold rehydrate
	 * (restoring files from storage).
	 */
	readonly initialFiles?: readonly SandboxFile[]
}

/**
 * Handle to a running sandbox. The `previewUrl` is the iframe-embeddable URL
 * the workspace shell points the preview pane at.
 *
 * Preview URLs are public-by-default (the unguessable sandbox ID IS the auth).
 * Sprint 1 AC-3: every surface that exposes a preview URL must include the
 * "anyone with this link can view your preview" warning copy.
 */
export type SandboxHandle = {
	readonly projectId: string
	readonly previewUrl: string
	readonly status: SandboxStatus
	/** Monotonic counter — increments on each successful Build write, useful for debugging HMR pickup. */
	readonly revision: number
}

export type SandboxStatus = 'starting' | 'ready' | 'stopping' | 'stopped' | 'error'

/**
 * Options passed to {@link SandboxProvider.writeFiles}. Batched to minimize
 * round-trips during Build streaming; the provider decides whether to write
 * in parallel or sequence.
 *
 * Per the spike, sequential writes are preferred to preserve error context —
 * if one file fails, the orchestrator needs to know *which* one so the kanban
 * card can surface the error in the learning explainer.
 */
export type WriteFilesOptions = {
	readonly projectId: string
	readonly files: readonly SandboxFile[]
}
