import { Flex, VStack } from '@styled-system/jsx'
import Link from 'next/link'
import { Heading, Text } from '@/shared/ui'

export default function NotFound() {
	return (
		<Flex
			minHeight="100vh"
			alignItems="center"
			justifyContent="center"
			bg="surface"
			paddingInline={6}
		>
			<VStack gap={4} maxWidth="480px" textAlign="center">
				<Heading as="h1" textStyle="primary.md" color="onSurface">
					Page not found
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					The page you're looking for doesn't exist or has been moved.
				</Text>
				<Link
					href="/"
					style={{
						padding: '12px 24px',
						background: '#623153',
						color: '#fff',
						borderRadius: '8px',
						textDecoration: 'none',
						fontWeight: 500,
					}}
				>
					Go home
				</Link>
			</VStack>
		</Flex>
	)
}
