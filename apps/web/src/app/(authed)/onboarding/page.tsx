import { styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { OnboardingFlow, OnboardingFunnel } from '@/features/onboarding'

const useNewFunnel = process.env.NEXT_PUBLIC_ONBOARDING_V2 === 'true'

export const metadata: Metadata = {
	title: 'Set up your business — Meldar',
	description: 'Choose your business type and get your booking page in seconds.',
	robots: { index: false, follow: false },
}

export default function OnboardingPage() {
	return (
		<styled.main
			minHeight="100vh"
			bg="surface"
			paddingBlock={{ base: 12, md: 16 }}
			paddingInline={{ base: 6, md: 10 }}
		>
			{useNewFunnel ? <OnboardingFunnel /> : <OnboardingFlow />}
		</styled.main>
	)
}
