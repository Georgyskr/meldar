import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: SITE_CONFIG.url, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
		{
			url: `${SITE_CONFIG.url}/start`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.9,
		},
		{
			url: `${SITE_CONFIG.url}/privacy-policy`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 0.3,
		},
		{
			url: `${SITE_CONFIG.url}/terms`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 0.3,
		},
	]
}
