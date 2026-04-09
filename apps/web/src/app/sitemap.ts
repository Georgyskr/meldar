import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: SITE_CONFIG.url, changeFrequency: 'weekly', priority: 1 },
		{ url: `${SITE_CONFIG.url}/sign-up`, changeFrequency: 'monthly', priority: 0.9 },
		{ url: `${SITE_CONFIG.url}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
		{ url: `${SITE_CONFIG.url}/terms`, changeFrequency: 'yearly', priority: 0.3 },
	]
}
