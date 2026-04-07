/**
 * Path safety validation for sandbox file operations.
 *
 * Every SandboxProvider implementation MUST run untrusted paths (AI output,
 * user uploads, template instantiations) through {@link assertSafeSandboxPath}
 * before any file I/O. This is a hard security invariant — AI output is
 * untrusted and traversal attempts (`../../../etc/passwd`) are a primary
 * attack surface on the sandbox container.
 *
 * Reference: AGENTS.md rule "Validate ALL AI Output" + the Phase 2 backlog
 * item #15 (Project offload + reupload) security checklist.
 */

import { SandboxUnsafePathError } from './errors'

/**
 * Path segments that are never allowed in a sandbox file path, even if the
 * canonical check passes. These are either platform-reserved, secret-bearing,
 * or belong to the persistence denylist (node_modules, .next, etc.).
 */
const RESERVED_SEGMENTS = new Set<string>([
	// Persistence denylist — never stored, per founder decision 2026-04-06.
	'node_modules',
	'.next',
	'.git',
	'.turbo',
	'dist',
	'.vercel',
	'.env',
	'.env.local',
	'.env.development',
	'.env.production',
])

/** Reserved path prefixes (not exact matches — path starts-with check). */
const RESERVED_PREFIXES: readonly string[] = ['.env.']

/** Maximum path length in characters. Prevents DoS via pathological paths. */
const MAX_PATH_LENGTH = 512

/** Maximum nesting depth. Sonnet should never produce paths this deep. */
const MAX_PATH_DEPTH = 16

/**
 * Validate a sandbox file path. Throws {@link SandboxUnsafePathError} on any
 * violation. Returns void on success.
 *
 * Rules:
 * 1. Non-empty string
 * 2. POSIX separators only (no backslashes)
 * 3. No leading slash (must be relative)
 * 4. No `..` segments anywhere
 * 5. No `.` segments (current-dir markers are redundant and usually a bug)
 * 6. No reserved segments (node_modules, .env, etc.)
 * 7. No reserved prefixes (.env.*)
 * 8. Max 512 chars total
 * 9. Max 16 path segments
 * 10. No null bytes
 * 11. No control characters
 */
export function assertSafeSandboxPath(path: string, options?: { projectId?: string }): void {
	const reject = (reason: string): never => {
		throw new SandboxUnsafePathError(path, reason, options)
	}

	if (typeof path !== 'string' || path.length === 0) {
		reject('path must be a non-empty string')
	}

	if (path.length > MAX_PATH_LENGTH) {
		reject(`path exceeds ${MAX_PATH_LENGTH} characters`)
	}

	if (path.includes('\0')) {
		reject('path contains null byte')
	}

	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — we're rejecting control characters
	if (/[\x00-\x1f\x7f]/.test(path)) {
		reject('path contains control characters')
	}

	if (path.includes('\\')) {
		reject('path contains backslash (POSIX separators only)')
	}

	if (path.startsWith('/')) {
		reject('path must be relative (no leading slash)')
	}

	const segments = path.split('/')

	if (segments.length > MAX_PATH_DEPTH) {
		reject(`path exceeds ${MAX_PATH_DEPTH} nested segments`)
	}

	for (const segment of segments) {
		if (segment === '') {
			reject('path contains empty segment (double slash)')
		}
		if (segment === '..') {
			reject('path traversal via ".." is forbidden')
		}
		if (segment === '.') {
			reject('path contains redundant "." segment')
		}
		if (RESERVED_SEGMENTS.has(segment)) {
			reject(`segment "${segment}" is in the persistence denylist`)
		}
		for (const prefix of RESERVED_PREFIXES) {
			if (segment.startsWith(prefix)) {
				reject(`segment "${segment}" matches reserved prefix "${prefix}"`)
			}
		}
	}
}

/**
 * Test-only convenience: returns true if the path is safe, false otherwise.
 * Production code should use {@link assertSafeSandboxPath} and catch the
 * typed error.
 */
export function isSafeSandboxPath(path: string): boolean {
	try {
		assertSafeSandboxPath(path)
		return true
	} catch (err) {
		if (err instanceof SandboxUnsafePathError) {
			return false
		}
		throw err
	}
}
