/**
 * Verify critical API route files are tracked by git.
 *
 * This test exists because `.gitignore` had `build/` (no leading slash)
 * which silently matched `api/workspace/[projectId]/build/route.ts`.
 * The build route was never committed, never deployed, and zero tests
 * caught it — the entire build pipeline returned 404 in production.
 *
 * This test runs `git ls-files` and checks that every route file on disk
 * is also tracked. If a .gitignore rule eats a route, this fails loud.
 */

import { execSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB_ROOT = path.resolve(__dirname, '../../../../')
const API_DIR = path.join(WEB_ROOT, 'src/app/api')
const REPO_ROOT = path.resolve(WEB_ROOT, '../../')

function findRouteFiles(dir: string): string[] {
	const results: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			results.push(...findRouteFiles(full))
		} else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
			results.push(path.relative(REPO_ROOT, full))
		}
	}
	return results
}

function getTrackedFiles(): Set<string> {
	const output = execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf-8' })
	return new Set(output.trim().split('\n'))
}

describe('API route files are tracked by git', () => {
	const routeFiles = statSync(API_DIR).isDirectory() ? findRouteFiles(API_DIR) : []
	const tracked = getTrackedFiles()

	it('found route files on disk', () => {
		expect(routeFiles.length).toBeGreaterThan(20)
	})

	for (const file of routeFiles) {
		const label = file.replace('apps/web/src/app/api/', '').replace('/route.ts', '')
		it(`${label} is tracked by git`, () => {
			expect(
				tracked.has(file),
				`${file} exists on disk but is NOT tracked by git — check .gitignore`,
			).toBe(true)
		})
	}
})
