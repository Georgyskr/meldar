'use client'

import { Box, Flex, styled } from '@styled-system/jsx'
import { useWorkspaceBuild } from '@/features/workspace-build'
import { isSafePreviewUrl } from './lib/preview-url'

export type PreviewPaneProps = {
	readonly projectName: string
}

export function PreviewPane({ projectName }: PreviewPaneProps) {
	const { previewUrl } = useWorkspaceBuild()

	if (!isSafePreviewUrl(previewUrl)) {
		return <PreviewPlaceholder />
	}

	return (
		<Box flex="1" position="relative" minHeight="400px" bg="surfaceContainer">
			<styled.iframe
				src={previewUrl}
				title={`${projectName} preview`}
				width="100%"
				height="100%"
				border="none"
				background="white"
				sandbox="allow-scripts allow-forms allow-popups"
				referrerPolicy="no-referrer"
				loading="lazy"
			/>
		</Box>
	)
}

function PreviewPlaceholder() {
	return (
		<Flex
			width="100%"
			height="100%"
			alignItems="center"
			justifyContent="center"
			direction="column"
			gap={3}
			padding={6}
			bg="surfaceContainer"
		>
			<styled.div
				width="64px"
				height="64px"
				borderRadius="full"
				background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
				opacity={0.3}
			/>
			<styled.h3 textStyle="heading.sm" color="onSurfaceVariant" textAlign="center">
				Spinning up your preview…
			</styled.h3>
			<styled.p textStyle="body.sm" color="onSurfaceVariant/70" textAlign="center" maxWidth="320px">
				First-time builds take a few seconds. Subsequent loads are instant.
			</styled.p>
		</Flex>
	)
}
