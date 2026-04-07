/**
 * Tests for CloudflareSandboxProvider — the HTTP client side of the
 * Cloudflare Worker integration.
 *
 * These tests run against a mocked fetch — they verify URL construction,
 * HMAC signing, request body shape, and error mapping. End-to-end tests
 * against a real deployed Worker live in a separate integration suite
 * (Sprint 1.5).
 */

import { type FetchMockHandler, makeFetchMock } from '@meldar/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudflareSandboxProvider } from '../cloudflare-provider'
import {
	SandboxNotFoundError,
	SandboxNotReadyError,
	SandboxStartFailedError,
	SandboxUnsafePathError,
	SandboxWriteFailedError,
} from '../errors'

const config = {
	workerUrl: 'https://meldar-sandbox.test.workers.dev',
	hmacSecret: 'test-secret',
}

describe('CloudflareSandboxProvider', () => {
	let fetchMock: ReturnType<typeof vi.fn<FetchMockHandler>>
	let provider: CloudflareSandboxProvider

	beforeEach(() => {
		fetchMock = vi.fn<FetchMockHandler>()
		provider = new CloudflareSandboxProvider({
			...config,
			fetchImpl: makeFetchMock(fetchMock),
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('config validation', () => {
		it('throws if workerUrl is missing', () => {
			expect(() => new CloudflareSandboxProvider({ ...config, workerUrl: '' })).toThrow(/required/)
		})

		it('throws if hmacSecret is missing', () => {
			expect(() => new CloudflareSandboxProvider({ ...config, hmacSecret: '' })).toThrow(/required/)
		})

		it('strips trailing slash from workerUrl', async () => {
			const p = new CloudflareSandboxProvider({
				workerUrl: 'https://example.com/',
				hmacSecret: 'x',
				fetchImpl: makeFetchMock(fetchMock),
			})
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ sandboxId: 's', previewUrl: 'u' }), { status: 200 }),
			)
			await p.start({ projectId: 'proj_1', userId: 'user_1', template: 't' })
			const url = fetchMock.mock.calls[0][0] as string
			expect(url).toBe('https://example.com/api/v1/start') // no double slash
		})

		it('fromEnv reads vars from a process.env-shape object', () => {
			expect(() =>
				CloudflareSandboxProvider.fromEnv({
					CF_SANDBOX_WORKER_URL: 'https://x',
					CF_SANDBOX_HMAC_SECRET: 'y',
				}),
			).not.toThrow()
		})

		it('fromEnv throws when env vars are missing', () => {
			expect(() => CloudflareSandboxProvider.fromEnv({})).toThrow(/CF_SANDBOX_WORKER_URL/)
		})
	})

	describe('HMAC signing', () => {
		it('attaches x-meldar-signature and x-meldar-timestamp headers', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ sandboxId: 's', previewUrl: 'u' }), { status: 200 }),
			)
			await provider.start({ projectId: 'proj_1', userId: 'user_1', template: 't' })

			const init = fetchMock.mock.calls[0][1] as RequestInit
			const headers = init.headers as Record<string, string>
			expect(headers['x-meldar-timestamp']).toMatch(/^\d+$/)
			expect(headers['x-meldar-signature']).toMatch(/^[0-9a-f]{64}$/)
		})

		it('produces a different signature for different request bodies (basic sanity)', async () => {
			// Each Response can only be consumed once, so create two distinct ones.
			fetchMock
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ sandboxId: 's', previewUrl: 'u' }), { status: 200 }),
				)
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ sandboxId: 's', previewUrl: 'u' }), { status: 200 }),
				)
			await provider.start({ projectId: 'proj_a', userId: 'user_1', template: 't' })
			await provider.start({ projectId: 'proj_b', userId: 'user_1', template: 't' })
			const sig1 = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
			const sig2 = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>
			expect(sig1['x-meldar-signature']).not.toBe(sig2['x-meldar-signature'])
		})
	})

	describe('start', () => {
		it('POSTs to /api/v1/start with the project metadata + initial files', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						sandboxId: 'sbx_1',
						previewUrl: 'https://3001-proj_1.workers.dev',
						status: 'ready',
						revision: 0,
					}),
					{ status: 200 },
				),
			)
			const handle = await provider.start({
				projectId: 'proj_1',
				userId: 'user_1',
				template: 'next-landing-v1',
				initialFiles: [{ path: 'src/app/page.tsx', content: 'hi' }],
			})

			const url = fetchMock.mock.calls[0][0] as string
			expect(url).toBe('https://meldar-sandbox.test.workers.dev/api/v1/start')

			const init = fetchMock.mock.calls[0][1] as RequestInit
			expect(init.method).toBe('POST')
			const body = JSON.parse(init.body as string)
			expect(body.projectId).toBe('proj_1')
			expect(body.userId).toBe('user_1')
			expect(body.template).toBe('next-landing-v1')
			expect(body.files).toHaveLength(1)

			expect(handle.previewUrl).toBe('https://3001-proj_1.workers.dev')
			expect(handle.projectId).toBe('proj_1')
			expect(handle.status).toBe('ready')
		})

		it('rejects unsafe paths in initialFiles before any HTTP call', async () => {
			await expect(
				provider.start({
					projectId: 'proj_1',
					userId: 'user_1',
					template: 't',
					initialFiles: [{ path: '../etc/passwd', content: 'pwned' }],
				}),
			).rejects.toThrow(SandboxUnsafePathError)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it('throws SandboxStartFailedError on a 5xx response', async () => {
			fetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }))
			await expect(
				provider.start({ projectId: 'proj_1', userId: 'user_1', template: 't' }),
			).rejects.toThrow(SandboxStartFailedError)
		})

		it('throws SandboxNotReadyError on a 409 Conflict', async () => {
			fetchMock.mockResolvedValueOnce(new Response('conflict', { status: 409 }))
			await expect(
				provider.start({ projectId: 'proj_1', userId: 'user_1', template: 't' }),
			).rejects.toThrow(SandboxNotReadyError)
		})

		it('throws SandboxStartFailedError when worker returns malformed JSON', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ status: 'ready' }), { status: 200 }),
			) // missing previewUrl
			await expect(
				provider.start({ projectId: 'proj_1', userId: 'user_1', template: 't' }),
			).rejects.toThrow(SandboxStartFailedError)
		})

		it('throws SandboxStartFailedError on network errors', async () => {
			fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))
			await expect(
				provider.start({ projectId: 'proj_1', userId: 'user_1', template: 't' }),
			).rejects.toThrow(SandboxStartFailedError)
		})

		it('honors timeoutMs and throws SandboxNotReadyError on AbortError', async () => {
			fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
			await expect(
				provider.start({ projectId: 'proj_1', userId: 'user_1', template: 't' }),
			).rejects.toThrow(SandboxNotReadyError)
		})
	})

	describe('writeFiles', () => {
		it('POSTs to /api/v1/write with the file batch', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						previewUrl: 'https://3001-proj_1.workers.dev',
						status: 'ready',
						revision: 3,
					}),
					{ status: 200 },
				),
			)
			const handle = await provider.writeFiles({
				projectId: 'proj_1',
				files: [
					{ path: 'a.ts', content: 'a' },
					{ path: 'b.ts', content: 'b' },
				],
			})

			const url = fetchMock.mock.calls[0][0] as string
			expect(url).toBe('https://meldar-sandbox.test.workers.dev/api/v1/write')
			const init = fetchMock.mock.calls[0][1] as RequestInit
			const body = JSON.parse(init.body as string)
			expect(body.files).toHaveLength(2)
			expect(handle.revision).toBe(3)
		})

		it('rejects unsafe paths before any HTTP call', async () => {
			await expect(
				provider.writeFiles({
					projectId: 'proj_1',
					files: [{ path: '/etc/passwd', content: 'pwned' }],
				}),
			).rejects.toThrow(SandboxUnsafePathError)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it('throws SandboxWriteFailedError when worker reports a failed file path', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						previewUrl: 'https://x',
						failedPath: 'src/app/page.tsx',
						error: 'disk full',
					}),
					{ status: 200 },
				),
			)
			try {
				await provider.writeFiles({
					projectId: 'proj_1',
					files: [{ path: 'src/app/page.tsx', content: 'hi' }],
				})
				expect.unreachable('should have thrown')
			} catch (err) {
				expect(err).toBeInstanceOf(SandboxWriteFailedError)
				expect((err as SandboxWriteFailedError).path).toBe('src/app/page.tsx')
			}
		})

		it('throws SandboxNotFoundError when worker returns 404', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
			await expect(
				provider.writeFiles({
					projectId: 'proj_1',
					files: [{ path: 'a.ts', content: 'a' }],
				}),
			).rejects.toThrow(SandboxNotFoundError)
		})
	})

	describe('getPreviewUrl', () => {
		it('returns the previewUrl from /api/v1/status', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ previewUrl: 'https://x', status: 'ready' }), {
					status: 200,
				}),
			)
			const url = await provider.getPreviewUrl('proj_1')
			expect(url).toBe('https://x')
		})

		it('returns null when worker returns 404', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
			expect(await provider.getPreviewUrl('proj_1')).toBeNull()
		})

		it('returns null when worker reports no previewUrl', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(JSON.stringify({ status: 'stopped' }), { status: 200 }),
			)
			expect(await provider.getPreviewUrl('proj_1')).toBeNull()
		})
	})

	describe('stop', () => {
		it('POSTs to /api/v1/stop and resolves on success', async () => {
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
			await expect(provider.stop('proj_1')).resolves.toBeUndefined()
			expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/stop')
		})

		it('treats 404 as success (idempotent stop)', async () => {
			fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
			await expect(provider.stop('proj_1')).resolves.toBeUndefined()
		})
	})

	describe('prewarm', () => {
		it('POSTs to /api/v1/prewarm and swallows errors silently (fire-and-forget)', async () => {
			fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))
			// Should NOT throw
			await expect(provider.prewarm('proj_1')).resolves.toBeUndefined()
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining('/api/v1/prewarm'),
				expect.anything(),
			)
		})

		it('does NOT throw when worker returns 5xx', async () => {
			fetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }))
			await expect(provider.prewarm('proj_1')).resolves.toBeUndefined()
		})

		it('completes normally on success', async () => {
			fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
			await expect(provider.prewarm('proj_1')).resolves.toBeUndefined()
		})
	})
})
