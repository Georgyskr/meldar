'use client'

import { Box, VStack } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { TemplatePicker } from '@/features/project-onboarding/ui/TemplatePicker'
import { Text } from '@/shared/ui'

export function WorkspaceEmptyState({ projectId }: { readonly projectId: string }) {
	const router = useRouter()
	const [chatComingSoon, setChatComingSoon] = useState(false)

	const handleTemplateApplied = useCallback(() => {
		router.refresh()
	}, [router])

	const handleStartChat = useCallback(() => {
		setChatComingSoon(true)
	}, [])

	return (
		<Box
			position="absolute"
			inset={0}
			display="grid"
			placeItems="center"
			paddingInline={6}
			paddingBlock={6}
			overflowY="auto"
		>
			<Box
				maxWidth="640px"
				width="100%"
				background="rgba(255, 255, 255, 0.7)"
				borderRadius="24px"
				border="1px solid"
				borderColor="outlineVariant/30"
				boxShadow="0 24px 64px rgba(98, 49, 83, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.6) inset"
				backdropFilter="blur(16px)"
			>
				<TemplatePicker
					projectId={projectId}
					onTemplateApplied={handleTemplateApplied}
					onStartChat={handleStartChat}
				/>
				{chatComingSoon && (
					<VStack
						alignItems="stretch"
						gap={2}
						paddingInline={4}
						paddingBlockEnd={6}
						marginBlockStart={-2}
					>
						<Box
							paddingBlock={3}
							paddingInline={4}
							borderRadius="md"
							background="primary/5"
							border="1px solid"
							borderColor="primary/20"
						>
							<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant">
								Describe-your-app chat is coming next. For now, pick a template above — you can
								rename, reorder, and edit tasks after.
							</Text>
						</Box>
					</VStack>
				)}
			</Box>
		</Box>
	)
}
