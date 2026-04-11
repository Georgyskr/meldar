'use client'

import { Flex, styled } from '@styled-system/jsx'
import { Calendar, ExternalLink, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Text } from '@/shared/ui'

type Props = {
	readonly projectId: string
	readonly subdomain: string | null
}

export function WorkspaceNav({ projectId, subdomain }: Props) {
	const pathname = usePathname()

	const links = [
		{
			href: `/workspace/${projectId}`,
			label: 'Build',
			icon: null,
			active: pathname === `/workspace/${projectId}`,
		},
		{
			href: `/workspace/${projectId}/admin`,
			label: 'Bookings',
			icon: <Calendar size={13} aria-hidden="true" />,
			active: pathname === `/workspace/${projectId}/admin`,
		},
		{
			href: `/workspace/${projectId}/admin/settings`,
			label: 'Settings',
			icon: <Settings size={13} aria-hidden="true" />,
			active: pathname === `/workspace/${projectId}/admin/settings`,
		},
	]

	return (
		<styled.nav aria-label="Workspace navigation">
			<Flex
				alignItems="center"
				gap={0}
				paddingInline={5}
				borderBlockStart="1px solid"
				borderColor="outlineVariant/20"
			>
				{links.map((link) => (
					<Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
						<Flex
							alignItems="center"
							gap={1.5}
							paddingBlock={2.5}
							paddingInline={3}
							borderBlockEnd="2px solid"
							borderColor={link.active ? 'primary' : 'transparent'}
							transition="all 0.15s"
							_hover={{ borderColor: link.active ? 'primary' : 'onSurface/20' }}
						>
							{link.icon}
							<Text textStyle="label.sm" color={link.active ? 'primary' : 'onSurfaceVariant'}>
								{link.label}
							</Text>
						</Flex>
					</Link>
				))}

				{subdomain && (
					<styled.a
						href={`https://${subdomain}`}
						target="_blank"
						rel="noopener noreferrer"
						textDecoration="none"
						marginInlineStart="auto"
					>
						<Flex alignItems="center" gap={1.5} paddingBlock={2.5} paddingInline={3}>
							<ExternalLink size={13} aria-hidden="true" />
							<Text textStyle="label.sm" color="onSurfaceVariant">
								My Site
							</Text>
						</Flex>
					</styled.a>
				)}
			</Flex>
		</styled.nav>
	)
}
