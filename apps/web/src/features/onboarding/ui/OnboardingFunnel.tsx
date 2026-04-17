'use client'

import { VStack } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { z } from 'zod'
import { getVerticalById } from '@/entities/booking-verticals'
import { Text, toast } from '@/shared/ui'
import { EXAMPLE_PAGES } from '../model/example-pages'
import { funnelReducer, INITIAL_STATE } from '../model/funnel-machine'
import { buildProposalFromFreeform } from '../model/proposal-data'
import { DoorA } from './DoorA'
import { DoorB } from './DoorB'
import { DoorC } from './DoorC'
import { DoorPicker } from './DoorPicker'
import { ProposalPreview } from './ProposalPreview'

type Props = {
	readonly fromProjectId?: string
}

const prefillResponseSchema = z.object({
	settings: z.object({
		verticalId: z.string().min(1),
		businessName: z.string().min(1),
	}),
})

function initialState(fromProjectId: string | undefined): import('../model/types').FunnelState {
	return fromProjectId ? { screen: 'prefilling' } : INITIAL_STATE
}

export function OnboardingFunnel({ fromProjectId }: Props) {
	const router = useRouter()
	const [state, dispatch] = useReducer(funnelReducer, fromProjectId, initialState)
	const prefillAttempted = useRef(false)

	useEffect(() => {
		if (!fromProjectId || prefillAttempted.current) return
		prefillAttempted.current = true
		const controller = new AbortController()

		fetch(`/api/workspace/${fromProjectId}/settings`, { signal: controller.signal })
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				const parsed = prefillResponseSchema.safeParse(data)
				if (!parsed.success) {
					dispatch({ type: 'prefillFailed' })
					toast.error("Couldn't load that project", 'Start fresh — pick a starting point below.')
					return
				}
				dispatch({
					type: 'prefillFromProject',
					verticalId: parsed.data.settings.verticalId,
					businessName: parsed.data.settings.businessName,
				})
			})
			.catch((err) => {
				if (err?.name === 'AbortError') return
				dispatch({ type: 'prefillFailed' })
				toast.error("Couldn't load that project", 'Start fresh — pick a starting point below.')
			})

		return () => controller.abort()
	}, [fromProjectId])

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
		case 'prefilling':
			return (
				<VStack gap="4" alignItems="center" paddingBlock="16">
					<Text textStyle="secondary.md" color="onSurfaceVariant">
						Loading your project…
					</Text>
				</VStack>
			)
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
					sourceName={state.sourceName}
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
					sourceName={state.sourceName}
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
