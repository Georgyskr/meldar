import { styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { z } from 'zod'
import { OnboardingFunnel } from '@/features/onboarding'

export const metadata: Metadata = {
	title: 'Set up your business — Meldar',
	description: 'Choose your business type and get your booking page in seconds.',
	robots: { index: false, follow: false },
}

const fromParamSchema = z.string().uuid()

type PageProps = {
	searchParams: Promise<{ from?: string }>
}

export default async function OnboardingPage({ searchParams }: PageProps) {
	const { from } = await searchParams
	const fromProjectId = fromParamSchema.safeParse(from).success ? from : undefined

	return (
		<styled.main
			minHeight="100vh"
			bg="surface"
			paddingBlock={{ base: 12, md: 16 }}
			paddingInline={{ base: 6, md: 10 }}
		>
			<OnboardingFunnel fromProjectId={fromProjectId} />
		</styled.main>
	)
}
