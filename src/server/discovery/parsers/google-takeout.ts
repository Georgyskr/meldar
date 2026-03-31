import JSZip from 'jszip'
import type { GoogleRawParseResult } from './types'

/**
 * Parse a Google Takeout ZIP export.
 *
 * Looks for Search history and YouTube history JSON files inside
 * `Takeout/My Activity/Search/` and `Takeout/My Activity/YouTube/`.
 * Path varies by locale, so we match by folder name patterns.
 */
export async function parseGoogleTakeout(file: File): Promise<GoogleRawParseResult> {
	const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200 MB
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			'File too large. Please export only Search + YouTube from Google Takeout (under 200 MB).',
		)
	}

	const archive = await JSZip.loadAsync(await file.arrayBuffer())

	// Zip bomb protection: check total uncompressed size before extracting
	const MAX_DECOMPRESSED_SIZE = 500 * 1024 * 1024 // 500 MB
	let totalSize = 0
	for (const entry of Object.values(archive.files)) {
		totalSize +=
			(entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0
	}
	if (totalSize > MAX_DECOMPRESSED_SIZE) {
		throw new Error(
			'Archive too large when decompressed. Please select fewer data categories in your export.',
		)
	}

	const searches: string[] = []
	const youtubeWatches: string[] = []

	for (const [path, entry] of Object.entries(archive.files)) {
		if (entry.dir) continue

		// Search history
		if (path.includes('My Activity') && path.includes('Search') && path.endsWith('.json')) {
			let raw: unknown
			try {
				raw = JSON.parse(await entry.async('string'))
			} catch {
				console.warn(`Skipping malformed JSON in Takeout archive: ${path}`)
				continue
			}
			if (!Array.isArray(raw)) continue

			for (const item of raw) {
				const title = (item as Record<string, unknown>).title as string | undefined
				if (title?.startsWith('Searched for ')) {
					searches.push(title.replace('Searched for ', '').slice(0, 100))
				}
			}
		}

		// YouTube watch history
		if (path.includes('My Activity') && path.includes('YouTube') && path.endsWith('.json')) {
			let raw: unknown
			try {
				raw = JSON.parse(await entry.async('string'))
			} catch {
				console.warn(`Skipping malformed JSON in Takeout archive: ${path}`)
				continue
			}
			if (!Array.isArray(raw)) continue

			for (const item of raw) {
				const title = (item as Record<string, unknown>).title as string | undefined
				if (title?.startsWith('Watched ')) {
					youtubeWatches.push(title.replace('Watched ', '').slice(0, 100))
				}
			}
		}
	}

	return {
		searchTopics: [], // filled by AI analysis
		youtubeTopCategories: null, // filled by AI analysis
		emailVolume: null, // future: parse MBOX
		_rawSearches: searches.slice(0, 500),
		_rawYoutubeWatches: youtubeWatches.slice(0, 500),
	}
}
