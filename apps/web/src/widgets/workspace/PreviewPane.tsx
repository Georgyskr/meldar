'use client'

import { Box, Flex } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import type { WrittenFile } from '@/features/workspace'
import { Text } from '@/shared/ui/typography'
import { BuildStatusOverlay } from './BuildStatusOverlay'
import { buildPreviewSrc } from './lib/build-status'
import { isSafePreviewUrl } from './lib/preview-url'

type Props = {
	readonly previewUrl: string | null
	readonly activeBuildCardId: string | null
	readonly writtenFiles?: readonly WrittenFile[]
	readonly buildJustFinished?: boolean
}

export function PreviewPane({ previewUrl, activeBuildCardId, buildJustFinished = false }: Props) {
	const isActive = activeBuildCardId !== null
	const wasActiveRef = useRef(isActive)
	const [cacheBuster, setCacheBuster] = useState(() => Date.now())

	useEffect(() => {
		const wasActive = wasActiveRef.current
		wasActiveRef.current = isActive
		if (wasActive && !isActive) {
			setCacheBuster(Date.now())
		}
	}, [isActive])

	const safeUrl = isSafePreviewUrl(previewUrl) ? previewUrl : null

	return (
		<Flex direction="column" flex="1" height="100%" position="relative" minWidth={0}>
			{safeUrl ? (
				<Box
					flex="1"
					border="1px solid"
					borderColor="outlineVariant/30"
					borderRadius="md"
					overflow="hidden"
				>
					<iframe
						key={cacheBuster}
						src={buildPreviewSrc(safeUrl, cacheBuster)}
						title="Live preview"
						sandbox="allow-scripts allow-same-origin allow-forms"
						style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
					/>
				</Box>
			) : (
				<Flex
					flex="1"
					alignItems="center"
					justifyContent="center"
					direction="column"
					gap={5}
					border="1px solid"
					borderColor="outlineVariant/30"
					borderRadius="md"
					paddingInline={6}
					textAlign="center"
					aria-live="polite"
				>
					<Box
						width="40px"
						height="40px"
						borderRadius="50%"
						bg="primary"
						animation="softPulse 1.6s ease-in-out infinite"
						aria-hidden
					/>
					<Text textStyle="primary.sm" color="onSurface">
						{buildJustFinished ? 'Opening your page\u2026' : 'Setting up your page\u2026'}
					</Text>
					<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="400px">
						{buildJustFinished
							? 'One moment while we bring it to life.'
							: "This takes about 30 seconds. You'll see your page here when it's ready."}
					</Text>
				</Flex>
			)}

			<BuildStatusOverlay />
		</Flex>
	)
}
