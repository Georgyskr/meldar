'use client'

import { Flex, styled } from '@styled-system/jsx'
import { Copy, Download, Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'

type XRayCardActionsProps = {
	xrayId: string
	totalHours?: number
	topApp?: string
	cardRef?: React.RefObject<HTMLDivElement | null>
	onTrack?: (event: { name: 'xray_shared'; method: string }) => void
}

export function XRayCardActions({
	xrayId,
	totalHours,
	topApp,
	cardRef,
	onTrack,
}: XRayCardActionsProps) {
	const [copied, setCopied] = useState(false)
	const [saving, setSaving] = useState(false)
	const shareUrl = `https://meldar.ai/xray/${xrayId}`

	const shareText =
		totalHours && topApp
			? `I spend ${totalHours}h/day on my phone — ${topApp} is the culprit. See yours:`
			: 'Check out my screen time breakdown'

	async function handleShare() {
		onTrack?.({ name: 'xray_shared', method: 'native_share' })
		if (navigator.share) {
			await navigator.share({
				title: 'My Digital Footprint Scan',
				text: shareText,
				url: shareUrl,
			})
		} else {
			await handleCopy()
		}
	}

	async function handleCopy() {
		onTrack?.({ name: 'xray_shared', method: 'copy_link' })
		await navigator.clipboard.writeText(shareUrl)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleSaveImage = useCallback(async () => {
		if (!cardRef?.current || saving) return
		setSaving(true)
		onTrack?.({ name: 'xray_shared', method: 'save_image' })
		try {
			const { toPng } = await import('html-to-image')
			const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
			const link = document.createElement('a')
			link.download = `time-xray-${xrayId}.png`
			link.href = dataUrl
			link.click()
		} catch {
			await navigator.clipboard.writeText(shareUrl)
		} finally {
			setSaving(false)
		}
	}, [cardRef, xrayId, saving, shareUrl, onTrack])

	return (
		<Flex gap={2} justifyContent="center" flexWrap="wrap" paddingBlock={4}>
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
				_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
			>
				<Share2 size={14} />
				Share
			</styled.button>

			{cardRef && (
				<styled.button
					onClick={handleSaveImage}
					disabled={saving}
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
					_disabled={{ opacity: 0.6, cursor: 'wait' }}
					_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
				>
					<Download size={14} />
					{saving ? 'Saving\u2026' : 'Save image'}
				</styled.button>
			)}

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
				_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
			>
				{copied ? (
					<>
						<Copy size={14} />
						Copied!
					</>
				) : (
					<>
						<Copy size={14} />
						Copy link
					</>
				)}
			</styled.button>
		</Flex>
	)
}
