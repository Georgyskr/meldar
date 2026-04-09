'use client'

import { Flex, styled } from '@styled-system/jsx'
import { useEffect, useState } from 'react'
import { Text } from '@/shared/ui'
import {
	getStoredConsent,
	REOPEN_CONSENT_EVENT,
	revokeConsent,
	saveConsent,
} from '../lib/use-consent-state'

export function CookieConsent() {
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (getStoredConsent() === 'undecided') {
			setVisible(true)
		}
		const handleReopen = () => setVisible(true)
		window.addEventListener(REOPEN_CONSENT_EVENT, handleReopen)
		return () => window.removeEventListener(REOPEN_CONSENT_EVENT, handleReopen)
	}, [])

	function accept() {
		saveConsent(true)
		setVisible(false)
	}

	function decline() {
		revokeConsent()
		setVisible(false)
	}

	if (!visible) return null

	return (
		<styled.div
			role="dialog"
			aria-label="Cookie consent"
			position="fixed"
			bottom={0}
			left={0}
			right={0}
			zIndex={100}
			bg="inverseSurface"
			color="inverseOnSurface"
			paddingInline={6}
			paddingBlock={4}
		>
			<Flex
				maxWidth="breakpoint-xl"
				marginInline="auto"
				flexDir={{ base: 'column', md: 'row' }}
				alignItems={{ md: 'center' }}
				justifyContent="space-between"
				gap={4}
			>
				<Text textStyle="secondary.sm" as="p" maxWidth="breakpoint-md">
					We use cookies to understand how visitors use this site. No tracking until you say so.{' '}
					<styled.a
						href="/privacy-policy"
						color="inversePrimary"
						textDecoration="underline"
						textUnderlineOffset="2px"
						_hover={{ opacity: 0.8 }}
					>
						Privacy policy
					</styled.a>
				</Text>
				<Flex gap={3} flexShrink={0}>
					<styled.button
						onClick={decline}
						paddingInline={4}
						paddingBlock={2}
						fontSize="sm"
						fontWeight="500"
						bg="transparent"
						border="1px solid"
						borderColor="inverseOnSurface/30"
						color="inverseOnSurface"
						borderRadius="md"
						cursor="pointer"
						transition="opacity 0.2s ease"
						_hover={{ opacity: 0.8 }}
					>
						Reject
					</styled.button>
					<styled.button
						onClick={accept}
						paddingInline={4}
						paddingBlock={2}
						fontSize="sm"
						fontWeight="500"
						background="linear-gradient(135deg, #623153 0%, #ffb876 100%)"
						color="white"
						border="none"
						borderRadius="md"
						cursor="pointer"
						transition="opacity 0.2s ease"
						_hover={{ opacity: 0.9 }}
					>
						Accept
					</styled.button>
				</Flex>
			</Flex>
		</styled.div>
	)
}
