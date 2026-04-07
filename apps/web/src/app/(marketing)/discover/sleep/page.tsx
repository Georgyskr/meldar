import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { SITE_CONFIG } from '@/shared/config/seo'
import { SleepClient } from './sleep-client'

export const metadata: Metadata = {
	title: `Sleep Debt Score | ${SITE_CONFIG.name}`,
	description: 'How much sleep does your phone steal? 5 questions. Your score in 1 minute.',
	alternates: { canonical: `${SITE_CONFIG.url}/discover/sleep` },
}

export default function SleepPage() {
	return (
		<styled.main paddingBlockStart="120px" paddingBlockEnd={32} paddingInline={{ base: 5, md: 12 }}>
			<VStack maxWidth="640px" marginInline="auto" gap={8}>
				<SleepClient />
			</VStack>
		</styled.main>
	)
}
