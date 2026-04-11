'use client'

import { Box, styled, VStack } from '@styled-system/jsx'
import { useCallback, useState } from 'react'
import type { BookingVertical } from '@/entities/booking-verticals'
import { Heading, MeldarBadge, Text } from '@/shared/ui'
import { BookingConfirmation } from './BookingConfirmation'
import { BookingForm } from './BookingForm'
import { ServiceCard } from './ServiceCard'

type Props = {
	readonly projectId: string
	readonly businessName: string
	readonly vertical: BookingVertical
}

type BookingResult = {
	readonly date: string
	readonly time: string
	readonly serviceName: string
}

type View =
	| { type: 'services' }
	| { type: 'form'; serviceIndex: number }
	| { type: 'confirmation'; booking: BookingResult }

export function BookingPage({ projectId, businessName, vertical }: Props) {
	const [view, setView] = useState<View>({ type: 'services' })

	const handleSelectService = useCallback((index: number) => {
		setView({ type: 'form', serviceIndex: index })
	}, [])

	const handleBack = useCallback(() => {
		setView({ type: 'services' })
	}, [])

	const handleSuccess = useCallback((booking: BookingResult) => {
		setView({ type: 'confirmation', booking })
	}, [])

	return (
		<styled.main minHeight="100dvh" background="surface" color="onSurface">
			<Box maxWidth="680px" marginInline="auto" paddingBlock={10} paddingInline={5}>
				{view.type === 'services' && (
					<VStack alignItems="stretch" gap={8}>
						<VStack alignItems="stretch" gap={3}>
							<Heading as="h1" textStyle="heading.1" color="onSurface">
								{businessName}
							</Heading>
							<Text as="p" textStyle="body.lg" color="onSurfaceVariant">
								Choose a service to book your appointment.
							</Text>
						</VStack>

						<VStack alignItems="stretch" gap={3} role="list" aria-label="Available services">
							{vertical.defaultServices.map((service, i) => (
								<Box key={service.name} role="listitem">
									<ServiceCard
										name={service.name}
										durationMinutes={service.durationMinutes}
										priceEur={service.priceEur}
										onSelect={() => handleSelectService(i)}
									/>
								</Box>
							))}
						</VStack>
					</VStack>
				)}

				{view.type === 'form' && (
					<BookingForm
						projectId={projectId}
						service={vertical.defaultServices[view.serviceIndex]}
						businessName={businessName}
						slotDurationMinutes={vertical.slotDurationMinutes}
						availableHours={vertical.defaultHours}
						onBack={handleBack}
						onSuccess={handleSuccess}
					/>
				)}

				{view.type === 'confirmation' && (
					<BookingConfirmation
						date={view.booking.date}
						time={view.booking.time}
						serviceName={view.booking.serviceName}
						businessName={businessName}
					/>
				)}
			</Box>

			<MeldarBadge />
		</styled.main>
	)
}
