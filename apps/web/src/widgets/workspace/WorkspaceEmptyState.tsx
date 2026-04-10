'use client'

import { OnboardingChat } from './OnboardingChat'

export function WorkspaceEmptyState({ projectId }: { readonly projectId: string }) {
	return <OnboardingChat projectId={projectId} />
}
