import { Flex, styled } from '@styled-system/jsx'
import { FocusModeToggle } from '@/features/focus-mode'

export function Header() {
	return (
		<styled.header
			position="fixed"
			top={0}
			left={0}
			right={0}
			zIndex={50}
			bg="surface/80"
			backdropFilter="blur(20px)"
			boxShadow="0px 24px 48px rgba(12,12,13,0.04)"
		>
			<Flex
				maxWidth="breakpoint-xl"
				marginInline="auto"
				paddingInline={8}
				paddingBlock={4}
				alignItems="center"
				justifyContent="space-between"
			>
				<Flex alignItems="center" gap={3}>
					<styled.div
						width="24px"
						height="24px"
						borderRadius="full"
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						opacity={0.9}
					/>
					<styled.a
						href="/"
						fontFamily="heading"
						fontSize="2xl"
						fontWeight="700"
						letterSpacing="-0.04em"
						color="onSurface"
						textDecoration="none"
					>
						Meldar
					</styled.a>
				</Flex>
				<Flex alignItems="center" gap={3}>
					<styled.a
						href="/discover"
						fontSize="sm"
						fontWeight="500"
						color="onSurfaceVariant"
						textDecoration="none"
						transition="color 0.15s ease"
						_hover={{ color: 'onSurface' }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						Discover
					</styled.a>
					<FocusModeToggle />
					<styled.a
						href="/xray"
						paddingInline={5}
						paddingBlock={2}
						fontSize="sm"
						fontWeight="500"
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						borderRadius="md"
						textDecoration="none"
						transition="opacity 0.2s ease"
						_hover={{ opacity: 0.9 }}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
					>
						Get your Time X-Ray
					</styled.a>
				</Flex>
			</Flex>
		</styled.header>
	)
}
