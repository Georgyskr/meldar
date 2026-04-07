import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: 'Meldar Sandbox Spike',
	description: 'Next.js 16 running inside a Cloudflare Sandbox container',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body
				style={{
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
					backgroundColor: '#faf9f6',
					color: '#2a1f26',
					margin: 0,
					padding: 0,
				}}
			>
				{children}
			</body>
		</html>
	)
}
