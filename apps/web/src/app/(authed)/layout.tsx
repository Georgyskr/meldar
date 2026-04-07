import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export const metadata: Metadata = {
	metadataBase: new URL(SITE_CONFIG.url),
	icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
	robots: { index: false, follow: false },
}

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>
}
