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

vi.mock('@/shared/ui/typography', () => ({
	Text: ({ as, children }: { as?: string; children?: ReactNode }) =>
		createElement(as || 'span', null, children),
	Heading: ({ as, children }: { as?: string; children?: ReactNode }) =>
		createElement(as || 'h2', null, children),
}))

vi.mock('lucide-react', () => ({
	Paperclip: () => createElement('svg', { 'data-testid': 'icon-paperclip' }),
	Send: () => createElement('svg', { 'data-testid': 'icon-send' }),
}))

import { FeedbackBar } from '../ui/FeedbackBar'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('FeedbackBar', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => {
			root.unmount()
		})
		container.remove()
		vi.restoreAllMocks()
	})

	it('renders textarea and Send button', () => {
		act(() => {
			root.render(createElement(FeedbackBar, { onSubmit: vi.fn() }))
		})

		const textarea = container.querySelector('textarea')
		expect(textarea).not.toBeNull()

		const sendButton = container.querySelector('[aria-label="Send feedback"]')
		expect(sendButton).not.toBeNull()
	})

	it('Send is disabled when textarea is empty', () => {
		act(() => {
			root.render(createElement(FeedbackBar, { onSubmit: vi.fn() }))
		})

		const sendButton = container.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement
		expect(sendButton.disabled).toBe(true)
	})

	it('shows clarification chips for short instructions', () => {
		const onSubmit = vi.fn()
		act(() => {
			root.render(createElement(FeedbackBar, { onSubmit }))
		})

		const textarea = container.querySelector('textarea') as HTMLTextAreaElement
		act(() => {
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
				window.HTMLTextAreaElement.prototype,
				'value',
			)?.set
			nativeInputValueSetter?.call(textarea, 'make it better')
			textarea.dispatchEvent(new Event('change', { bubbles: true }))
		})

		const sendButton = container.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement
		act(() => {
			sendButton.click()
		})

		expect(container.textContent).toContain('Bolder colors?')
		expect(container.textContent).toContain('Bigger text?')
		expect(container.textContent).toContain('More spacing?')
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('shows Stitch suggestion for "logo" keyword', () => {
		act(() => {
			root.render(createElement(FeedbackBar, { onSubmit: vi.fn() }))
		})

		const textarea = container.querySelector('textarea') as HTMLTextAreaElement
		act(() => {
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
				window.HTMLTextAreaElement.prototype,
				'value',
			)?.set
			nativeInputValueSetter?.call(textarea, 'change the logo to something modern')
			textarea.dispatchEvent(new Event('change', { bubbles: true }))
		})

		expect(container.textContent).toContain('Need design assets?')
		expect(container.textContent).toContain("Try Stitch — it's free")

		const stitchLink = container.querySelector(
			'a[href="https://stitch.withgoogle.com/"]',
		) as HTMLAnchorElement
		expect(stitchLink).not.toBeNull()
	})

	it('reference button has aria-label', () => {
		act(() => {
			root.render(createElement(FeedbackBar, { onSubmit: vi.fn() }))
		})

		const attachButton = container.querySelector('[aria-label="Attach reference"]')
		expect(attachButton).not.toBeNull()
	})
})
