import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

const AUTH_WALLED_PATHS = ['/api/', '/sign-in', '/sign-up', '/workspace']
const MARKETING_NOINDEX = ['/thank-you', '/coming-soon']

export default function robots(): MetadataRoute.Robots {
	const disallow = [...AUTH_WALLED_PATHS, ...MARKETING_NOINDEX]
	return {
		rules: [
			{ userAgent: '*', allow: '/', disallow },
			{ userAgent: 'GPTBot', allow: '/', disallow },
			{ userAgent: 'ClaudeBot', allow: '/', disallow },
			{ userAgent: 'PerplexityBot', allow: '/', disallow },
		],
		sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
	}
}
