'use client'

import { Box, Flex } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import { Text } from '@/shared/ui/typography'
import { BuildStatusOverlay } from './BuildStatusOverlay'
import { buildPreviewSrc } from './lib/build-status'
import { isSafePreviewUrl } from './lib/preview-url'

type Props = {
	readonly previewUrl: string | null
	readonly activeBuildCardId: string | null
	readonly failureMessage: string | null
}

export function PreviewPane({ previewUrl, activeBuildCardId, failureMessage }: Props) {
	const isBuilding = activeBuildCardId !== null
	const wasBuildingRef = useRef(isBuilding)
	const [cacheBuster, setCacheBuster] = useState(() => Date.now())

	useEffect(() => {
		const wasBuilding = wasBuildingRef.current
		wasBuildingRef.current = isBuilding
		if (wasBuilding && !isBuilding) {
			setCacheBuster(Date.now())
		}
	}, [isBuilding])

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
						style={{
							width: '100%',
							height: '100%',
							border: 'none',
							display: 'block',
						}}
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
				>
					{isBuilding ? (
						<>
							<Box
								width="40px"
								height="40px"
								borderRadius="50%"
								bg="primary"
								animation="softPulse 1.6s ease-in-out infinite"
							/>
							<Text textStyle="primary.sm" color="onSurface">
								Building your page&hellip;
							</Text>
							<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="400px">
								This takes about 30 seconds. You'll see your page appear here when it's ready.
							</Text>
						</>
					) : (
						<>
							<Text textStyle="primary.sm" color="onSurface">
								Describe what you want to build
							</Text>
							<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="440px">
								Use the input below to get started. Try "create a booking page for a hair salon with 3 services" or "build a landing page with email capture."
							</Text>
							<Text textStyle="secondary.xs" color="onSurfaceVariant/60" maxWidth="400px">
								Your live preview will appear here once the first build completes.
							</Text>
						</>
					)}
				</Flex>
			)}

			<BuildStatusOverlay activeBuildCardId={activeBuildCardId} failureMessage={failureMessage} />
		</Flex>
	)
}
