import { Box, styled } from '@styled-system/jsx'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<styled.main minHeight="100vh" bg="surface" paddingBlock={{ base: 10, md: 14 }}>
			<Box maxWidth="breakpoint-lg" marginInline="auto" paddingInline={{ base: 6, md: 10 }}>
				{children}
			</Box>
		</styled.main>
	)
}
