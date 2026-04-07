/**
 * R2BlobStorage — production BlobStorage backed by Cloudflare R2 via the
 * S3-compatible API. Uses `aws4fetch` to sign requests with SigV4 in any
 * runtime (Vercel Edge, Node, Cloudflare Workers).
 *
 * Why S3-compatible API and not the Workers `env.R2.put()` binding:
 * the main Next.js app runs on Vercel, not Workers. The binding only works
 * inside a Workers runtime. The S3 API works everywhere, at the cost of
 * one HTTPS roundtrip per blob op (R2 is in the same region as Vercel
 * Functions for low-latency).
 *
 * Required environment variables:
 *   R2_ACCOUNT_ID         — your Cloudflare account ID (NOT the bucket name)
 *   R2_ACCESS_KEY_ID      — R2 token's access key
 *   R2_SECRET_ACCESS_KEY  — R2 token's secret
 *   R2_BUCKET             — bucket name, e.g. 'meldar-projects-prod'
 *
 * Optional:
 *   R2_ENDPOINT           — override the default endpoint (for tests against
 *                            a local minio or similar). Defaults to
 *                            https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
 *
 * Setup checklist (one-time, in the Cloudflare dashboard):
 *   1. Create the bucket: `meldar-projects-prod` (or similar per environment)
 *   2. Create an R2 API token with "Object Read & Write" scoped to that
 *      bucket. NEVER use account-wide credentials.
 *   3. Configure CORS on the bucket if any browser-side code will hit it
 *      directly (Sprint 1 does NOT — all R2 access is server-side).
 *   4. Set a lifecycle rule to abort multipart uploads after 24h (we don't
 *      use multipart yet but it's a cheap insurance policy).
 *   5. Set the env vars in Vercel project settings for both preview and
 *      production environments.
 */

import { AwsClient } from 'aws4fetch'
import { type BlobStorage, blobKey, sha256Hex } from './blob'
import { BlobIntegrityError, BlobStorageError } from './errors'

export type R2BlobStorageConfig = {
	readonly accountId: string
	readonly accessKeyId: string
	readonly secretAccessKey: string
	readonly bucket: string
	/** Override the endpoint (for local testing). Defaults to the R2 production endpoint. */
	readonly endpoint?: string
}

export class R2BlobStorage implements BlobStorage {
	private readonly client: AwsClient
	private readonly endpoint: string
	private readonly bucket: string

