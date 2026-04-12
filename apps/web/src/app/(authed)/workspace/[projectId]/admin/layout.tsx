import { Box, Flex, HStack, styled } from '@styled-system/jsx'
import Link from 'next/link'
import { Heading, Text } from '@/shared/ui'

export default async function AdminLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ projectId: string }>
}) {
	const { projectId } = await params

	return (
		<styled.main minHeight="100vh" bg="surface">
			<Box
				borderBlockEnd="1px solid"
				borderColor="outlineVariant/30"
				bg="surface"
				paddingBlock={4}
				paddingInline={{ base: 6, md: 10 }}
			>
				<Flex
					maxWidth="breakpoint-lg"
					marginInline="auto"
					justifyContent="space-between"
					alignItems="center"
				>
					<HStack gap={4}>
						<Link href={`/workspace/${projectId}`} style={{ textDecoration: 'none' }}>
							<Text textStyle="label.sm" color="primary">
								&larr; Back to workspace
							</Text>
						</Link>
					</HStack>
					<HStack gap={4}>
						<Link href={`/workspace/${projectId}/admin`} style={{ textDecoration: 'none' }}>
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Bookings
							</Text>
						</Link>
						<Link href={`/workspace/${projectId}/admin/settings`} style={{ textDecoration: 'none' }}>
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Settings
							</Text>
						</Link>
					</HStack>
				</Flex>
			</Box>
			<Box
				maxWidth="breakpoint-lg"
				marginInline="auto"
				paddingInline={{ base: 6, md: 10 }}
				paddingBlock={{ base: 8, md: 12 }}
			>
				{children}
			</Box>
		</styled.main>
	)
}
