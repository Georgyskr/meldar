import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseGoogleTakeout } from '../google-takeout'

// ── Helpers ─────────────────────────────────────────────────────────────────

async function makeTakeoutZip(files: Record<string, string>): Promise<File> {
	const zip = new JSZip()
	for (const [path, content] of Object.entries(files)) {
		zip.file(path, content)
	}
	const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
	return new File([blob], 'takeout.zip', { type: 'application/zip' })
}

async function makeBombFile(): Promise<File> {
	const zip = new JSZip()
	zip.file('Takeout/My Activity/Search/data.json', '[]')
	const buf = await zip.generateAsync({ type: 'arraybuffer' })
	const file = new File([buf], 'takeout.zip', { type: 'application/zip' })

	const origLoadAsync = JSZip.loadAsync.bind(JSZip)
	vi.spyOn(JSZip, 'loadAsync').mockImplementationOnce(async (data: unknown) => {
		const archive = await origLoadAsync(data)
		for (const entry of Object.values(archive.files)) {
			;(entry as unknown as { _data: { uncompressedSize: number } })._data = {
				uncompressedSize: 600 * 1024 * 1024,
			}
		}
		return archive
	})

	return file
}

function makeSearchEntries(count: number): unknown[] {
	return Array.from({ length: count }, (_, i) => ({
		title: `Searched for query ${i}`,
	}))
}

function makeYoutubeEntries(count: number): unknown[] {
	return Array.from({ length: count }, (_, i) => ({
		title: `Watched video ${i}`,
	}))
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('parseGoogleTakeout', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('file size checks (pre-extraction)', () => {
		it('throws "File too large" when file.size > 200 MB before opening the ZIP', async () => {
			const zip = new JSZip()
			zip.file('data.json', '[]')
			const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
			// Create a file and override the size getter
			const file = new File([blob], 'takeout.zip', { type: 'application/zip' })
			Object.defineProperty(file, 'size', { value: 201 * 1024 * 1024 })

			await expect(parseGoogleTakeout(file)).rejects.toThrow('File too large')
		})
	})

	describe('zip bomb protection', () => {
		it('throws "Archive too large when decompressed" when total uncompressed size > 500 MB', async () => {
			const file = await makeBombFile()

			await expect(parseGoogleTakeout(file)).rejects.toThrow('Archive too large when decompressed')
		})

		it('throws before any entry content is read', async () => {
			const file = await makeBombFile()

			// The bomb check happens before iterating entries for content extraction
			await expect(parseGoogleTakeout(file)).rejects.toThrow('Archive too large when decompressed')
		})
	})

	describe('search history extraction', () => {
		it('extracts searches from ZIP paths matching "My Activity" + "Search" + ".json"', async () => {
			const searchData = [
				{ title: 'Searched for how to cook pasta' },
				{ title: 'Searched for best restaurants nearby' },
			]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/MyActivity.json': JSON.stringify(searchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches).toHaveLength(2)
		})

		it('strips the "Searched for " prefix from item titles', async () => {
			const searchData = [{ title: 'Searched for how to cook pasta' }]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/MyActivity.json': JSON.stringify(searchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches[0]).toBe('how to cook pasta')
		})

		it('truncates each search query to 100 chars', async () => {
			const longQuery = 'C'.repeat(150)
			const searchData = [{ title: `Searched for ${longQuery}` }]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/MyActivity.json': JSON.stringify(searchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches[0]).toHaveLength(100)
		})

		it('caps _rawSearches at 500 entries', async () => {
			const searchData = makeSearchEntries(600)
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/MyActivity.json': JSON.stringify(searchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches).toHaveLength(500)
		})

		it('skips items where title does not start with "Searched for "', async () => {
			const searchData = [
				{ title: 'Searched for valid query' },
				{ title: 'Visited www.example.com' }, // not a search
				{ title: 'Searched for another query' },
			]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/MyActivity.json': JSON.stringify(searchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches).toHaveLength(2)
			expect(result._rawSearches).toEqual(['valid query', 'another query'])
		})

		it('skips files with malformed JSON and logs a warning, then continues other files', async () => {
			const validSearchData = [{ title: 'Searched for valid query' }]
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/bad.json': 'not json {{{',
				'Takeout/My Activity/Search/good.json': JSON.stringify(validSearchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches).toHaveLength(1)
			expect(result._rawSearches[0]).toBe('valid query')
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Skipping malformed JSON in Takeout archive'),
			)
			warnSpy.mockRestore()
		})
	})

	describe('youtube history extraction', () => {
		it('extracts watches from ZIP paths matching "My Activity" + "YouTube" + ".json"', async () => {
			const ytData = [
				{ title: 'Watched Cooking Tutorial' },
				{ title: 'Watched Programming Basics' },
			]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/YouTube/MyActivity.json': JSON.stringify(ytData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawYoutubeWatches).toHaveLength(2)
		})

		it('strips the "Watched " prefix from item titles', async () => {
			const ytData = [{ title: 'Watched Cooking Tutorial' }]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/YouTube/MyActivity.json': JSON.stringify(ytData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawYoutubeWatches[0]).toBe('Cooking Tutorial')
		})

		it('truncates each watch title to 100 chars', async () => {
			const longTitle = 'D'.repeat(150)
			const ytData = [{ title: `Watched ${longTitle}` }]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/YouTube/MyActivity.json': JSON.stringify(ytData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawYoutubeWatches[0]).toHaveLength(100)
		})

		it('caps _rawYoutubeWatches at 500 entries', async () => {
			const ytData = makeYoutubeEntries(600)
			const file = await makeTakeoutZip({
				'Takeout/My Activity/YouTube/MyActivity.json': JSON.stringify(ytData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawYoutubeWatches).toHaveLength(500)
		})
	})

	describe('result shape', () => {
		it('returns searchTopics: [] and youtubeTopCategories: null (filled in AI step)', async () => {
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/data.json': JSON.stringify([{ title: 'Searched for test' }]),
			})

			const result = await parseGoogleTakeout(file)

			expect(result.searchTopics).toEqual([])
			expect(result.youtubeTopCategories).toBeNull()
		})

		it('returns emailVolume: null', async () => {
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search/data.json': JSON.stringify([{ title: 'Searched for test' }]),
			})

			const result = await parseGoogleTakeout(file)

			expect(result.emailVolume).toBeNull()
		})
	})

	describe('locale tolerance', () => {
		it('matches a non-English ZIP path that contains "My Activity" and "Search"', async () => {
			// The parser checks for "My Activity" and "Search" substrings,
			// so a path like "Takeout/My Activity/Search - Google/data.json" should also work
			const searchData = [{ title: 'Searched for lokale suche' }]
			const file = await makeTakeoutZip({
				'Takeout/My Activity/Search - Google/data.json': JSON.stringify(searchData),
			})

			const result = await parseGoogleTakeout(file)

			expect(result._rawSearches).toHaveLength(1)
			expect(result._rawSearches[0]).toBe('lokale suche')
		})
	})
})
