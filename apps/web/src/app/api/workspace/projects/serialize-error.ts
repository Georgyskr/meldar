export function serializeError(err: unknown, maxDepth = 5): Record<string, unknown> {
	if (!(err instanceof Error)) return { message: String(err) }
	const out: Record<string, unknown> = {
		name: err.name,
		message: err.message,
	}
	for (const key of ['code', 'operation', 'projectId', 'buildId', 'path'] as const) {
		if (key in err) out[key] = (err as unknown as Record<string, unknown>)[key]
	}
	if (process.env.NODE_ENV !== 'production' && err.stack) {
		out.stack = err.stack.split('\n').slice(0, 6).join('\n')
	}
	if (err.cause) {
		if (maxDepth <= 0) {
			out.cause = { message: '[cause chain truncated]' }
		} else {
			out.cause = serializeError(err.cause, maxDepth - 1)
		}
	}
	return out
}
