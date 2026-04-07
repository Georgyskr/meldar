export type PainPoint = {
	id: string
	emoji: string
	title: string
	description: string
	category:
		| 'email'
		| 'food'
		| 'money'
		| 'school'
		| 'social'
		| 'work'
		| 'health'
		| 'shopping'
		| 'files'
		| 'planning'
	automationHint: string
	weeklyHours: string
}

export const painLibrary: PainPoint[] = [
	{
		id: 'email-chaos',
		emoji: '\u{1F4E8}',
		title: 'Email chaos',
		description: 'Drowning in emails. Most are junk. The important ones get buried.',
		category: 'email',
		automationHint: 'Auto-sort by importance, draft replies, mass unsubscribe',
		weeklyHours: '~4 hrs/week',
	},
	{
		id: 'meal-planning',
		emoji: '\u{1F373}',
		title: 'What\u2019s for dinner?',
		description: 'Every single day, the same question. By 6pm you\u2019re ordering takeout.',
		category: 'food',
		automationHint: 'Weekly meal plan from what\u2019s in your fridge + auto grocery list',
		weeklyHours: '~3 hrs/week',
	},
	{
		id: 'expense-tracking',
		emoji: '\u{1F4B8}',
		title: 'Money goes... somewhere',
		description: 'You know you\u2019re spending too much but have no idea where.',
		category: 'money',
		automationHint: 'Auto-categorize expenses, track subscriptions, flag overspending',
		weeklyHours: '~2 hrs/week',
	},
	{
		id: 'grade-checking',
		emoji: '\u{1F393}',
		title: 'Refreshing the grade portal',
		description: 'Check 10 times a day. Grades appear randomly. You miss deadlines.',
		category: 'school',
		automationHint: 'Get a text the moment a grade is posted or a deadline approaches',
		weeklyHours: '~3 hrs/week',
	},
	{
		id: 'social-posting',
		emoji: '\u{1F4F1}',
		title: 'Posting to every platform',
		description: 'Same content, 4 different formats, 4 different apps. Every. Single. Time.',
		category: 'social',
		automationHint: 'Write once, auto-format and post to all platforms',
		weeklyHours: '~5 hrs/week',
	},
	{
		id: 'job-applications',
		emoji: '\u{1F4BC}',
		title: 'Job application hell',
		description: 'Rewriting the same resume for every job. Losing track of who you applied to.',
		category: 'work',
		automationHint: 'Auto-tailor resume, track all applications, remind to follow up',
		weeklyHours: '~6 hrs/week',
	},
	{
		id: 'price-watching',
		emoji: '\u{1F3F7}\uFE0F',
		title: 'Checking if the price dropped',
		description: 'You want that thing but it\u2019s too expensive. So you check. Every. Day.',
		category: 'shopping',
		automationHint: 'Get a notification the moment the price drops or it\u2019s back in stock',
		weeklyHours: '~2 hrs/week',
	},
	{
		id: 'file-mess',
		emoji: '\u{1F4C2}',
		title: 'Downloads folder from hell',
		description: '2,000 files. No folders. Can\u2019t find anything. Scared to look.',
		category: 'files',
		automationHint: 'Auto-sort files by type, project, and date. Permanently.',
		weeklyHours: '~1 hr/week',
	},
	{
		id: 'meeting-overload',
		emoji: '\u{1F4C5}',
		title: 'Meetings that should be emails',
		description: 'Your calendar is a wall of rectangles. Half of them are pointless.',
		category: 'planning',
		automationHint: 'Auto-summarize meetings, extract action items, decline low-value invites',
		weeklyHours: '~4 hrs/week',
	},
	{
		id: 'health-tracking',
		emoji: '\u{1F4AA}',
		title: 'Tracking health... for 3 days',
		description: 'You start logging meals or workouts. By Thursday, you\u2019ve quit.',
		category: 'health',
		automationHint: 'Passive tracking that doesn\u2019t rely on you remembering to log',
		weeklyHours: '~2 hrs/week',
	},
	{
		id: 'apartment-hunting',
		emoji: '\u{1F3E0}',
		title: 'Apartment hunting refresh',
		description: 'Checking Zillow/Apartments.com every morning. New listings gone in hours.',
		category: 'shopping',
		automationHint: 'Get instant alerts for new listings matching your criteria',
		weeklyHours: '~3 hrs/week',
	},
	{
		id: 'copy-paste-hell',
		emoji: '\u{1F4CB}',
		title: 'Copy-paste between apps',
		description: 'You copy something from one app, paste into another. Over and over.',
		category: 'work',
		automationHint: 'Auto-sync data between the apps you bounce between',
		weeklyHours: '~3 hrs/week',
	},
]
