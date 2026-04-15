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

const mockUseWorkspaceBuild = vi.fn()
vi.mock('@/features/workspace', () => ({
	useWorkspaceBuild: () => mockUseWorkspaceBuild(),
}))

import { BuildStatusOverlay } from '../BuildStatusOverlay'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('BuildStatusOverlay', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		mockUseWorkspaceBuild.mockReturnValue({ lastBuildAt: null })
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

	function render(props: { activeBuildCardId: string | null; failureMessage: string | null }) {
		act(() => {
			root.render(createElement(BuildStatusOverlay, props))
		})
	}

	it('shows nothing when idle with no prior build', () => {
		render({ activeBuildCardId: null, failureMessage: null })
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill).toBeNull()
	})

	it('shows the building pill while a build is active', () => {
		render({ activeBuildCardId: 'card-1', failureMessage: null })
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('data-phase')).toBe('building')
	})

	it('shows the done pill when lastBuildAt appears while phase is idle', () => {
		render({ activeBuildCardId: 'card-1', failureMessage: null })
		expect(container.querySelector('[data-testid="build-pill"]')?.getAttribute('data-phase')).toBe(
			'building',
		)

		mockUseWorkspaceBuild.mockReturnValue({ lastBuildAt: 12345 })
		render({ activeBuildCardId: null, failureMessage: null })

		expect(container.querySelector('[data-testid="build-pill"]')?.getAttribute('data-phase')).toBe(
			'done',
		)
	})

	it('shows the done pill when the overlay mounts fresh after a build (remount race)', () => {
		mockUseWorkspaceBuild.mockReturnValue({ lastBuildAt: 99999 })
		render({ activeBuildCardId: null, failureMessage: null })

		expect(container.querySelector('[data-testid="build-pill"]')?.getAttribute('data-phase')).toBe(
			'done',
		)
	})

	it('shows the failed pill when a failure message is present', () => {
		render({ activeBuildCardId: null, failureMessage: 'timeout' })
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('data-phase')).toBe('failed')
	})

	it('done pill fades out after the timeout', () => {
		mockUseWorkspaceBuild.mockReturnValue({ lastBuildAt: 500 })
		render({ activeBuildCardId: null, failureMessage: null })
		expect(container.querySelector('[data-testid="build-pill"]')).not.toBeNull()

		act(() => {
			vi.advanceTimersByTime(3100)
		})
		expect(container.querySelector('[data-testid="build-pill"]')).toBeNull()
	})

	it('exposes role=status for assistive tech announcements', () => {
		render({ activeBuildCardId: 'card-1', failureMessage: null })
		const pill = container.querySelector('[data-testid="build-pill"]')
		expect(pill?.getAttribute('role')).toBe('status')
	})
})
