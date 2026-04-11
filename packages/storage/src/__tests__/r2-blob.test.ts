import { type FetchMockHandler, makeFetchMock } from '@meldar/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sha256Hex } from '../blob'
import { BlobIntegrityError, BlobStorageError } from '../errors'
import { R2BlobStorage } from '../r2-blob'

const VALID_HASH = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' // sha256('hello')

/**
 * aws4fetch passes a single Request object as the first arg to fetch (not
 * url + init). These helpers extract what we want to assert on without
 * caring about the specific shape.
 */
function getCallUrl(call: unknown[]): string {
	const arg = call[0]
	if (arg instanceof Request) return arg.url
	return String(arg)
}

function getCallMethod(call: unknown[]): string {
	const arg = call[0]
	if (arg instanceof Request) return arg.method
	const init = call[1] as RequestInit | undefined
	return init?.method ?? 'GET'
}

function getCallHeader(call: unknown[], name: string): string | null {
	const arg = call[0]
	if (arg instanceof Request) return arg.headers.get(name)
	const init = call[1] as RequestInit | undefined
	const headers = init?.headers as Record<string, string> | undefined
	return headers?.[name] ?? headers?.[name.toLowerCase()] ?? null
}

async function getCallBody(call: unknown[]): Promise<string | null> {
	const arg = call[0]
	if (arg instanceof Request) {
		const cloned = arg.clone()
		return cloned.text()
	}
	const init = call[1] as RequestInit | undefined
	if (typeof init?.body === 'string') return init.body
	return null
}

const config = {
	accountId: 'acct_test',
	accessKeyId: 'AKIA_TEST',
	secretAccessKey: 'secret_test',
	bucket: 'meldar-test',
}

