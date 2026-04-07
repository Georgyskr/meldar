import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'
import { XRayPageClient } from './xray-client'

export const metadata: Metadata = {
	title: `Free Digital Footprint Scan | ${SITE_CONFIG.name}`,
	description:
		'Upload your Screen Time screenshot and see exactly where your time goes. Free, instant, private.',
	alternates: { canonical: `${SITE_CONFIG.url}/xray` },
}

export default function XRayPage() {
	return <XRayPageClient />
}
