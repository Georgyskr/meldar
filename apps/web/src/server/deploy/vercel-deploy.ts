import { createHash } from 'node:crypto'

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 5 * 60 * 1_000
const UPLOAD_CONCURRENCY = 8

export type ReadyState =
	| 'QUEUED'
	| 'INITIALIZING'
	| 'BUILDING'
	| 'UPLOADING'
	| 'DEPLOYING'
	| 'READY'
	| 'ERROR'
	| 'CANCELED'

export type DeployError =
	| { readonly kind: 'not_configured'; readonly missing: readonly string[] }
	| { readonly kind: 'project_create_failed'; readonly status: number; readonly body: string }
	| { readonly kind: 'upload_failed'; readonly path: string; readonly status: number }
	| { readonly kind: 'deployment_create_failed'; readonly status: number; readonly body: string }
	| {
			readonly kind: 'deployment_build_failed'
			readonly deploymentId: string
			readonly lastState: ReadyState
	  }
	| {
			readonly kind: 'deployment_timeout'
			readonly deploymentId: string
			readonly lastState: ReadyState
	  }
	| { readonly kind: 'domain_add_failed'; readonly status: number; readonly body: string }
	| { readonly kind: 'alias_failed'; readonly status: number; readonly body: string }
	| { readonly kind: 'network_error'; readonly message: string }

export type DeployResult =
	| {
			readonly ok: true
			readonly url: string
			readonly vercelProjectId: string
			readonly vercelDeploymentId: string
			readonly apiLatencyMs: number
			readonly buildDurationMs: number
	  }
	| {
			readonly ok: false
			readonly error: DeployError
			readonly vercelProjectId?: string
			readonly vercelDeploymentId?: string
			readonly apiLatencyMs: number
	  }

export type DeployInput = {
	readonly slug: string
	readonly files: ReadonlyArray<{ readonly path: string; readonly content: string }>
	readonly signal?: AbortSignal
	readonly fetchImpl?: typeof fetch
}

type VercelConfig = {
	readonly token: string
	readonly teamId: string | undefined
	readonly appsDomain: string
}

function readConfig(): VercelConfig | { readonly missing: string[] } {
	const token = process.env.MELDAR_DEPLOY_TOKEN
	const appsDomain = process.env.VERCEL_APPS_DOMAIN ?? 'apps.meldar.ai'
	const missing: string[] = []
	if (!token) missing.push('MELDAR_DEPLOY_TOKEN')
	if (missing.length > 0) return { missing }
	return {
		token: token as string,
		teamId: process.env.VERCEL_TEAM_ID,
		appsDomain,
	}
}

