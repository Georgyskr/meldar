import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deployToVercel } from '../vercel-deploy'

describe('deployToVercel', () => {
	const ORIGINAL_ENV = { ...process.env }

	beforeEach(() => {
		process.env.MELDAR_DEPLOY_TOKEN = 'test-token'
		process.env.VERCEL_TEAM_ID = 'team_xxx'
		process.env.VERCEL_APPS_DOMAIN = 'apps.meldar.ai'
	})

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV }
		vi.clearAllMocks()
	})

	function makeFetchSequence(responses: Response[]): typeof fetch {
		let i = 0
		return vi.fn(async () => {
			const res = responses[i++]
			if (!res) throw new Error(`no response for call ${i}`)
			return res
		}) as unknown as typeof fetch
	}

	it('returns not_configured when MELDAR_DEPLOY_TOKEN is missing', async () => {
		delete process.env.MELDAR_DEPLOY_TOKEN
		const result = await deployToVercel({
			slug: 'quiet-forest-4721',
			files: [{ path: 'package.json', content: '{}' }],
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error.kind).toBe('not_configured')
			if (result.error.kind === 'not_configured') {
				expect(result.error.missing).toContain('MELDAR_DEPLOY_TOKEN')
			}
		}
	})

	it('runs the full 6-step sequence on the happy path', async () => {
		const fetchMock = makeFetchSequence([
			new Response(JSON.stringify({ id: 'prj_abc' }), { status: 200 }), // createProject
			new Response('', { status: 200 }), // uploadFile
			new Response(JSON.stringify({ id: 'dpl_xyz' }), { status: 200 }), // createDeployment
			new Response(JSON.stringify({ readyState: 'READY' }), { status: 200 }), // pollState
			new Response(JSON.stringify({ name: 'quiet-forest-4721.apps.meldar.ai' }), { status: 200 }), // addDomain
			new Response(JSON.stringify({ alias: 'quiet-forest-4721.apps.meldar.ai' }), { status: 200 }), // aliasDeployment
			new Response('', { status: 200 }), // HEAD cert warm-up
		])

		const result = await deployToVercel({
			slug: 'quiet-forest-4721',
			files: [{ path: 'package.json', content: '{}' }],
			fetchImpl: fetchMock,
		})

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.url).toBe('https://quiet-forest-4721.apps.meldar.ai')
			expect(result.vercelProjectId).toBe('prj_abc')
			expect(result.vercelDeploymentId).toBe('dpl_xyz')
		}
	})

	it('handles a 409 on project create by looking up the existing project', async () => {
		const fetchMock = makeFetchSequence([
			new Response(JSON.stringify({ error: 'conflict' }), { status: 409 }), // createProject 409
			new Response(JSON.stringify({ id: 'prj_existing' }), { status: 200 }), // lookup
			new Response('', { status: 200 }), // uploadFile
			new Response(JSON.stringify({ id: 'dpl_xyz' }), { status: 200 }), // createDeployment
			new Response(JSON.stringify({ readyState: 'READY' }), { status: 200 }), // poll
			new Response(JSON.stringify({ name: 'x.apps.meldar.ai' }), { status: 200 }), // addDomain
			new Response(JSON.stringify({ alias: 'x.apps.meldar.ai' }), { status: 200 }), // alias
			new Response('', { status: 200 }), // HEAD
		])

		const result = await deployToVercel({
			slug: 'happy-panda-8832',
			files: [{ path: 'package.json', content: '{}' }],
			fetchImpl: fetchMock,
		})

		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.vercelProjectId).toBe('prj_existing')
		}
	})

	it('maps ERROR readyState to deployment_build_failed', async () => {
		const fetchMock = makeFetchSequence([
			new Response(JSON.stringify({ id: 'prj_abc' }), { status: 200 }),
			new Response('', { status: 200 }),
			new Response(JSON.stringify({ id: 'dpl_xyz' }), { status: 200 }),
			new Response(JSON.stringify({ readyState: 'ERROR' }), { status: 200 }),
		])

		const result = await deployToVercel({
			slug: 'quiet-forest-4721',
			files: [{ path: 'package.json', content: '{}' }],
			fetchImpl: fetchMock,
		})

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error.kind).toBe('deployment_build_failed')
		}
	})

	it('maps upload failure to upload_failed with the path', async () => {
		const fetchMock = makeFetchSequence([
			new Response(JSON.stringify({ id: 'prj_abc' }), { status: 200 }),
			new Response('upload error', { status: 413 }), // upload fails
		])

		const result = await deployToVercel({
			slug: 'quiet-forest-4721',
			files: [{ path: 'package.json', content: '{}' }],
			fetchImpl: fetchMock,
		})

		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error.kind).toBe('upload_failed')
			if (result.error.kind === 'upload_failed') {
				expect(result.error.path).toBe('package.json')
				expect(result.error.status).toBe(413)
			}
		}
	})

	it('accepts 409 on addDomain as idempotent success', async () => {
		const fetchMock = makeFetchSequence([
			new Response(JSON.stringify({ id: 'prj_abc' }), { status: 200 }),
			new Response('', { status: 200 }),
			new Response(JSON.stringify({ id: 'dpl_xyz' }), { status: 200 }),
			new Response(JSON.stringify({ readyState: 'READY' }), { status: 200 }),
			new Response(JSON.stringify({ error: 'already exists' }), { status: 409 }), // addDomain 409
			new Response(JSON.stringify({ alias: 'x.apps.meldar.ai' }), { status: 200 }),
			new Response('', { status: 200 }),
		])

		const result = await deployToVercel({
			slug: 'quiet-forest-4721',
			files: [{ path: 'package.json', content: '{}' }],
			fetchImpl: fetchMock,
		})

		expect(result.ok).toBe(true)
	})
})
