export type ComponentType = {
	readonly id: string
	readonly label: string
	readonly defaultTaskType: 'feature' | 'page' | 'integration' | 'data' | 'fix' | 'polish'
	readonly tokenCostRange: readonly [min: number, max: number]
	readonly learningTemplate: string
}

export const COMPONENT_VOCABULARY: readonly ComponentType[] = [
	{
		id: 'chart',
		label: 'Chart',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 10],
		learningTemplate: 'Charts help you see trends and patterns in your data over time',
	},
	{
		id: 'table',
		label: 'Table',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 8],
		learningTemplate: 'Tables organize data into rows and columns for easy scanning',
	},
	{
		id: 'form',
		label: 'Form',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 8],
		learningTemplate: 'Forms let users input and submit structured data',
	},
	{
		id: 'page',
		label: 'Page',
		defaultTaskType: 'page',
		tokenCostRange: [3, 10],
		learningTemplate: 'Pages are the screens users navigate between in your app',
	},
	{
		id: 'layout',
		label: 'Layout',
		defaultTaskType: 'page',
		tokenCostRange: [3, 8],
		learningTemplate: 'Layouts define the overall structure — header, sidebar, main content',
	},
	{
		id: 'auth',
		label: 'Auth',
		defaultTaskType: 'integration',
		tokenCostRange: [5, 15],
		learningTemplate: 'Auth controls who can access your app and what they can do',
	},
	{
		id: 'email-sender',
		label: 'Email Sender',
		defaultTaskType: 'integration',
		tokenCostRange: [5, 12],
		learningTemplate: 'Email senders let your app send notifications and updates automatically',
	},
	{
		id: 'data-input',
		label: 'Data Input',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 8],
		learningTemplate: 'Data inputs capture information from users in a structured way',
	},
	{
		id: 'api-connector',
		label: 'API Connector',
		defaultTaskType: 'integration',
		tokenCostRange: [5, 15],
		learningTemplate: 'API connectors let your app talk to external services and data sources',
	},
	{
		id: 'scheduler',
		label: 'Scheduler',
		defaultTaskType: 'integration',
		tokenCostRange: [5, 12],
		learningTemplate:
			'Schedulers run tasks automatically at set times — like a digital alarm clock',
	},
	{
		id: 'dashboard',
		label: 'Dashboard',
		defaultTaskType: 'page',
		tokenCostRange: [5, 15],
		learningTemplate: 'Dashboards combine multiple views into one at-a-glance summary',
	},
	{
		id: 'search',
		label: 'Search',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 10],
		learningTemplate: 'Search lets users find specific items quickly in large collections',
	},
	{
		id: 'filter',
		label: 'Filter',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 8],
		learningTemplate: 'Filters narrow down what you see based on criteria you choose',
	},
	{
		id: 'export',
		label: 'Export',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 8],
		learningTemplate: 'Export lets you download your data so you always own a copy',
	},
	{
		id: 'import',
		label: 'Import',
		defaultTaskType: 'data',
		tokenCostRange: [5, 12],
		learningTemplate: 'Import brings existing data into your app from files or other services',
	},
	{
		id: 'notification',
		label: 'Notification',
		defaultTaskType: 'feature',
		tokenCostRange: [3, 10],
		learningTemplate: 'Notifications keep users informed about changes without checking the app',
	},
	{
		id: 'file-upload',
		label: 'File Upload',
		defaultTaskType: 'feature',
		tokenCostRange: [5, 10],
		learningTemplate: 'File uploads let users attach documents, images, or data to your app',
	},
] as const

export type ComponentTypeId = (typeof COMPONENT_VOCABULARY)[number]['id']
