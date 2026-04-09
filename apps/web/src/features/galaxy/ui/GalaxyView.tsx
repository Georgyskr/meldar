'use client'

import dynamic from 'next/dynamic'
import { useWebGLFallback } from '../lib/use-webgl-fallback'
import type { GalaxyMilestone, GalaxyTask } from '../model/types'
import { GalaxyErrorBoundary } from './GalaxyErrorBoundary'
import { GalaxyFallback } from './GalaxyFallback'

const GalaxyCanvas = dynamic(() => import('./GalaxyCanvas').then((m) => m.GalaxyCanvas), {
	ssr: false,
	loading: () => <GalaxyLoadingSkeleton />,
})

type FallbackMode = 'plan' | 'taskFocus' | 'building' | 'review'

export interface GalaxyViewProps {
	milestones: readonly GalaxyMilestone[]
	previewUrl?: string | null
	selectedTaskId?: string | null
	fallbackMode?: FallbackMode
	onTaskSelect?: (task: GalaxyTask) => void
	onTaskDeselect?: () => void
	onBuildTask?: (task: GalaxyTask) => void
}

function GalaxyLoadingSkeleton() {
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: '#faf9f6',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: 'Inter, sans-serif',
				fontSize: 11,
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				color: '#81737a',
			}}
		>
			Setting up your workspace...
		</div>
	)
}

export function GalaxyView(props: GalaxyViewProps) {
	const fallback = useWebGLFallback()

	if (!fallback.ready) {
		return <GalaxyLoadingSkeleton />
	}

	const shouldUseFallback = !fallback.supported || fallback.isMobile || fallback.reducedMotion

	if (shouldUseFallback) {
		return (
			<GalaxyFallback
				milestones={props.milestones}
				previewUrl={props.previewUrl}
				selectedTaskId={props.selectedTaskId}
				mode={props.fallbackMode}
				onTaskSelect={props.onTaskSelect}
				onTaskDeselect={props.onTaskDeselect}
				onBuildTask={props.onBuildTask}
			/>
		)
	}

	return (
		<GalaxyErrorBoundary
			fallback={
				<GalaxyFallback
					milestones={props.milestones}
					previewUrl={props.previewUrl}
					selectedTaskId={props.selectedTaskId}
					mode={props.fallbackMode}
					onTaskSelect={props.onTaskSelect}
					onTaskDeselect={props.onTaskDeselect}
					onBuildTask={props.onBuildTask}
				/>
			}
		>
			<GalaxyCanvas
				milestones={props.milestones}
				previewUrl={props.previewUrl}
				onTaskSelect={props.onTaskSelect}
				onTaskDeselect={props.onTaskDeselect}
				onBuildTask={props.onBuildTask}
			/>
		</GalaxyErrorBoundary>
	)
}
