'use client'

import { Box, styled, VStack } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import { Text } from '@/shared/ui'

type Decision = {
	readonly summary: string
	readonly changePrompt: string
}

type Props = {
	readonly projectId: string
	readonly buildId: string
	readonly buildsCompleted: number
}

export function DecisionsCard({ projectId, buildId, buildsCompleted }: Props) {
	const [decisions, setDecisions] = useState<Decision[] | null>(null)
	const [collapsed, setCollapsed] = useState(buildsCompleted > 3)
	const [loading, setLoading] = useState(true)
	const cacheRef = useRef<Record<string, Decision[]>>({})

	useEffect(() => {
		if (cacheRef.current[buildId]) {
			setDecisions(cacheRef.current[buildId])
			setLoading(false)
			return
		}

		let cancelled = false
		setLoading(true)
		setDecisions(null)

		fetch(`/api/workspace/${projectId}/build-decisions?buildId=${encodeURIComponent(buildId)}`)
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return (await res.json()) as { decisions: Decision[] }
			})
			.then((data) => {
				if (!cancelled) {
					cacheRef.current[buildId] = data.decisions
					setDecisions(data.decisions)
					setLoading(false)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setDecisions(null)
					setLoading(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [projectId, buildId])

	if (loading) {
		return (
			<Box
				paddingBlock={3}
				paddingInline={4}
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/30"
				borderRadius="md"
			>
				<Text textStyle="secondary.xs" color="onSurfaceVariant/40">
					Loading decisions...
				</Text>
			</Box>
		)
	}
	if (!decisions || decisions.length === 0) return null

	if (collapsed) {
		return (
			<styled.button
				type="button"
				onClick={() => setCollapsed(false)}
				width="100%"
				paddingBlock={2.5}
				paddingInline={4}
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/30"
				borderRadius="md"
				textAlign="left"
				cursor="pointer"
				transition="all 0.12s"
				_hover={{ background: 'onSurface/3' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				<Text textStyle="secondary.xs" color="onSurfaceVariant">
					{decisions.length} things I decided for you · tap to see
				</Text>
			</styled.button>
		)
	}

	return (
		<Box
			paddingBlock={4}
			paddingInline={4}
			background="surfaceContainerLowest"
			border="1px solid"
			borderColor="outlineVariant/30"
			borderRadius="md"
		>
			<VStack alignItems="stretch" gap={3}>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					{decisions.length} things I decided for you
				</Text>

				{decisions.map((d) => (
					<Box key={d.summary}>
						<Text as="p" textStyle="body.sm" color="onSurface">
							{d.summary}
						</Text>
					</Box>
				))}

				{buildsCompleted <= 3 && (
					<styled.button
						type="button"
						onClick={() => setCollapsed(true)}
						background="transparent"
						border="none"
						cursor="pointer"
						padding={0}
						textAlign="left"
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
					>
						<Text
							textStyle="secondary.xs"
							color="onSurfaceVariant/40"
							_hover={{ color: 'primary' }}
						>
							dismiss
						</Text>
					</styled.button>
				)}
			</VStack>
		</Box>
	)
}
