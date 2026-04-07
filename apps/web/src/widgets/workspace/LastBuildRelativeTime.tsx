'use client'

import { styled } from '@styled-system/jsx'
import { useEffect, useReducer } from 'react'
import { useWorkspaceBuild } from '@/features/workspace-build'
import { formatRelative } from './lib/format-relative'

const TICK_INTERVAL_MS = 30_000

export function LastBuildRelativeTime() {
	const { lastBuildAt } = useWorkspaceBuild()
	const [, forceTick] = useReducer((x: number) => x + 1, 0)

	useEffect(() => {
		if (!lastBuildAt) return
		const interval = setInterval(forceTick, TICK_INTERVAL_MS)
		return () => clearInterval(interval)
	}, [lastBuildAt])

	if (!lastBuildAt) {
		return (
			<styled.span textStyle="body.xs" color="onSurfaceVariant/60">
				No builds yet
			</styled.span>
		)
	}

	return (
		<styled.span textStyle="body.xs" color="onSurfaceVariant/80">
			Last build {formatRelative(lastBuildAt)}
		</styled.span>
	)
}
