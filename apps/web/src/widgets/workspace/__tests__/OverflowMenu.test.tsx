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
				[
					'href',
					'target',
					'rel',
					'role',
					'type',
					'onClick',
					'className',
					'id',
					'disabled',
				].includes(key)
			) {
				htmlProps[key] = val
			}
		}
		return createElement(tag, htmlProps, children as ReactNode)
	}
}

vi.mock('@styled-system/jsx', () => {
	const styled = new Proxy(() => {}, {
		apply(_t: unknown, _this: unknown, args: unknown[]) {
			return makePassthrough(args[0] as string)
		},
		get(_t: unknown, prop: string) {
			if (prop === '__esModule') return false
			return makePassthrough(prop)
		},
	})
	return {
		styled,
		Box: makePassthrough('div'),
		Flex: makePassthrough('div'),
		VStack: makePassthrough('div'),
	}
})

vi.mock('@/shared/ui', () => ({
	Text: ({ as, children }: { as?: string; children?: ReactNode }) =>
		createElement(as || 'span', null, children),
}))

vi.mock('lucide-react', () => ({
	MoreHorizontal: () => createElement('svg', { 'data-testid': 'icon-more' }),
}))

vi.mock('next/link', () => ({
	default: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
		createElement('a', { href, ...props }, children),
}))

import { OverflowMenu } from '../OverflowMenu'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('OverflowMenu', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})
	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders trigger button with aria-label', () => {
		act(() => {
			root.render(createElement(OverflowMenu, { projectId: 'p1', subdomain: null }))
		})
		const trigger = container.querySelector('[aria-label="Menu"]')
		expect(trigger).not.toBeNull()
	})

	it('menu items are hidden by default', () => {
		act(() => {
			root.render(createElement(OverflowMenu, { projectId: 'p1', subdomain: null }))
		})
		expect(container.textContent).not.toContain('Manage bookings')
		expect(container.textContent).not.toContain('Settings')
	})

	it('clicking trigger reveals menu items', () => {
		act(() => {
			root.render(createElement(OverflowMenu, { projectId: 'p1', subdomain: null }))
		})
		const trigger = container.querySelector('[aria-label="Menu"]') as HTMLButtonElement
		act(() => trigger.click())
		expect(container.textContent).toContain('Manage bookings')
		expect(container.textContent).toContain('Settings')
	})

	it('shows "My site" only when subdomain is set', () => {
		act(() => {
			root.render(createElement(OverflowMenu, { projectId: 'p1', subdomain: null }))
		})
		const trigger = container.querySelector('[aria-label="Menu"]') as HTMLButtonElement
		act(() => trigger.click())
		expect(container.textContent).not.toContain('My site')

		act(() => root.unmount())
		container.remove()
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		act(() => {
			root.render(
				createElement(OverflowMenu, { projectId: 'p1', subdomain: 'studio-mia.meldar.ai' }),
			)
		})
		const trigger2 = container.querySelector('[aria-label="Menu"]') as HTMLButtonElement
		act(() => trigger2.click())
		expect(container.textContent).toContain('My site')
	})

	it('links point to correct routes', () => {
		act(() => {
			root.render(createElement(OverflowMenu, { projectId: 'p1', subdomain: null }))
		})
		const trigger = container.querySelector('[aria-label="Menu"]') as HTMLButtonElement
		act(() => trigger.click())
		const links = Array.from(container.querySelectorAll('a'))
		const bookings = links.find((l) => l.textContent?.includes('Manage bookings'))
		const settings = links.find((l) => l.textContent?.includes('Settings'))
		expect(bookings?.getAttribute('href')).toBe('/workspace/p1/admin')
		expect(settings?.getAttribute('href')).toBe('/workspace/p1/admin/settings')
	})
})
