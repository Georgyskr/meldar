const KEY_PREFIX = 'meldar.autoBuild.kicked.'

function storage(): Storage | null {
	if (typeof window === 'undefined') return null
	try {
		return window.sessionStorage
	} catch {
		return null
	}
}

export function hasKickedAutoBuild(projectId: string): boolean {
	return storage()?.getItem(KEY_PREFIX + projectId) === '1'
}

export function markAutoBuildKicked(projectId: string): void {
	try {
		storage()?.setItem(KEY_PREFIX + projectId, '1')
	} catch {
		/* sessionStorage can throw in private mode / quota-exceeded — ignore */
	}
}
