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
		put: async (projectId: string, hash: string) => {
			console.warn(
				`[noop-blob] PUT discarded: project=${projectId} hash=${hash.slice(0, 8)}… — R2 not configured`,
			)
		},
		get: async () => {
			throw new Error('R2 not configured \u2014 file content unavailable')
		},
		delete: async () => {},
		exists: async () => false,
	}
	return new PostgresProjectStorage(getDb(), noopBlob as never)
}

export function _resetProjectStorageCache(): void {
	cached = null
}
