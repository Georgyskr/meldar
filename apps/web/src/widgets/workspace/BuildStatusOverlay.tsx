'use client'

import { css } from '@styled-system/css'
import { Box, Flex } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import { derivePipelinePhase, useWorkspaceBuild } from '@/features/workspace'
import { Text } from '@/shared/ui/typography'

type OverlayPhase = 'building' | 'done' | 'failed'

const DONE_PILL_FADE_MS = 3000

export function BuildStatusOverlay() {
	const workspace = useWorkspaceBuild()
	const { lastBuildAt } = workspace
	const pipeline = derivePipelinePhase(workspace)
	const [visible, setVisible] = useState<OverlayPhase | null>(null)
	const shownBuildAtRef = useRef<number | null>(null)
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (fadeTimerRef.current !== null) {
			clearTimeout(fadeTimerRef.current)
			fadeTimerRef.current = null
		}

		if (pipeline.kind === 'building' || pipeline.kind === 'deploying') {
			setVisible('building')
			return
		}

		if (pipeline.kind === 'failed') {
			setVisible('failed')
			return
		}

		if (lastBuildAt !== null && lastBuildAt !== shownBuildAtRef.current) {
			shownBuildAtRef.current = lastBuildAt
			setVisible('done')
			fadeTimerRef.current = setTimeout(() => {
				setVisible(null)
				fadeTimerRef.current = null
			}, DONE_PILL_FADE_MS)
			return
		}

		setVisible(null)
	}, [pipeline.kind, lastBuildAt])

	useEffect(() => {
		return () => {
			if (fadeTimerRef.current !== null) {
				clearTimeout(fadeTimerRef.current)
			}
		}
	}, [])

	if (visible === null) return null

	return (
		<Box
			position="absolute"
			insetBlockStart="12px"
			insetInlineEnd="12px"
			zIndex={10}
			role="status"
			aria-live="polite"
			data-testid="build-pill"
			data-phase={visible}
		>
			{visible === 'building' && <BuildingPill />}
			{visible === 'done' && <DonePill />}
			{visible === 'failed' && <FailedPill />}
		</Box>
	)
}

function BuildingPill() {
	return (
		<Flex
			alignItems="center"
			gap="1.5"
			paddingBlock="1.5"
			paddingInline="3"
			borderRadius="full"
			background="primary"
			className={css({ animation: 'softPulse 1.6s ease-in-out infinite' })}
		>
			<Text textStyle="label.sm" color="surface">
				Updating&hellip;
			</Text>
		</Flex>
	)
}

function DonePill() {
	return (
		<Flex
			alignItems="center"
			gap="1.5"
			paddingBlock="1.5"
			paddingInline="3"
			borderRadius="full"
			background="success"
			className={css({ animation: 'checkIn 0.3s ease-out forwards' })}
		>
			<Text textStyle="label.sm" color="surface">
				&#10003; Updated
			</Text>
		</Flex>
	)
}

function FailedPill() {
	return (
		<Flex
			alignItems="center"
			gap="1.5"
			paddingBlock="1.5"
			paddingInline="3"
			borderRadius="full"
			background="error"
		>
			<Text textStyle="label.sm" color="surface">
				Didn&rsquo;t work &mdash; try a different prompt
			</Text>
		</Flex>
	)
}
