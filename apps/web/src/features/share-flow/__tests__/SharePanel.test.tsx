// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@styled-system/jsx', () => {
	function makePassthrough(defaultTag: string) {
		return ({ as, children, ...rest }: Record<string, unknown>) => {
			const tag = (as as string) || defaultTag
			const htmlProps: Record<string, unknown> = {}
			for (const [key, val] of Object.entries(rest)) {
				if (
					key.startsWith('aria-') ||
					key.startsWith('data-') ||
					['href', 'target', 'rel', 'role', 'type', 'onClick', 'className', 'id'].includes(key)
				) {
					htmlProps[key] = val
				}
			}
			return createElement(tag, htmlProps, children as ReactNode)
		}
	}

	const styled = new Proxy(() => {}, {
		apply(_target, _this, args: unknown[]) {
			return makePassthrough(args[0] as string)
		},
		get(_target, prop: string) {
			if (prop === '__esModule') return false
			return makePassthrough(prop)
		},
	})

	return {
		styled,
		Box: makePassthrough('div'),
		Flex: makePassthrough('div'),
		HStack: makePassthrough('div'),
		VStack: makePassthrough('div'),
	}
})

vi.mock('@/shared/ui', () => ({
	Text: ({ as, children }: { as?: string; children?: ReactNode }) =>
		createElement(as || 'span', null, children),
	Heading: ({ as, children }: { as?: string; children?: ReactNode }) =>
		createElement(as || 'h2', null, children),
}))

vi.mock('lucide-react', () => ({
	Check: () => createElement('svg', { 'data-testid': 'icon-check' }),
	Copy: () => createElement('svg', { 'data-testid': 'icon-copy' }),
	Instagram: () => createElement('svg', { 'data-testid': 'icon-instagram' }),
	MessageCircle: () => createElement('svg', { 'data-testid': 'icon-message-circle' }),
}))

import { SharePanel } from '../ui/SharePanel'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('SharePanel', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		})
	})

	afterEach(() => {
		act(() => {
			root.unmount()
		})
		container.remove()
		vi.restoreAllMocks()
	})

	it('renders the subdomain URL', () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})
		expect(container.textContent).toContain('elif-studio.meldar.ai')
	})

	it('copies the full URL to clipboard on click', () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})

		const copyButton = container.querySelector(
			'[aria-label="Copy link to clipboard"]',
		) as HTMLButtonElement
		act(() => {
			copyButton.click()
		})

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://elif-studio.meldar.ai')
	})

	it('shows "Copied!" after clicking copy', async () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})

		const copyButton = container.querySelector(
			'[aria-label="Copy link to clipboard"]',
		) as HTMLButtonElement
		await act(async () => {
			copyButton.click()
		})

		expect(container.querySelector('[aria-label="Link copied"]')).not.toBeNull()
		expect(container.textContent).toContain('Copied!')
	})

	it('links WhatsApp button to wa.me with the URL', () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})

		const whatsappLink = container.querySelector(
			'[aria-label="Share on WhatsApp"]',
		) as HTMLAnchorElement
		expect(whatsappLink.getAttribute('href')).toBe(
			'https://wa.me/?text=Book%20with%20me%3A%20https%3A%2F%2Felif-studio.meldar.ai',
		)
	})

	it('opens WhatsApp link in a new tab', () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})

		const whatsappLink = container.querySelector(
			'[aria-label="Share on WhatsApp"]',
		) as HTMLAnchorElement
		expect(whatsappLink.getAttribute('target')).toBe('_blank')
		expect(whatsappLink.getAttribute('rel')).toBe('noopener noreferrer')
	})

	it('has aria-labels on all share buttons', () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})

		expect(container.querySelector('[aria-label="Copy link to clipboard"]')).not.toBeNull()
		expect(container.querySelector('[aria-label="Share on WhatsApp"]')).not.toBeNull()
		expect(container.querySelector('[aria-label="Share on Instagram"]')).not.toBeNull()
	})

	it('shows Instagram tooltip on click', () => {
		act(() => {
			root.render(createElement(SharePanel, { subdomain: 'elif-studio.meldar.ai' }))
		})

		const instagramButton = container.querySelector(
			'[aria-label="Share on Instagram"]',
		) as HTMLButtonElement
		act(() => {
			instagramButton.click()
		})

		expect(container.textContent).toContain('Paste this link in your Instagram bio')
	})
})
