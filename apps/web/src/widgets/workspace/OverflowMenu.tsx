'use client'

import { Box, VStack } from '@styled-system/jsx'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Text } from '@/shared/ui'

type Props = {
	readonly projectId: string
	readonly subdomain: string | null
}

type MenuItem = {
	readonly key: string
	readonly href: string
	readonly external: boolean
	readonly label: string
	readonly variant: 'primary' | 'secondary'
}

export function OverflowMenu({ projectId, subdomain }: Props) {
	const [open, setOpen] = useState(false)
	const [focusIndex, setFocusIndex] = useState(0)
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
	const menuId = useId()

	const items: MenuItem[] = [
		...(subdomain
			? [
					{
						key: 'site',
						href: `https://${subdomain}`,
						external: true,
						label: 'My site \u2192',
						variant: 'primary' as const,
					},
				]
			: []),
		{
			key: 'bookings',
			href: `/workspace/${projectId}/admin`,
			external: false,
			label: 'Manage bookings',
			variant: 'primary',
		},
		{
			key: 'settings',
			href: `/workspace/${projectId}/admin/settings`,
			external: false,
			label: 'Settings',
			variant: 'primary',
		},
		{
			key: 'all',
			href: '/workspace',
			external: false,
			label: 'All projects',
			variant: 'secondary',
		},
	]

	const close = useCallback(() => {
		setOpen(false)
		triggerRef.current?.focus()
	}, [])

	useEffect(() => {
		if (!open) return
		const onClick = (e: MouseEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				close()
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault()
				setFocusIndex((i) => (i + 1) % items.length)
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault()
				setFocusIndex((i) => (i - 1 + items.length) % items.length)
			}
			if (e.key === 'Home') {
				e.preventDefault()
				setFocusIndex(0)
			}
			if (e.key === 'End') {
				e.preventDefault()
				setFocusIndex(items.length - 1)
			}
		}
		document.addEventListener('mousedown', onClick)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('mousedown', onClick)
			document.removeEventListener('keydown', onKey)
		}
	}, [open, close, items.length])

	useEffect(() => {
		if (!open) return
		itemRefs.current[focusIndex]?.focus()
	}, [open, focusIndex])

	const handleTriggerKey = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			setFocusIndex(0)
			setOpen(true)
		}
	}

	return (
		<Box ref={rootRef} position="relative">
			<button
				ref={triggerRef}
				type="button"
				aria-label="Menu"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => {
					setFocusIndex(0)
					setOpen((v) => !v)
				}}
				onKeyDown={handleTriggerKey}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					width: 44,
					height: 44,
					border: 'none',
					borderRadius: 8,
					background: 'transparent',
					cursor: 'pointer',
				}}
			>
				<MoreHorizontal size={18} />
			</button>

			{open && (
				<VStack
					id={menuId}
					role="menu"
					aria-label="Project actions"
					alignItems="stretch"
					gap="0"
					position="absolute"
					insetBlockStart="48px"
					insetInlineEnd="0"
					minWidth="220px"
					zIndex={50}
					background="surfaceContainerLowest"
					border="1px solid"
					borderColor="outlineVariant"
					borderRadius="md"
					paddingBlock="2"
					boxShadow="0 4px 12px rgba(0,0,0,0.08)"
				>
					{items.map((item, i) => (
						<MenuItemLink
							key={item.key}
							item={item}
							index={i}
							focused={focusIndex === i}
							itemRefs={itemRefs}
							onClose={close}
						/>
					))}
				</VStack>
			)}
		</Box>
	)
}

type MenuItemLinkProps = {
	readonly item: MenuItem
	readonly index: number
	readonly focused: boolean
	readonly itemRefs: React.RefObject<Array<HTMLAnchorElement | null>>
	readonly onClose: () => void
}

function MenuItemLink({ item, index, focused, itemRefs, onClose }: MenuItemLinkProps) {
	const refCallback = (el: HTMLAnchorElement | null) => {
		itemRefs.current[index] = el
	}
	const commonProps = {
		ref: refCallback,
		role: 'menuitem' as const,
		tabIndex: focused ? 0 : -1,
		onClick: onClose,
		style: { padding: '12px 16px', textDecoration: 'none', outline: 'none' },
	}
	const labelColor = item.variant === 'primary' ? 'onSurface' : 'onSurfaceVariant'
	return item.external ? (
		<a href={item.href} target="_blank" rel="noopener noreferrer" {...commonProps}>
			<Text textStyle="secondary.sm" color={labelColor}>
				{item.label}
			</Text>
		</a>
	) : (
		<Link href={item.href} {...commonProps}>
			<Text textStyle="secondary.sm" color={labelColor}>
				{item.label}
			</Text>
		</Link>
	)
}
