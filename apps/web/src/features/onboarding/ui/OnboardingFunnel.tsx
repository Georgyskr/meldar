'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useReducer } from 'react'
import { getVerticalById } from '@/entities/booking-verticals'
import { toast } from '@/shared/ui'
import { EXAMPLE_PAGES } from '../model/example-pages'
import { funnelReducer, INITIAL_STATE } from '../model/funnel-machine'
import { buildProposalFromFreeform } from '../model/proposal-data'
import { DoorA } from './DoorA'
import { DoorB } from './DoorB'
import { DoorC } from './DoorC'
import { DoorPicker } from './DoorPicker'
import { ProposalPreview } from './ProposalPreview'

export function OnboardingFunnel() {
	const router = useRouter()
	const [state, dispatch] = useReducer(funnelReducer, INITIAL_STATE)

	const handleDoorASubmit = useCallback(
		(data: { verticalId: string; businessName: string; websiteUrl: string }) => {
			dispatch({ type: 'submitDoorA', ...data })
		},
		[],
	)

	const handleExampleSelect = useCallback((exampleId: string) => {
		const example = EXAMPLE_PAGES.find((e) => e.id === exampleId)
		if (!example) return
		const vertical = getVerticalById(example.verticalId)
		dispatch({
			type: 'selectExample',
			proposal: {
				verticalId: example.verticalId,
				verticalLabel: vertical?.label ?? 'Other',
				businessName: example.title,
				services: example.services,
				hours: vertical?.defaultHours ?? {
					days: ['mon', 'tue', 'wed', 'thu', 'fri'],
					start: '09:00',
					end: '17:00',
				},
			},
		})
	}, [])

	const handleFreeformSubmit = useCallback((text: string) => {
		const proposal = buildProposalFromFreeform(text, '')
		dispatch({ type: 'submitFreeform', proposal })
	}, [])

	const handleConfirm = useCallback(async () => {
		if (state.screen !== 'proposalPreview') return
		dispatch({ type: 'confirm' })

		try {
			const body: Record<string, unknown> = {
				verticalId: state.proposal.verticalId,
				businessName: state.proposal.businessName,
				services: state.proposal.services,
			}
			if (state.websiteUrl) body.websiteUrl = state.websiteUrl
			const res = await fetch('/api/onboarding', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			if (!res.ok) {
				let message = `Something went wrong (${res.status})`
				try {
					const json = (await res.json()) as { error?: { message?: string } }
					if (json.error?.message) message = json.error.message
				} catch {}
				dispatch({ type: 'failure', error: message })
				toast.error('Could not set up your page', message)
				return
			}

			const json = (await res.json()) as { projectId: string; subdomain?: string }
			dispatch({ type: 'success', projectId: json.projectId, subdomain: json.subdomain })
			router.push(`/workspace/${json.projectId}`)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Network error'
			dispatch({ type: 'failure', error: message })
			toast.error('Network error', message)
		}
	}, [state, router])

	switch (state.screen) {
		case 'doorPicker':
			return <DoorPicker onSelectDoor={(door) => dispatch({ type: 'selectDoor', door })} />
		case 'doorA':
			return (
				<DoorA
					onSubmit={handleDoorASubmit}
					onBack={() => dispatch({ type: 'back' })}
					initialVerticalId={state.selectedVerticalId}
					initialBusinessName={state.businessName}
				/>
			)
		case 'doorB':
			return (
				<DoorB onSelectExample={handleExampleSelect} onBack={() => dispatch({ type: 'back' })} />
			)
		case 'doorC':
			return <DoorC onSubmit={handleFreeformSubmit} onBack={() => dispatch({ type: 'back' })} />
		case 'proposalPreview':
			return (
				<ProposalPreview
					proposal={state.proposal}
					submitting={false}
					error={state.error}
					onConfirm={handleConfirm}
					onGoBack={() => dispatch({ type: 'back' })}
				/>
			)
		case 'submitting':
			return (
				<ProposalPreview
					proposal={state.proposal}
					submitting={true}
					error={null}
					onConfirm={handleConfirm}
					onGoBack={() => {}}
				/>
			)
		case 'complete':
			return null
	}
}
