// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupMocks } from './test-helpers'

setupMocks()

import { DoorA } from '../ui/DoorA'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

const defaultProps = {
	onSubmit: vi.fn(),
	onBack: vi.fn(),
	initialVerticalId: null as string | null,
	initialBusinessName: '',
}

describe('DoorA', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
		vi.clearAllMocks()
	})

	it('renders all vertical options', () => {
		act(() => {
			root.render(createElement(DoorA, defaultProps))
		})
		const text = container.textContent ?? ''
		expect(text).toContain('Hair / Beauty')
		expect(text).toContain('PT / Wellness')
		expect(text).toContain('Consulting')
	})

	it('renders business name input', () => {
		act(() => {
			root.render(createElement(DoorA, defaultProps))
		})
		const input = container.querySelector('input[placeholder]')
		expect(input).not.toBeNull()
	})

	it('has a back button that calls onBack', () => {
		act(() => {
			root.render(createElement(DoorA, defaultProps))
		})
		const backBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Back') || b.textContent?.includes('←'),
		)
		expect(backBtn).toBeTruthy()
		act(() => backBtn?.click())
		expect(defaultProps.onBack).toHaveBeenCalled()
	})
})
