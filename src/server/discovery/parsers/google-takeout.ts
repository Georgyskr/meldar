import JSZip from 'jszip'
import type { GoogleParseResult } from './types'

/**
 * Parse a Google Takeout ZIP export.
 *
 * Looks for Search history and YouTube history JSON files inside
 * `Takeout/My Activity/Search/` and `Takeout/My Activity/YouTube/`.
 * Path varies by locale, so we match by folder name patterns.
 */
export async function parseGoogleTakeout(file: File): Promise<GoogleParseResult> {
	const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200 MB
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			'File too large. Please export only Search + YouTube from Google Takeout (under 200 MB).',
		)
	}

	const archive = await JSZip.loadAsync(await file.arrayBuffer())

	const searches: string[] = []
	const youtubeWatches: string[] = []

	for (const [path, entry] of Object.entries(archive.files)) {
		if (entry.dir) continue

		// Search history
		if (path.includes('My Activity') && path.includes('Search') && path.endsWith('.json')) {
			const raw: unknown = JSON.parse(await entry.async('string'))
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
			const raw: unknown = JSON.parse(await entry.async('string'))
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
