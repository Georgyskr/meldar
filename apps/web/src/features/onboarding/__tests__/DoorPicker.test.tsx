// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupMocks } from './test-helpers'

setupMocks()

import { DoorPicker } from '../ui/DoorPicker'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('DoorPicker', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders the heading', () => {
		act(() => {
			root.render(createElement(DoorPicker, { onSelectDoor: vi.fn() }))
		})
		expect(container.textContent).toContain('What do you need today')
	})

	it('does NOT contain banned words', () => {
		act(() => {
			root.render(createElement(DoorPicker, { onSelectDoor: vi.fn() }))
		})
		const text = container.textContent ?? ''
		expect(text).not.toContain('Welcome to Meldar')
		expect(text).not.toMatch(/\bbuild\b/i)
		expect(text).not.toContain('847')
	})

	it('renders exactly 3 door cards', () => {
		act(() => {
			root.render(createElement(DoorPicker, { onSelectDoor: vi.fn() }))
		})
		const buttons = container.querySelectorAll('button')
		expect(buttons.length).toBe(3)
	})

	it('renders the 3 door labels', () => {
		act(() => {
			root.render(createElement(DoorPicker, { onSelectDoor: vi.fn() }))
		})
		const text = container.textContent ?? ''
		expect(text).toContain('I need something for my business')
		expect(text).toContain('Show me what this can do')
		expect(text).toMatch(/I have an idea/i)
	})

	it('calls onSelectDoor with correct door id on click', () => {
		const onSelect = vi.fn()
		act(() => {
			root.render(createElement(DoorPicker, { onSelectDoor: onSelect }))
		})
		const buttons = container.querySelectorAll('button')
		act(() => {
			;(buttons[0] as HTMLButtonElement).click()
		})
		expect(onSelect).toHaveBeenCalledWith('a')
		act(() => {
			;(buttons[1] as HTMLButtonElement).click()
		})
		expect(onSelect).toHaveBeenCalledWith('b')
		act(() => {
			;(buttons[2] as HTMLButtonElement).click()
		})
		expect(onSelect).toHaveBeenCalledWith('c')
	})
})
