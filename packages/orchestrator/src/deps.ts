/**
 * buildOrchestratorDeps — wires {@link OrchestratorDeps} from process.env so
 * route handlers don't repeat the same boilerplate. Each backing service is
 * read lazily (on first call) and cached for the lifetime of the Lambda.
 *
 * The split between this file and `engine.ts` is deliberate:
 *   - `engine.ts`        knows nothing about env vars; it just consumes a
 *                         pre-built OrchestratorDeps. This keeps it 100%
 *                         testable with in-memory implementations.
 *   - `deps.ts` (this)   is the boring glue that maps env → real impls. It
 *                         is the only place that touches `process.env` for
 *                         the orchestrator's runtime dependencies.
 *
 * Sandbox provider is OPTIONAL. If `CF_SANDBOX_WORKER_URL` is unset, builds
 * still run end-to-end and persist to Postgres + R2 — they just don't mirror
 * to a live preview. This makes local dev (no Worker deployed) trivially
 * possible while production gets the full preview pipeline.
 */

import Anthropic from '@anthropic-ai/sdk'
import { CloudflareSandboxProvider, type SandboxProvider } from '@meldar/sandbox'
import { buildProjectStorageFromEnv } from '@meldar/storage'
import { UpstashTokenLedger } from '@meldar/tokens'
import { Redis } from '@upstash/redis'
import type { AiCallLogger, GlobalSpendGuard, OrchestratorDeps } from './engine'

let cached: OrchestratorDeps | null = null

/**
 * Build (or return the cached) OrchestratorDeps from environment variables.
 *
 * Throws an Error with a helpful message if any required env var is missing —
 * this is intentional. The orchestrator route is gated behind auth and a 500
 * here is a deployment misconfiguration we want to see loudly in logs.
 */
export function buildOrchestratorDeps(overrides?: {
	globalSpendGuard?: GlobalSpendGuard
	aiCallLogger?: AiCallLogger
}): OrchestratorDeps {
	if (cached && !overrides) return cached

	const storage = buildProjectStorageFromEnv()

	const ledger = new UpstashTokenLedger({
		redis: createRedisFromEnv(),
	})

	const sandbox = createSandboxProviderFromEnv()
	const anthropic = new Anthropic()

	const deps: OrchestratorDeps = {
		storage,
		sandbox,
		ledger,
		anthropic,
		globalSpendGuard: overrides?.globalSpendGuard,
		aiCallLogger: overrides?.aiCallLogger,
	}

	if (!overrides) cached = deps
	return deps
}

/** Reset the cache. Used by tests that mutate process.env. */
export function _resetOrchestratorDepsCache(): void {
	cached = null
}

function createRedisFromEnv(): Redis {
	const url = process.env.UPSTASH_REDIS_REST_URL
	const token = process.env.UPSTASH_REDIS_REST_TOKEN
	if (!url || !token) {
		throw new Error(
			'Upstash Redis is not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
		)
	}
	return new Redis({ url, token })
}

/**
 * Sandbox is OPTIONAL — if the worker isn't deployed, we return null and the
 * orchestrator falls back to "DB writes only, no live preview." This is the
 * right default for local dev and for production environments that opt out
 * of the sandbox feature.
 */
function createSandboxProviderFromEnv(): SandboxProvider | null {
	const workerUrl = process.env.CF_SANDBOX_WORKER_URL
	const hmacSecret = process.env.CF_SANDBOX_HMAC_SECRET
	if (!workerUrl || !hmacSecret) return null
	return new CloudflareSandboxProvider({ workerUrl, hmacSecret })
}
