import { styled, VStack } from '@styled-system/jsx'

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<VStack alignItems="flex-start" gap={3} width="100%">
			<styled.h2 fontFamily="heading" fontSize="xl" fontWeight="700" color="onSurface">
				{title}
			</styled.h2>
			{children}
		</VStack>
	)
}

export function P({ children }: { children: React.ReactNode }) {
	return (
		<styled.p fontSize="sm" fontWeight="300" color="onSurfaceVariant" lineHeight="relaxed">
			{children}
		</styled.p>
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
		<styled.span fontWeight="500" color="onSurface">
			{children}
		</styled.span>
	)
}