describe('R2BlobStorage', () => {
	let fetchMock: ReturnType<typeof vi.fn<FetchMockHandler>>
	let originalFetch: typeof globalThis.fetch

	beforeEach(() => {
		originalFetch = globalThis.fetch
		fetchMock = vi.fn<FetchMockHandler>()
		globalThis.fetch = makeFetchMock(fetchMock)
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	describe('config validation', () => {
		it('throws if any required field is missing', () => {
			expect(() => new R2BlobStorage({ ...config, accountId: '' })).toThrow(
				/missing required config/,
			)
			expect(() => new R2BlobStorage({ ...config, bucket: '' })).toThrow(/missing required config/)
		})

		it('fromEnv reads vars from process.env-shape object', () => {
			const env = {
				R2_ACCOUNT_ID: 'acct_x',
				R2_ACCESS_KEY_ID: 'k',
				R2_SECRET_ACCESS_KEY: 's',
				R2_BUCKET: 'b',
			}
			expect(() => R2BlobStorage.fromEnv(env)).not.toThrow()
		})

		it('fromEnv throws with a clear message when vars are missing', () => {
			expect(() => R2BlobStorage.fromEnv({})).toThrow(/R2_ACCOUNT_ID/)
		})
	})

	describe('put', () => {
		it('issues a PUT to the content-addressed URL', async () => {
			fetchMock
				.mockResolvedValueOnce(new Response(null, { status: 404 })) // exists() check
				.mockResolvedValueOnce(new Response(null, { status: 200 })) // PUT

			const blob = new R2BlobStorage(config)
			await blob.put('proj_1', VALID_HASH, 'hello')

			const putCall = fetchMock.mock.calls[1]
			expect(getCallUrl(putCall)).toBe(
				`https://acct_test.r2.cloudflarestorage.com/meldar-test/projects/proj_1/content/${VALID_HASH}`,
			)
			expect(getCallMethod(putCall)).toBe('PUT')
			expect(await getCallBody(putCall)).toBe('hello')
		})

		it('skips the PUT if the blob already exists (idempotent)', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 })) // exists() returns true

			const blob = new R2BlobStorage(config)
			await blob.put('proj_1', VALID_HASH, 'hello')

			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(getCallMethod(fetchMock.mock.calls[0])).toBe('HEAD')
		})

		it('attaches a SHA256 integrity header', async () => {
			fetchMock
				.mockResolvedValueOnce(new Response(null, { status: 404 }))
				.mockResolvedValueOnce(new Response(null, { status: 200 }))

			const blob = new R2BlobStorage(config)
			await blob.put('proj_1', VALID_HASH, 'hello')

			const putCall = fetchMock.mock.calls[1]
			expect(getCallHeader(putCall, 'x-amz-checksum-algorithm')).toBe('SHA256')
			expect(getCallHeader(putCall, 'x-amz-checksum-sha256')).toBe(
				'LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=',
			)
		})

		it('throws BlobStorageError on a non-2xx response', async () => {
			fetchMock
				.mockResolvedValueOnce(new Response(null, { status: 404 }))
				.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }))

			const blob = new R2BlobStorage(config)
			await expect(blob.put('proj_1', VALID_HASH, 'hello')).rejects.toThrow(BlobStorageError)
		})

		it('wraps network errors in BlobStorageError', async () => {
			fetchMock.mockRejectedValue(new Error('ECONNRESET'))

			const blob = new R2BlobStorage(config)
			await expect(blob.put('proj_1', VALID_HASH, 'hello')).rejects.toThrow(BlobStorageError)
		})
	})

	describe('get', () => {
		it('returns the response body on success', async () => {
			fetchMock.mockResolvedValueOnce(new Response('hello', { status: 200 }))

			const blob = new R2BlobStorage(config)
			const content = await blob.get('proj_1', VALID_HASH)
			expect(content).toBe('hello')
		})

		it('verifies integrity when verify: true', async () => {
			fetchMock.mockResolvedValueOnce(new Response('hello', { status: 200 }))

			const blob = new R2BlobStorage(config)
			const content = await blob.get('proj_1', VALID_HASH, { verify: true })
			expect(content).toBe('hello')
		})

		it("throws BlobIntegrityError when verify: true and content doesn't match hash", async () => {
			fetchMock.mockResolvedValueOnce(new Response('tampered', { status: 200 }))

			const blob = new R2BlobStorage(config)
			await expect(blob.get('proj_1', VALID_HASH, { verify: true })).rejects.toThrow(
				BlobIntegrityError,
			)
		})

		it('throws BlobStorageError on 404', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))

			const blob = new R2BlobStorage(config)
			await expect(blob.get('proj_1', VALID_HASH)).rejects.toThrow(BlobStorageError)
		})

		it('throws BlobStorageError on 5xx', async () => {
			fetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }))

			const blob = new R2BlobStorage(config)
			await expect(blob.get('proj_1', VALID_HASH)).rejects.toThrow(BlobStorageError)
		})
	})

	describe('exists', () => {
		it('returns true on 200', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
			const blob = new R2BlobStorage(config)
			expect(await blob.exists('proj_1', VALID_HASH)).toBe(true)
		})

		it('returns false on 404', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
			const blob = new R2BlobStorage(config)
			expect(await blob.exists('proj_1', VALID_HASH)).toBe(false)
		})

		it('uses HEAD method', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
			const blob = new R2BlobStorage(config)
			await blob.exists('proj_1', VALID_HASH)
			expect(getCallMethod(fetchMock.mock.calls[0])).toBe('HEAD')
		})
	})

	describe('delete', () => {
		it('treats 204 as success', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
			const blob = new R2BlobStorage(config)
			await expect(blob.delete('proj_1', VALID_HASH)).resolves.toBeUndefined()
		})

		it('treats 404 as success (idempotent)', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
			const blob = new R2BlobStorage(config)
			await expect(blob.delete('proj_1', VALID_HASH)).resolves.toBeUndefined()
		})

		it('throws on unexpected status', async () => {
			fetchMock.mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
			const blob = new R2BlobStorage(config)
			await expect(blob.delete('proj_1', VALID_HASH)).rejects.toThrow(BlobStorageError)
		})

		it('uses DELETE method', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
			const blob = new R2BlobStorage(config)
			await blob.delete('proj_1', VALID_HASH)
			expect(getCallMethod(fetchMock.mock.calls[0])).toBe('DELETE')
		})
	})

	describe('URL construction', () => {
		it('uses path-style URLs', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
			const blob = new R2BlobStorage(config)
			await blob.exists('proj_abc', VALID_HASH)

			expect(getCallUrl(fetchMock.mock.calls[0])).toBe(
				`https://acct_test.r2.cloudflarestorage.com/meldar-test/projects/proj_abc/content/${VALID_HASH}`,
			)
		})

		it('honors a custom endpoint', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
			const blob = new R2BlobStorage({ ...config, endpoint: 'http://localhost:9000' })
			await blob.exists('proj_abc', VALID_HASH)

			expect(getCallUrl(fetchMock.mock.calls[0])).toBe(
				`http://localhost:9000/meldar-test/projects/proj_abc/content/${VALID_HASH}`,
			)
		})
	})

	it('sha256Hex sanity check (hello → expected hash)', async () => {
		expect(await sha256Hex('hello')).toBe(VALID_HASH)
	})
})
