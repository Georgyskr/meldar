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
	readonly failureMessage: string | null
	readonly writtenFiles?: readonly WrittenFile[]
	readonly buildJustFinished?: boolean
}

export function PreviewPane({
	previewUrl,
	activeBuildCardId,
	failureMessage,
	writtenFiles = [],
	buildJustFinished = false,
}: Props) {
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
	const latestFile = writtenFiles.length > 0 ? writtenFiles[writtenFiles.length - 1] : null
	const isDeploying = !isBuilding && buildJustFinished && !safeUrl

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
							{latestFile ? (
								<>
									<Text textStyle="primary.sm" color="onSurface">
										Writing code&hellip;
									</Text>
									<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="400px">
										Writing {latestFile.path.split('/').pop()}&hellip;
									</Text>
								</>
							) : (
								<>
									<Text textStyle="primary.sm" color="onSurface">
										Thinking&hellip;
									</Text>
									<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="400px">
										Meldar is planning your page.
									</Text>
								</>
							)}
						</>
					) : isDeploying ? (
						<>
							<Box
								width="40px"
								height="40px"
								borderRadius="50%"
								bg="primary"
								animation="softPulse 1.6s ease-in-out infinite"
							/>
							<Text textStyle="primary.sm" color="onSurface">
								Starting preview&hellip;
							</Text>
							<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="400px">
								Your page is ready. Loading the live preview.
							</Text>
						</>
					) : (
						<>
							<Text textStyle="primary.sm" color="onSurface">
								Describe what you want to build
							</Text>
							<Text textStyle="secondary.sm" color="onSurfaceVariant" maxWidth="440px">
								Use the input below to get started. Try &ldquo;create a booking page for a hair
								salon with 3 services&rdquo; or &ldquo;build a landing page with email
								capture.&rdquo;
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
