export type BuildStatusPhase = 'idle' | 'building' | 'done' | 'failed'

export function deriveBuildStatus(
	activeBuildCardId: string | null,
	failureMessage: string | null,
): BuildStatusPhase {
	if (activeBuildCardId !== null) return 'building'
	if (failureMessage !== null) return 'failed'
	return 'idle'
}

export function buildPreviewSrc(previewUrl: string, cacheBuster: number): string {
	const sep = previewUrl.includes('?') ? '&' : '?'
	return `${previewUrl}${sep}t=${cacheBuster}`
}
