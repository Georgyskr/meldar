type FunnelEvent =
	| { name: 'signup'; source: string }
	| { name: 'quiz_complete'; painCount: number }
	| { name: 'screenshot_upload' }
	| { name: 'xray_created'; xrayId: string }
	| { name: 'xray_shared'; method: string }
	| { name: 'checkout_initiated'; product: string }
	| { name: 'email_captured'; source: string }

export function trackEvent(event: FunnelEvent) {
	if (typeof window === 'undefined' || !window.gtag) return
	const { name, ...params } = event
	window.gtag('event', name, params)
}
