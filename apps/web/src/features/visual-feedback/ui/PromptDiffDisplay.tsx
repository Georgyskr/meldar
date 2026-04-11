'use client'

import { Box, Flex } from '@styled-system/jsx'
import { useEffect, useState } from 'react'
import { Text } from '@/shared/ui/typography'

type Props = {
	readonly userInstruction: string
	readonly aiInterpretation: string
}

export function PromptDiffDisplay({ userInstruction, aiInterpretation }: Props) {
	const [visible, setVisible] = useState(true)

	useEffect(() => {
		const timer = setTimeout(() => setVisible(false), 10_000)
		return () => clearTimeout(timer)
	}, [])

	if (!visible) return null

	return (
		<Box
			paddingBlock={2}
			paddingInline={3}
			bg="outlineVariant/10"
			borderRadius="sm"
			transition="opacity 0.3s"
		>
			<Flex direction="column" gap={1}>
				<Text as="p" textStyle="body.sm" color="onSurfaceVariant">
					You said: &lsquo;{userInstruction}&rsquo;
				</Text>
				<Text as="p" textStyle="body.sm" color="onSurface">
					Meldar understood: &lsquo;{aiInterpretation}&rsquo;
				</Text>
			</Flex>
		</Box>
	)
}
