'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import {
	ArrowRight,
	Briefcase,
	Dumbbell,
	type LucideIcon,
	Pen,
	Scissors,
	Store,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { z } from 'zod'
import { BOOKING_VERTICALS, type BookingVertical } from '@/entities/booking-verticals'
import { Heading, Text, toast } from '@/shared/ui'

const ICON_MAP: Record<string, LucideIcon> = {
	Scissors,
	Dumbbell,
	Pen,
	Briefcase,
	Store,
}

const FETCH_TIMEOUT_MS = 10_000

const onboardingResponseSchema = z.object({
	projectId: z.string(),
	subdomain: z.string().optional(),
})

type Step = 'pick' | 'creating' | 'ready'

type ReadyPayload = {
	projectId: string
	subdomain?: string
}

export function OnboardingFlow() {
	const router = useRouter()
	const [step, setStep] = useState<Step>('pick')
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [businessName, setBusinessName] = useState('')
	const [timedOut, setTimedOut] = useState(false)
	const [readyData, setReadyData] = useState<ReadyPayload | null>(null)
	const inFlight = useRef(false)

	const handleGo = useCallback(async () => {
		if (!selectedId || inFlight.current) return
		inFlight.current = true
		setStep('creating')
		setTimedOut(false)

		const controller = new AbortController()
		const timeout = setTimeout(() => {
			controller.abort()
			setTimedOut(true)
		}, FETCH_TIMEOUT_MS)

		try {
			const res = await fetch('/api/onboarding', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					verticalId: selectedId,
					...(businessName.trim() ? { businessName: businessName.trim() } : {}),
				}),
				signal: controller.signal,
			})

			clearTimeout(timeout)

			if (!res.ok) {
				let message = `Something went wrong (${res.status})`
				try {
					const json = (await res.json()) as { error?: { message?: string } }
					if (json.error?.message) message = json.error.message
				} catch {}
				toast.error('Could not set up your business', message)
				setStep('pick')
				return
			}

			const parsed = onboardingResponseSchema.safeParse(await res.json())
			if (!parsed.success) {
				toast.error('Could not set up your business', 'Unexpected server response')
				setStep('pick')
				return
			}

			setReadyData(parsed.data)
			setStep('ready')
		} catch (err) {
			clearTimeout(timeout)
			if (err instanceof DOMException && err.name === 'AbortError') {
				setTimedOut(true)
				return
			}
			toast.error(
				'Network error',
				err instanceof Error ? err.message : 'Please check your connection',
			)
			setStep('pick')
		} finally {
			inFlight.current = false
		}
	}, [selectedId, businessName])

	const handleRetry = useCallback(() => {
		setTimedOut(false)
		setStep('pick')
	}, [])

	if (step === 'ready' && readyData) {
		return (
			<VStack gap="6" alignItems="center" justifyContent="center" minHeight="60vh">
				<VStack gap="2" alignItems="center">
					<Heading as="h1" textStyle="primary.lg" color="onSurface">
						Your booking page is ready!
					</Heading>
					{readyData.subdomain && (
						<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
							{readyData.subdomain}
						</Text>
					)}
				</VStack>

				<styled.button
					type="button"
					onClick={() => router.push(`/workspace/${readyData.projectId}`)}
					paddingInline="8"
					paddingBlock="4"
					bg="onSurface"
					color="surface"
					border="none"
					cursor="pointer"
					transition="all 0.2s ease"
					_hover={{ bg: 'primary' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
				>
					<Flex alignItems="center" gap="2">
						<Text textStyle="button.md" color="surface">
							Go to your dashboard
						</Text>
						<ArrowRight size={16} />
					</Flex>
				</styled.button>
			</VStack>
		)
	}

	if (step === 'creating') {
		return (
			<VStack gap="4" alignItems="center" justifyContent="center" minHeight="60vh">
				{timedOut ? (
					<>
						<Heading as="h1" textStyle="primary.md" color="onSurface">
							Taking longer than expected...
						</Heading>
						<styled.button
							type="button"
							onClick={handleRetry}
							paddingInline="6"
							paddingBlock="3"
							bg="onSurface"
							color="surface"
							border="none"
							cursor="pointer"
							transition="all 0.2s ease"
							_hover={{ bg: 'primary' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<Text textStyle="button.md" color="surface">
								Try again?
							</Text>
						</styled.button>
					</>
				) : (
					<>
						<Box
							width="32px"
							height="32px"
							border="2px solid"
							borderColor="primary"
							borderTopColor="transparent"
							borderRadius="50%"
							animation="spin 0.8s linear infinite"
						/>
						<Heading as="h1" textStyle="primary.md" color="onSurface">
							Setting up your booking page...
						</Heading>
						<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
							This only takes a moment.
						</Text>
					</>
				)}
			</VStack>
		)
	}

	return (
		<VStack gap="10" alignItems="stretch" maxWidth="640px" marginInline="auto">
			<VStack gap="2" alignItems="center">
				<Heading as="h1" textStyle="primary.lg" color="onSurface">
					What's your business?
				</Heading>
				<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
					Pick one. You can change everything later.
				</Text>
			</VStack>

			<Grid gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap="3">
				{BOOKING_VERTICALS.map((vertical) => (
					<VerticalCard
						key={vertical.id}
						vertical={vertical}
						selected={selectedId === vertical.id}
						onSelect={() => setSelectedId(vertical.id)}
					/>
				))}
			</Grid>

			<Box>
				<styled.label htmlFor="business-name" display="block" marginBlockEnd="2">
					<Text textStyle="label.sm" color="onSurfaceVariant">
						Business name (optional)
					</Text>
				</styled.label>
				<styled.input
					id="business-name"
					type="text"
					placeholder="e.g. Studio Mia"
					value={businessName}
					onChange={(e) => setBusinessName(e.target.value)}
					width="100%"
					paddingInline="4"
					paddingBlock="3"
					border="1px solid"
					borderColor="onSurface/15"
					bg="surface"
					color="onSurface"
					fontFamily="body"
					fontSize="md"
					outline="none"
					transition="border-color 0.2s ease"
					_focus={{ borderColor: 'primary' }}
					_placeholder={{ color: 'onSurfaceVariant/40' }}
				/>
			</Box>

			<styled.button
				type="button"
				onClick={() => handleGo()}
				disabled={!selectedId}
				width="100%"
				paddingBlock="4"
				bg={selectedId ? 'onSurface' : 'onSurface/20'}
				color="surface"
				border="none"
				cursor={selectedId ? 'pointer' : 'not-allowed'}
				transition="all 0.2s ease"
				_hover={selectedId ? { bg: 'primary' } : {}}
				_disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				<Text textStyle="button.md" color="surface">
					Create my booking page
				</Text>
			</styled.button>
		</VStack>
	)
}

function VerticalCard({
	vertical,
	selected,
	onSelect,
}: {
	readonly vertical: BookingVertical
	readonly selected: boolean
	readonly onSelect: () => void
}) {
	const Icon = ICON_MAP[vertical.icon]

	return (
		<styled.button
			type="button"
			onClick={onSelect}
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			gap="3"
			paddingBlock="6"
			paddingInline="4"
			border={selected ? '2px solid' : '1px solid'}
			borderColor={selected ? 'primary' : 'onSurface/15'}
			bg={selected ? 'primary/5' : 'surface'}
			cursor="pointer"
			transition="all 0.15s ease"
			_hover={{
				borderColor: selected ? 'primary' : 'onSurface/40',
				bg: selected ? 'primary/5' : 'primary/3',
			}}
			_focusVisible={{
				outline: '2px solid',
				outlineColor: 'primary',
				outlineOffset: '2px',
			}}
		>
			{Icon && <Icon size={24} color={selected ? '#623153' : '#666'} />}
			<Text textStyle="label.md" color={selected ? 'primary' : 'onSurface'}>
				{vertical.label}
			</Text>
		</styled.button>
	)
}
