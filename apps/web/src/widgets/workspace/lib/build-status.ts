export type BuildStatusPhase = 'idle' | 'building' | 'done' | 'failed'

export function deriveBuildStatus(
	activeBuildCardId: string | null,
	failureMessage: string | null,
	pipelineActive = false,
): BuildStatusPhase {
	if (activeBuildCardId !== null || pipelineActive) return 'building'
	if (failureMessage !== null) return 'failed'
	return 'idle'
}

export function buildPreviewSrc(previewUrl: string, cacheBuster: number): string {
	const sep = previewUrl.includes('?') ? '&' : '?'
	return `${previewUrl}${sep}t=${cacheBuster}`
}
