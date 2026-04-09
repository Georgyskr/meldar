import { styled, VStack } from '@styled-system/jsx'
import { Heading, Text } from '@/shared/ui'

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<VStack alignItems="flex-start" gap={3} width="100%">
			<Heading textStyle="primary.sm" color="onSurface">
				{title}
			</Heading>
			{children}
		</VStack>
	)
}

export function P({ children }: { children: React.ReactNode }) {
	return (
		<Text textStyle="secondary.sm" as="p" color="onSurfaceVariant">
			{children}
		</Text>
	)
}

export function Ul({ children }: { children: React.ReactNode }) {
	return (
		<styled.ul
			paddingInlineStart={5}
			fontSize="sm"
			fontWeight="300"
			color="onSurfaceVariant"
			lineHeight="relaxed"
			listStyleType="disc"
		>
			{children}
		</styled.ul>
	)
}

export function Li({ children }: { children: React.ReactNode }) {
	return <styled.li marginBlockEnd={1}>{children}</styled.li>
}

export function B({ children }: { children: React.ReactNode }) {
	return (
		<Text textStyle="secondary.md" color="onSurface">
			{children}
		</Text>
	)
}