	constructor(config: R2BlobStorageConfig) {
		if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
			throw new Error('R2BlobStorage: missing required config')
		}
		this.client = new AwsClient({
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
			service: 's3',
			region: 'auto', // R2 uses 'auto' for region
		})
		this.endpoint = config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`
		this.bucket = config.bucket
	}

	/**
	 * Construct an R2BlobStorage from environment variables. Throws a clear
	 * error message if any required var is missing — surfaced at startup,
	 * not at first use, so deployment misconfiguration fails fast.
	 */
	static fromEnv(env: Record<string, string | undefined> = process.env): R2BlobStorage {
		const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']
		const missing = required.filter((k) => !env[k])
		if (missing.length > 0) {
			throw new Error(
				`R2BlobStorage.fromEnv: missing env vars: ${missing.join(', ')}. ` +
					`See src/server/storage/r2-blob.ts for setup instructions.`,
			)
		}
		return new R2BlobStorage({
			accountId: env.R2_ACCOUNT_ID as string,
			accessKeyId: env.R2_ACCESS_KEY_ID as string,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
			bucket: env.R2_BUCKET as string,
			endpoint: env.R2_ENDPOINT,
		})
	}

	private url(projectId: string, contentHash: string): string {
		const key = blobKey(projectId, contentHash)
		// Path-style URL: https://{endpoint}/{bucket}/{key}
		return `${this.endpoint}/${this.bucket}/${encodePath(key)}`
	}

	async put(projectId: string, contentHash: string, content: string): Promise<void> {
		// Content-addressable idempotency: if the blob already exists at this
		// key, skip the write. Same bytes → same hash → same key → no-op write
		// would be wasteful (and pays an op cost on R2's metered API).
		if (await this.exists(projectId, contentHash)) {
			return
		}

		const url = this.url(projectId, contentHash)
		try {
			const res = await this.client.fetch(url, {
				method: 'PUT',
				body: content,
				headers: {
					'content-type': 'application/octet-stream',
					// Server-side integrity check: R2 will reject the put if the
					// SHA-256 of the body doesn't match. Cheaper than us
					// recomputing on every read.
					'x-amz-checksum-sha256': await sha256ToBase64(content),
					'x-amz-checksum-algorithm': 'SHA256',
				},
			})
			if (!res.ok) {
				const body = await res.text().catch(() => '<no body>')
				throw new BlobStorageError(
					'put',
					`R2 PUT failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`,
					{ projectId },
				)
			}
		} catch (err) {
			if (err instanceof BlobStorageError) throw err
			throw new BlobStorageError('put', `R2 PUT network error: ${formatErr(err)}`, {
				projectId,
				cause: err,
			})
		}
	}

	async get(
		projectId: string,
		contentHash: string,
		options?: { verify?: boolean },
	): Promise<string> {
		const url = this.url(projectId, contentHash)
		let res: Response
		try {
			res = await this.client.fetch(url, { method: 'GET' })
		} catch (err) {
			throw new BlobStorageError('get', `R2 GET network error: ${formatErr(err)}`, {
				projectId,
				cause: err,
			})
		}
		if (res.status === 404) {
			throw new BlobStorageError('get', `blob not found: ${contentHash}`, { projectId })
		}
		if (!res.ok) {
			const body = await res.text().catch(() => '<no body>')
			throw new BlobStorageError(
				'get',
				`R2 GET failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`,
				{ projectId },
			)
		}
		const content = await res.text()
		if (options?.verify) {
			const actual = await sha256Hex(content)
			if (actual !== contentHash.toLowerCase()) {
				throw new BlobIntegrityError(contentHash, actual, { projectId })
			}
		}
		return content
	}

	async exists(projectId: string, contentHash: string): Promise<boolean> {
		const url = this.url(projectId, contentHash)
		try {
			const res = await this.client.fetch(url, { method: 'HEAD' })
			if (res.status === 404) return false
			if (res.ok) return true
			throw new BlobStorageError(
				'exists',
				`R2 HEAD unexpected status: ${res.status} ${res.statusText}`,
				{ projectId },
			)
		} catch (err) {
			if (err instanceof BlobStorageError) throw err
			throw new BlobStorageError('exists', `R2 HEAD network error: ${formatErr(err)}`, {
				projectId,
				cause: err,
			})
		}
	}

	async delete(projectId: string, contentHash: string): Promise<void> {
		const url = this.url(projectId, contentHash)
		try {
			const res = await this.client.fetch(url, { method: 'DELETE' })
			// R2 returns 204 on success, 404 on missing — both are "success" for
			// idempotent delete semantics.
			if (res.status === 204 || res.status === 404 || res.status === 200) {
				return
			}
			const body = await res.text().catch(() => '<no body>')
			throw new BlobStorageError(
				'delete',
				`R2 DELETE failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`,
				{ projectId },
			)
		} catch (err) {
			if (err instanceof BlobStorageError) throw err
			throw new BlobStorageError('delete', `R2 DELETE network error: ${formatErr(err)}`, {
				projectId,
				cause: err,
			})
		}
	}
}

/**
 * URL-encode a path while preserving '/' as a separator. R2 (and S3) treat
 * the key as opaque between slashes, but path traversal characters MUST be
 * percent-escaped on the wire. The blobKey() helper already validates the
 * structure, so this is just defensive encoding.
 */
function encodePath(key: string): string {
	return key
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/')
}

async function sha256ToBase64(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	// Convert ArrayBuffer → base64 without going through Buffer (works in
	// Workers/Edge runtimes that don't have Node's Buffer).
	const view = new Uint8Array(digest)
	let binary = ''
	for (let i = 0; i < view.length; i++) {
		binary += String.fromCharCode(view[i])
	}
	return btoa(binary)
}

function formatErr(err: unknown): string {
	if (err instanceof Error) return err.message
	return String(err)
}
