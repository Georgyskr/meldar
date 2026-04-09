export type GalaxyTaskStatus = 'done' | 'ready' | 'active' | 'todo' | 'locked' | 'failed'

export interface GalaxyTask {
	readonly id: string
	readonly title: string
	readonly status: GalaxyTaskStatus
	readonly learn: string
	readonly dependsOn: readonly string[]
}

export interface GalaxyMilestone {
	readonly id: string
	readonly title: string
	readonly status: 'done' | 'active' | 'locked'
	readonly completionPct: number
	readonly tasks: readonly GalaxyTask[]
}
