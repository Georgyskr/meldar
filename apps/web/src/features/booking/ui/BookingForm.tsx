'use client'

import { Grid, styled, VStack } from '@styled-system/jsx'
import { ArrowLeft } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Button, Heading, Text, toast } from '@/shared/ui'

type Service = {
	readonly name: string
	readonly durationMinutes: number
	readonly priceEur: number
}

type Props = {
	readonly projectId: string
	readonly service: Service
	readonly businessName: string
	readonly slotDurationMinutes: number
	readonly availableHours: { readonly start: string; readonly end: string }
	readonly onBack: () => void
	readonly onSuccess: (booking: { date: string; time: string; serviceName: string }) => void
}

function generateTimeSlots(start: string, end: string, slotMinutes: number): string[] {
	const slots: string[] = []
	const [startH, startM] = start.split(':').map(Number)
	const [endH, endM] = end.split(':').map(Number)
	const startTotal = startH * 60 + startM
	const endTotal = endH * 60 + endM

	for (let t = startTotal; t + slotMinutes <= endTotal; t += slotMinutes) {
		const h = Math.floor(t / 60)
		const m = t % 60
		slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
	}

	return slots
}

function todayIso(): string {
	const d = new Date()
	return d.toISOString().split('T')[0]
}

const inputStyles = {
	width: '100%',
	minHeight: '44px',
	paddingBlock: '10px',
	paddingInline: '14px',
	background: 'surfaceContainerLowest',
	border: '1px solid',
	borderColor: 'outlineVariant/50',
	borderRadius: 'md',
	color: 'onSurface',
	fontSize: '14px',
	outline: 'none',
	transition: 'border-color 0.15s',
	_focus: {
		borderColor: 'primary',
		boxShadow: '0 0 0 2px rgba(98, 49, 83, 0.15)',
	},
	_placeholder: { color: 'onSurfaceVariant/50' },
} as const

export function BookingForm({
	projectId,
	service,
	businessName,
	slotDurationMinutes,
	availableHours,
	onBack,
	onSuccess,
}: Props) {
	const [date, setDate] = useState('')
	const [time, setTime] = useState('')
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [note, setNote] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const timeSlots = useMemo(
		() => generateTimeSlots(availableHours.start, availableHours.end, slotDurationMinutes),
		[availableHours.start, availableHours.end, slotDurationMinutes],
	)

	const canSubmit = date && time && name.trim() && email.trim()

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			if (!canSubmit || submitting) return

			setSubmitting(true)
			try {
				const res = await fetch(`/api/workspace/${projectId}/bookings`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						service: service.name,
						date,
						time,
						name: name.trim(),
						email: email.trim(),
						note: note.trim() || undefined,
					}),
				})

				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as {
						error?: { message?: string }
					}
					throw new Error(body.error?.message ?? `Request failed (${res.status})`)
				}

				onSuccess({ date, time, serviceName: service.name })
			} catch (err) {
				toast.error('Booking failed', err instanceof Error ? err.message : 'Please try again.')
			} finally {
				setSubmitting(false)
			}
		},
		[canSubmit, submitting, projectId, service.name, date, time, name, email, note, onSuccess],
	)

	return (
		<VStack alignItems="stretch" gap={6} maxWidth="520px" width="100%">
			<styled.button
				type="button"
				onClick={onBack}
				display="inline-flex"
				alignItems="center"
				gap={1.5}
				background="none"
				border="none"
				cursor="pointer"
				padding={0}
				color="onSurfaceVariant"
				_hover={{ color: 'onSurface' }}
			>
				<ArrowLeft size={16} aria-hidden="true" />
				<Text as="span" textStyle="body.sm" color="inherit">
					Back to services
				</Text>
			</styled.button>

			<VStack alignItems="stretch" gap={2}>
				<Text textStyle="label.sm" color="primary">
					{businessName}
				</Text>
				<Heading as="h2" textStyle="heading.2" color="onSurface">
					{service.name}
				</Heading>
				<Text textStyle="body.md" color="onSurfaceVariant">
					{service.durationMinutes} min &middot;{' '}
					{service.priceEur === 0 ? 'Free' : `€${service.priceEur}`}
				</Text>
			</VStack>

			<styled.form onSubmit={handleSubmit}>
				<VStack alignItems="stretch" gap={5}>
					<Grid columns={{ base: 1, sm: 2 }} gap={4}>
						<VStack alignItems="stretch" gap={1.5}>
							<styled.label htmlFor="booking-date">
								<Text textStyle="label.sm" color="onSurfaceVariant">
									Date
								</Text>
							</styled.label>
							<styled.input
								id="booking-date"
								type="date"
								required
								min={todayIso()}
								value={date}
								onChange={(e) => setDate(e.target.value)}
								{...inputStyles}
							/>
						</VStack>

						<VStack alignItems="stretch" gap={1.5}>
							<styled.label htmlFor="booking-time">
								<Text textStyle="label.sm" color="onSurfaceVariant">
									Time
								</Text>
							</styled.label>
							<styled.select
								id="booking-time"
								required
								value={time}
								onChange={(e) => setTime(e.target.value)}
								{...inputStyles}
							>
								<option value="">Select a time</option>
								{timeSlots.map((slot) => (
									<option key={slot} value={slot}>
										{slot}
									</option>
								))}
							</styled.select>
						</VStack>
					</Grid>

					<VStack alignItems="stretch" gap={1.5}>
						<styled.label htmlFor="booking-name">
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Your name
							</Text>
						</styled.label>
						<styled.input
							id="booking-name"
							type="text"
							required
							placeholder="Jane Doe"
							value={name}
							onChange={(e) => setName(e.target.value)}
							{...inputStyles}
						/>
					</VStack>

					<VStack alignItems="stretch" gap={1.5}>
						<styled.label htmlFor="booking-email">
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Email
							</Text>
						</styled.label>
						<styled.input
							id="booking-email"
							type="email"
							required
							placeholder="jane@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							{...inputStyles}
						/>
					</VStack>

					<VStack alignItems="stretch" gap={1.5}>
						<styled.label htmlFor="booking-note">
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Note{' '}
								<Text as="span" textStyle="body.sm" color="onSurfaceVariant/50">
									(optional)
								</Text>
							</Text>
						</styled.label>
						<styled.textarea
							id="booking-note"
							placeholder="Anything we should know?"
							rows={3}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							{...inputStyles}
							resize="vertical"
						/>
					</VStack>

					<Button type="submit" variant="solid" size="lg" disabled={!canSubmit || submitting}>
						{submitting ? 'Sending...' : 'Confirm booking'}
					</Button>
				</VStack>
			</styled.form>
		</VStack>
	)
}
