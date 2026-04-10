#!/usr/bin/env npx tsx
/**
 * End-to-end API flow test against a running Meldar instance.
 * Tests the REAL flow with REAL API calls — no mocks.
 *
 * Usage:
 *   npx tsx apps/web/scripts/e2e-api-flow.ts [base-url]
 *   Default base URL: https://meldar.ai
 *
 * Requires E2E_EMAIL and E2E_PASSWORD env vars, or uses defaults.
 */

const BASE = process.argv[2] || 'https://meldar.ai'
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@meldar.ai'
const PASSWORD = process.env.E2E_PASSWORD || 'e2e-playwright-test-password-12345!'

let authCookie = process.env.MELDAR_AUTH_COOKIE || ''
let projectId = ''
let cardId = ''
let cardTitle = ''
const results: Array<{ step: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string; ms: number }> = []

async function api(
	method: string,
	path: string,
	body?: unknown,
	opts?: { raw?: boolean; timeout?: number },
): Promise<{ status: number; data: unknown; raw: string }> {
	const url = `${BASE}${path}`
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	if (authCookie) headers.Cookie = `meldar-auth=${authCookie}`

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), opts?.timeout ?? 10000)

	try {
		const res = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
			signal: controller.signal,
			redirect: 'manual',
		})
		clearTimeout(timer)

		const raw = await res.text()
		let data: unknown = raw
		try {
			data = JSON.parse(raw)
		} catch {}

		return { status: res.status, data, raw }
	} catch (err) {
		clearTimeout(timer)
		return { status: 0, data: { error: err instanceof Error ? err.message : String(err) }, raw: '' }
	}
}

async function step(name: string, fn: () => Promise<string>): Promise<boolean> {
	const start = Date.now()
	try {
		const detail = await fn()
		results.push({ step: name, status: 'PASS', detail, ms: Date.now() - start })
		console.log(`  ✅ ${name} (${Date.now() - start}ms) — ${detail}`)
		return true
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err)
		results.push({ step: name, status: 'FAIL', detail, ms: Date.now() - start })
		console.log(`  ❌ ${name} (${Date.now() - start}ms) — ${detail}`)
		return false
	}
}

function skip(name: string, reason: string) {
	results.push({ step: name, status: 'SKIP', detail: reason, ms: 0 })
	console.log(`  ⏭️  ${name} — SKIPPED: ${reason}`)
}

function assert(condition: boolean, msg: string) {
	if (!condition) throw new Error(msg)
}

