/** Log-only classification of dev-server failures. Feeds the structured
 *  log's `errorSubtype` field so reactive-build-repair can decide retry vs.
 *  surface-to-user. HTTP responses continue to use `WorkerErrorCode`. */

export type DevServerErrorSubtype =
	| 'USER_CODE_ERROR'
	| 'USER_DEPENDENCY_ERROR'
	| 'PORT_CONFLICT'
	| 'READINESS_TIMEOUT'
	| 'OOM'
	| 'INFRA_ERROR'
	| 'UNKNOWN'

export function classifyDevServerFailure(
	stderrTail: string,
	exitCode: number,
): DevServerErrorSubtype {
	// Exit-code rules come first so "Killed" in user source doesn't masquerade as OOM.
	if (exitCode === 137 || /JavaScript heap out of memory/i.test(stderrTail)) {
		return 'OOM'
	}
	if (exitCode === 124 && stderrTail.trim() === '') {
		return 'READINESS_TIMEOUT'
	}
	if (/EADDRINUSE/i.test(stderrTail)) {
		return 'PORT_CONFLICT'
	}
	if (/Cannot find module|Module not found/i.test(stderrTail)) {
		return 'USER_DEPENDENCY_ERROR'
	}
	// Require `:` after SyntaxError/TypeError so mentions in prose don't match.
	if (/\bSyntaxError:|\bTypeError:.*at parse/i.test(stderrTail)) {
		return 'USER_CODE_ERROR'
	}
	if (/npm ERR!|ENOSPC|ECONNRESET/i.test(stderrTail)) {
		return 'INFRA_ERROR'
	}
	return 'UNKNOWN'
}
