'use client'

import { css } from '@styled-system/css'
import { Box, Flex } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import { Text } from '@/shared/ui/typography'
import { type BuildStatusPhase, deriveBuildStatus } from './lib/build-status'

const DONE_PILL_FADE_MS = 3000

type Props = {
	readonly activeBuildCardId: string | null
	readonly failureMessage: string | null
}

export function BuildStatusOverlay({ activeBuildCardId, failureMessage }: Props) {
	const phase = deriveBuildStatus(activeBuildCardId, failureMessage)
	const [visible, setVisible] = useState<BuildStatusPhase | null>(null)
	const prevPhaseRef = useRef(phase)
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const prev = prevPhaseRef.current
		prevPhaseRef.current = phase

		if (fadeTimerRef.current !== null) {
			clearTimeout(fadeTimerRef.current)
			fadeTimerRef.current = null
		}

		if (phase === 'building') {
			setVisible('building')
			return
		}

		if (phase === 'failed') {
			setVisible('failed')
			return
		}

		if (prev === 'building' && phase === 'idle') {
			setVisible('done')
			fadeTimerRef.current = setTimeout(() => {
				setVisible(null)
				fadeTimerRef.current = null
			}, DONE_PILL_FADE_MS)
			return
		}

		setVisible(null)
	}, [phase])

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
			aria-live="polite"
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
				Something went wrong
			</Text>
		</Flex>
	)
}