// ── Steps ────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
	const res = await api('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD })
	assert(res.status === 200, `Login failed: ${res.status} ${JSON.stringify(res.data)}`)

	const setCookie = res.raw // The fetch API doesn't give us Set-Cookie easily
	// Try extracting from a second request - verify /me works
	// Actually, fetch doesn't forward Set-Cookie. Let's extract the token from response if available.
	// Workaround: use the login response to get user, then make a second call
	const body = res.data as { success?: boolean; token?: string }
	assert(body.success === true, `Login response: ${JSON.stringify(body)}`)

	// The cookie is httpOnly so we can't read it from JS.
	// Use a raw HTTP approach instead.
	const rawRes = await fetch(`${BASE}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
		redirect: 'manual',
	})
	const cookies = rawRes.headers.getSetCookie?.() ?? []
	const meldarCookie = cookies.find((c) => c.startsWith('meldar-auth='))
	if (meldarCookie) {
		authCookie = meldarCookie.split('=')[1].split(';')[0]
	}
	assert(authCookie.length > 0, 'Could not extract auth cookie from Set-Cookie header')
	return `authenticated as ${EMAIL}`
}

async function verifyAuth(): Promise<string> {
	const res = await api('GET', '/api/auth/me')
	assert(res.status === 200, `GET /me failed: ${res.status} ${JSON.stringify(res.data)}`)
	const body = res.data as { user?: { email?: string } }
	return `verified: ${body.user?.email}`
}

async function createProject(): Promise<string> {
	const res = await api('POST', '/api/workspace/projects', { name: 'E2E Flow Test' })
	assert(res.status === 201 || res.status === 200, `Create project: ${res.status} ${JSON.stringify(res.data)}`)
	const body = res.data as { projectId?: string }
	assert(!!body.projectId, `No projectId in response: ${JSON.stringify(body)}`)
	projectId = body.projectId!
	return `projectId: ${projectId}`
}

async function generateProposal(): Promise<string> {
	const res = await api('POST', `/api/workspace/${projectId}/generate-proposal`, {
		description: 'a simple todo list app',
	}, { timeout: 30000 })
	assert(res.status === 200, `Generate proposal: ${res.status} ${JSON.stringify(res.data)}`)
	const body = res.data as { proposal?: { appType?: string; sections?: string[] } }
	assert(!!body.proposal?.appType, `No appType: ${JSON.stringify(body)}`)
	assert(Array.isArray(body.proposal?.sections), `No sections: ${JSON.stringify(body)}`)
	return `"${body.proposal!.appType}" with ${body.proposal!.sections!.length} sections`
}

async function saveWishes(): Promise<string> {
	const res = await api('PATCH', `/api/workspace/${projectId}/wishes`, {
		originalDescription: 'a simple todo list app',
		proposal: {
			appType: 'Todo List',
			style: 'Clean minimal',
			palette: 'Light with blue accents',
			sections: ['Task list', 'Add task', 'Filters'],
			tone: 'Simple, focused',
		},
		approvedAt: new Date().toISOString(),
	})
	assert(res.status === 200, `Save wishes: ${res.status} ${JSON.stringify(res.data)}`)
	const body = res.data as { wishes?: { proposal?: { appType?: string } } }
	assert(!!body.wishes?.proposal, `No wishes in response: ${JSON.stringify(body)}`)
	return `wishes saved: ${body.wishes!.proposal!.appType}`
}

async function generatePlan(): Promise<string> {
	const res = await api('POST', `/api/workspace/${projectId}/generate-plan`, {
		messages: [
			{ role: 'user', content: 'a simple todo list app' },
			{ role: 'assistant', content: 'A todo list with tasks, filters, and a clean UI.' },
		],
	}, { timeout: 60000 })
	assert(res.status === 201 || res.status === 200, `Generate plan: ${res.status} ${JSON.stringify(res.data)}`)
	const body = res.data as { cards?: Array<{ id: string; title: string; parentId: string | null }> }
	assert(Array.isArray(body.cards) && body.cards.length > 0, `No cards: ${JSON.stringify(res.data)}`)
	const subtasks = body.cards!.filter((c) => c.parentId !== null)
	return `${body.cards!.length} cards (${subtasks.length} subtasks)`
}

async function applyTemplate(): Promise<string> {
	const res = await api('POST', `/api/workspace/${projectId}/apply-template`, {
		templateId: 'weight-tracker',
	})
	assert(res.status === 201 || res.status === 200, `Apply template: ${res.status} ${JSON.stringify(res.data)}`)
	const body = res.data as { cards?: unknown[] }
	assert(Array.isArray(body.cards) && body.cards.length > 0, `No cards from template: ${JSON.stringify(res.data)}`)
	return `template applied: ${body.cards!.length} cards`
}

async function getCards(): Promise<string> {
	const res = await api('GET', `/api/workspace/${projectId}/cards`)
	assert(res.status === 200, `Get cards: ${res.status}`)
	const body = res.data as { cards?: Array<{ id: string; title: string; parentId: string | null; state: string; description: string | null }> }
	assert(Array.isArray(body.cards) && body.cards.length > 0, 'No cards')
	const subtasks = body.cards!.filter((c) => c.parentId !== null)
	const first = subtasks[0]
	if (first) {
		cardId = first.id
		cardTitle = first.title
	}
	return `${subtasks.length} subtasks, first: "${cardTitle}"`
}

async function triggerBuild(): Promise<string> {
	assert(!!cardId, 'No card to build')
	const res = await api('POST', `/api/workspace/${projectId}/build`, {
		prompt: cardTitle,
		kanbanCardId: cardId,
	}, { timeout: 120000 })

	// The response is an SSE stream
	assert(res.status === 200, `Build: ${res.status} ${JSON.stringify(res.data)}`)

	const events = res.raw.split('\n\n').filter((chunk) => chunk.includes('data:'))
	const types = events
		.map((e) => {
			const dataLine = e.split('\n').find((l) => l.startsWith('data:'))
			if (!dataLine) return null
			try {
				const d = JSON.parse(dataLine.slice(5).trim())
				return d.type
			} catch {
				return dataLine.includes('[DONE]') ? 'done' : null
			}
		})
		.filter(Boolean)

	assert(types.includes('started'), `No 'started' event. Events: ${types.join(', ')}`)
	assert(types.includes('committed') || types.includes('failed'), `No terminal event. Events: ${types.join(', ')}`)

	const hasFiles = types.includes('file_written')
	const deployed = types.includes('deployed')
	const deployFailed = types.includes('deploy_failed')
	const deployCode = events
		.map((e) => {
			try {
				const d = JSON.parse(e.split('\n').find((l) => l.startsWith('data:'))?.slice(5) ?? '{}')
				return d.type === 'deploy_failed' ? d.code : null
			} catch { return null }
		})
		.find(Boolean)

	return `events: [${types.join(', ')}] files=${hasFiles} deployed=${deployed} deployFailed=${deployFailed}${deployCode ? ` (${deployCode})` : ''}`
}

async function improvePrompt(): Promise<string> {
	const res = await api('POST', `/api/workspace/${projectId}/improve-prompt`, {
		prompt: 'add a button that clears completed tasks',
	}, { timeout: 30000 })
	// 200 = improved, 402 = insufficient balance, 429 = rate limited — all acceptable
	assert(
		res.status === 200 || res.status === 402 || res.status === 429,
		`Improve prompt: ${res.status} ${JSON.stringify(res.data)}`,
	)
	if (res.status === 200) {
		const body = res.data as { improved?: string }
		return `improved: "${body.improved?.slice(0, 60)}..."`
	}
	return `${res.status} (expected — rate/balance limit)`
}

async function getFiles(): Promise<string> {
	const res = await api('GET', `/api/workspace/${projectId}/files?path=src/app/page.tsx`)
	if (res.status === 200) {
		const body = res.data as { content?: string; path?: string }
		return `file retrieved: ${body.path ?? 'src/app/page.tsx'} (${(body.content ?? '').length} chars)`
	}
	if (res.status === 404) {
		return 'no files yet (project has no builds)'
	}
	assert(false, `Get files: ${res.status} ${JSON.stringify(res.data)}`)
	return ''
}

async function checkRoutes(): Promise<string> {
	const routes = [
		['POST', '/api/auth/login'],
		['GET', '/api/auth/me'],
		['POST', '/api/workspace/projects'],
		['POST', `/api/workspace/${projectId}/build`],
		['POST', `/api/workspace/${projectId}/auto-build`],
		['POST', `/api/workspace/${projectId}/generate-proposal`],
		['PATCH', `/api/workspace/${projectId}/wishes`],
		['POST', `/api/workspace/${projectId}/generate-plan`],
		['POST', `/api/workspace/${projectId}/improve-prompt`],
		['GET', `/api/workspace/${projectId}/cards`],
		['GET', `/api/workspace/${projectId}/files`],
		['GET', `/api/workspace/${projectId}/build-decisions`],
	]
	const missing: string[] = []
	for (const [method, path] of routes) {
		const res = await api(method, path, method !== 'GET' ? {} : undefined)
		if (res.status === 404) missing.push(`${method} ${path}`)
	}
	assert(missing.length === 0, `Missing routes (404): ${missing.join(', ')}`)
	return `all ${routes.length} routes respond (no 404s)`
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log(`\n🔍 Meldar E2E API Flow Test`)
	console.log(`   Target: ${BASE}`)
	console.log(`   User: ${EMAIL}\n`)

	// Auth
	if (authCookie) {
		skip('1. Login', 'using MELDAR_AUTH_COOKIE env var')
	} else {
		const loggedIn = await step('1. Login', login)
		if (!loggedIn) { console.log('\n⛔ Cannot continue without auth.'); return }
	}
	await step('2. Verify auth', verifyAuth)

	// Project creation
	if (process.env.PROJECT_ID) {
		projectId = process.env.PROJECT_ID
		skip('3. Create project', `using PROJECT_ID env var: ${projectId}`)
	} else {
		const created = await step('3. Create project', createProject)
		if (!created) { console.log('\n⛔ Cannot continue without project.'); return }
	}

	// Route existence check
	await step('4. All routes exist (no 404s)', checkRoutes)

	// Proposal flow
	await step('5. Generate proposal (Haiku)', generateProposal)
	await step('6. Save wishes', saveWishes)

	// Plan generation — try Haiku first, fall back to template
	let planned = await step('7a. Generate plan (Haiku)', generatePlan)
	if (!planned) {
		planned = await step('7b. Apply template (fallback)', applyTemplate)
		if (!planned) { console.log('\n⛔ Cannot continue without plan.'); return }
	}

	// Cards
	const gotCards = await step('8. Get cards', getCards)
	if (!gotCards) { console.log('\n⛔ Cannot continue without cards.'); return }

	// Build
	await step('9. Trigger build (Sonnet)', triggerBuild)

	// Post-build
	await step('10. Get files', getFiles)
	await step('11. Improve prompt (Haiku)', improvePrompt)

	// Summary
	console.log('\n' + '═'.repeat(60))
	const passed = results.filter((r) => r.status === 'PASS').length
	const failed = results.filter((r) => r.status === 'FAIL').length
	const skipped = results.filter((r) => r.status === 'SKIP').length
	console.log(`\n  ${passed} passed, ${failed} failed, ${skipped} skipped out of ${results.length}`)

	if (failed > 0) {
		console.log('\n  Failed steps:')
		for (const r of results.filter((r) => r.status === 'FAIL')) {
			console.log(`    ❌ ${r.step}: ${r.detail}`)
		}
	}

	console.log('')
	process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
	console.error('Fatal:', err)
	process.exit(1)
})
