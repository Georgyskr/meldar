import type { Metadata } from 'next'
import { StartClient } from './start-client'

export const metadata: Metadata = {
	title: 'Start here — Meldar',
	description:
		'Discover what wastes your time. Upload your data, get personalized AI recommendations. Free to start.',
	alternates: { canonical: 'https://meldar.ai/start' },
}

export default function StartPage() {
	return <StartClient />
}
