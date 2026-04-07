type FunnelEvent =
	| { name: 'signup'; source: string }
	| { name: 'quiz_started' }
	| { name: 'quiz_complete'; painCount: number }
	| { name: 'scan_started' }
	| { name: 'scan_completed' }
	| { name: 'scan_failed'; reason: string }
	| { name: 'screenshot_upload' }
	| { name: 'xray_created'; xrayId: string }
	| { name: 'xray_shared'; method: string }
	| { name: 'checkout_initiated'; product: string }
	| { name: 'email_captured'; source: string }
	| { name: 'founding_signup' }
	| { name: 'pricing_viewed' }
	| { name: 'faq_opened'; question: string }
	| { name: 'cta_clicked'; location: string }

export function trackEvent(event: FunnelEvent) {
	if (typeof window === 'undefined' || !window.gtag) return
	const { name, ...params } = event
	window.gtag('event', name, params)
}
