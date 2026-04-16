// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function makePassthrough(defaultTag: string) {
	return ({ as, children, ...rest }: Record<string, unknown>) => {
		const tag = (as as string) || defaultTag
		const htmlProps: Record<string, unknown> = {}
		for (const [key, val] of Object.entries(rest)) {
			if (
				key.startsWith('aria-') ||
				key.startsWith('data-') ||
				['role', 'className', 'id', 'style'].includes(key)
			) {
				htmlProps[key] = val
			}
		}
		return createElement(tag, htmlProps, children as ReactNode)
	}
}

vi.mock('@styled-system/jsx', () => ({
	Box: makePassthrough('div'),
	Flex: makePassthrough('div'),
}))

vi.mock('@styled-system/css', () => ({
	css: () => '',
}))

vi.mock('@/shared/ui/typography', () => ({
	Text: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
}))

type MockWorkspace = {
	lastBuildAt: number | null
	activeBuildCardId: string | null
	failureMessage: string | null
	currentCardIndex: number | null
	totalCards: number | null
	deployment: { type: 'idle' | 'deploying' | 'deployed' | 'failed'; [k: string]: unknown }
}

const mockUseWorkspaceBuild = vi.fn<() => MockWorkspace>()

vi.mock('@/features/workspace', async () => {
	const actual =
		await vi.importActual<typeof import('@/features/workspace')>('@/features/workspace')
	return {
		...actual,
		useWorkspaceBuild: () => mockUseWorkspaceBuild(),
	}
})

import { BuildStatusOverlay } from '../BuildStatusOverlay'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

function workspace(overrides: Partial<MockWorkspace> = {}): MockWorkspace {
	return {
		lastBuildAt: null,
		activeBuildCardId: null,
		failureMessage: null,
		currentCardIndex: null,
		totalCards: null,
		deployment: { type: 'idle' },
		...overrides,
	}
}

describe('BuildStatusOverlay', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		mockUseWorkspaceBuild.mockReturnValue(workspace())
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => {
			root.unmount()
		})
		container.remove()
		vi.useRealTimers()
	})

	function render() {
		act(() => {
			root.render(createElement(BuildStatusOverlay))
		})
	}

	it('shows nothing when idle with no prior build', () => {
		render()
		expect(container.querySelector('[data-testid="build-pill"]')).toBeNull()
	})

	it('shows the building pill while a build is active', () => {
		mockUseWorkspaceBuild.mockReturnValue(workspace({ activeBuildCardId: 'card-1' }))
		render()
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('data-phase')).toBe('building')
	})

	it('shows the building pill during deploy phase', () => {
		mockUseWorkspaceBuild.mockReturnValue(
			workspace({ deployment: { type: 'deploying', slug: 'x', hostname: 'x.meldar.ai' } }),
		)
		render()
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('data-phase')).toBe('building')
	})

	it('shows the done pill when lastBuildAt appears while phase is idle', () => {
		mockUseWorkspaceBuild.mockReturnValue(workspace({ activeBuildCardId: 'card-1' }))
		render()
		expect(container.querySelector('[data-testid="build-pill"]')?.getAttribute('data-phase')).toBe(
			'building',
		)

		mockUseWorkspaceBuild.mockReturnValue(workspace({ lastBuildAt: 12345 }))
		render()

		expect(container.querySelector('[data-testid="build-pill"]')?.getAttribute('data-phase')).toBe(
			'done',
		)
	})

	it('shows the done pill when the overlay mounts fresh after a build (remount race)', () => {
		mockUseWorkspaceBuild.mockReturnValue(workspace({ lastBuildAt: 99999 }))
		render()
		expect(container.querySelector('[data-testid="build-pill"]')?.getAttribute('data-phase')).toBe(
			'done',
		)
	})

	it('shows the failed pill when a failure message is present', () => {
		mockUseWorkspaceBuild.mockReturnValue(workspace({ failureMessage: 'timeout' }))
		render()
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('data-phase')).toBe('failed')
	})

	it('done pill fades out after the timeout', () => {
		mockUseWorkspaceBuild.mockReturnValue(workspace({ lastBuildAt: 500 }))
		render()
		expect(container.querySelector('[data-testid="build-pill"]')).not.toBeNull()

		act(() => {
			vi.advanceTimersByTime(3100)
		})
		expect(container.querySelector('[data-testid="build-pill"]')).toBeNull()
	})

	it('exposes role=status for assistive tech announcements', () => {
		mockUseWorkspaceBuild.mockReturnValue(workspace({ activeBuildCardId: 'card-1' }))
		render()
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('role')).toBe('status')
	})
})
