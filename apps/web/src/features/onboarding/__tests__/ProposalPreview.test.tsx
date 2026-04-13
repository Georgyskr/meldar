// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProposalData } from '../model/types'
import { setupMocks } from './test-helpers'

setupMocks()

import { ProposalPreview } from '../ui/ProposalPreview'

const PROPOSAL: ProposalData = {
	verticalId: 'consulting',
	verticalLabel: 'Consulting',
	businessName: 'My Consulting Biz',
	services: [
		{ name: 'Strategy call', durationMinutes: 60 },
		{ name: 'Workshop', durationMinutes: 180 },
	],
	hours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '17:00' },
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('ProposalPreview', () => {
	beforeEach(() => {
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('renders the business name', () => {
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: null,
					onConfirm: vi.fn(),
					onGoBack: vi.fn(),
				}),
			)
		})
		expect(container.textContent).toContain('My Consulting Biz')
	})

	it('renders each service name', () => {
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: null,
					onConfirm: vi.fn(),
					onGoBack: vi.fn(),
				}),
			)
		})
		expect(container.textContent).toContain('Strategy call')
		expect(container.textContent).toContain('Workshop')
	})

	it('does NOT render any prices', () => {
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: null,
					onConfirm: vi.fn(),
					onGoBack: vi.fn(),
				}),
			)
		})
		const text = container.textContent ?? ''
		expect(text).not.toMatch(/€|EUR|\$|price/i)
	})

	it('renders "Let\'s go" CTA', () => {
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: null,
					onConfirm: vi.fn(),
					onGoBack: vi.fn(),
				}),
			)
		})
		expect(container.textContent).toMatch(/Let[\u2019']s go/i)
	})

	it('clicking "Let\'s go" calls onConfirm', () => {
		const onConfirm = vi.fn()
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: null,
					onConfirm,
					onGoBack: vi.fn(),
				}),
			)
		})
		const btn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes("Let's go") || b.textContent?.includes('Let\u2019s go'),
		)
		act(() => btn?.click())
		expect(onConfirm).toHaveBeenCalled()
	})

	it('renders "Change things" link', () => {
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: null,
					onConfirm: vi.fn(),
					onGoBack: vi.fn(),
				}),
			)
		})
		expect(container.textContent).toContain('Change things')
	})

	it('shows error message when error is set', () => {
		act(() => {
			root.render(
				createElement(ProposalPreview, {
					proposal: PROPOSAL,
					submitting: false,
					error: 'Network error',
					onConfirm: vi.fn(),
					onGoBack: vi.fn(),
				}),
			)
		})
		expect(container.textContent).toContain('Network error')
	})
})
