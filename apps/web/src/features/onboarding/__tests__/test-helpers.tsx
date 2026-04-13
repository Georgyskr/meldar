import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

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
					'onChange',
					'onSubmit',
					'className',
					'id',
					'disabled',
					'placeholder',
					'value',
					'htmlFor',
					'readOnly',
				].includes(key)
			) {
				htmlProps[key] = val
			}
		}
		return createElement(tag, htmlProps, children as ReactNode)
	}
}

const styled = new Proxy(() => {}, {
	apply(_target: unknown, _this: unknown, args: unknown[]) {
		return makePassthrough(args[0] as string)
	},
	get(_target: unknown, prop: string) {
		if (prop === '__esModule') return false
		return makePassthrough(prop)
	},
})

export function setupMocks() {
	vi.mock('@styled-system/jsx', () => ({
		styled,
		Box: makePassthrough('div'),
		Flex: makePassthrough('div'),
		HStack: makePassthrough('div'),
		VStack: makePassthrough('div'),
		Grid: makePassthrough('div'),
		Stack: makePassthrough('div'),
	}))

	vi.mock('@styled-system/css', () => ({
		css: () => '',
	}))

	vi.mock('@/shared/ui/typography', () => ({
		Text: ({ as, children }: { as?: string; children?: ReactNode }) =>
			createElement(as || 'span', null, children),
		Heading: ({ as, children }: { as?: string; children?: ReactNode }) =>
			createElement(as || 'h2', null, children),
	}))

	vi.mock('@/shared/ui', () => ({
		Text: ({ as, children }: { as?: string; children?: ReactNode }) =>
			createElement(as || 'span', null, children),
		Heading: ({ as, children }: { as?: string; children?: ReactNode }) =>
			createElement(as || 'h2', null, children),
		Button: ({ children, ...props }: Record<string, unknown>) =>
			createElement('button', { type: 'button', ...props }, children as ReactNode),
		toast: { error: vi.fn(), success: vi.fn() },
	}))

	vi.mock(
		'lucide-react',
		() =>
			new Proxy(
				{},
				{
					get(_target: unknown, prop: string) {
						return () => createElement('svg', { 'data-testid': `icon-${prop}` })
					},
				},
			),
	)
}
