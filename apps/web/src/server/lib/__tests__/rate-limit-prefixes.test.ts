import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Rate limiter prefix uniqueness (Finding #5)', () => {
	it('verify-email uses a distinct prefix from forgot-password and reset-password', () => {
		const source = fs.readFileSync(path.resolve(import.meta.dirname, '../rate-limit.ts'), 'utf8')

		const prefixRegex = /prefix:\s*'([^']+)'/g
		const prefixes: string[] = []
		let match: RegExpExecArray | null = prefixRegex.exec(source)
		while (match !== null) {
			prefixes.push(match[1])
			match = prefixRegex.exec(source)
		}

		expect(prefixes).toContain('rl:verify-email')
		expect(prefixes).toContain('rl:forgot-password')
		expect(prefixes).toContain('rl:reset-password')

		const unique = new Set(prefixes)
		expect(unique.size).toBe(prefixes.length)
	})

	it('verify-email route imports verifyEmailLimit', async () => {
		const source = fs.readFileSync(
			path.resolve(import.meta.dirname, '../../../app/api/auth/verify-email/route.ts'),
			'utf8',
		)
		expect(source).toContain('verifyEmailLimit')
	})

	it('forgot-password route imports forgotPasswordLimit', async () => {
		const source = fs.readFileSync(
			path.resolve(import.meta.dirname, '../../../app/api/auth/forgot-password/route.ts'),
			'utf8',
		)
		expect(source).toContain('forgotPasswordLimit')
	})

	it('reset-password route imports resetPasswordLimit', async () => {
		const source = fs.readFileSync(
			path.resolve(import.meta.dirname, '../../../app/api/auth/reset-password/route.ts'),
			'utf8',
		)
		expect(source).toContain('resetPasswordLimit')
	})
})
