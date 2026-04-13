// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
					'title',
					'src',
					'sandbox',
					'style',
				].includes(key)
			) {
				htmlProps[key] = val
			}
		}
		return createElement(tag, htmlProps, children as ReactNode)
	}
}

vi.mock('@styled-system/jsx', () => ({
	Box: makePassthrough('div'),
	Flex: makePassthrough('div'),
}))

vi.mock('@/shared/ui/typography', () => ({
	Text: ({ children }: { children?: ReactNode }) => createElement('span', null, children),
	Heading: ({ as, children }: { as?: string; children?: ReactNode }) =>
		createElement(as || 'h2', null, children),
}))

vi.mock('../BuildStatusOverlay', () => ({
	BuildStatusOverlay: () => createElement('div', { 'data-testid': 'build-overlay' }),
}))

vi.mock('../lib/build-status', () => ({
	buildPreviewSrc: (url: string, buster: number) => `${url}?t=${buster}`,
}))

vi.mock('../lib/preview-url', () => ({
	isSafePreviewUrl: (v: string | null): v is string => !!v && v.startsWith('http'),
}))

import { PreviewPane } from '../PreviewPane'

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('PreviewPane', () => {
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
	})

	it('renders idle state when previewUrl is null and not building', () => {
		act(() => {
			root.render(
				createElement(PreviewPane, {
					previewUrl: null,
					activeBuildCardId: null,
					failureMessage: null,
				}),
			)
		})

		expect(container.textContent).toContain('Describe what you want to build')
		expect(container.textContent).toContain('live preview will appear here')
		expect(container.querySelector('iframe')).toBeNull()
	})

	it('shows thinking phase when building with no files yet', () => {
		act(() => {
			root.render(
				createElement(PreviewPane, {
					previewUrl: null,
					activeBuildCardId: 'some-card-id',
					failureMessage: null,
					writtenFiles: [],
				}),
			)
		})

		expect(container.textContent).toContain('Thinking')
		expect(container.querySelector('iframe')).toBeNull()
	})

	it('shows writing phase with latest file name', () => {
		act(() => {
			root.render(
				createElement(PreviewPane, {
					previewUrl: null,
					activeBuildCardId: 'some-card-id',
					failureMessage: null,
					writtenFiles: [
						{ path: 'src/app/layout.tsx', sizeBytes: 500, writtenAt: 1 },
						{ path: 'src/app/page.tsx', sizeBytes: 1200, writtenAt: 2 },
					],
				}),
			)
		})

		expect(container.textContent).toContain('Writing')
		expect(container.textContent).toContain('page.tsx')
	})

	it('shows deploying phase after build commits but preview not ready', () => {
		act(() => {
			root.render(
				createElement(PreviewPane, {
					previewUrl: null,
					activeBuildCardId: null,
					failureMessage: null,
					writtenFiles: [{ path: 'src/app/page.tsx', sizeBytes: 1200, writtenAt: 1 }],
					buildJustFinished: true,
				}),
			)
		})

		expect(container.textContent).toContain('Starting preview')
	})

	it('renders an iframe when previewUrl is set', () => {
		act(() => {
			root.render(
				createElement(PreviewPane, {
					previewUrl: 'https://sandbox-abc.workers.dev',
					activeBuildCardId: null,
					failureMessage: null,
				}),
			)
		})

		const iframe = container.querySelector('iframe')
		expect(iframe).not.toBeNull()
		expect(iframe?.getAttribute('title')).toBe('Live preview')
		expect(iframe?.getAttribute('src')).toContain('https://sandbox-abc.workers.dev')
	})
})
