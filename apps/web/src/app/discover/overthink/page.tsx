import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'
import { OverthinkClient } from './overthink-client'

export const metadata: Metadata = {
	title: `The Overthink Report | ${SITE_CONFIG.name}`,
	description: 'How much time do you lose to indecision? 8 questions. Your answer in 2 minutes.',
	alternates: { canonical: `${SITE_CONFIG.url}/discover/overthink` },
}

export default function OverthinkPage() {
	return (
		<styled.main paddingBlockStart="120px" paddingBlockEnd={32} paddingInline={{ base: 5, md: 12 }}>
			<VStack maxWidth="640px" marginInline="auto" gap={8}>
				<OverthinkClient />
			</VStack>
		</styled.main>
	)
}
