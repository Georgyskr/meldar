'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { OnboardingChat } from './OnboardingChat'
import { TemplatePickerFallback } from './TemplatePickerFallback'

function EmptyStateInner({ projectId }: { readonly projectId: string }) {
	const searchParams = useSearchParams()
	const skipOnboarding = searchParams.get('skip-onboarding') === '1'

	if (skipOnboarding) {
		return <TemplatePickerFallback projectId={projectId} />
	}

	return <OnboardingChat projectId={projectId} />
}

export function WorkspaceEmptyState({ projectId }: { readonly projectId: string }) {
	return (
		<Suspense fallback={null}>
			<EmptyStateInner projectId={projectId} />
		</Suspense>
	)
}
