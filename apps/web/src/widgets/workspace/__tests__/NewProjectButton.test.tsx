// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPending } = vi.hoisted(() => ({ mockPending: { value: false } }))

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		createElement('a', { href }, children),
	useLinkStatus: () => ({ pending: mockPending.value }),
}))

const { NewProjectButton } = await import('../NewProjectButton')

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('NewProjectButton', () => {
	beforeEach(() => {
		mockPending.value = false
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('links to /onboarding', () => {
		act(() => {
			root.render(createElement(NewProjectButton))
		})
		const anchor = container.querySelector('a')
		expect(anchor?.getAttribute('href')).toBe('/onboarding')
	})

	it('renders default label when not navigating', () => {
		mockPending.value = false
		act(() => {
			root.render(createElement(NewProjectButton))
		})
		expect(container.textContent).toContain('+ New project')
		expect(container.textContent).not.toContain('Opening')
	})

	it('renders pending label while navigating', () => {
		mockPending.value = true
		act(() => {
			root.render(createElement(NewProjectButton))
		})
		expect(container.textContent).toContain('Opening')
	})
})
