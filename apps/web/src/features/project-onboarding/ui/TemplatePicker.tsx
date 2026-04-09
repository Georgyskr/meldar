'use client'

import { TEMPLATE_SUMMARIES } from '@meldar/orchestrator'
import { Box, Grid, styled, VStack } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import { Heading, Text } from '@/shared/ui'

export type TemplatePickerProps = {
	readonly projectId: string
	readonly onTemplateApplied: () => void
	readonly onStartChat: () => void
}

export function TemplatePicker({ projectId, onTemplateApplied, onStartChat }: TemplatePickerProps) {
	const [applying, setApplying] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handlePickTemplate = useCallback(
		async (templateId: string) => {
			if (applying) return
			setApplying(templateId)
			setError(null)

			try {
				const response = await fetch(`/api/workspace/${projectId}/apply-template`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ templateId }),
				})
				if (!response.ok) {
					const data = (await response.json()) as { error?: { message?: string } }
					throw new Error(data.error?.message ?? `HTTP ${response.status}`)
				}
				onTemplateApplied()
				setApplying(null)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Something went wrong')
				setApplying(null)
			}
		},
		[projectId, applying, onTemplateApplied],
	)

	return (
		<VStack alignItems="stretch" gap={5} paddingBlock={6} paddingInline={4}>
			<VStack alignItems="stretch" gap={1}>
				<Heading textStyle="secondary.lg" color="onSurface">
					Start building
				</Heading>
				<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
					Pick a template to get started:
				</Text>
			</VStack>

			<Grid columns={{ base: 1, sm: 2 }} gap={3}>
				{TEMPLATE_SUMMARIES.map((template) => (
					<styled.button
						key={template.id}
						type="button"
						onClick={() => handlePickTemplate(template.id)}
						disabled={applying !== null}
						textAlign="left"
						paddingBlock={4}
						paddingInline={4}
						borderRadius="lg"
						border="1px solid"
						borderColor={applying === template.id ? 'primary' : 'outlineVariant/50'}
						background={applying === template.id ? 'primary/5' : 'surface'}
						cursor={applying ? 'not-allowed' : 'pointer'}
						transition="all 0.15s"
						_hover={{
							borderColor: 'primary',
							background: 'primary/5',
						}}
						_disabled={{
							opacity: applying === template.id ? 1 : 0.5,
						}}
					>
						<VStack alignItems="flex-start" gap={1}>
							<Text textStyle="secondary.sm" color="onSurface">
								{template.name}
							</Text>
							<Text textStyle="secondary.xs" color="onSurfaceVariant">
								{template.description}
							</Text>
						</VStack>
					</styled.button>
				))}
			</Grid>

			{error && (
				<Box paddingBlock={2} paddingInline={3} borderRadius="md" background="error/10">
					<Text as="p" textStyle="secondary.xs" color="error">
						{error}
					</Text>
				</Box>
			)}

			<Box borderBlockStart="1px solid" borderColor="outlineVariant/20" paddingBlockStart={4}>
				<styled.button
					type="button"
					onClick={() => onStartChat()}
					disabled={applying !== null}
					width="100%"
					paddingBlock={3}
					paddingInline={4}
					borderRadius="md"
					border="1px solid"
					borderColor="outlineVariant/50"
					background="transparent"
					color="onSurfaceVariant"
					fontWeight="500"
					textStyle="secondary.sm"
					cursor={applying ? 'not-allowed' : 'pointer'}
					transition="all 0.15s"
					_hover={{
						borderColor: 'primary',
						color: 'primary',
					}}
					_disabled={{
						opacity: 0.5,
						cursor: 'not-allowed',
					}}
				>
					or describe what you want to build
				</styled.button>
			</Box>

			{applying && (
				<Box display="flex" justifyContent="center">
					<Text textStyle="secondary.xs" color="onSurfaceVariant">
						Setting up your project...
					</Text>
				</Box>
			)}
		</VStack>
	)
}
