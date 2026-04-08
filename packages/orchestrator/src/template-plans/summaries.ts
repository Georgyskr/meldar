export type TemplateSummary = {
	id: string
	name: string
	description: string
	category: string
	milestoneCount: number
	learningHighlights: string[]
	estimatedTokens: number
	estimatedMinutes: number
	difficulty: 'beginner' | 'intermediate' | 'advanced'
	tags: string[]
}

export const TEMPLATE_SUMMARIES: TemplateSummary[] = [
	{
		id: 'weight-tracker',
		name: 'Weight Tracker',
		description: 'Track food, weight, and see trends',
		category: 'health',
		milestoneCount: 4,
		learningHighlights: [
			'How to organise information so you see what matters first',
			'How forms capture and validate real-world input',
			"How visualising data reveals patterns you'd miss in a list",
		],
		estimatedTokens: 29,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['dashboard', 'layout', 'form', 'table', 'data-input', 'chart', 'export', 'filter'],
	},
	{
		id: 'expense-tracker',
		name: 'Expense Tracker',
		description: 'Log expenses and see where your money goes',
		category: 'finance',
		milestoneCount: 4,
		learningHighlights: [
			'How structured input makes messy spending data useful',
			"How charts expose spending habits you didn't notice",
			'How summary stats turn raw data into actionable insight',
		],
		estimatedTokens: 29,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['form', 'data-input', 'table', 'chart', 'filter', 'dashboard', 'export'],
	},
	{
		id: 'portfolio-site',
		name: 'Portfolio Site',
		description: 'A personal site to showcase your work',
		category: 'personal',
		milestoneCount: 4,
		learningHighlights: [
			'How a strong first screen hooks visitors in seconds',
			'How galleries let your work speak for itself',
			'How contact forms turn visitors into conversations',
		],
		estimatedTokens: 27,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['page', 'layout', 'table', 'filter', 'form', 'notification'],
	},
	{
		id: 'task-manager',
		name: 'Task Manager',
		description: 'Keep track of your to-dos with priorities',
		category: 'productivity',
		milestoneCount: 4,
		learningHighlights: [
			'How lists turn a jumbled to-do pile into an actionable queue',
			'How filters cut noise and surface the most important items',
			'How calendar views give you a time-based perspective on your work',
		],
		estimatedTokens: 29,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['table', 'form', 'data-input', 'filter', 'search', 'chart', 'notification', 'dashboard'],
	},
	{
		id: 'booking-page',
		name: 'Booking Page',
		description: 'Let people book time with you',
		category: 'business',
		milestoneCount: 4,
		learningHighlights: [
			'How availability rules prevent double-booking and protect your time',
			'How a smooth booking flow removes friction for both sides',
			'How automated emails keep everyone in the loop without manual follow-up',
		],
		estimatedTokens: 31,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['form', 'data-input', 'notification', 'email-sender', 'chart', 'table'],
	},
	{
		id: 'feedback-collector',
		name: 'Feedback Collector',
		description: 'Collect NPS scores and testimonials from your clients',
		category: 'freelance',
		milestoneCount: 4,
		learningHighlights: [
			'How simple forms can capture valuable client sentiment',
			'How dashboards turn scattered feedback into actionable patterns',
			'How real-time alerts let you respond to feedback while it is fresh',
		],
		estimatedTokens: 33,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['form', 'notification', 'dashboard', 'chart', 'email-sender', 'page', 'data-input'],
	},
	{
		id: 'project-status-dashboard',
		name: 'Project Status Dashboard',
		description: 'Share live project progress with your clients',
		category: 'freelance',
		milestoneCount: 4,
		learningHighlights: [
			'How overview pages give you a quick pulse on everything in flight',
			'How timelines show the relationship between tasks and deadlines',
			'How structured updates replace long email threads',
		],
		estimatedTokens: 26,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['dashboard', 'chart', 'table', 'form', 'page', 'data-input'],
	},
	{
		id: 'team-status-board',
		name: 'Team Status Board',
		description: "See who's working on what across your team",
		category: 'operations',
		milestoneCount: 4,
		learningHighlights: [
			'How team directories make it easy to find who owns what',
			'How async status updates replace daily stand-up meetings',
			'How weekly summaries turn daily noise into actionable insight',
		],
		estimatedTokens: 26,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['table', 'form', 'dashboard', 'chart', 'filter'],
	},
	{
		id: 'meeting-action-items',
		name: 'Meeting Action Items',
		description: 'Log meetings, extract action items, track completion',
		category: 'operations',
		milestoneCount: 4,
		learningHighlights: [
			'How structured meeting logs prevent decisions from being forgotten',
			'How consolidated tables surface commitments that would otherwise be buried in notes',
			'How tracking completion rates reveals whether meetings are productive',
		],
		estimatedTokens: 30,
		estimatedMinutes: 28,
		difficulty: 'intermediate',
		tags: ['form', 'table', 'data-input', 'chart', 'dashboard', 'email-sender'],
	},
]
