import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: SITE_CONFIG.url, changeFrequency: 'weekly', priority: 1 },
		{ url: `${SITE_CONFIG.url}/start`, changeFrequency: 'monthly', priority: 0.9 },
		{ url: `${SITE_CONFIG.url}/discover`, changeFrequency: 'monthly', priority: 0.8 },
		{ url: `${SITE_CONFIG.url}/discover/sleep`, changeFrequency: 'monthly', priority: 0.7 },
		{ url: `${SITE_CONFIG.url}/discover/overthink`, changeFrequency: 'monthly', priority: 0.7 },
		{ url: `${SITE_CONFIG.url}/xray`, changeFrequency: 'monthly', priority: 0.8 },
		{ url: `${SITE_CONFIG.url}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
		{ url: `${SITE_CONFIG.url}/terms`, changeFrequency: 'yearly', priority: 0.3 },
	]
}
