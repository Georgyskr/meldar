/**
 * SandboxProvider — the adapter interface every Meldar v3 sandbox backend
 * must implement.
 *
 * Sprint 1 ships one implementation: `CloudflareSandboxProvider` (wraps
 * `@cloudflare/sandbox`). The abstraction exists so that:
 *
 * 1. The orchestrator and workspace code are decoupled from Cloudflare SDK
 *    type shapes — we can swap providers if a load-bearing assumption about
 *    Cloudflare breaks (quota change, pricing change, reliability issues).
 * 2. Unit tests can substitute an in-memory fake without spinning up Docker.
 * 3. Future multi-region support can route to a different provider per
 *    region without rewriting orchestrator code.
 *
 * Contract guarantees (every implementation MUST honour these):
 *
 * - All methods are safe to call concurrently for DIFFERENT projectIds.
 * - All methods are safe to call SEQUENTIALLY for the SAME projectId.
 * - Concurrent calls for the same projectId SHOULD serialize internally
 *   (e.g., via a Durable Object single-writer guarantee), but callers
 *   should not rely on interleaving semantics.
 * - `prewarm`, `start`, and `writeFiles` all validate file paths via the
 *   sandbox safety invariants (no "..", no absolute, no reserved segments)
 *   and throw {@link SandboxUnsafePathError} on violation. AI output is
 *   untrusted — validation at the provider boundary is mandatory.
 * - On any non-fatal failure, the provider emits a typed
 *   {@link SandboxError} subclass so the orchestrator can route errors to
 *   the learning explainer with accurate context.
 */

import type { SandboxHandle, StartSandboxOptions, WriteFilesOptions } from './types'

export interface SandboxProvider {
	/**
	 * Fire-and-forget warm-up of a project's sandbox. Used by the Stripe
	 * webhook handler (ADR #47) and the magic-link click handler (ADR #49)
	 * to absorb cold-start latency before the user lands in the workspace.
	 *
	 * Behavior:
	 * - If the sandbox does not exist yet, boot the container, start
	 *   `next dev`, wait for the port to listen, then return.
	 * - If the sandbox is already running, no-op.
	 * - If the sandbox is in `starting` state from a prior call, await its
	 *   readiness rather than starting a second one.
	 *
	 * This method MUST NOT throw on transient failures — callers rely on
	 * fire-and-forget semantics and swallow errors. Log failures, don't
	 * propagate.
	 *
	 * Latency target: completes within the provider's internal timeout
	 * (default 30s) or logs a warning and returns.
	 *
	 * `opts.requestId` carries a 32-hex correlation ID through to the worker
	 * log line so a user-facing incident can be traced end-to-end. Optional —
	 * webhook callers without an ambient requestId omit it and the worker
	 * generates a fresh one.
	 */
	prewarm(projectId: string, opts?: { requestId?: string }): Promise<void>

	/**
	 * Start (or re-attach to) a sandbox for the given project. Writes any
	 * `initialFiles`, starts the dev server, waits for the preview port to
	 * listen, and returns a handle with the iframe-embeddable preview URL.
	 *
	 * Idempotent: calling start() on an already-running project returns the
	 * existing handle without re-booting.
	 *
	 * Day-2 cold rehydrate path: the orchestrator calls this with the
	 * project's current file set fetched from `project_files`. The provider
	 * is responsible for the write → boot → wait sequence; callers just
	 * await the handle.
	 *
	 * Throws:
	 * - {@link SandboxStartFailedError} if the container fails to boot
	 * - {@link SandboxNotReadyError} if the dev server never serves its port
	 * - {@link SandboxUnsafePathError} if any initial file has an unsafe path
	 */
	start(options: StartSandboxOptions): Promise<SandboxHandle>

	/**
	 * Write a batch of files into a running sandbox. Used during Build
	 * streaming — the orchestrator calls this once per kanban card's worth
	 * of generated files.
	 *
	 * Writes are sequenced to preserve error context: if file N fails, files
	 * 0..N-1 are committed and files N+1.. are not attempted. The returned
	 * handle reflects the sandbox state after the last successful write.
	 *
	 * Throws:
	 * - {@link SandboxNotFoundError} if the project isn't currently running
	 * - {@link SandboxWriteFailedError} (with `path`) on any individual write failure
	 * - {@link SandboxUnsafePathError} on any unsafe path
	 */
	writeFiles(options: WriteFilesOptions): Promise<SandboxHandle>

	/**
	 * Return the current preview URL for a running sandbox, or null if the
	 * sandbox is not running. Used by the workspace shell to render the
	 * preview iframe without waiting for a full start() roundtrip.
	 *
	 * Does NOT boot a sandbox. Callers wanting "boot if needed" semantics
	 * should use {@link start} instead.
	 */
	getPreviewUrl(projectId: string): Promise<string | null>

	/**
	 * Gracefully stop the sandbox for a project. Safe to call on an
	 * already-stopped or never-started project — always resolves.
	 *
	 * The provider is responsible for releasing the underlying compute
	 * resource (Durable Object hibernation, container teardown, etc.) and
	 * freeing the preview URL. After stop() resolves, the provider MUST
	 * return null from {@link getPreviewUrl} for the same projectId until a
	 * new {@link start} or {@link prewarm} call.
	 */
	stop(projectId: string): Promise<void>
}
