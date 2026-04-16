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

	describe('draft persistence', () => {
		beforeEach(() => {
			window.sessionStorage.clear()
		})

		it('saves typed draft to sessionStorage scoped by draftKey', () => {
			act(() => {
				root.render(createElement(FeedbackBar, { onSubmit: vi.fn(), draftKey: 'proj-1' }))
			})
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement
			act(() => {
				const set = Object.getOwnPropertyDescriptor(
					window.HTMLTextAreaElement.prototype,
					'value',
				)?.set
				set?.call(textarea, 'make the button pink')
				textarea.dispatchEvent(new Event('change', { bubbles: true }))
			})
			expect(window.sessionStorage.getItem('meldar.feedback-draft.proj-1')).toBe(
				'make the button pink',
			)
		})

		it('restores draft on mount when sessionStorage has a value', () => {
			window.sessionStorage.setItem('meldar.feedback-draft.proj-2', 'change price to 50')
			act(() => {
				root.render(createElement(FeedbackBar, { onSubmit: vi.fn(), draftKey: 'proj-2' }))
			})
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement
			expect(textarea.value).toBe('change price to 50')
		})

		it('clears the draft after a successful submit', async () => {
			const onSubmit = vi.fn().mockResolvedValue(undefined)
			act(() => {
				root.render(createElement(FeedbackBar, { onSubmit, draftKey: 'proj-3' }))
			})
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement
			act(() => {
				const set = Object.getOwnPropertyDescriptor(
					window.HTMLTextAreaElement.prototype,
					'value',
				)?.set
				set?.call(textarea, 'add a bigger hero section that takes the full width')
				textarea.dispatchEvent(new Event('change', { bubbles: true }))
			})
			expect(window.sessionStorage.getItem('meldar.feedback-draft.proj-3')).toContain('hero')
			const send = container.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement
			await act(async () => {
				send.click()
			})
			await act(async () => {
				await Promise.resolve()
			})
			expect(window.sessionStorage.getItem('meldar.feedback-draft.proj-3')).toBeNull()
		})

		it('keeps the draft when submit fails', async () => {
			const onSubmit = vi.fn().mockImplementation(async () => {
				throw new Error('network')
			})
			act(() => {
				root.render(createElement(FeedbackBar, { onSubmit, draftKey: 'proj-4' }))
			})
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement
			act(() => {
				const set = Object.getOwnPropertyDescriptor(
					window.HTMLTextAreaElement.prototype,
					'value',
				)?.set
				set?.call(textarea, 'add a bigger hero section that takes the full width')
				textarea.dispatchEvent(new Event('change', { bubbles: true }))
			})
			const send = container.querySelector('[aria-label="Send feedback"]') as HTMLButtonElement
			await act(async () => {
				try {
					send.click()
					await Promise.resolve().then(() => Promise.resolve())
				} catch {
					/* expected */
				}
			})
			expect(window.sessionStorage.getItem('meldar.feedback-draft.proj-4')).toContain('hero')
		})

		it('scopes drafts per draftKey (no cross-project bleed)', () => {
			window.sessionStorage.setItem('meldar.feedback-draft.proj-A', 'A-text')
			window.sessionStorage.setItem('meldar.feedback-draft.proj-B', 'B-text')
			act(() => {
				root.render(createElement(FeedbackBar, { onSubmit: vi.fn(), draftKey: 'proj-A' }))
			})
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement
			expect(textarea.value).toBe('A-text')
		})

		it('omits persistence entirely when draftKey is not provided', () => {
			act(() => {
				root.render(createElement(FeedbackBar, { onSubmit: vi.fn() }))
			})
			const textarea = container.querySelector('textarea') as HTMLTextAreaElement
			act(() => {
				const set = Object.getOwnPropertyDescriptor(
					window.HTMLTextAreaElement.prototype,
					'value',
				)?.set
				set?.call(textarea, 'hello')
				textarea.dispatchEvent(new Event('change', { bubbles: true }))
			})
			expect(window.sessionStorage.length).toBe(0)
		})
	})
})
