import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/api/', '/thank-you', '/coming-soon'],
			},
			{ userAgent: 'GPTBot', allow: '/' },
			{ userAgent: 'ClaudeBot', allow: '/' },
			{ userAgent: 'PerplexityBot', allow: '/' },
		],
		sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
	}
}
