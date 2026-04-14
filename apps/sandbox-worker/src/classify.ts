/**
 * P1-11 — dev-server failure classification.
 *
 * Pure function over (stderrTail, exitCode). LOG-ONLY — the HTTP response
 * still uses the closed 11-code `WorkerErrorCode` enum (DEV_SERVER_*). The
 * subtype here feeds the structured log's `error_subtype` field so the
 * reactive-build-repair retry logic can decide:
 *   USER_* — surface to user, don't retry infra
 *   INFRA_*, OOM — page on-call, may retry
 *   PORT_CONFLICT — stop+restart
 *   READINESS_TIMEOUT — retry once
 *   UNKNOWN — don't retry speculatively
 */

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
	// OOM and kernel-signal kills come with specific exit codes; match those
	// before substring-scanning so a "Killed" in user-source doesn't
	// misclassify as OOM.
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
	// Anchor on `SyntaxError:` / `TypeError:` with a colon so help-text and
	// prose mentions of those words don't trigger a USER_CODE_ERROR classification.
	if (/\bSyntaxError:|\bTypeError:.*at parse/i.test(stderrTail)) {
		return 'USER_CODE_ERROR'
	}
	if (/npm ERR!|ENOSPC|ECONNRESET/i.test(stderrTail)) {
		return 'INFRA_ERROR'
	}
	return 'UNKNOWN'
}
