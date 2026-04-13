// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupMocks } from './test-helpers'

setupMocks()

import { DoorB } from '../ui/DoorB'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('DoorB', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders exactly 3 example cards', () => {
		act(() => {
			root.render(createElement(DoorB, { onSelectExample: vi.fn(), onBack: vi.fn() }))
		})
		const useButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
			b.textContent?.includes('Use this'),
		)
		expect(useButtons.length).toBe(3)
	})

	it('renders example titles', () => {
		act(() => {
			root.render(createElement(DoorB, { onSelectExample: vi.fn(), onBack: vi.fn() }))
		})
		const text = container.textContent ?? ''
		expect(text).toContain("Sofia's Hair Studio")
		expect(text).toContain('Peak Fitness PT')
		expect(text).toContain('Anna Strategy')
	})

	it('does NOT display prices', () => {
		act(() => {
			root.render(createElement(DoorB, { onSelectExample: vi.fn(), onBack: vi.fn() }))
		})
		const text = container.textContent ?? ''
		expect(text).not.toMatch(/€|EUR|\$/)
	})

	it('clicking "Use this" calls onSelectExample with the example id', () => {
		const onSelect = vi.fn()
		act(() => {
			root.render(createElement(DoorB, { onSelectExample: onSelect, onBack: vi.fn() }))
		})
		const useButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
			b.textContent?.includes('Use this'),
		)
		act(() => useButtons[0].click())
		expect(onSelect).toHaveBeenCalledWith('hair-salon-example')
	})

	it('has a back button', () => {
		const onBack = vi.fn()
		act(() => {
			root.render(createElement(DoorB, { onSelectExample: vi.fn(), onBack }))
		})
		const backBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Back') || b.textContent?.includes('←'),
		)
		expect(backBtn).toBeTruthy()
		act(() => backBtn?.click())
		expect(onBack).toHaveBeenCalled()
	})
})
