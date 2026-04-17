// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupMocks } from './test-helpers'

setupMocks()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn() }),
}))

import { OnboardingFunnel } from '../ui/OnboardingFunnel'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('OnboardingFunnel', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders DoorPicker on initial mount', () => {
		act(() => {
			root.render(createElement(OnboardingFunnel))
		})
		expect(container.textContent).toContain('What do you need today')
	})

	it('clicking Door A shows the vertical picker', () => {
		act(() => {
			root.render(createElement(OnboardingFunnel))
		})
		const buttons = container.querySelectorAll('button')
		const doorA = Array.from(buttons).find((b) =>
			b.textContent?.includes('I need something for my business'),
		)
		act(() => doorA?.click())
		expect(container.textContent).toContain('What kind of business')
	})

	it('clicking Door B shows examples', () => {
		act(() => {
			root.render(createElement(OnboardingFunnel))
		})
		const buttons = container.querySelectorAll('button')
		const doorB = Array.from(buttons).find((b) =>
			b.textContent?.includes('Show me what this can do'),
		)
		act(() => doorB?.click())
		expect(container.textContent).toContain('Real pages made with Meldar')
	})

	it('clicking Door C shows freeform input', () => {
		act(() => {
			root.render(createElement(OnboardingFunnel))
		})
		const buttons = container.querySelectorAll('button')
		const doorC = Array.from(buttons).find((b) => b.textContent?.includes('I have an idea'))
		act(() => doorC?.click())
		expect(container.textContent).toContain('eating your time')
	})

	it('clicking Back from Door A returns to DoorPicker', () => {
		act(() => {
			root.render(createElement(OnboardingFunnel))
		})
		const doorA = Array.from(container.querySelectorAll('button')).find((b) =>
			b.textContent?.includes('I need something for my business'),
		)
		act(() => doorA?.click())
		expect(container.textContent).toContain('What kind of business')

		const backBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Back') || b.textContent?.includes('←'),
		)
		act(() => backBtn?.click())
		expect(container.textContent).toContain('What do you need today')
	})

	it('shows a loading state (not DoorPicker) before prefill resolves', async () => {
		let resolveFetch: (v: Response) => void = () => {}
		vi.stubGlobal(
			'fetch',
			vi.fn(
				() =>
					new Promise<Response>((resolve) => {
						resolveFetch = resolve
					}),
			),
		)

		await act(async () => {
			root.render(createElement(OnboardingFunnel, { fromProjectId: 'abc-123' }))
		})

		expect(container.textContent).not.toContain('What do you need today')

		resolveFetch({
			ok: true,
			json: () =>
				Promise.resolve({
					settings: { verticalId: 'pt-wellness', businessName: 'Joes PT' },
				}),
		} as Response)
		await act(async () => {
			await new Promise((r) => setTimeout(r, 0))
		})
		vi.unstubAllGlobals()
	})

	it('shows ProposalPreview with "Copy of X" name after prefill resolves', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							settings: { verticalId: 'pt-wellness', businessName: 'Joes PT' },
						}),
				} as Response),
			),
		)

		await act(async () => {
			root.render(createElement(OnboardingFunnel, { fromProjectId: 'abc-123' }))
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(container.textContent).toContain('Copy of Joes PT')
		vi.unstubAllGlobals()
	})

	it('falls back to DoorPicker when settings response has invalid shape', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							settings: { garbage: 'value' },
						}),
				} as Response),
			),
		)

		await act(async () => {
			root.render(createElement(OnboardingFunnel, { fromProjectId: 'abc-123' }))
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(container.textContent).toContain('What do you need today')
		vi.unstubAllGlobals()
	})

	it('falls back to DoorPicker when fetch fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('network'))),
		)

		await act(async () => {
			root.render(createElement(OnboardingFunnel, { fromProjectId: 'abc-123' }))
		})
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(container.textContent).toContain('What do you need today')
		vi.unstubAllGlobals()
	})
})
