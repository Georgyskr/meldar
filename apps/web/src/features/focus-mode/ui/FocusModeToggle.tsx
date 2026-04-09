'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Text } from '@/shared/ui'
import { setFocusMode, useFocusMode } from '../lib/use-focus-mode'

type PopoverState = 'hidden' | 'asking' | 'none'

export function FocusModeToggle() {
	const { focusMode } = useFocusMode()
	const [popover, setPopover] = useState<PopoverState>('none')
	const popoverRef = useRef<HTMLDivElement>(null)

	function handleToggleClick() {
		if (focusMode) {
			setFocusMode(false)
			setPopover('none')
			return
		}

		if (popover === 'none') {
			setPopover('asking')
			return
		}

		// Shouldn't reach here, but fallback
		setFocusMode(true)
		setPopover('hidden')
	}

	function handleYes() {
		setFocusMode(true)
		setPopover('hidden')
	}

	function handleNo() {
		setPopover('none')
	}

	// Close popover on outside click
	useEffect(() => {
		if (popover !== 'asking') return

		function handleClickOutside(e: MouseEvent) {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setPopover('none')
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [popover])

	return (
		<Box position="relative" ref={popoverRef}>
			<styled.button
				onClick={handleToggleClick}
				display="flex"
				alignItems="center"
				gap={1.5}
				paddingInline={3}
				paddingBlock={1.5}
				fontSize="sm"
				fontWeight="500"
				bg={focusMode ? 'primary/10' : 'transparent'}
				color={focusMode ? 'primary' : 'onSurfaceVariant'}
				border="1px solid"
				borderColor={focusMode ? 'primary/30' : 'outlineVariant/20'}
				borderRadius="full"
				cursor="pointer"
				transition="all 0.2s ease"
				_hover={{ bg: focusMode ? 'primary/15' : 'surfaceContainer' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
				aria-pressed={focusMode}
				aria-label={focusMode ? 'Focus mode is on. Click to turn off.' : 'Turn on focus mode'}
			>
				<Sparkles size={14} />
				<Text display={{ base: 'none', md: 'inline' }}>Focus</Text>
			</styled.button>

			{popover === 'asking' && (
				<VStack
					position="absolute"
					top="calc(100% + 8px)"
					right={0}
					width="280px"
					padding={5}
					bg="surfaceContainerLowest"
					borderRadius="xl"
					border="1px solid"
					borderColor="outlineVariant/15"
					boxShadow="0 8px 30px rgba(0,0,0,0.12)"
					gap={4}
					zIndex={60}
					style={{ animation: 'meldarFadeSlideUp 0.2s ease-out both' }}
				>
					<Text as="p" textStyle="secondary.sm" color="onSurface">
						Some people use their phone to help focus — games, music, fidgets. Want us to factor
						that in?
					</Text>
					<Flex gap={2} width="100%">
						<styled.button
							onClick={handleYes}
							flex={1}
							paddingBlock={2}
							fontSize="sm"
							fontWeight="600"
							background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
							color="white"
							border="none"
							borderRadius="md"
							cursor="pointer"
							transition="opacity 0.2s ease"
							_hover={{ opacity: 0.9 }}
						>
							Yes, that's me
						</styled.button>
						<styled.button
							onClick={handleNo}
							flex={1}
							paddingBlock={2}
							fontSize="sm"
							fontWeight="500"
							bg="transparent"
							border="1px solid"
							borderColor="outlineVariant/30"
							color="onSurfaceVariant"
							borderRadius="md"
							cursor="pointer"
							_hover={{ bg: 'surfaceContainer' }}
						>
							No thanks
						</styled.button>
					</Flex>
				</VStack>
			)}
		</Box>
	)
}
