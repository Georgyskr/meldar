export type ProjectStep = {
	readonly current: number
	readonly total: number
	readonly label: string
}

export const PLACEHOLDER_STEP: ProjectStep = {
	current: 1,
	total: 8,
	label: 'Setup',
}
