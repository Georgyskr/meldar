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
	/**
	 * Optional initial file set to write before the dev server starts. Used on
	 * first-ever project creation (genesis build) and on Day-2 cold rehydrate
	 * (restoring files from storage).
	 */
	readonly initialFiles?: readonly SandboxFile[]
	/**
	 * 32-hex end-to-end correlation ID that travels on `x-meldar-request-id`.
	 * Orchestrator generates one per build; provider generates one per call if
	 * omitted. Not part of the HMAC body — the header rides independently so
	 * callers can stamp a trace without re-signing.
	 */
	readonly requestId?: string
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
	/**
	 * 32-hex end-to-end correlation ID. See {@link StartSandboxOptions.requestId}.
	 */
	readonly requestId?: string
	/**
	 * Owner of the project. Written to the worker's structured log so an
	 * incident responder can distinguish "one user broken" from "platform-wide
	 * regression" without a DB cross-reference. Optional for back-compat with
	 * any caller that doesn't have userId in scope.
	 */
	readonly userId?: string
}
