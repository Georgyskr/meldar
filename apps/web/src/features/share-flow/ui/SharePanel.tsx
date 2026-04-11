'use client'

import { Box, HStack, styled, VStack } from '@styled-system/jsx'
import { Check, Copy, Instagram, MessageCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Heading, Text } from '@/shared/ui'

type Props = {
	readonly subdomain: string
}

export function SharePanel({ subdomain }: Props) {
	const url = `https://${subdomain}`
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {}
	}, [url])

	const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Book with me: ${url}`)}`

	return (
		<VStack alignItems="stretch" gap={5}>
			<VStack alignItems="stretch" gap={2}>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Your booking page
				</Text>
				<Heading as="h2" textStyle="heading.3" color="onSurface">
					Share it everywhere
				</Heading>
			</VStack>

			<Box
				paddingBlock={4}
				paddingInline={5}
				background="primary/5"
				border="1px solid"
				borderColor="primary/20"
				borderRadius="md"
			>
				<Text
					as="code"
					textStyle="body.md"
					color="primary"
					fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
					wordBreak="break-all"
				>
					{subdomain}
				</Text>
			</Box>

			<HStack gap={3} flexWrap="wrap">
				<styled.button
					type="button"
					onClick={handleCopy}
					aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
					display="inline-flex"
					alignItems="center"
					gap={2}
					minHeight="44px"
					minWidth="44px"
					paddingBlock={3}
					paddingInline={5}
					background={copied ? 'primary' : 'transparent'}
					color={copied ? 'surface' : 'onSurface'}
					border="1px solid"
					borderColor={copied ? 'primary' : 'outlineVariant/50'}
					borderRadius="md"
					cursor="pointer"
					transition="all 0.15s"
					_hover={{ background: copied ? 'primary' : 'onSurface/4' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
					<Text as="span" textStyle="button.md" color={copied ? 'surface' : 'onSurface'}>
						{copied ? 'Copied!' : 'Copy link'}
					</Text>
				</styled.button>

				<styled.a
					href={whatsappHref}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Share on WhatsApp"
					display="inline-flex"
					alignItems="center"
					gap={2}
					minHeight="44px"
					minWidth="44px"
					paddingBlock={3}
					paddingInline={5}
					background="transparent"
					color="onSurface"
					border="1px solid"
					borderColor="outlineVariant/50"
					borderRadius="md"
					textDecoration="none"
					cursor="pointer"
					transition="all 0.15s"
					_hover={{ background: 'onSurface/4' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					<MessageCircle size={16} aria-hidden="true" />
					<Text as="span" textStyle="button.md" color="onSurface">
						WhatsApp
					</Text>
				</styled.a>

				<InstagramButton />
			</HStack>
		</VStack>
	)
}

function InstagramButton() {
	const [showTip, setShowTip] = useState(false)

	return (
		<Box position="relative">
			<styled.button
				type="button"
				onClick={() => setShowTip((prev) => !prev)}
				aria-label="Share on Instagram"
				aria-expanded={showTip}
				display="inline-flex"
				alignItems="center"
				gap={2}
				minHeight="44px"
				minWidth="44px"
				paddingBlock={3}
				paddingInline={5}
				background="transparent"
				color="onSurface"
				border="1px solid"
				borderColor="outlineVariant/50"
				borderRadius="md"
				cursor="pointer"
				transition="all 0.15s"
				_hover={{ background: 'onSurface/4' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				<Instagram size={16} aria-hidden="true" />
				<Text as="span" textStyle="button.md" color="onSurface">
					Instagram
				</Text>
			</styled.button>

			{showTip && (
				<Box
					position="absolute"
					insetBlockStart="100%"
					insetInlineStart={0}
					marginBlockStart={2}
					paddingBlock={3}
					paddingInline={4}
					background="surfaceContainerLowest"
					border="1px solid"
					borderColor="outlineVariant/40"
					borderRadius="md"
					boxShadow="sm"
					whiteSpace="nowrap"
					zIndex={10}
					role="tooltip"
				>
					<Text textStyle="body.sm" color="onSurfaceVariant">
						Paste this link in your Instagram bio
					</Text>
				</Box>
			)}
		</Box>
	)
}
