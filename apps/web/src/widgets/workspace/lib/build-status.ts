export function buildPreviewSrc(previewUrl: string, cacheBuster: number): string {
	const sep = previewUrl.includes('?') ? '&' : '?'
	return `${previewUrl}${sep}t=${cacheBuster}`
}
