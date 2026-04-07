import { MODELS } from '@meldar/tokens'
import { describe, expect, it } from 'vitest'
import { routeModel } from '../model-routing'

describe('routeModel', () => {
	describe('component types', () => {
		it.each([
			'chart',
			'table',
			'form',
			'filter',
			'export',
			'data-input',
			'page',
			'search',
			'notification',
			'file-upload',
			'import',
		])('routes "%s" to Haiku', (componentType) => {
			expect(routeModel(componentType)).toBe(MODELS.HAIKU)
		})

		it.each([
			'auth',
			'api-connector',
			'dashboard',
			'scheduler',
			'email-sender',
			'layout',
		])('routes "%s" to Sonnet', (componentType) => {
			expect(routeModel(componentType)).toBe(MODELS.SONNET)
		})
	})

	describe('task types', () => {
		it.each([
			'feature',
			'page',
			'data',
			'fix',
			'polish',
		])('routes task type "%s" to Haiku', (taskType) => {
			expect(routeModel(taskType)).toBe(MODELS.HAIKU)
		})

		it('routes task type "integration" to Sonnet', () => {
			expect(routeModel('integration')).toBe(MODELS.SONNET)
		})
	})

	describe('fallback behavior', () => {
		it('returns Sonnet for undefined', () => {
			expect(routeModel(undefined)).toBe(MODELS.SONNET)
		})

		it('returns Sonnet for unknown types', () => {
			expect(routeModel('unknown-type')).toBe(MODELS.SONNET)
		})

		it('returns Sonnet for empty string', () => {
			expect(routeModel('')).toBe(MODELS.SONNET)
		})
	})
})
