// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupMocks } from './test-helpers'

setupMocks()

import { DoorC } from '../ui/DoorC'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('DoorC', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders a textarea', () => {
		act(() => {
			root.render(createElement(DoorC, { onSubmit: vi.fn(), onBack: vi.fn() }))
		})
		expect(container.querySelector('textarea')).not.toBeNull()
	})

	it('does NOT use the word "build" in any copy', () => {
		act(() => {
			root.render(createElement(DoorC, { onSubmit: vi.fn(), onBack: vi.fn() }))
		})
		const text = container.textContent ?? ''
		expect(text).not.toMatch(/\bbuild\b/i)
	})

	it('has a back button', () => {
		const onBack = vi.fn()
		act(() => {
			root.render(createElement(DoorC, { onSubmit: vi.fn(), onBack }))
		})
		const backBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Back') || b.textContent?.includes('←'),
		)
		act(() => backBtn?.click())
		expect(onBack).toHaveBeenCalled()
	})
})
