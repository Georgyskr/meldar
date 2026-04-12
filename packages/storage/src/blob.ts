/**
 * BlobStorage — the abstraction over whatever object store holds raw file
 * bytes. Sprint 1 will ship an R2 implementation. Tests use the in-memory
 * implementation from `in-memory-blob.ts`.
 *
 * Keys are content-addressable: `projects/{projectId}/content/{sha256}`. The
 * sha256 IS the integrity check — callers compute the hash before storing,
 * and `get()` optionally verifies on read.
 */

import { BlobIntegrityError, BlobStorageError } from './errors'

/** Key scheme — callers never construct keys directly, always through this helper. */
export function blobKey(projectId: string, contentHash: string): string {
	if (!projectId || !contentHash) {
		throw new Error('blobKey: projectId and contentHash are required')
	}
	if (!/^[0-9a-f]{64}$/i.test(contentHash)) {
		throw new Error(`blobKey: contentHash must be sha256 hex (got: ${contentHash})`)
	}
	return `projects/${projectId}/content/${contentHash}`
}

/**
 * Compute sha256 of a UTF-8 string using the Web Crypto API (works in both
 * Node and Workers runtime). Returns lowercase hex.
 */
export async function sha256Hex(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return bufferToHex(digest)
}

function bufferToHex(buf: ArrayBuffer): string {
	const view = new Uint8Array(buf)
	let hex = ''
	for (let i = 0; i < view.length; i++) {
		hex += view[i].toString(16).padStart(2, '0')
	}
	return hex
}

export interface BlobStorage {
	/**
	 * Write a blob. Idempotent when content-addressed: storing the same bytes
	 * under the same key is a no-op (hash guarantees byte-for-byte equality).
	 * Implementations may skip the actual write when `exists(key)` is true.
	 */
	put(projectId: string, contentHash: string, content: string): Promise<void>

	/**
	 * Fetch a blob by content hash. Throws {@link BlobStorageError} if the
	 * blob is missing or the fetch fails. Set `verify: true` to recompute
	 * the hash and throw {@link BlobIntegrityError} on mismatch.
	 */
	get(projectId: string, contentHash: string, options?: { verify?: boolean }): Promise<string>

	/** Check whether a blob exists without fetching its contents. */
	exists(projectId: string, contentHash: string): Promise<boolean>

	/**
	 * Delete a blob. Used by the orphaned-blob reaper (reference counting
	 * against `build_files` + `project_files`). Safe to call on a missing
	 * blob — implementations SHOULD treat "not found" as success.
	 */
	delete(projectId: string, contentHash: string): Promise<void>
}

export { BlobIntegrityError, BlobStorageError }
