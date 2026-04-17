// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@styled-system/jsx', async () => {
	const { createElement: ce } = await import('react')
	function tag(defaultTag: string) {
		return ({ as, children, ...rest }: Record<string, unknown>) => {
			const html: Record<string, unknown> = {}
			for (const [k, v] of Object.entries(rest)) {
				if (
					k.startsWith('aria-') ||
					k.startsWith('data-') ||
					['onClick', 'id', 'role', 'type', 'tabIndex', 'title'].includes(k)
				) {
					html[k] = v
				}
			}
			return ce((as as string) || defaultTag, html, children as React.ReactNode)
		}
	}
	const styled = new Proxy(() => {}, {
		get: (_t, p: string) => tag(p),
		apply: (_t, _s, args: unknown[]) => tag(args[0] as string),
	})
	return {
		styled,
		Box: tag('div'),
		Flex: tag('div'),
	}
})

vi.mock('@/shared/ui', async () => {
	const { createElement: ce } = await import('react')
	return {
		Text: ({ as, children }: { as?: string; children?: React.ReactNode }) =>
			ce(as || 'span', null, children),
	}
})

vi.mock('lucide-react', () => ({
	WifiOff: () => null,
}))

const { DisconnectedStrip } = await import('../DisconnectedStrip')

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('DisconnectedStrip', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders nothing when reason is null', () => {
		act(() => {
			root.render(createElement(DisconnectedStrip, { reason: null, onRefresh: vi.fn() }))
		})
		expect(container.textContent).toBe('')
	})

	it('renders the reason as primary text (user-facing situation, not mechanism)', () => {
		act(() => {
			root.render(
				createElement(DisconnectedStrip, {
					reason: 'Build finished. Refresh to see it.',
					onRefresh: vi.fn(),
				}),
			)
		})
		expect(container.textContent).toContain('Build finished. Refresh to see it.')
	})

	it('does NOT repeat the "Live updates paused" mechanism label (icon conveys it)', () => {
		act(() => {
			root.render(createElement(DisconnectedStrip, { reason: 'any reason', onRefresh: vi.fn() }))
		})
		expect(container.textContent).not.toContain('Live updates paused')
	})

	it('uses role="status" with polite live region (non-alarming)', () => {
		act(() => {
			root.render(createElement(DisconnectedStrip, { reason: 'x', onRefresh: vi.fn() }))
		})
		const status = container.querySelector('[role="status"]')
		expect(status).not.toBeNull()
		expect(status?.getAttribute('aria-live')).toBe('polite')
	})

	it('calls onRefresh when the Refresh button is clicked', () => {
		const onRefresh = vi.fn()
		act(() => {
			root.render(createElement(DisconnectedStrip, { reason: 'x', onRefresh }))
		})
		const refresh = Array.from(container.querySelectorAll('button')).find((b) =>
			b.textContent?.match(/refresh/i),
		)
		act(() => refresh?.click())
		expect(onRefresh).toHaveBeenCalled()
	})
})
