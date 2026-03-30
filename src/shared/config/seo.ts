export const SITE_CONFIG = {
	name: 'Meldar',
	url: 'https://meldar.ai',
	tagline: 'Your AI. Your app. Nobody else\u2019s.',
	description:
		'Tell Meldar what annoys you. It builds a personal app that fixes it. 30 minutes. No coding. No confusion.',
} as const

export const BUSINESS_INFO = {
	legalName: 'ClickTheRoadFi Oy',
	businessId: '3362511-1',
	country: 'FI',
	city: 'Helsinki',
	address: 'Punavuorenkatu 1 B 13',
	postalCode: '00120',
	email: 'gosha.skryuchenkov@gmail.com',
	phone: '045 343 9983',
} as const

export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: SITE_CONFIG.name,
				item: SITE_CONFIG.url,
			},
			...items.map((item, index) => ({
				'@type': 'ListItem',
				position: index + 2,
				name: item.name,
				item: `${SITE_CONFIG.url}${item.path}`,
			})),
		],
	}
}
