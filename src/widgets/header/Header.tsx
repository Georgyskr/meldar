'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useEffect, useState } from 'react'

export function Header() {
	const [scrolled, setScrolled] = useState(false)

	useEffect(() => {
		function onScroll() {
			setScrolled(window.scrollY > 20)
		}
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	return (
		<styled.header
			position="fixed"
			top={0}
			left={0}
			right={0}
			zIndex={50}
			backdropFilter={scrolled ? 'blur(40px) saturate(1.2)' : 'blur(32px)'}
			transition="all 0.3s ease"
			bg={scrolled ? 'surface/85' : 'surface/30'}
			boxShadow={scrolled ? '0 1px 0 rgba(0,0,0,0.06)' : 'none'}
		>
			<styled.a
				href="#main-content"
				position="absolute"
				top="-100%"
				left="16px"
				paddingInline={4}
				paddingBlock={2}
				bg="primary"
				color="onPrimary"
				fontWeight="600"
				fontSize="sm"
				borderRadius="md"
				zIndex={100}
				textDecoration="none"
				_focusVisible={{
					top: '12px',
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				Skip to content
			</styled.a>
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
				<styled.a
					href="/start"
					paddingInline={5}
					paddingBlock={2}
					fontSize="sm"
					fontWeight="600"
					fontFamily="heading"
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					borderRadius="md"
					textDecoration="none"
					transition="opacity 0.2s ease"
					_hover={{ opacity: 0.9 }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					Start here
				</styled.a>
			</Flex>
		</styled.header>
	)
}
