// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '@/entities/kanban-card'
import type { BuildReceipt } from '@/features/workspace'

vi.mock('@styled-system/jsx', async () => {
	const { createElement: ce } = await import('react')
	function tag(defaultTag: string) {
		return ({ as, children, ...rest }: Record<string, unknown>) => {
			const html: Record<string, unknown> = {}
			for (const [k, v] of Object.entries(rest)) {
				if (
					k.startsWith('aria-') ||
					k.startsWith('data-') ||
					['onClick', 'id', 'role', 'type', 'tabIndex'].includes(k)
				) {
					html[k] = v
				}
			}
			return ce((as as string) || defaultTag, html, children as React.ReactNode)
		}
	}
	const styled = new Proxy(() => {}, {
		get: (_t, p: string) => tag(p),
		apply: (_t, _s, args: unknown[]) => tag(args[0] as string),
	})
	return {
		styled,
		Box: tag('div'),
		Flex: tag('div'),
		VStack: tag('div'),
	}
})

vi.mock('@/shared/ui', async () => {
	const { createElement: ce } = await import('react')
	return {
		Text: ({ as, children, id }: { as?: string; children?: React.ReactNode; id?: string }) =>
			ce(as || 'span', { id }, children),
		Heading: ({ as, children, id }: { as?: string; children?: React.ReactNode; id?: string }) =>
			ce(as || 'h2', { id }, children),
	}
})

vi.mock('lucide-react', () => ({
	PartyPopper: () => null,
}))

const { FirstBuildCelebration } = await import('../FirstBuildCelebration')

function makeCard(overrides: Partial<KanbanCard>): KanbanCard {
	return {
		id: crypto.randomUUID(),
		projectId: crypto.randomUUID(),
		parentId: null,
		position: 0,
		state: 'draft',
		required: true,
		title: 'Card',
		description: null,
		taskType: 'page',
		acceptanceCriteria: null,
		explainerText: null,
		generatedBy: 'user',
		tokenCostEstimateMin: null,
		tokenCostEstimateMax: null,
		tokenCostActual: null,
		dependsOn: [],
		blockedReason: null,
		lastBuildId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		builtAt: null,
		...overrides,
	}
}

const RECEIPT: BuildReceipt = {
	cardId: 'card-1',
	subtaskTitle: 'Personalizing your page',
	fileCount: 3,
	tokenCost: 10,
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe('FirstBuildCelebration', () => {
	beforeEach(() => {
		localStorage.clear()
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
		localStorage.clear()
	})

	it('does NOT fire for the auto-personalization card', () => {
		const cards = [
			makeCard({
				title: 'Personalizing your page',
				state: 'built',
				generatedBy: 'auto_personalization',
			}),
		]
		act(() => {
			root.render(
				createElement(FirstBuildCelebration, {
					projectId: 'p1',
					receipt: RECEIPT,
					cards,
				}),
			)
		})
		expect(container.textContent).not.toContain('Your first feature just shipped')
	})

	it('DOES fire for a user-applied template card that was just built', () => {
		const cards = [
			makeCard({
				title: 'Hero section',
				state: 'built',
				generatedBy: 'template',
			}),
		]
		act(() => {
			root.render(
				createElement(FirstBuildCelebration, {
					projectId: 'p-tpl',
					receipt: { ...RECEIPT, subtaskTitle: 'Hero section' },
					cards,
				}),
			)
		})
		expect(container.textContent).toContain('Your first feature just shipped')
	})

	it('fires for a user-directed build (generatedBy user)', () => {
		const cards = [
			makeCard({
				title: 'Hero section',
				state: 'built',
				generatedBy: 'user',
			}),
		]
		act(() => {
			root.render(
				createElement(FirstBuildCelebration, {
					projectId: 'p2',
					receipt: { ...RECEIPT, subtaskTitle: 'Hero section' },
					cards,
				}),
			)
		})
		expect(container.textContent).toContain('Your first feature just shipped')
	})

	it('fires for a haiku-planned build the user ran', () => {
		const cards = [
			makeCard({
				title: 'Add a contact form',
				state: 'built',
				generatedBy: 'haiku',
			}),
		]
		act(() => {
			root.render(
				createElement(FirstBuildCelebration, {
					projectId: 'p3',
					receipt: { ...RECEIPT, subtaskTitle: 'Add a contact form' },
					cards,
				}),
			)
		})
		expect(container.textContent).toContain('Your first feature just shipped')
	})

	it('fires when auto-personalization is built AND a user card is also built', () => {
		const cards = [
			makeCard({
				title: 'Personalizing your page',
				state: 'built',
				generatedBy: 'auto_personalization',
			}),
			makeCard({
				title: 'Real feature',
				state: 'built',
				generatedBy: 'user',
			}),
		]
		act(() => {
			root.render(
				createElement(FirstBuildCelebration, {
					projectId: 'p4',
					receipt: { ...RECEIPT, subtaskTitle: 'Real feature' },
					cards,
				}),
			)
		})
		expect(container.textContent).toContain('Your first feature just shipped')
	})
})
