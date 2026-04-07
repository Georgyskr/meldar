import type { Metadata } from 'next'
import { GoogleAnalytics } from '@/features/analytics'
import { CookieConsent } from '@/features/cookie-consent'
import { SITE_CONFIG } from '@/shared/config'
import { Footer } from '@/widgets/footer'
import { Header } from '@/widgets/header'

export const metadata: Metadata = {
	title: 'Meldar \u2014 Tell us what annoys you. We build an app that fixes it.',
	description: SITE_CONFIG.description,
	metadataBase: new URL(SITE_CONFIG.url),
	icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
	openGraph: {
		title: 'Meldar \u2014 Your personal AI app, built in 30 minutes',
		description: SITE_CONFIG.description,
		url: SITE_CONFIG.url,
		siteName: 'Meldar',
		type: 'website',
		locale: 'en_US',
		images: [
			{
				url: `${SITE_CONFIG.url}/og`,
				width: 1200,
				height: 630,
				alt: 'Meldar — Your AI. Your app. Nobody else\u2019s.',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Meldar \u2014 Your personal AI app, built in 30 minutes',
		description: SITE_CONFIG.description,
		images: [`${SITE_CONFIG.url}/og`],
	},
	alternates: { canonical: SITE_CONFIG.url },
	robots: { index: true, follow: true },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			{children}
			<Footer />
			<CookieConsent />
			<GoogleAnalytics />
		</>
	)
}
