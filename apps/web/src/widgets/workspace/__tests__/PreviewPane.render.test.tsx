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

	it('idle state shows a calm "setting up" message, not a developer prompt', () => {
		act(() => {
			root.render(
				createElement(PreviewPane, {
					previewUrl: null,
					activeBuildCardId: null,
					failureMessage: null,
				}),
			)
		})

		const text = container.textContent ?? ''
		expect(text).not.toContain('Describe what you want to build')
		expect(text).not.toMatch(/\bbuild\b/i)
		expect(text).not.toMatch(/\bcode\b/i)
		expect(text).not.toContain('landing page with email capture')
		expect(container.querySelector('iframe')).toBeNull()
		expect(text).toMatch(/setting up|getting ready|preparing/i)
	})

	it('building state shows progress without exposing file names or dev words', () => {
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

		const text = container.textContent ?? ''
		expect(text).not.toContain('Writing code')
		expect(text).not.toContain('page.tsx')
		expect(text).not.toContain('layout.tsx')
		expect(text).not.toMatch(/\.tsx\b/)
	})

	it('building state shows a warm message when no files yet', () => {
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

		const text = container.textContent ?? ''
		expect(text).toMatch(/setting up|getting ready|preparing/i)
		expect(container.querySelector('iframe')).toBeNull()
	})

	it('post-commit state shows "opening your page" or similar', () => {
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

		const text = container.textContent ?? ''
		expect(text).toMatch(/opening|almost there|one moment/i)
		expect(text).not.toContain('page.tsx')
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
