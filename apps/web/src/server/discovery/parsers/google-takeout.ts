import JSZip from 'jszip'
import { z } from 'zod'
import type { GoogleRawParseResult } from './types'

// Parses Takeout Search + YouTube history. Path layout varies by locale, so
// we match by substrings ("My Activity" + "Search"/"YouTube") rather than
// fixed paths. Resilience is permissive: a single bad file or item must not
// abort the whole parse — both failure tiers surface as counts on the
// return value instead (`_skippedFileCount`, `_skippedItemCount`).

const takeoutActivityItemSchema = z
	.object({
		title: z.string().optional(),
	})
	.passthrough()

type ActivityReadResult = {
	items: z.infer<typeof takeoutActivityItemSchema>[]
	skippedItems: number
	fileFailed: boolean
}

export async function parseGoogleTakeout(file: File): Promise<GoogleRawParseResult> {
	const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200 MB
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			'File too large. Please export only Search + YouTube from Google Takeout (under 200 MB).',
		)
	}

	const archive = await JSZip.loadAsync(await file.arrayBuffer())

	// JSZip exposes uncompressed sizes only via internal `_data` — no public API.
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
	let skippedFileCount = 0
	let skippedItemCount = 0

	for (const [path, entry] of Object.entries(archive.files)) {
		if (entry.dir) continue

		// Search history
		if (path.includes('My Activity') && path.includes('Search') && path.endsWith('.json')) {
			const read = await readActivityFile(entry)
			if (read.fileFailed) skippedFileCount += 1
			skippedItemCount += read.skippedItems
			for (const item of read.items) {
				const title = item.title
				if (title?.startsWith('Searched for ')) {
					searches.push(title.replace('Searched for ', '').slice(0, 100))
				}
			}
		}

		// YouTube watch history
		if (path.includes('My Activity') && path.includes('YouTube') && path.endsWith('.json')) {
			const read = await readActivityFile(entry)
			if (read.fileFailed) skippedFileCount += 1
			skippedItemCount += read.skippedItems
			for (const item of read.items) {
				const title = item.title
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
		_skippedFileCount: skippedFileCount,
		_skippedItemCount: skippedItemCount,
	}
}

async function readActivityFile(entry: JSZip.JSZipObject): Promise<ActivityReadResult> {
	let raw: unknown
	try {
		raw = JSON.parse(await entry.async('string'))
	} catch {
		return { items: [], skippedItems: 0, fileFailed: true }
	}
	if (!Array.isArray(raw)) {
		return { items: [], skippedItems: 0, fileFailed: true }
	}

	const items: z.infer<typeof takeoutActivityItemSchema>[] = []
	let skippedItems = 0
	for (const candidate of raw) {
		const result = takeoutActivityItemSchema.safeParse(candidate)
		if (result.success) {
			items.push(result.data)
		} else {
			skippedItems += 1
		}
	}
	return { items, skippedItems, fileFailed: false }
}
