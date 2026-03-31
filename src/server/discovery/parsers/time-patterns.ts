export function extractTimePatterns(messages: { timestamp: number }[]) {
	const withTimestamp = messages.filter((m) => m.timestamp > 0)
	if (withTimestamp.length === 0) {
		return { mostActiveHour: 12, weekdayVsWeekend: 'balanced' as const }
	}

	const hourCounts = new Map<number, number>()
	for (const m of withTimestamp) {
		const h = new Date(m.timestamp * 1000).getHours()
		hourCounts.set(h, (hourCounts.get(h) || 0) + 1)
	}

	const mostActiveHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12

	const weekdays = withTimestamp.filter((m) => {
		const day = new Date(m.timestamp * 1000).getDay()
		return day > 0 && day < 6
	}).length
	const ratio = weekdays / withTimestamp.length

	return {
		mostActiveHour,
		weekdayVsWeekend:
			ratio > 0.7
				? ('weekday_heavy' as const)
				: ratio < 0.3
					? ('weekend_heavy' as const)
					: ('balanced' as const),
	}
}
