import { describe, expect, it } from 'vitest'
import { colorForEvent, formatBytes, labelForEvent } from '../lib/build-log-format'

describe('formatBytes', () => {
	it('formats bytes under 1KB as B', () => {
		expect(formatBytes(0)).toBe('0B')
		expect(formatBytes(512)).toBe('512B')
		expect(formatBytes(1023)).toBe('1023B')
	})

	it('formats bytes between 1KB and 1MB as KB', () => {
		expect(formatBytes(1024)).toBe('1KB')
		expect(formatBytes(2048)).toBe('2KB')
		expect(formatBytes(1024 * 1023)).toBe('1023KB')
	})

	it('formats bytes >= 1MB as MB with one decimal', () => {
		expect(formatBytes(1024 * 1024)).toBe('1.0MB')
		expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5MB')
	})
})

describe('colorForEvent', () => {
	it('returns primary for started and prompt_sent', () => {
		expect(colorForEvent('started')).toBe('primary')
		expect(colorForEvent('prompt_sent')).toBe('primary')
	})

	it('returns tertiary for file_written', () => {
		expect(colorForEvent('file_written')).toBe('tertiary')
	})

	it('returns green for committed', () => {
		expect(colorForEvent('committed')).toBe('green.500')
	})

	it('returns red for failed', () => {
		expect(colorForEvent('failed')).toBe('red.500')
	})

	it('returns outline for unhandled types', () => {
		expect(colorForEvent('sandbox_ready')).toBe('outline')
	})
})

describe('labelForEvent', () => {
	it('formats started with truncated buildId', () => {
		expect(
			labelForEvent({ type: 'started', buildId: '0123456789abcdef-extra', projectId: 'p' }),
		).toBe('▶ Build started (01234567)')
	})

	it('formats prompt_sent with cents estimate', () => {
		expect(labelForEvent({ type: 'prompt_sent', promptHash: 'h', estimatedCents: 12 })).toBe(
			'→ Prompt sent (~12¢ estimate)',
		)
	})

	it('formats file_written with size', () => {
		expect(
			labelForEvent({
				type: 'file_written',
				path: 'src/app/page.tsx',
				contentHash: 'h',
				sizeBytes: 2048,
				fileIndex: 0,
			}),
		).toBe('📄 src/app/page.tsx (2KB)')
	})

	it('formats sandbox_ready with revision', () => {
		expect(labelForEvent({ type: 'sandbox_ready', previewUrl: 'https://x', revision: 7 })).toBe(
			'🟢 Preview live (revision 7)',
		)
	})

	it('formats committed with file count and cents', () => {
		expect(
			labelForEvent({
				type: 'committed',
				buildId: 'b',
				fileCount: 4,
				actualCents: 8,
				tokenCost: 1234,
			}),
		).toBe('✓ Committed: 4 files, 8¢ (1234 tokens)')
	})

	it('formats failed with reason', () => {
		expect(labelForEvent({ type: 'failed', reason: 'rate_limited' })).toBe('✗ Failed: rate_limited')
	})
})
