import JSZip from 'jszip'
import { bench, describe } from 'vitest'
import { parseChatGptExport } from '@/server/discovery/parsers/chatgpt'
import { parseClaudeExport } from '@/server/discovery/parsers/claude-export'
import { parseGoogleTakeout } from '@/server/discovery/parsers/google-takeout'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeChatGptConversation(index: number) {
	const ts = 1700000000 + index * 60
	return {
		title: `Conversation ${index}`,
		mapping: {
			[`node-${index}`]: {
				message: {
					author: { role: 'user' },
					content: { parts: [`User message number ${index}`] },
					create_time: ts,
				},
			},
			[`node-${index}-reply`]: {
				message: {
					author: { role: 'assistant' },
					content: { parts: [`Assistant reply number ${index}`] },
					create_time: ts + 5,
				},
			},
		},
	}
}

async function makeChatGptZip(conversationCount: number): Promise<File> {
	const conversations = Array.from({ length: conversationCount }, (_, i) =>
		makeChatGptConversation(i),
	)
	const zip = new JSZip()
	zip.file('conversations.json', JSON.stringify(conversations))
	const buf = await zip.generateAsync({ type: 'arraybuffer' })
	return new File([buf], 'chatgpt-export.zip', { type: 'application/zip' })
}

async function makeGoogleTakeoutZip(
	searchCount: number,
	youtubeCount: number,
): Promise<File> {
	const searches = Array.from({ length: searchCount }, (_, i) => ({
		title: `Searched for topic number ${i}`,
		time: '2024-01-15T10:00:00.000Z',
	}))
	const youtubeWatches = Array.from({ length: youtubeCount }, (_, i) => ({
		title: `Watched video title ${i}`,
		time: '2024-01-15T12:00:00.000Z',
	}))

	const zip = new JSZip()
	zip.file(
		'Takeout/My Activity/Search/MyActivity.json',
		JSON.stringify(searches),
	)
	zip.file(
		'Takeout/My Activity/YouTube/MyActivity.json',
		JSON.stringify(youtubeWatches),
	)
	const buf = await zip.generateAsync({ type: 'arraybuffer' })
	return new File([buf], 'takeout.zip', { type: 'application/zip' })
}

function makeClaudeConversation(index: number) {
	const ts = new Date(1700000000000 + index * 60000).toISOString()
	return {
		uuid: `conv-${index}`,
		name: `Conversation ${index}`,
		chat_messages: [
			{
				sender: 'human',
				text: `User message number ${index}`,
				created_at: ts,
			},
			{
				sender: 'assistant',
				text: `Claude reply number ${index}`,
				created_at: ts,
			},
		],
	}
}

function makeClaudeExportFile(conversationCount: number): File {
	const conversations = Array.from({ length: conversationCount }, (_, i) =>
		makeClaudeConversation(i),
	)
	const json = JSON.stringify(conversations)
	return new File([json], 'claude-export.json', { type: 'application/json' })
}

// ── Pre-built fixtures (created once, reused across iterations) ─────────────

let chatgpt1k: File
let chatgpt10k: File
let googleTakeout: File
let claude1k: File

// ── Benchmarks ──────────────────────────────────────────────────────────────

describe('parseChatGptExport', () => {
	bench(
		'parseChatGptExport — 1,000 conversation ZIP',
		async () => {
			await parseChatGptExport(chatgpt1k)
		},
		{
			setup: async () => {
				if (!chatgpt1k) {
					chatgpt1k = await makeChatGptZip(1000)
				}
			},
		},
	)

	bench(
		'parseChatGptExport — 10,000 conversation ZIP',
		async () => {
			await parseChatGptExport(chatgpt10k)
		},
		{
			setup: async () => {
				if (!chatgpt10k) {
					chatgpt10k = await makeChatGptZip(10000)
				}
			},
		},
	)
})

describe('parseGoogleTakeout', () => {
	bench(
		'parseGoogleTakeout — 500 searches + 500 YouTube watches ZIP',
		async () => {
			await parseGoogleTakeout(googleTakeout)
		},
		{
			setup: async () => {
				if (!googleTakeout) {
					googleTakeout = await makeGoogleTakeoutZip(500, 500)
				}
			},
		},
	)
})

describe('parseClaudeExport', () => {
	bench(
		'parseClaudeExport — 1,000 conversation JSON',
		async () => {
			await parseClaudeExport(claude1k)
		},
		{
			setup: async () => {
				if (!claude1k) {
					claude1k = makeClaudeExportFile(1000)
				}
			},
		},
	)
})
