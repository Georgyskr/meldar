import type { NextConfig } from 'next'

const config: NextConfig = {
	// Allow cross-origin from the Cloudflare sandbox proxy domain. Next.js 16 needs
	// allowedDevOrigins configured when the dev server is accessed via a different
	// hostname than the one it binds to (the sandbox proxies requests through a
	// generated subdomain).
	allowedDevOrigins: ['*.localhost', '*.workers.dev', '*.meldar.ai'],
	// Disable telemetry during the spike to avoid noise in logs
	telemetry: false,
}

export default config
