'use client'

import { Box, HStack, VStack } from '@styled-system/jsx'
import { useEffect, useState } from 'react'
import { Text, toast } from '@/shared/ui'

type Booking = {
	readonly id: string
	readonly clientName: string
	readonly serviceName: string
	readonly date: string
	readonly time: string
	readonly status: 'confirmed' | 'pending' | 'cancelled'
}

type Props = {
	readonly projectId: string
}

function statusColor(status: Booking['status']): string {
	switch (status) {
		case 'confirmed':
			return 'success'
		case 'pending':
			return 'warning'
		case 'cancelled':
			return 'onSurfaceVariant/40'
	}
}

function statusLabel(status: Booking['status']): string {
	switch (status) {
		case 'confirmed':
			return 'Confirmed'
		case 'pending':
			return 'Pending'
		case 'cancelled':
			return 'Cancelled'
	}
}

function formatDate(iso: string): string {
	const d = new Date(`${iso}T00:00:00`)
	return d.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

export function BookingsList({ projectId }: Props) {
	const [bookings, setBookings] = useState<Booking[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const res = await fetch(`/api/workspace/${projectId}/bookings`)
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				const data = (await res.json()) as { bookings: Booking[] }
				if (!cancelled) setBookings(data.bookings)
			} catch (err) {
				if (!cancelled) {
					toast.error(
						'Could not load bookings',
						err instanceof Error ? err.message : 'Please refresh.',
					)
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [projectId])

	if (loading) {
		return (
			<Box paddingBlock={6}>
				<Text textStyle="body.sm" color="onSurfaceVariant">
					Loading bookings...
				</Text>
			</Box>
		)
	}

	if (bookings.length === 0) {
		return (
			<Box
				paddingBlock={8}
				paddingInline={6}
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/30"
				borderRadius="lg"
				textAlign="center"
			>
				<Text textStyle="body.md" color="onSurfaceVariant">
					No bookings yet. Share your booking page to get started.
				</Text>
			</Box>
		)
	}

	return (
		<VStack alignItems="stretch" gap={0}>
			<Box
				display={{ base: 'none', md: 'grid' }}
				gridTemplateColumns="1fr 1fr 120px 80px 100px"
				gap={4}
				paddingBlock={3}
				paddingInline={5}
				borderBlockEnd="1px solid"
				borderColor="outlineVariant/30"
			>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Client
				</Text>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Service
				</Text>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Date
				</Text>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Time
				</Text>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Status
				</Text>
			</Box>

			{bookings.map((booking) => (
				<Box
					key={booking.id}
					display={{ base: 'flex', md: 'grid' }}
					flexDirection={{ base: 'column', md: 'row' }}
					gridTemplateColumns={{ md: '1fr 1fr 120px 80px 100px' }}
					gap={{ base: 1.5, md: 4 }}
					alignItems={{ md: 'center' }}
					paddingBlock={4}
					paddingInline={5}
					borderBlockEnd="1px solid"
					borderColor="outlineVariant/15"
					transition="background 0.1s"
					_hover={{ background: 'onSurface/2' }}
				>
					<Text textStyle="body.md" color="onSurface">
						{booking.clientName}
					</Text>
					<Text textStyle="body.sm" color="onSurfaceVariant">
						{booking.serviceName}
					</Text>
					<Text textStyle="body.sm" color="onSurfaceVariant">
						{formatDate(booking.date)}
					</Text>
					<Text textStyle="body.sm" color="onSurfaceVariant">
						{booking.time}
					</Text>
					<HStack gap={2} alignItems="center">
						<Box
							width="8px"
							height="8px"
							borderRadius="50%"
							background={statusColor(booking.status)}
							flexShrink={0}
						/>
						<Text textStyle="label.sm" color="onSurfaceVariant">
							{statusLabel(booking.status)}
						</Text>
					</HStack>
				</Box>
			))}
		</VStack>
	)
}
