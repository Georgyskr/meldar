/**
 * Build a production {@link ProjectStorage} (Postgres + R2) from process.env.
 *
 * Lives in its own module so route handlers can pull only the storage layer
 * without dragging in Anthropic, Redis, or sandbox dependencies. The
 * orchestrator's full `buildOrchestratorDeps()` re-uses this internally.
 *
 * Throws an Error with a helpful message if any required env var is missing.
 * Callers are expected to surface this as a 500: missing R2 or DB credentials
 * is a deployment misconfiguration we want to fail loudly on.
 */

import { getDb } from '@meldar/db/client'
import { PostgresProjectStorage } from './postgres-provider'
import { R2BlobStorage } from './r2-blob'

let cached: PostgresProjectStorage | null = null

export function buildProjectStorageFromEnv(): PostgresProjectStorage {
	if (cached) return cached

	const accountId = process.env.R2_ACCOUNT_ID
	const accessKeyId = process.env.R2_ACCESS_KEY_ID
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
	const bucket = process.env.R2_BUCKET
	if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
		throw new Error(
			'R2 storage is not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET',
		)
	}

	const blob = new R2BlobStorage({ accountId, accessKeyId, secretAccessKey, bucket })
	cached = new PostgresProjectStorage(getDb(), blob)
	return cached
}

export function buildProjectStorageWithoutR2(): PostgresProjectStorage {
	const noopBlob = {
		put: async () => {},
		get: async () => null,
		delete: async () => {},
		exists: async () => false,
	}
	return new PostgresProjectStorage(getDb(), noopBlob as never)
}

/** Reset the cache. Used by tests that mutate process.env. */
export function _resetProjectStorageCache(): void {
	cached = null
}
