'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { useEffect, useState } from 'react'
import { Text } from '@/shared/ui'

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
			transition="all 0.3s ease"
			bg={scrolled ? 'surface/92' : 'surface/40'}
			backdropFilter={scrolled ? 'blur(16px) saturate(1.2)' : 'blur(8px)'}
			borderBottom={scrolled ? '1px solid' : 'none'}
			borderColor="onSurface/15"
		>
			<styled.a
				href="#main-content"
				position="absolute"
				top="-100%"
				left="16px"
				paddingInline={4}
				paddingBlock={2}
				bg="onSurface"
				color="surface"
				zIndex={100}
				textDecoration="none"
				_focusVisible={{
					top: '12px',
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				<Text textStyle="button.md" color="surface">
					Skip to content
				</Text>
			</styled.a>
			<Flex
				maxWidth="breakpoint-xl"
				marginInline="auto"
				paddingInline={{ base: 5, md: 12 }}
				paddingBlock={{ base: 3, md: 4 }}
				alignItems="center"
				justifyContent="space-between"
			>
				<Flex alignItems="baseline" gap={3}>
					<Box
						width="10px"
						height="10px"
						borderRadius="full"
						bg="secondaryLight"
						boxShadow="0 0 12px #FFB876"
						style={{ animation: 'gentleBreathe 3s ease-in-out infinite' }}
					/>
					<styled.a href="/" textDecoration="none">
						<Text textStyle="primary.sm" color="onSurface">
							Meldar
						</Text>
					</styled.a>
					<Text
						textStyle="italic.sm"
						color="onSurfaceVariant/60"
						display={{ base: 'none', md: 'inline' }}
					>
						Vol. I
					</Text>
				</Flex>
				<styled.a
					href="/sign-up"
					display="inline-flex"
					alignItems="center"
					paddingInline={5}
					paddingBlock={2}
					bg="onSurface"
					color="surface"
					textDecoration="none"
					transition="all 0.2s ease"
					_hover={{ bg: 'primary' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '3px' }}
				>
					<Text textStyle="button.sm" color="surface">
						Start free
					</Text>
				</styled.a>
			</Flex>
		</styled.header>
	)
}
