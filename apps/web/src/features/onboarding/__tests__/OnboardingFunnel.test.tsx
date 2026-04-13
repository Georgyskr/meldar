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
})
