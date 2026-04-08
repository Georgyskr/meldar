export type TemplatePlan = {
	readonly id: string
	readonly name: string
	readonly description: string
	readonly category: string
	readonly milestones: ReadonlyArray<{
		readonly title: string
		readonly description: string
		readonly whatYouLearn: string
		readonly taskType: 'feature' | 'page' | 'integration' | 'data' | 'fix' | 'polish'
		readonly subtasks: ReadonlyArray<{
			readonly title: string
			readonly description: string
			readonly whatYouLearn: string
			readonly taskType: 'feature' | 'page' | 'integration' | 'data' | 'fix' | 'polish'
			readonly componentType: string
			readonly acceptanceCriteria: readonly string[]
		}>
	}>
}

export const TEMPLATE_PLANS: readonly TemplatePlan[] = [
	{
		id: 'weight-tracker',
		name: 'Weight Tracker',
		description: 'Track food, weight, and see trends',
		category: 'health',
		milestones: [
			{
				title: 'Dashboard layout',
				description: "Your home screen that shows today's stats at a glance",
				whatYouLearn: 'How to organise information so you see what matters first',
				taskType: 'page',
				subtasks: [
					{
						title: 'Daily summary panel',
						description: "Shows today's weight, calories eaten, and calories remaining",
						whatYouLearn: 'How dashboards pull numbers from different places into one view',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Displays current weight',
							'Shows calories consumed and remaining',
						],
					},
					{
						title: 'Navigation menu',
						description: 'Lets you switch between dashboard, food log, and weight chart',
						whatYouLearn: 'How navigation ties separate screens into a single app',
						taskType: 'page',
						componentType: 'layout',
						acceptanceCriteria: ['Links to all main sections', 'Highlights the active page'],
					},
				],
			},
			{
				title: 'Food input form',
				description: 'Log what you eat with a quick form',
				whatYouLearn: 'How forms capture and validate real-world input',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Meal entry form',
						description: 'Add a meal with name, calories, and time of day',
						whatYouLearn: 'How to collect structured data from users without friction',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts meal name, calorie count, and time',
							'Validates that calories is a positive number',
						],
					},
					{
						title: "Today's food log",
						description: "A table showing everything you've logged today",
						whatYouLearn: 'How tables display lists of records you can scan quickly',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: ['Lists meals logged today', 'Shows total calories at the bottom'],
					},
					{
						title: 'Quick-add buttons',
						description: 'Shortcut buttons for foods you log often',
						whatYouLearn: 'How saving user preferences reduces repetitive work',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Shows recent meals as one-tap buttons',
							"Adds the meal to today's log on click",
						],
					},
				],
			},
			{
				title: 'Weight chart',
				description: 'Shows your weight trend over time',
				whatYouLearn: "How visualising data reveals patterns you'd miss in a list",
				taskType: 'feature',
				subtasks: [
					{
						title: 'Weight input',
						description: 'Record your weight each day',
						whatYouLearn: 'How simple daily inputs build a powerful dataset over time',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: ['Accepts weight in kg or lbs', "Defaults to today's date"],
					},
					{
						title: 'Trend line chart',
						description: 'A line chart plotting your weight over the past 30 days',
						whatYouLearn: 'How charts make trends obvious that numbers alone hide',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'Plots weight entries on a time axis',
							'Shows a trend line for the selected period',
						],
					},
				],
			},
			{
				title: 'Data export',
				description: 'Download your food and weight data as a CSV file',
				whatYouLearn: 'How exporting keeps you in control of your own data',
				taskType: 'feature',
				subtasks: [
					{
						title: 'CSV export button',
						description: 'One click to download all your entries as a spreadsheet',
						whatYouLearn: 'How apps convert stored records into portable file formats',
						taskType: 'feature',
						componentType: 'export',
						acceptanceCriteria: [
							'Generates a CSV with date, weight, meals, and calories',
							'Download starts immediately on click',
						],
					},
					{
						title: 'Date range filter',
						description: 'Pick a start and end date to export only part of your history',
						whatYouLearn: 'How filters let users get exactly the slice of data they need',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Accepts a start and end date',
							'Export only includes entries in that range',
						],
					},
				],
			},
		],
	},
	{
		id: 'expense-tracker',
		name: 'Expense Tracker',
		description: 'Log expenses and see where your money goes',
		category: 'finance',
		milestones: [
			{
				title: 'Expense entry form',
				description: 'Log every purchase with amount, category, and date',
				whatYouLearn: 'How structured input makes messy spending data useful',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Expense form',
						description: 'Add an expense with amount, category, merchant, and date',
						whatYouLearn: 'How forms turn everyday actions into organised records',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts amount, category, merchant name, and date',
							'Validates amount is a positive number',
						],
					},
					{
						title: 'Category picker',
						description: 'Choose from preset categories like Food, Transport, and Rent',
						whatYouLearn: 'How consistent categories make later analysis possible',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Shows at least 6 spending categories',
							'Selected category attaches to the expense',
						],
					},
					{
						title: 'Recent expenses list',
						description: 'A scrollable list of your latest expenses',
						whatYouLearn: 'How tables give you a quick scan of recent activity',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows the 20 most recent expenses',
							'Each row displays amount, category, and date',
						],
					},
				],
			},
			{
				title: 'Category breakdown chart',
				description: 'See a pie chart of where your money goes each month',
				whatYouLearn: "How charts expose spending habits you didn't notice",
				taskType: 'feature',
				subtasks: [
					{
						title: 'Spending by category chart',
						description: 'A pie or donut chart showing the share of each category',
						whatYouLearn: 'How proportional charts highlight where the biggest chunk goes',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'Shows percentage of total for each category',
							'Updates when the selected month changes',
						],
					},
					{
						title: 'Month selector',
						description: 'Switch between months to compare spending patterns',
						whatYouLearn: 'How time filters let you spot month-to-month changes',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Lets user pick any past month',
							'Chart and summary update to reflect that month',
						],
					},
				],
			},
			{
				title: 'Monthly summary',
				description: 'A dashboard with total spent, average daily spend, and top category',
				whatYouLearn: 'How summary stats turn raw data into actionable insight',
				taskType: 'page',
				subtasks: [
					{
						title: 'Summary dashboard',
						description: 'Shows total spent, daily average, and biggest category this month',
						whatYouLearn: 'How dashboards condense a month of data into three numbers',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Displays total spent for the month',
							'Shows average daily spending',
							'Highlights the top spending category',
						],
					},
					{
						title: 'Spending trend chart',
						description: 'A bar chart of daily spending so you see spikes',
						whatYouLearn: 'How bar charts reveal when your spending surges',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'One bar per day of the selected month',
							'Hover shows the exact amount for that day',
						],
					},
				],
			},
			{
				title: 'CSV export',
				description: 'Download all your expenses as a spreadsheet',
				whatYouLearn: 'How exporting gives you a backup and lets you analyse data elsewhere',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Full export button',
						description: "Download every expense you've ever logged as a CSV",
						whatYouLearn: 'How a single export keeps your data portable and safe',
						taskType: 'feature',
						componentType: 'export',
						acceptanceCriteria: [
							'Generates a CSV with date, amount, category, and merchant',
							'Download begins on click',
						],
					},
					{
						title: 'Date range filter for export',
						description: 'Narrow the export to a specific time window',
						whatYouLearn: 'How combining filters with exports gives precise control',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Lets user select a start and end date',
							'Only exports expenses in that range',
						],
					},
				],
			},
		],
	},
	{
		id: 'portfolio-site',
		name: 'Portfolio Site',
		description: 'A personal site to showcase your work',
		category: 'personal',
		milestones: [
			{
				title: 'Landing page',
				description: 'Your front door -- a bold intro that tells visitors who you are',
				whatYouLearn: 'How a strong first screen hooks visitors in seconds',
				taskType: 'page',
				subtasks: [
					{
						title: 'Hero section',
						description: 'A full-width area with your name, tagline, and call to action',
						whatYouLearn: 'How hero sections set the tone for the entire site',
						taskType: 'page',
						componentType: 'page',
						acceptanceCriteria: [
							'Shows name and tagline prominently',
							'Has a call-to-action button',
						],
					},
					{
						title: 'Site navigation',
						description: 'A header with links to Projects, About, and Contact',
						whatYouLearn: 'How navigation lets visitors move through your site confidently',
						taskType: 'page',
						componentType: 'layout',
						acceptanceCriteria: ['Links to all main sections', 'Stays visible while scrolling'],
					},
				],
			},
			{
				title: 'Projects gallery',
				description: 'Show off your best work in a visual grid',
				whatYouLearn: 'How galleries let your work speak for itself',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Project cards grid',
						description: 'A grid of cards, each with a thumbnail, title, and short description',
						whatYouLearn: 'How card grids organise visual content for easy browsing',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows project thumbnail, title, and description',
							'Responsive grid adjusts to screen size',
						],
					},
					{
						title: 'Project detail page',
						description: 'Click a card to see the full project with images and write-up',
						whatYouLearn: 'How detail pages give depth without cluttering the overview',
						taskType: 'page',
						componentType: 'page',
						acceptanceCriteria: [
							'Shows full project description and images',
							'Has a back link to the gallery',
						],
					},
					{
						title: 'Category filter',
						description: 'Filter projects by type -- design, code, writing, etc.',
						whatYouLearn: 'How filters help visitors find what interests them fast',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Shows clickable category tags',
							'Gallery updates to show only matching projects',
						],
					},
				],
			},
			{
				title: 'Contact form',
				description: 'Let visitors reach out to you directly from the site',
				whatYouLearn: 'How contact forms turn visitors into conversations',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Contact message form',
						description: 'A form with name, email, and message fields',
						whatYouLearn: 'How forms collect inquiries while keeping your email private',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Has name, email, and message fields',
							'Validates email format before submission',
						],
					},
					{
						title: 'Confirmation message',
						description: 'Shows a thank-you message after the form is submitted',
						whatYouLearn: 'How feedback after actions builds trust with visitors',
						taskType: 'feature',
						componentType: 'notification',
						acceptanceCriteria: [
							'Displays a success message on submit',
							'Clears the form fields after sending',
						],
					},
				],
			},
			{
				title: 'About page',
				description: 'Tell your story and share what drives you',
				whatYouLearn: 'How an about page builds connection beyond your portfolio pieces',
				taskType: 'page',
				subtasks: [
					{
						title: 'Bio section',
						description: 'A section with your photo, bio, and key skills',
						whatYouLearn: 'How personal storytelling makes a portfolio memorable',
						taskType: 'page',
						componentType: 'page',
						acceptanceCriteria: [
							'Displays photo, bio text, and skill list',
							'Readable on both mobile and desktop',
						],
					},
					{
						title: 'Social links',
						description: 'Links to your GitHub, LinkedIn, or other profiles',
						whatYouLearn: 'How external links extend your presence beyond one site',
						taskType: 'page',
						componentType: 'layout',
						acceptanceCriteria: [
							'Shows icons linking to at least 2 profiles',
							'Links open in a new tab',
						],
					},
				],
			},
		],
	},
	{
		id: 'task-manager',
		name: 'Task Manager',
		description: 'Keep track of your to-dos with priorities',
		category: 'productivity',
		milestones: [
			{
				title: 'Task list',
				description: 'See all your tasks in one place, organised and clear',
				whatYouLearn: 'How lists turn a jumbled to-do pile into an actionable queue',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Task list view',
						description: 'A scrollable list showing each task with its title and status',
						whatYouLearn: 'How list views keep you focused on what needs doing next',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows all tasks with title, priority, and status',
							'Completed tasks are visually distinct',
						],
					},
					{
						title: 'Add task form',
						description: 'Create a new task with title, description, priority, and due date',
						whatYouLearn: 'How capturing details upfront saves time later',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts title, description, priority level, and due date',
							'New task appears in the list immediately',
						],
					},
					{
						title: 'Mark complete toggle',
						description: "Check off a task when it's done",
						whatYouLearn: 'How state changes in the UI reflect real progress',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Clicking toggles the task between active and complete',
							'Completed tasks move to the bottom or a separate section',
						],
					},
				],
			},
			{
				title: 'Priority filter',
				description: 'Focus on what matters by filtering tasks by priority',
				whatYouLearn: 'How filters cut noise and surface the most important items',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Priority filter buttons',
						description: 'Toggle between All, High, Medium, and Low priority views',
						whatYouLearn: 'How filtering by priority helps you tackle the right task first',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Filter buttons for All, High, Medium, and Low',
							'List updates instantly when a filter is selected',
						],
					},
					{
						title: 'Search bar',
						description: 'Type to find a specific task by title',
						whatYouLearn: 'How search makes large lists manageable',
						taskType: 'feature',
						componentType: 'search',
						acceptanceCriteria: [
							'Filters the list as you type',
							'Shows a "no results" message when nothing matches',
						],
					},
				],
			},
			{
				title: 'Due date calendar',
				description: 'See upcoming deadlines on a calendar',
				whatYouLearn: 'How calendar views give you a time-based perspective on your work',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Calendar view',
						description: 'A monthly calendar with tasks placed on their due dates',
						whatYouLearn: 'How mapping tasks to dates reveals busy periods and gaps',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: ['Shows a monthly calendar grid', 'Tasks appear on their due date'],
					},
					{
						title: 'Overdue highlight',
						description: 'Past-due tasks are highlighted in red so nothing slips through',
						whatYouLearn: 'How visual urgency cues keep deadlines from sneaking by',
						taskType: 'polish',
						componentType: 'notification',
						acceptanceCriteria: [
							'Overdue tasks show a red indicator',
							'Overdue count shows at the top of the page',
						],
					},
				],
			},
			{
				title: 'Completion stats',
				description: "Track how productive you've been this week and month",
				whatYouLearn: 'How seeing your own progress builds momentum',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Stats dashboard',
						description: 'Shows tasks completed this week, this month, and your streak',
						whatYouLearn: 'How dashboards turn activity history into motivation',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Shows weekly and monthly completion counts',
							'Displays current streak of consecutive active days',
						],
					},
					{
						title: 'Completion rate chart',
						description: 'A bar chart of tasks completed per day over the last 14 days',
						whatYouLearn: 'How visualising productivity reveals your best and worst days',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'One bar per day for the last 14 days',
							'Hover shows the count for that day',
						],
					},
				],
			},
		],
	},
	{
		id: 'booking-page',
		name: 'Booking Page',
		description: 'Let people book time with you',
		category: 'business',
		milestones: [
			{
				title: 'Available slots setup',
				description: "Define when you're free so people can only book open times",
				whatYouLearn: 'How availability rules prevent double-booking and protect your time',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Weekly schedule form',
						description: 'Set your available hours for each day of the week',
						whatYouLearn: 'How recurring schedules reduce manual work every week',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Lets you set start and end time for each weekday',
							'Days can be toggled on or off',
						],
					},
					{
						title: 'Slot duration setting',
						description: 'Choose how long each booking slot lasts (15, 30, or 60 min)',
						whatYouLearn: 'How slot sizes balance flexibility with structure',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Offers 15, 30, and 60 minute options',
							'Selected duration applies to all generated slots',
						],
					},
				],
			},
			{
				title: 'Booking form',
				description: 'The page visitors see to pick a time and book with you',
				whatYouLearn: 'How a smooth booking flow removes friction for both sides',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Date and time picker',
						description: 'Visitors pick an available date and time slot',
						whatYouLearn: 'How showing only available options prevents confusion',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Only shows dates with available slots',
							'Selecting a date reveals open time slots',
						],
					},
					{
						title: 'Booker details form',
						description: 'Collects name, email, and an optional note from the person booking',
						whatYouLearn: 'How capturing just enough info keeps the flow fast',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: ['Requires name and email', 'Optional note field for context'],
					},
					{
						title: 'Booking confirmation',
						description: 'Shows a success message with the confirmed date and time',
						whatYouLearn: 'How confirmation screens reduce "did it work?" anxiety',
						taskType: 'feature',
						componentType: 'notification',
						acceptanceCriteria: [
							'Displays confirmed date, time, and booker name',
							'Includes a note to check their email',
						],
					},
				],
			},
			{
				title: 'Confirmation email',
				description: 'Automatically email both you and the booker when a slot is reserved',
				whatYouLearn: 'How automated emails keep everyone in the loop without manual follow-up',
				taskType: 'integration',
				subtasks: [
					{
						title: 'Email to booker',
						description: 'Sends a confirmation email with date, time, and any prep instructions',
						whatYouLearn: 'How transactional emails build trust by confirming actions instantly',
						taskType: 'integration',
						componentType: 'email-sender',
						acceptanceCriteria: [
							"Sends to the booker's email on successful booking",
							'Includes date, time, and your name',
						],
					},
					{
						title: 'Notification to host',
						description: 'You get an email whenever someone books a slot',
						whatYouLearn: 'How notifications keep you aware without checking the app',
						taskType: 'integration',
						componentType: 'email-sender',
						acceptanceCriteria: [
							'Sends to your email on every new booking',
							'Includes booker name, email, and time',
						],
					},
				],
			},
			{
				title: 'Calendar view',
				description: 'See all your upcoming bookings on a weekly calendar',
				whatYouLearn: "How calendar views give you a bird's eye view of your schedule",
				taskType: 'page',
				subtasks: [
					{
						title: 'Weekly calendar',
						description: 'A week view showing booked and open slots side by side',
						whatYouLearn: 'How calendar layouts make scheduling conflicts obvious',
						taskType: 'page',
						componentType: 'chart',
						acceptanceCriteria: [
							'Shows 7 days with time blocks',
							'Booked slots are visually distinct from open ones',
						],
					},
					{
						title: 'Upcoming bookings list',
						description: 'A simple list of your next bookings with booker details',
						whatYouLearn: 'How list views complement calendars for quick reference',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Lists upcoming bookings sorted by date',
							'Shows booker name, date, and time for each',
						],
					},
				],
			},
		],
	},
	{
		id: 'feedback-collector',
		name: 'Feedback Collector',
		description: 'Collect NPS scores and testimonials from your clients',
		category: 'freelance',
		milestones: [
			{
				title: 'Feedback form',
				description: 'A short form where clients rate their experience and leave a comment',
				whatYouLearn: 'How simple forms can capture valuable client sentiment',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Rating input',
						description: 'A 0-10 scale where clients score how likely they are to recommend you',
						whatYouLearn: 'How NPS scores give you one number to track client happiness',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Shows a clickable 0-10 scale',
							'Selected score is visually highlighted',
						],
					},
					{
						title: 'Testimonial text field',
						description:
							'An optional text area for clients to share what they liked or suggest improvements',
						whatYouLearn: 'How open-ended fields capture feedback numbers alone miss',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts multi-line text input',
							'Submits alongside the rating score',
						],
					},
					{
						title: 'Submission confirmation',
						description: 'A thank-you message shown after the form is submitted',
						whatYouLearn: 'How confirmation feedback builds trust with respondents',
						taskType: 'feature',
						componentType: 'notification',
						acceptanceCriteria: [
							'Displays a success message after submission',
							'Prevents duplicate submissions',
						],
					},
				],
			},
			{
				title: 'Results dashboard',
				description: 'See your average NPS score and how it changes over time',
				whatYouLearn: 'How dashboards turn scattered feedback into actionable patterns',
				taskType: 'page',
				subtasks: [
					{
						title: 'Average score display',
						description:
							'Shows your overall NPS score with a colour indicator for good, neutral, or low',
						whatYouLearn:
							'How summary statistics distill many responses into one actionable number',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Displays the current average NPS score',
							'Colour changes based on score range',
						],
					},
					{
						title: 'Score trend chart',
						description: 'A line chart showing how your NPS has moved over the past months',
						whatYouLearn: 'How trend charts reveal whether your service is improving or slipping',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'Plots monthly average scores on a time axis',
							'Shows at least the last 6 data points',
						],
					},
				],
			},
			{
				title: 'Email notifications',
				description: 'Get an email every time a client submits new feedback',
				whatYouLearn: 'How real-time alerts let you respond to feedback while it is fresh',
				taskType: 'integration',
				subtasks: [
					{
						title: 'New feedback alert',
						description:
							'Sends you an email with the score and comment the moment a client submits',
						whatYouLearn: 'How transactional emails keep you in the loop without checking the app',
						taskType: 'integration',
						componentType: 'email-sender',
						acceptanceCriteria: [
							'Sends an email to the owner on every new submission',
							'Includes the NPS score and testimonial text',
						],
					},
					{
						title: 'Weekly summary digest',
						description:
							'A weekly email summarising how many responses you received and your average score',
						whatYouLearn: 'How digest emails prevent alert fatigue while keeping you informed',
						taskType: 'integration',
						componentType: 'email-sender',
						acceptanceCriteria: [
							'Sends once per week',
							'Includes total responses and average score for the period',
						],
					},
				],
			},
			{
				title: 'Public testimonials page',
				description: 'A shareable page that showcases your best client testimonials',
				whatYouLearn: 'How social proof pages turn happy clients into marketing assets',
				taskType: 'page',
				subtasks: [
					{
						title: 'Testimonial card grid',
						description: 'A grid of cards, each showing a client quote and their score',
						whatYouLearn: 'How card layouts make testimonials scannable and visually appealing',
						taskType: 'page',
						componentType: 'page',
						acceptanceCriteria: [
							'Shows approved testimonials in a responsive grid',
							'Each card displays the quote and rating',
						],
					},
					{
						title: 'Approve or hide toggle',
						description: 'Choose which testimonials appear on the public page',
						whatYouLearn: 'How moderation controls let you curate your public image',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Each testimonial has an approve/hide toggle',
							'Only approved testimonials show on the public page',
						],
					},
				],
			},
		],
	},
	{
		id: 'project-status-dashboard',
		name: 'Project Status Dashboard',
		description: 'Share live project progress with your clients',
		category: 'freelance',
		milestones: [
			{
				title: 'Project overview page',
				description: 'A single page showing all your active projects and their current status',
				whatYouLearn: 'How overview pages give you a quick pulse on everything in flight',
				taskType: 'page',
				subtasks: [
					{
						title: 'Project list with status badges',
						description: 'Each project shows its name, client, and a colour-coded status badge',
						whatYouLearn: 'How status indicators communicate progress at a glance',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Lists all projects with name and client',
							'Status badge shows Not Started, In Progress, or Complete',
						],
					},
					{
						title: 'Progress percentage bar',
						description: 'A visual bar showing how much of each project is done',
						whatYouLearn: 'How progress bars make completion tangible for both you and clients',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'Displays a percentage bar for each project',
							'Updates when milestones are marked complete',
						],
					},
				],
			},
			{
				title: 'Timeline and milestones view',
				description: 'See each project broken into milestones on a timeline',
				whatYouLearn: 'How timelines show the relationship between tasks and deadlines',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Milestone list',
						description:
							'Each project expands to show its milestones with due dates and completion status',
						whatYouLearn: 'How breaking projects into milestones makes large work manageable',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows milestone title, due date, and status',
							'Completed milestones are visually distinct',
						],
					},
					{
						title: 'Timeline chart',
						description: 'A horizontal bar chart showing milestone spans across weeks',
						whatYouLearn: 'How Gantt-style charts reveal overlaps and gaps in your schedule',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'Each milestone renders as a horizontal bar',
							'Current date is marked with a vertical line',
						],
					},
				],
			},
			{
				title: 'Status update form',
				description: "Quickly update a project's status and add a note for the client",
				whatYouLearn: 'How structured updates replace long email threads',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Status change dropdown',
						description: 'Pick a new status from a dropdown and save it with one click',
						whatYouLearn: 'How constrained inputs keep status data consistent and useful',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Shows a dropdown with status options',
							'Saves the new status immediately on selection',
						],
					},
					{
						title: 'Update note field',
						description: 'Add a short note explaining what changed or what is next',
						whatYouLearn: 'How update notes create a history trail clients can follow',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts a text note alongside the status change',
							'Notes appear in the project timeline',
						],
					},
				],
			},
			{
				title: 'Shareable client link',
				description: 'Generate a read-only link so clients can check progress themselves',
				whatYouLearn: 'How shareable links reduce status check emails and build transparency',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Public project page',
						description:
							'A read-only version of the project overview that anyone with the link can view',
						whatYouLearn: 'How public pages turn your app into a client communication tool',
						taskType: 'page',
						componentType: 'page',
						acceptanceCriteria: [
							'Shows project status, milestones, and recent updates',
							'No login required to view',
						],
					},
					{
						title: 'Copy link button',
						description: 'A button that copies the shareable URL to your clipboard',
						whatYouLearn: 'How clipboard actions reduce friction in sharing workflows',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Copies the link to clipboard on click',
							'Shows a brief confirmation message',
						],
					},
				],
			},
		],
	},
	{
		id: 'team-status-board',
		name: 'Team Status Board',
		description: "See who's working on what across your team",
		category: 'operations',
		milestones: [
			{
				title: 'Team member list',
				description: 'A directory of everyone on the team with their role and current assignment',
				whatYouLearn: 'How team directories make it easy to find who owns what',
				taskType: 'page',
				subtasks: [
					{
						title: 'Member table',
						description: 'A table listing each team member with name, role, and current task',
						whatYouLearn: 'How tables organise people data for quick scanning',
						taskType: 'page',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows name, role, and current assignment for each member',
							'Sortable by name or role',
						],
					},
					{
						title: 'Add member form',
						description: 'A form to add a new team member with their name, role, and email',
						whatYouLearn: 'How forms standardise the data you collect about each person',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts name, role, and email',
							'New member appears in the table immediately',
						],
					},
				],
			},
			{
				title: 'Status update form',
				description: 'A quick form for each team member to post what they are working on',
				whatYouLearn: 'How async status updates replace daily stand-up meetings',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Daily status input',
						description:
							'A short form where each person logs what they did, what they plan to do, and any blockers',
						whatYouLearn: 'How structured daily updates surface problems before they escalate',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Has fields for done, planned, and blockers',
							'Timestamps each entry automatically',
						],
					},
					{
						title: 'Status history list',
						description: 'A scrollable timeline of past status updates for each member',
						whatYouLearn: 'How history logs let you trace decisions and progress backward',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows past updates in reverse chronological order',
							'Grouped by team member',
						],
					},
				],
			},
			{
				title: 'Weekly summary dashboard',
				description: 'A dashboard summarising what the team accomplished this week',
				whatYouLearn: 'How weekly summaries turn daily noise into actionable insight',
				taskType: 'page',
				subtasks: [
					{
						title: 'Team activity overview',
						description:
							'Shows total updates posted, active members, and blockers raised this week',
						whatYouLearn: 'How aggregate stats reveal team health at a glance',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Displays total updates, active members, and blocker count',
							'Covers the current work week',
						],
					},
					{
						title: 'Activity chart',
						description: 'A bar chart showing daily update volume across the week',
						whatYouLearn: 'How activity charts highlight which days are busiest or quietest',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: ['One bar per weekday', 'Hover shows the exact count for that day'],
					},
				],
			},
			{
				title: 'Filter by team or project',
				description: 'Narrow the board to a specific team, project, or person',
				whatYouLearn: 'How filters let managers focus on one slice without losing the big picture',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Team filter dropdown',
						description: 'A dropdown to show only members of a specific team or department',
						whatYouLearn: 'How dropdown filters reduce noise on busy boards',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Lists all teams as filter options',
							'Board updates to show only matching members',
						],
					},
					{
						title: 'Project filter',
						description: 'Filter the board to show only people working on a specific project',
						whatYouLearn: 'How cross-cutting filters reveal who is contributing to each project',
						taskType: 'feature',
						componentType: 'filter',
						acceptanceCriteria: [
							'Lists all active projects as filter options',
							'Shows members assigned to the selected project',
						],
					},
				],
			},
		],
	},
	{
		id: 'meeting-action-items',
		name: 'Meeting Action Items',
		description: 'Log meetings, extract action items, track completion',
		category: 'operations',
		milestones: [
			{
				title: 'Meeting log form',
				description: 'Capture the essentials of each meeting in one quick form',
				whatYouLearn: 'How structured meeting logs prevent decisions from being forgotten',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Meeting details form',
						description: 'Record the meeting title, date, attendees, and key notes',
						whatYouLearn: 'How capturing meeting metadata makes them searchable later',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Accepts title, date, attendees, and notes',
							'Validates that at least a title and date are provided',
						],
					},
					{
						title: 'Action item extractor',
						description:
							'Tag specific lines from your notes as action items with an assignee and due date',
						whatYouLearn: 'How extracting action items from notes turns talk into trackable work',
						taskType: 'feature',
						componentType: 'form',
						acceptanceCriteria: [
							'Lets you add action items with description, assignee, and due date',
							'Action items link back to the parent meeting',
						],
					},
				],
			},
			{
				title: 'Action items table',
				description: 'A single view of every action item across all meetings',
				whatYouLearn:
					'How consolidated tables surface commitments that would otherwise be buried in notes',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Action items list',
						description: 'A table showing each action item with its assignee, due date, and status',
						whatYouLearn: 'How tables turn scattered commitments into an accountable list',
						taskType: 'feature',
						componentType: 'table',
						acceptanceCriteria: [
							'Shows description, assignee, due date, and status',
							'Overdue items are visually highlighted',
						],
					},
					{
						title: 'Status toggle',
						description: 'Mark action items as done with a single click',
						whatYouLearn: 'How quick toggles reduce friction in keeping records up to date',
						taskType: 'feature',
						componentType: 'data-input',
						acceptanceCriteria: [
							'Clicking toggles between open and complete',
							'Completed items move to a separate section',
						],
					},
				],
			},
			{
				title: 'Completion tracker',
				description: 'See how many action items are getting done on time',
				whatYouLearn: 'How tracking completion rates reveals whether meetings are productive',
				taskType: 'feature',
				subtasks: [
					{
						title: 'Completion rate chart',
						description:
							'A chart showing the percentage of action items completed on time each week',
						whatYouLearn: 'How visualising completion rates holds the team accountable',
						taskType: 'feature',
						componentType: 'chart',
						acceptanceCriteria: [
							'Plots weekly completion percentages',
							'Shows a target line for comparison',
						],
					},
					{
						title: 'Overdue items dashboard',
						description: 'A summary panel highlighting all overdue action items and their owners',
						whatYouLearn: 'How overdue dashboards prevent tasks from slipping through the cracks',
						taskType: 'page',
						componentType: 'dashboard',
						acceptanceCriteria: [
							'Lists all overdue items sorted by how late they are',
							'Shows the assignee for each overdue item',
						],
					},
				],
			},
			{
				title: 'Weekly digest email',
				description: 'A weekly email summarising open action items and overdue tasks',
				whatYouLearn: 'How digest emails keep the team aligned without another meeting',
				taskType: 'integration',
				subtasks: [
					{
						title: 'Digest email sender',
						description: 'Sends a weekly summary email listing open and overdue action items',
						whatYouLearn: 'How automated digests replace manual follow-up and save manager time',
						taskType: 'integration',
						componentType: 'email-sender',
						acceptanceCriteria: [
							'Sends once per week to all team members',
							'Includes counts of open, completed, and overdue items',
						],
					},
					{
						title: 'Assignee reminder email',
						description: 'Sends a personal reminder to each person with their open action items',
						whatYouLearn:
							'How personalised reminders drive higher completion rates than group emails',
						taskType: 'integration',
						componentType: 'email-sender',
						acceptanceCriteria: [
							'Sends to each assignee individually',
							"Lists only that person's open items with due dates",
						],
					},
				],
			},
		],
	},
] as const
