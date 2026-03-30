interface GtagConsentParams {
	analytics_storage?: 'granted' | 'denied'
	ad_storage?: 'granted' | 'denied'
	ad_user_data?: 'granted' | 'denied'
	ad_personalization?: 'granted' | 'denied'
}

type GtagCommand =
	| ['consent', 'default' | 'update', GtagConsentParams]
	| ['js', Date]
	| ['config', string, Record<string, unknown>?]
	| ['event', string, Record<string, unknown>?]

interface Window {
	dataLayer: GtagCommand[]
	gtag: (...args: GtagCommand) => void
}