export async function deployToVercel(input: DeployInput): Promise<DeployResult> {
	const startedAt = Date.now()
	const config = readConfig()
	if ('missing' in config) {
		return {
			ok: false,
			error: { kind: 'not_configured', missing: config.missing },
			apiLatencyMs: 0,
		}
	}

	const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis)
	const vercel = createVercelClient(config, fetchImpl, input.signal)
	const projectName = `meldar-${input.slug}`.slice(0, 52)
	const hostname = `${input.slug}.${config.appsDomain}`

	let vercelProjectId: string
	try {
		vercelProjectId = await vercel.ensureProject(projectName)
	} catch (err) {
		return toNetworkError(err, startedAt)
	}

	const manifest: Array<{ file: string; sha: string; size: number }> = []
	try {
		const workQueue = input.files.map((f) => ({
			path: f.path,
			bytes: new TextEncoder().encode(f.content),
		}))
		const manifestMap = await uploadAllFiles(workQueue, vercel, UPLOAD_CONCURRENCY)
		for (const f of workQueue) {
			const entry = manifestMap.get(f.path)
			if (!entry) continue
			manifest.push({ file: f.path, sha: entry.sha, size: entry.size })
		}
	} catch (err) {
		if (err instanceof VercelApiError) {
			return {
				ok: false,
				error: { kind: 'upload_failed', path: err.extra ?? '<unknown>', status: err.status },
				apiLatencyMs: Date.now() - startedAt,
				vercelProjectId,
			}
		}
		return toNetworkError(err, startedAt, vercelProjectId)
	}

	let deploymentId: string
	try {
		deploymentId = await vercel.createDeployment({
			name: projectName,
			projectId: vercelProjectId,
			files: manifest,
		})
	} catch (err) {
		if (err instanceof VercelApiError) {
			return {
				ok: false,
				error: { kind: 'deployment_create_failed', status: err.status, body: err.bodyPreview },
				apiLatencyMs: Date.now() - startedAt,
				vercelProjectId,
			}
		}
		return toNetworkError(err, startedAt, vercelProjectId)
	}

	const buildStart = Date.now()
	let lastState: ReadyState = 'QUEUED'
	try {
		while (Date.now() - buildStart < POLL_TIMEOUT_MS) {
			if (input.signal?.aborted) {
				return {
					ok: false,
					error: { kind: 'network_error', message: 'aborted' },
					apiLatencyMs: Date.now() - startedAt,
					vercelProjectId,
					vercelDeploymentId: deploymentId,
				}
			}
			const state = await vercel.getDeploymentState(deploymentId)
			lastState = state
			if (state === 'READY') break
			if (state === 'ERROR' || state === 'CANCELED') {
				return {
					ok: false,
					error: { kind: 'deployment_build_failed', deploymentId, lastState: state },
					apiLatencyMs: Date.now() - startedAt,
					vercelProjectId,
					vercelDeploymentId: deploymentId,
				}
			}
			await sleep(POLL_INTERVAL_MS, input.signal)
		}
		if (lastState !== 'READY') {
			return {
				ok: false,
				error: { kind: 'deployment_timeout', deploymentId, lastState },
				apiLatencyMs: Date.now() - startedAt,
				vercelProjectId,
				vercelDeploymentId: deploymentId,
			}
		}
	} catch (err) {
		return toNetworkError(err, startedAt, vercelProjectId, deploymentId)
	}
	const buildDurationMs = Date.now() - buildStart

	try {
		await vercel.addDomainIfMissing(vercelProjectId, hostname)
	} catch (err) {
		if (err instanceof VercelApiError) {
			return {
				ok: false,
				error: { kind: 'domain_add_failed', status: err.status, body: err.bodyPreview },
				apiLatencyMs: Date.now() - startedAt,
				vercelProjectId,
				vercelDeploymentId: deploymentId,
			}
		}
		return toNetworkError(err, startedAt, vercelProjectId, deploymentId)
	}

	try {
		await vercel.aliasDeployment(deploymentId, hostname)
	} catch (err) {
		if (err instanceof VercelApiError) {
			return {
				ok: false,
				error: { kind: 'alias_failed', status: err.status, body: err.bodyPreview },
				apiLatencyMs: Date.now() - startedAt,
				vercelProjectId,
				vercelDeploymentId: deploymentId,
			}
		}
		return toNetworkError(err, startedAt, vercelProjectId, deploymentId)
	}

	const finalUrl = `https://${hostname}`
	try {
		await fetchImpl(finalUrl, { method: 'HEAD', signal: input.signal }).catch(() => {})
	} catch {}

	return {
		ok: true,
		url: finalUrl,
		vercelProjectId,
		vercelDeploymentId: deploymentId,
		apiLatencyMs: Date.now() - startedAt,
		buildDurationMs,
	}
}

class VercelApiError extends Error {
	constructor(
		readonly status: number,
		readonly bodyPreview: string,
		readonly extra?: string,
	) {
		super(`Vercel API ${status}: ${bodyPreview.slice(0, 200)}`)
		this.name = 'VercelApiError'
	}
}

type VercelClient = {
	ensureProject: (name: string) => Promise<string>
	uploadFile: (sha: string, bytes: Uint8Array, path: string) => Promise<void>
	createDeployment: (opts: {
		name: string
		projectId: string
		files: Array<{ file: string; sha: string; size: number }>
	}) => Promise<string>
	getDeploymentState: (id: string) => Promise<ReadyState>
	addDomainIfMissing: (projectId: string, hostname: string) => Promise<void>
	aliasDeployment: (deploymentId: string, hostname: string) => Promise<void>
}

