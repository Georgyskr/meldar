import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

const FAKE_UUID = '00000000-0000-0000-0000-000000000000'
const FAKE_UUID2 = '00000000-0000-0000-0000-000000000001'

const ROUTES: Array<{ method: string; path: string; label: string }> = [
	{ method: 'POST', path: '/api/auth/login', label: 'auth/login' },
	{ method: 'POST', path: '/api/auth/register', label: 'auth/register' },
	{ method: 'GET', path: '/api/auth/me', label: 'auth/me' },
	{ method: 'POST', path: '/api/auth/forgot-password', label: 'auth/forgot-password' },
	{ method: 'POST', path: '/api/auth/reset-password', label: 'auth/reset-password' },
	{ method: 'GET', path: '/api/auth/verify-email', label: 'auth/verify-email' },
	{ method: 'POST', path: '/api/auth/resend-verification', label: 'auth/resend-verification' },
	{ method: 'GET', path: '/api/auth/google', label: 'auth/google' },

	{ method: 'GET', path: '/api/workspace/projects', label: 'workspace/projects GET' },
	{ method: 'GET', path: '/api/workspace/tokens', label: 'workspace/tokens GET' },
	{
		method: 'POST',
		path: '/api/workspace/tokens/claim-daily',
		label: 'workspace/tokens/claim-daily',
	},

	{ method: 'POST', path: `/api/workspace/${FAKE_UUID}/build`, label: 'workspace/build' },
	{
		method: 'POST',
		path: `/api/workspace/${FAKE_UUID}/apply-template`,
		label: 'workspace/apply-template',
	},
	{
		method: 'POST',
		path: `/api/workspace/${FAKE_UUID}/ask-question`,
		label: 'workspace/ask-question',
	},
	{
		method: 'POST',
		path: `/api/workspace/${FAKE_UUID}/generate-plan`,
		label: 'workspace/generate-plan',
	},
	{
		method: 'POST',
		path: `/api/workspace/${FAKE_UUID}/improve-prompt`,
		label: 'workspace/improve-prompt',
	},
	{
		method: 'GET',
		path: `/api/workspace/${FAKE_UUID}/build-decisions`,
		label: 'workspace/build-decisions',
	},
	{ method: 'GET', path: `/api/workspace/${FAKE_UUID}/cards`, label: 'workspace/cards GET' },
	{ method: 'GET', path: `/api/workspace/${FAKE_UUID}/files`, label: 'workspace/files' },

	{
		method: 'PATCH',
		path: `/api/workspace/${FAKE_UUID}/cards/${FAKE_UUID2}`,
		label: 'workspace/cards/[cardId] PATCH',
	},
	{
		method: 'PATCH',
		path: `/api/workspace/${FAKE_UUID}/cards/reorder`,
		label: 'workspace/cards/reorder',
	},

	{ method: 'POST', path: '/api/billing/checkout', label: 'billing/checkout' },
	{ method: 'POST', path: '/api/billing/webhook', label: 'billing/webhook' },

	{ method: 'GET', path: '/api/cron/purge', label: 'cron/purge' },
	{ method: 'GET', path: '/api/cron/spend-alert', label: 'cron/spend-alert' },
	{ method: 'GET', path: '/api/cron/email-touchpoints', label: 'cron/email-touchpoints' },
]

test.describe('API route existence smoke test', () => {
	for (const route of ROUTES) {
		test(`${route.label} → not 404`, async ({ request }) => {
			const res = await request.fetch(route.path, {
				method: route.method,
				headers: { 'Content-Type': 'application/json' },
				data: route.method !== 'GET' ? '{}' : undefined,
			})
			expect(
				res.status(),
				`${route.method} ${route.path} returned 404 — route file is missing from deployment`,
			).not.toBe(404)
		})
	}
})
