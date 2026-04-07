import { describe, expect, it } from 'vitest'
import { SandboxUnsafePathError } from '../errors'
import { assertSafeSandboxPath, isSafeSandboxPath } from '../safety'

describe('assertSafeSandboxPath', () => {
	describe('accepts safe paths', () => {
		it.each([
			'src/app/page.tsx',
			'package.json',
			'README.md',
			'src/components/ui/button.tsx',
			'public/favicon.ico',
			'src/app/api/route.ts',
			'src/styles/globals.css',
			'tsconfig.json',
			'next.config.ts',
			'a.ts', // minimal
		])('accepts %s', (path) => {
			expect(() => assertSafeSandboxPath(path)).not.toThrow()
			expect(isSafeSandboxPath(path)).toBe(true)
		})
	})

	describe('rejects path traversal', () => {
		it.each([
			'../etc/passwd',
			'../../root/.ssh/id_rsa',
			'src/../../../etc/passwd',
			'src/app/../../etc/passwd',
			'..',
			'../foo',
			'foo/..',
			'foo/../bar',
		])('rejects %s', (path) => {
			expect(() => assertSafeSandboxPath(path)).toThrow(SandboxUnsafePathError)
			expect(isSafeSandboxPath(path)).toBe(false)
		})
	})

	describe('rejects absolute paths', () => {
		it.each(['/etc/passwd', '/var/log/system.log', '/', '/root'])('rejects %s', (path) => {
			expect(() => assertSafeSandboxPath(path)).toThrow(SandboxUnsafePathError)
		})
	})

	describe('rejects empty and malformed paths', () => {
		it('rejects empty string', () => {
			expect(() => assertSafeSandboxPath('')).toThrow(SandboxUnsafePathError)
		})

		it('rejects double slashes', () => {
			expect(() => assertSafeSandboxPath('src//app/page.tsx')).toThrow(SandboxUnsafePathError)
		})

		it('rejects backslashes', () => {
			expect(() => assertSafeSandboxPath('src\\app\\page.tsx')).toThrow(SandboxUnsafePathError)
		})

		it('rejects current-dir markers', () => {
			expect(() => assertSafeSandboxPath('./src/app/page.tsx')).toThrow(SandboxUnsafePathError)
			expect(() => assertSafeSandboxPath('src/./app/page.tsx')).toThrow(SandboxUnsafePathError)
		})
	})

	describe('rejects null bytes and control characters', () => {
		it('rejects null byte', () => {
			expect(() => assertSafeSandboxPath('src/app/page.tsx\0')).toThrow(SandboxUnsafePathError)
		})

		it('rejects newline', () => {
			expect(() => assertSafeSandboxPath('src/app/page.tsx\n')).toThrow(SandboxUnsafePathError)
		})

		it('rejects tab', () => {
			expect(() => assertSafeSandboxPath('src\tapp/page.tsx')).toThrow(SandboxUnsafePathError)
		})

		it('rejects DEL character', () => {
			expect(() => assertSafeSandboxPath('src/app/page.tsx\x7f')).toThrow(SandboxUnsafePathError)
		})
	})

	describe('rejects persistence-denylist segments', () => {
		it.each([
			'node_modules/lodash/index.js',
			'src/node_modules/foo',
			'.next/cache/webpack/client-development/0.pack.gz',
			'src/.next/build.js',
			'.git/config',
			'src/.git/HEAD',
			'.turbo/cache/foo',
			'dist/main.js',
			'src/dist/main.js',
			'.vercel/output/config.json',
			'.env',
			'src/.env',
		])('rejects %s', (path) => {
			expect(() => assertSafeSandboxPath(path)).toThrow(SandboxUnsafePathError)
		})
	})

	describe('rejects .env.* variants by prefix', () => {
		it.each([
			'.env.local',
			'.env.development',
			'.env.production',
			'.env.test',
			'.env.custom',
			'src/.env.local',
		])('rejects %s', (path) => {
			expect(() => assertSafeSandboxPath(path)).toThrow(SandboxUnsafePathError)
		})
	})

	describe('rejects oversized paths', () => {
		it('rejects paths longer than 512 chars', () => {
			const tooLong = `${'a/'.repeat(260)}file.ts` // > 512 chars, 260 segments
			expect(() => assertSafeSandboxPath(tooLong)).toThrow(SandboxUnsafePathError)
		})

		it('rejects paths with more than 16 segments', () => {
			const tooDeep = `${'a/'.repeat(20)}file.ts`
			expect(() => assertSafeSandboxPath(tooDeep)).toThrow(SandboxUnsafePathError)
		})

		it('accepts exactly at 16 segments', () => {
			const exactlyOk = `${'a/'.repeat(15)}file.ts` // 16 segments total
			expect(() => assertSafeSandboxPath(exactlyOk)).not.toThrow()
		})
	})

	describe('error metadata', () => {
		it('attaches the rejected path to the error', () => {
			try {
				assertSafeSandboxPath('../etc/passwd')
				expect.unreachable('should have thrown')
			} catch (err) {
				expect(err).toBeInstanceOf(SandboxUnsafePathError)
				const typed = err as SandboxUnsafePathError
				expect(typed.path).toBe('../etc/passwd')
				expect(typed.code).toBe('sandbox_unsafe_path')
			}
		})

		it('attaches projectId from options when provided', () => {
			try {
				assertSafeSandboxPath('../etc/passwd', { projectId: 'proj_abc' })
				expect.unreachable('should have thrown')
			} catch (err) {
				expect(err).toBeInstanceOf(SandboxUnsafePathError)
				expect((err as SandboxUnsafePathError).projectId).toBe('proj_abc')
			}
		})

		it('error message describes the specific violation', () => {
			try {
				assertSafeSandboxPath('../etc/passwd')
				expect.unreachable('should have thrown')
			} catch (err) {
				expect((err as Error).message).toMatch(/traversal/i)
			}
		})
	})
})
