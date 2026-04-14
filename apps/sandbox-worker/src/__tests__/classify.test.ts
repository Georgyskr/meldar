import { describe, expect, it } from 'vitest'
import { classifyDevServerFailure } from '../classify'

describe('classifyDevServerFailure (P1-11)', () => {
	it('maps SyntaxError stderr to USER_CODE_ERROR', () => {
		expect(
			classifyDevServerFailure('SyntaxError: Unexpected token ) in /app/src/app/page.tsx:12', 1),
		).toBe('USER_CODE_ERROR')
	})

	it('maps "Cannot find module" to USER_DEPENDENCY_ERROR', () => {
		expect(classifyDevServerFailure(`Error: Cannot find module 'foo'`, 1)).toBe(
			'USER_DEPENDENCY_ERROR',
		)
	})

	it('maps "Module not found" (Next.js webpack message) to USER_DEPENDENCY_ERROR', () => {
		expect(classifyDevServerFailure('Module not found: Error', 1)).toBe('USER_DEPENDENCY_ERROR')
	})

	it('maps EADDRINUSE to PORT_CONFLICT', () => {
		expect(
			classifyDevServerFailure('Error: listen EADDRINUSE: address already in use :::3001', 1),
		).toBe('PORT_CONFLICT')
	})

	it('maps exitCode 137 (SIGKILL) to OOM', () => {
		expect(classifyDevServerFailure('Killed', 137)).toBe('OOM')
	})

	it('maps "JavaScript heap out of memory" stderr to OOM regardless of exit code', () => {
		expect(classifyDevServerFailure('FATAL ERROR: JavaScript heap out of memory', 1)).toBe('OOM')
	})

	it('maps empty stderr + exit 124 (timeout) to READINESS_TIMEOUT', () => {
		expect(classifyDevServerFailure('', 124)).toBe('READINESS_TIMEOUT')
	})

	it('maps "npm ERR!" to INFRA_ERROR', () => {
		expect(classifyDevServerFailure('npm ERR! code ENOSPC\nno space', 1)).toBe('INFRA_ERROR')
	})

	it('maps ENOSPC to INFRA_ERROR', () => {
		expect(classifyDevServerFailure('Error: ENOSPC: no space left', 1)).toBe('INFRA_ERROR')
	})

	it('returns UNKNOWN for unrecognized stderr', () => {
		expect(classifyDevServerFailure('some weird output', 1)).toBe('UNKNOWN')
	})

	it('F2: does NOT match "SyntaxError" inside a help-text or noise string (word-boundary anchor)', () => {
		// Before anchoring, any stderr *mentioning* SyntaxError matched. A diagnostic
		// like `Run with --no-SyntaxErrors to disable` or user prose inside a stack
		// preamble would false-positive to USER_CODE_ERROR.
		expect(classifyDevServerFailure('Hint: there is no SyntaxErrorDetector enabled', 1)).toBe(
			'UNKNOWN',
		)
		expect(classifyDevServerFailure('MySyntaxError: not a real syntax error', 1)).toBe('UNKNOWN')
	})

	it('F2: still matches real "SyntaxError:" output', () => {
		expect(classifyDevServerFailure('SyntaxError: Unexpected token', 1)).toBe('USER_CODE_ERROR')
	})

	it('OOM from exit 137 takes precedence over user-source-looking stderr', () => {
		// If npm run dev OOMs in a file that happened to contain "SyntaxError"
		// in a comment, the OOM classification must win — retry strategy differs.
		expect(classifyDevServerFailure('SyntaxError in user code', 137)).toBe('OOM')
	})

	it('READINESS_TIMEOUT requires BOTH empty stderr AND exit 124', () => {
		// Exit 124 with non-empty stderr is a different failure mode.
		expect(classifyDevServerFailure('npm ERR! ENOSPC', 124)).toBe('INFRA_ERROR')
	})
})
