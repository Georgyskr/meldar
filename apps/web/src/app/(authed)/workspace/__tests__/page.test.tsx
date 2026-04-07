import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
	mockListUserProjects,
	mockVerifyToken,
	mockRedirect,
	mockCookieGet,
	mockDbSelect,
	mockDbFrom,
	mockDbWhere,
	mockDbLimit,
} = vi.hoisted(() => ({
	mockListUserProjects: vi.fn(),
	mockVerifyToken: vi.fn(),
	mockRedirect: vi.fn((path: string) => {
		throw new Error(`REDIRECT:${path}`)
	}),
	mockCookieGet: vi.fn(),
	mockDbSelect: vi.fn(),
	mockDbFrom: vi.fn(),
	mockDbWhere: vi.fn(),
	mockDbLimit: vi.fn(),
}))

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: mockDbSelect,
	}),
}))

vi.mock('@/server/projects/list-user-projects', () => ({
	listUserProjects: (...args: unknown[]) => mockListUserProjects(...args),
}))

vi.mock('@/server/identity/jwt', () => ({
	verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

vi.mock('next/headers', () => ({
	cookies: async () => ({ get: mockCookieGet }),
}))

vi.mock('next/navigation', () => ({
	redirect: (path: string) => mockRedirect(path),
}))

vi.mock('next/link', () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => ({
		type: 'a',
		props: { href, children },
	}),
}))

vi.mock('@/features/auth', () => ({
	SignOutButton: () => ({ type: 'button', props: { 'data-testid': 'sign-out' } }),
}))

vi.mock('@/widgets/workspace', () => ({
	EmailVerificationBanner: ({ email, verified }: { email: string; verified: boolean }) =>
		verified
			? null
			: {
					type: 'div',
					props: { 'data-testid': 'email-verification-banner', children: `Verify ${email}` },
				},
	NewProjectButton: () => ({ type: 'button', props: { 'data-testid': 'new-project' } }),
}))

import WorkspaceDashboardPage from '../page'

type RenderableElement = {
	type?: unknown
	props?: Record<string, unknown> & { children?: unknown }
}

function expandFunctionComponent(node: RenderableElement): unknown {
	if (typeof node.type === 'function') {
		const Component = node.type as (props: unknown) => unknown
		try {
			return Component(node.props ?? {})
		} catch {
			return node.props?.children
		}
	}
	return node
}

function findAllText(node: unknown, out: string[] = []): string[] {
	if (node == null || typeof node === 'boolean') return out
	if (typeof node === 'string' || typeof node === 'number') {
		out.push(String(node))
		return out
	}
	if (Array.isArray(node)) {
		for (const child of node) findAllText(child, out)
		return out
	}
	if (typeof node === 'object') {
		const element = node as RenderableElement
		if (typeof element.type === 'function') {
			findAllText(expandFunctionComponent(element), out)
			return out
		}
		if (element.props?.children !== undefined) {
			findAllText(element.props.children, out)
		}
	}
	return out
}

function findByTestId(node: unknown, testId: string): boolean {
	if (node == null || typeof node === 'boolean') return false
	if (typeof node !== 'object') return false
	if (Array.isArray(node)) {
		return node.some((child) => findByTestId(child, testId))
	}
	const element = node as RenderableElement
	if (element.props && element.props['data-testid'] === testId) return true
	if (typeof element.type === 'function') {
		return findByTestId(expandFunctionComponent(element), testId)
	}
	if (element.props?.children !== undefined) {
		return findByTestId(element.props.children, testId)
	}
	return false
}

describe('WorkspaceDashboardPage', () => {
	beforeEach(() => {
		mockCookieGet.mockReturnValue({ value: 'cookie_value' })
		mockVerifyToken.mockReturnValue({ userId: 'user_1', email: 'user@example.com' })
		mockDbSelect.mockReturnValue({ from: mockDbFrom })
		mockDbFrom.mockReturnValue({ where: mockDbWhere })
		mockDbWhere.mockReturnValue({ limit: mockDbLimit })
		mockDbLimit.mockResolvedValue([{ emailVerified: false }])
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('throws when reached without a session (layout should have redirected first)', async () => {
		mockVerifyToken.mockReturnValue(null)
		await expect(WorkspaceDashboardPage()).rejects.toThrow(/layout should have redirected/)
	})

	it('renders the empty state when the user has zero projects', async () => {
		mockListUserProjects.mockResolvedValue([])
		const tree = (await WorkspaceDashboardPage()) as ReactElement
		const text = findAllText(tree).join(' ')
		expect(text).toContain('Your projects')
		expect(text).toContain('user@example.com')
		expect(text).toContain('Nothing here yet')
		expect(findByTestId(tree, 'new-project')).toBe(true)
		expect(findByTestId(tree, 'sign-out')).toBe(true)
		expect(mockListUserProjects).toHaveBeenCalledWith('user_1')
	})

	it('renders a card grid when the user has projects', async () => {
		mockListUserProjects.mockResolvedValue([
			{
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'My first build',
				lastBuildAt: new Date('2026-04-06T10:00:00Z'),
				previewUrl: null,
				createdAt: new Date('2026-04-05T10:00:00Z'),
			},
			{
				id: '550e8400-e29b-41d4-a716-446655440001',
				name: 'Second build',
				lastBuildAt: null,
				previewUrl: null,
				createdAt: new Date('2026-04-04T10:00:00Z'),
			},
		])
		const tree = (await WorkspaceDashboardPage()) as ReactElement
		const text = findAllText(tree).join(' ')
		expect(text).toContain('My first build')
		expect(text).toContain('Second build')
		expect(text).toContain('No builds yet')
		expect(text).not.toContain('Nothing here yet')
		expect(findByTestId(tree, 'new-project')).toBe(true)
		expect(findByTestId(tree, 'sign-out')).toBe(true)
	})

	it('renders an error banner when the project query throws', async () => {
		mockListUserProjects.mockRejectedValue(new Error('db down'))
		const tree = (await WorkspaceDashboardPage()) as ReactElement
		const text = findAllText(tree).join(' ')
		expect(text).toContain("couldn't load your projects")
	})
})
