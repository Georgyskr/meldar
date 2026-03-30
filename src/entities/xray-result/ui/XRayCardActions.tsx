'use client'

import { Flex, styled } from '@styled-system/jsx'
import { Copy, ExternalLink, Share2 } from 'lucide-react'
import { useState } from 'react'
import { trackEvent } from '@/features/analytics'

export function XRayCardActions({ xrayId }: { xrayId: string }) {
	const [copied, setCopied] = useState(false)
	const shareUrl = `https://meldar.ai/xray/${xrayId}`

	async function handleShare() {
		trackEvent({ name: 'xray_shared', method: 'native_share' })
		if (navigator.share) {
			await navigator.share({
				title: 'My Time X-Ray',
				text: 'Check out my screen time breakdown',
				url: shareUrl,
			})
		} else {
			await handleCopy()
		}
	}

	async function handleCopy() {
		trackEvent({ name: 'xray_shared', method: 'copy_link' })
		await navigator.clipboard.writeText(shareUrl)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<Flex gap={3} justifyContent="center" paddingBlock={4}>
			<styled.button
				onClick={handleShare}
				display="flex"
				alignItems="center"
				gap={2}
				paddingInline={4}
				paddingBlock={2}
				bg="surfaceContainerHigh"
				borderRadius="full"
				fontSize="sm"
				fontWeight="500"
				color="primary"
				border="none"
				cursor="pointer"
				transition="opacity 0.2s"
				_hover={{ opacity: 0.8 }}
			>
				<Share2 size={14} />
				Share
			</styled.button>

			<styled.button
				onClick={handleCopy}
				display="flex"
				alignItems="center"
				gap={2}
				paddingInline={4}
				paddingBlock={2}
				bg="surfaceContainerHigh"
				borderRadius="full"
				fontSize="sm"
				fontWeight="500"
				color="onSurfaceVariant"
				border="none"
				cursor="pointer"
				transition="opacity 0.2s"
				_hover={{ opacity: 0.8 }}
			>
				{copied ? (
					<>
						<Copy size={14} />
						Copied!
					</>
				) : (
					<>
						<ExternalLink size={14} />
						Copy link
					</>
				)}
			</styled.button>
		</Flex>
	)
}