function createVercelClient(
	config: VercelConfig,
	fetchImpl: typeof fetch,
	signal: AbortSignal | undefined,
): VercelClient {
	const teamQuery = config.teamId ? `?teamId=${encodeURIComponent(config.teamId)}` : ''
	const withTeam = (path: string): string => {
		const joiner = path.includes('?') ? '&' : '?'
		return config.teamId ? `${path}${joiner}teamId=${encodeURIComponent(config.teamId)}` : path
	}
	const baseHeaders = {
		Authorization: `Bearer ${config.token}`,
	}

	async function jsonFetch(url: string, init: RequestInit): Promise<Response> {
		const res = await fetchImpl(`https://api.vercel.com${url}`, {
			...init,
			signal,
			headers: { ...baseHeaders, ...(init.headers as Record<string, string>) },
		})
		return res
	}

	return {
		async ensureProject(name) {
			const res = await jsonFetch(withTeam('/v11/projects'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name,
					framework: 'nextjs',
				}),
			})
			if (res.ok) {
				const body = (await res.json()) as { id: string }
				return body.id
			}
			if (res.status === 409) {
				const lookupRes = await jsonFetch(withTeam(`/v9/projects/${encodeURIComponent(name)}`), {
					method: 'GET',
				})
				if (!lookupRes.ok) {
					const text = await lookupRes.text()
					throw new VercelApiError(lookupRes.status, text)
				}
				const body = (await lookupRes.json()) as { id: string }
				return body.id
			}
			const text = await res.text()
			throw new VercelApiError(res.status, text)
		},

		async uploadFile(sha, bytes, path) {
			const res = await fetchImpl(`https://api.vercel.com/v2/files${teamQuery}`, {
				method: 'POST',
				signal,
				headers: {
					...baseHeaders,
					'content-type': 'application/octet-stream',
					'content-length': String(bytes.byteLength),
					'x-vercel-digest': sha,
				},
				body: bytes as unknown as BodyInit,
			})
			if (!res.ok) {
				const text = await res.text().catch(() => '<no body>')
				throw new VercelApiError(res.status, text, path)
			}
		},

		async createDeployment(opts) {
			const res = await jsonFetch(withTeam('/v13/deployments?forceNew=1'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: opts.name,
					project: opts.projectId,
					target: 'production',
					files: opts.files,
					projectSettings: {
						framework: 'nextjs',
						installCommand: 'npm install --ignore-scripts',
						buildCommand: 'npx panda codegen --silent && npx next build',
					},
					gitSource: null,
				}),
			})
			if (!res.ok) {
				const text = await res.text()
				throw new VercelApiError(res.status, text)
			}
			const body = (await res.json()) as { id: string }
			return body.id
		},

		async getDeploymentState(id) {
			const res = await jsonFetch(withTeam(`/v13/deployments/${id}`), {
				method: 'GET',
			})
			if (!res.ok) {
				const text = await res.text()
				throw new VercelApiError(res.status, text)
			}
			const body = (await res.json()) as { readyState?: ReadyState }
			return body.readyState ?? 'QUEUED'
		},

		async addDomainIfMissing(projectId, hostname) {
			const res = await jsonFetch(withTeam(`/v10/projects/${projectId}/domains`), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: hostname }),
			})
			if (res.ok) return
			if (res.status === 409) return // domain already attached — idempotent
			const text = await res.text()
			throw new VercelApiError(res.status, text)
		},

		async aliasDeployment(deploymentId, hostname) {
			const res = await jsonFetch(withTeam(`/v2/deployments/${deploymentId}/aliases`), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ alias: hostname }),
			})
			if (!res.ok) {
				const text = await res.text()
				const isCertPending =
					res.status === 400 && text.includes('cert_missing')
				const isAlreadyAliased =
					res.status === 409 ||
					(res.status === 400 && text.includes('not_modified'))
				if (isCertPending || isAlreadyAliased) return
				throw new VercelApiError(res.status, text)
			}
		},
	}
}

async function uploadAllFiles(
	files: Array<{ path: string; bytes: Uint8Array }>,
	vercel: VercelClient,
	concurrency: number,
): Promise<Map<string, { sha: string; size: number }>> {
	const result = new Map<string, { sha: string; size: number }>()
	const queue = [...files]
	const workers = Array.from({ length: Math.min(concurrency, files.length) }, async () => {
		while (queue.length > 0) {
			const next = queue.shift()
			if (!next) return
			const sha = sha1(next.bytes)
			await vercel.uploadFile(sha, next.bytes, next.path)
			result.set(next.path, { sha, size: next.bytes.byteLength })
		}
	})
	await Promise.all(workers)
	return result
}

function sha1(bytes: Uint8Array): string {
	return createHash('sha1').update(bytes).digest('hex')
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer)
			reject(new Error('aborted'))
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort)
			resolve()
		}, ms)
		if (signal) {
			signal.addEventListener('abort', onAbort, { once: true })
		}
	})
}

function toNetworkError(
	err: unknown,
	startedAt: number,
	vercelProjectId?: string,
	vercelDeploymentId?: string,
): DeployResult {
	return {
		ok: false,
		error: { kind: 'network_error', message: err instanceof Error ? err.message : String(err) },
		apiLatencyMs: Date.now() - startedAt,
		vercelProjectId,
		vercelDeploymentId,
	}
}
