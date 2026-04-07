import type { ProjectStep } from '@/entities/project-step'

export function computeStepWidthPct(step: ProjectStep): string {
	if (!Number.isFinite(step.total) || step.total <= 0) return '0%'
	const ratio = Math.max(0, Math.min(1, step.current / step.total))
	return `${Math.round(ratio * 100)}%`
}
