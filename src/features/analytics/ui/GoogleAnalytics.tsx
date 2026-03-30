'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { useConsentState } from '@/features/cookie-consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export function GoogleAnalytics() {
	const consent = useConsentState()

	useEffect(() => {
		if (consent === 'rejected' && typeof window.gtag === 'function') {
			window.gtag('consent', 'update', { analytics_storage: 'denied' })
		}
	}, [consent])

	if (!GA_ID || consent !== 'accepted') return null

	return (
		<>
			<Script
				id="gtag-init"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: gtag inline script
				dangerouslySetInnerHTML={{
					__html: `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  analytics_storage:'granted',
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied'
});
gtag('js',new Date());
gtag('config','${GA_ID}');
`,
				}}
			/>
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
				strategy="afterInteractive"
			/>
		</>
	)
}
