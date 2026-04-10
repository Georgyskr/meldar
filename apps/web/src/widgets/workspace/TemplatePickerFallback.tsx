'use client'

import { Box } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { TemplatePicker } from '@/features/project-onboarding/ui/TemplatePicker'

export function TemplatePickerFallback({ projectId }: { readonly projectId: string }) {
	const router = useRouter()

	const handleTemplateApplied = useCallback(() => {
		router.refresh()
	}, [router])

	const handleStartChat = useCallback(() => {
		router.push(`/workspace/${projectId}`)
	}, [router, projectId])

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
			</Box>
		</Box>
	)
}
