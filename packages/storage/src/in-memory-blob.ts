/**
 * In-memory BlobStorage implementation for unit tests. NOT for production.
 *
 * Stores blobs in a Map keyed by `projects/{projectId}/content/{hash}`.
 * Verifies content hash on `get({verify: true})` just like the R2 impl will.
 */

import { type BlobStorage, blobKey, sha256Hex } from './blob'
import { BlobIntegrityError, BlobStorageError } from './errors'

export class InMemoryBlobStorage implements BlobStorage {
	private readonly store = new Map<string, string>()

	async put(projectId: string, contentHash: string, content: string): Promise<void> {
		const key = blobKey(projectId, contentHash)
		// Content-addressable idempotency: if the blob already exists at this
		// key, do nothing. Under a correct caller the bytes are identical by
		// definition.
		if (this.store.has(key)) {
			return
		}
		this.store.set(key, content)
	}

	async get(
		projectId: string,
		contentHash: string,
		options?: { verify?: boolean },
	): Promise<string> {
		const key = blobKey(projectId, contentHash)
		const content = this.store.get(key)
		if (content === undefined) {
			throw new BlobStorageError('get', `blob not found: ${key}`, { projectId })
		}
		if (options?.verify) {
			const actual = await sha256Hex(content)
			if (actual !== contentHash.toLowerCase()) {
				throw new BlobIntegrityError(contentHash, actual, { projectId })
			}
		}
		return content
	}

	async exists(projectId: string, contentHash: string): Promise<boolean> {
		return this.store.has(blobKey(projectId, contentHash))
	}

	async delete(projectId: string, contentHash: string): Promise<void> {
		this.store.delete(blobKey(projectId, contentHash))
	}

	// ── Test helpers (not part of the BlobStorage contract) ───────────────

	/** Number of blobs currently stored. Useful for assert-dedup tests. */
	get size(): number {
		return this.store.size
	}

	/** Clear all blobs. Tests only. */
	clear(): void {
		this.store.clear()
	}

	/** Iterate all keys. Tests only. */
	keys(): IterableIterator<string> {
		return this.store.keys()
	}
}
