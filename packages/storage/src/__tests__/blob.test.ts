import { describe, expect, it } from 'vitest'
import { blobKey, sha256Hex } from '../blob'
import { BlobIntegrityError, BlobStorageError } from '../errors'
import { InMemoryBlobStorage } from '../in-memory-blob'

describe('sha256Hex', () => {
	it('produces lowercase hex of length 64', async () => {
		const hash = await sha256Hex('hello')
		expect(hash).toMatch(/^[0-9a-f]{64}$/)
	})

	it('is deterministic for identical input', async () => {
		expect(await sha256Hex('same')).toBe(await sha256Hex('same'))
	})

	it('differs for different input', async () => {
		expect(await sha256Hex('a')).not.toBe(await sha256Hex('b'))
	})

	it('matches the known sha256 for "hello"', async () => {
		expect(await sha256Hex('hello')).toBe(
			'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
		)
	})
})

describe('blobKey', () => {
	const validHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

	it('produces the content-addressed key layout', () => {
		expect(blobKey('proj_abc', validHash)).toBe(`projects/proj_abc/content/${validHash}`)
	})

	it('rejects empty projectId', () => {
		expect(() => blobKey('', validHash)).toThrow()
	})

	it('rejects empty contentHash', () => {
		expect(() => blobKey('proj_abc', '')).toThrow()
	})

	it('rejects non-sha256 content hash', () => {
		expect(() => blobKey('proj_abc', 'not-a-hash')).toThrow(/sha256/)
		expect(() => blobKey('proj_abc', 'a'.repeat(63))).toThrow(/sha256/) // wrong length
		expect(() => blobKey('proj_abc', 'z'.repeat(64))).toThrow(/sha256/) // non-hex char
	})

	it('accepts uppercase hex', () => {
		const upper = validHash.toUpperCase()
		expect(blobKey('proj_abc', upper)).toBe(`projects/proj_abc/content/${upper}`)
	})
})

describe('InMemoryBlobStorage', () => {
	it('stores and retrieves a blob', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('hello')
		await blob.put('proj_1', hash, 'hello')
		expect(await blob.get('proj_1', hash)).toBe('hello')
	})

	it('reports existence', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('hi')
		expect(await blob.exists('proj_1', hash)).toBe(false)
		await blob.put('proj_1', hash, 'hi')
		expect(await blob.exists('proj_1', hash)).toBe(true)
	})

	it('throws BlobStorageError on missing blob', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('nope')
		await expect(blob.get('proj_1', hash)).rejects.toThrow(BlobStorageError)
	})

	it('dedups identical puts under the same key (idempotent)', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('x')
		await blob.put('proj_1', hash, 'x')
		await blob.put('proj_1', hash, 'x')
		await blob.put('proj_1', hash, 'x')
		expect(blob.size).toBe(1)
	})

	it('isolates blobs by project (same hash, different project = different key)', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('shared')
		await blob.put('proj_a', hash, 'shared')
		await blob.put('proj_b', hash, 'shared')
		expect(blob.size).toBe(2)
		expect(await blob.get('proj_a', hash)).toBe('shared')
		expect(await blob.get('proj_b', hash)).toBe('shared')
	})

	it('verify: true catches tampered blobs', async () => {
		const blob = new InMemoryBlobStorage()
		const realHash = await sha256Hex('original')
		const fakeHash = await sha256Hex('different')
		await blob.put('proj_1', realHash, 'original')

		// Fetch the blob under the REAL hash — verifies fine
		expect(await blob.get('proj_1', realHash, { verify: true })).toBe('original')

		// Manually tamper: stuff mismatched content under a hash that doesn't match
		// (simulates corruption in the backing store)
		// The in-memory impl doesn't have a direct tamper hook, so we test via
		// storing content whose bytes don't match the provided hash label.
		// Since put() uses blobKey(hash), we use a different hash as the "claim".
		// We'll store content under hash A but pretend to fetch under hash B.
		await blob.put('proj_1', fakeHash, 'original') // stores 'original' under fakeHash
		// Now fetching with verify will mismatch because sha256('original') ≠ fakeHash
		await expect(blob.get('proj_1', fakeHash, { verify: true })).rejects.toThrow(BlobIntegrityError)
	})

	it('delete is a no-op on missing blob', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('nope')
		await expect(blob.delete('proj_1', hash)).resolves.toBeUndefined()
	})

	it('delete removes an existing blob', async () => {
		const blob = new InMemoryBlobStorage()
		const hash = await sha256Hex('x')
		await blob.put('proj_1', hash, 'x')
		await blob.delete('proj_1', hash)
		expect(await blob.exists('proj_1', hash)).toBe(false)
	})
})
