type PromptSegment = 'role' | 'context' | 'task' | 'constraints' | 'format'

type SegmentMatch = {
	readonly type: PromptSegment
	readonly text: string
	readonly startIndex: number
	readonly endIndex: number
}

export type PromptAnatomy = {
	readonly segments: readonly SegmentMatch[]
	readonly missing: readonly PromptSegment[]
	readonly score: number
}

const SEGMENT_PATTERNS: ReadonlyArray<{ type: PromptSegment; pattern: RegExp }> = [
	{ type: 'role', pattern: /(?:you are|act as|as a|you're a)\b.+/i },
	{
		type: 'context',
		pattern: /(?:given that|based on|using|with the following|here is|the data)\b.+/i,
	},
	{
		type: 'task',
		pattern: /(?:create|generate|build|write|design|make|add|implement|show|display)\b.+/i,
	},
	{
		type: 'constraints',
		pattern: /(?:don't|do not|never|avoid|without|no more than|maximum|only)\b.+/i,
	},
	{
		type: 'format',
		pattern: /(?:return as|respond with|output as|in the format|as json|as a list|as a table)\b.+/i,
	},
]

const ALL_SEGMENTS: readonly PromptSegment[] = ['role', 'context', 'task', 'constraints', 'format']

export function parsePromptAnatomy(description: string): PromptAnatomy {
	if (!description.trim()) {
		return { segments: [], missing: [...ALL_SEGMENTS], score: 0 }
	}

	const segments: SegmentMatch[] = []

	for (const { type, pattern } of SEGMENT_PATTERNS) {
		const match = pattern.exec(description)
		if (match) {
			segments.push({
				type,
				text: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length,
			})
		}
	}

	const found = new Set(segments.map((s) => s.type))
	const missing = ALL_SEGMENTS.filter((s) => !found.has(s))

	return { segments, missing, score: found.size }
}
