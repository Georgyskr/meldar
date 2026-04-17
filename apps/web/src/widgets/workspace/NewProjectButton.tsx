'use client'

import { styled } from '@styled-system/jsx'
import Link, { useLinkStatus } from 'next/link'
import { Text } from '@/shared/ui'

const StyledLink = styled(Link)

function Label() {
	const { pending } = useLinkStatus()
	return (
		<Text textStyle="button.sm" color="surface">
			{pending ? 'Opening…' : '+ New project'}
		</Text>
	)
}

export function NewProjectButton() {
	return (
		<StyledLink
			href="/onboarding"
			paddingInline={4}
			paddingBlock={1.5}
			bg="onSurface"
			color="surface"
			textDecoration="none"
			transition="all 0.2s ease"
			_hover={{ bg: 'primary' }}
			_focusVisible={{
				outline: '2px solid',
				outlineColor: 'primary',
				outlineOffset: '2px',
			}}
		>
			<Label />
		</StyledLink>
	)
}
