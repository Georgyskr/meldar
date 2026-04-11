'use client'

import { Box, Grid, HStack, styled, VStack } from '@styled-system/jsx'
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button, Heading, Text, toast } from '@/shared/ui'

type Service = {
	id: string
	name: string
	durationMinutes: number
	priceEur: number
}

let nextServiceId = 0
function createServiceId(): string {
	return `svc-${Date.now()}-${++nextServiceId}`
}

type AvailableHours = {
	days: string[]
	start: string
	end: string
}

type Props = {
	readonly projectId: string
	readonly initialBusinessName: string
	readonly initialServices: readonly Service[]
	readonly initialHours: AvailableHours
}

const DAY_OPTIONS = [
	{ value: 'mon', label: 'Mon' },
	{ value: 'tue', label: 'Tue' },
	{ value: 'wed', label: 'Wed' },
	{ value: 'thu', label: 'Thu' },
	{ value: 'fri', label: 'Fri' },
	{ value: 'sat', label: 'Sat' },
	{ value: 'sun', label: 'Sun' },
] as const

const inputStyles = {
	width: '100%',
	minHeight: '40px',
	paddingBlock: '8px',
	paddingInline: '12px',
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
} as const

export function SettingsPanel({
	projectId,
	initialBusinessName,
	initialServices,
	initialHours,
}: Props) {
	const [businessName, setBusinessName] = useState(initialBusinessName)
	const [services, setServices] = useState<Service[]>(
		initialServices.map((s) => ({ ...s, id: createServiceId() })),
	)
	const [hours, setHours] = useState<AvailableHours>({
		days: [...initialHours.days],
		start: initialHours.start,
		end: initialHours.end,
	})
	const [saving, setSaving] = useState(false)

	const handleAddService = useCallback(() => {
		setServices((prev) => [
			...prev,
			{ id: createServiceId(), name: '', durationMinutes: 60, priceEur: 0 },
		])
	}, [])

	const handleRemoveService = useCallback((index: number) => {
		setServices((prev) => prev.filter((_, i) => i !== index))
	}, [])

	const handleServiceChange = useCallback(
		(index: number, field: keyof Service, value: string | number) => {
			setServices((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
		},
		[],
	)

	const handleToggleDay = useCallback((day: string) => {
		setHours((prev) => ({
			...prev,
			days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
		}))
	}, [])

	const handleSave = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()
			setSaving(true)

			try {
				const res = await fetch(`/api/workspace/${projectId}/settings`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						businessName: businessName.trim(),
						services: services.filter((s) => s.name.trim()),
						availableHours: hours,
					}),
				})

				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as {
						error?: { message?: string }
					}
					throw new Error(body.error?.message ?? `Request failed (${res.status})`)
				}

				toast.success('Settings saved')
			} catch (err) {
				toast.error('Could not save', err instanceof Error ? err.message : 'Please try again.')
			} finally {
				setSaving(false)
			}
		},
		[projectId, businessName, services, hours],
	)

	return (
		<styled.form onSubmit={handleSave}>
			<VStack alignItems="stretch" gap={8}>
				<VStack alignItems="stretch" gap={4}>
					<Heading as="h2" textStyle="heading.3" color="onSurface">
						Business details
					</Heading>

					<VStack alignItems="stretch" gap={1.5}>
						<styled.label htmlFor="settings-name">
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Business name
							</Text>
						</styled.label>
						<styled.input
							id="settings-name"
							type="text"
							required
							value={businessName}
							onChange={(e) => setBusinessName(e.target.value)}
							{...inputStyles}
						/>
					</VStack>
				</VStack>

				<VStack alignItems="stretch" gap={4}>
					<HStack justifyContent="space-between" alignItems="center">
						<Heading as="h2" textStyle="heading.3" color="onSurface">
							Services
						</Heading>
						<styled.button
							type="button"
							onClick={handleAddService}
							display="inline-flex"
							alignItems="center"
							gap={1.5}
							paddingBlock={2}
							paddingInline={3}
							background="transparent"
							color="primary"
							border="1px solid"
							borderColor="primary/30"
							borderRadius="md"
							cursor="pointer"
							fontSize="13px"
							transition="all 0.15s"
							_hover={{ background: 'primary/5' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<Plus size={14} aria-hidden="true" />
							<Text as="span" textStyle="label.sm" color="primary">
								Add service
							</Text>
						</styled.button>
					</HStack>

					<VStack alignItems="stretch" gap={3}>
						{services.map((service, i) => (
							<Box
								key={service.id}
								paddingBlock={4}
								paddingInline={5}
								background="surfaceContainerLowest"
								border="1px solid"
								borderColor="outlineVariant/30"
								borderRadius="md"
							>
								<Grid columns={{ base: 1, sm: 3 }} gap={3} alignItems="end">
									<VStack alignItems="stretch" gap={1}>
										<Text as="label" textStyle="label.sm" color="onSurfaceVariant">
											Name
										</Text>
										<styled.input
											type="text"
											required
											value={service.name}
											onChange={(e) => handleServiceChange(i, 'name', e.target.value)}
											placeholder="e.g. Haircut"
											{...inputStyles}
										/>
									</VStack>
									<VStack alignItems="stretch" gap={1}>
										<Text as="label" textStyle="label.sm" color="onSurfaceVariant">
											Duration (min)
										</Text>
										<styled.input
											type="number"
											required
											min={5}
											step={5}
											value={service.durationMinutes}
											onChange={(e) =>
												handleServiceChange(i, 'durationMinutes', Number(e.target.value))
											}
											{...inputStyles}
										/>
									</VStack>
									<HStack gap={2} alignItems="end">
										<VStack alignItems="stretch" gap={1} flex={1}>
											<Text as="label" textStyle="label.sm" color="onSurfaceVariant">
												Price (EUR)
											</Text>
											<styled.input
												type="number"
												required
												min={0}
												step={1}
												value={service.priceEur}
												onChange={(e) => handleServiceChange(i, 'priceEur', Number(e.target.value))}
												{...inputStyles}
											/>
										</VStack>
										<styled.button
											type="button"
											onClick={() => handleRemoveService(i)}
											aria-label={`Remove ${service.name || 'service'}`}
											display="flex"
											alignItems="center"
											justifyContent="center"
											minHeight="40px"
											minWidth="40px"
											background="transparent"
											color="onSurfaceVariant"
											border="1px solid"
											borderColor="outlineVariant/30"
											borderRadius="md"
											cursor="pointer"
											transition="all 0.15s"
											flexShrink={0}
											_hover={{ color: 'error', borderColor: 'error/30' }}
											_focusVisible={{
												outline: '2px solid',
												outlineColor: 'primary',
												outlineOffset: '2px',
											}}
										>
											<Trash2 size={16} aria-hidden="true" />
										</styled.button>
									</HStack>
								</Grid>
							</Box>
						))}
					</VStack>
				</VStack>

				<VStack alignItems="stretch" gap={4}>
					<Heading as="h2" textStyle="heading.3" color="onSurface">
						Available hours
					</Heading>

					<VStack alignItems="stretch" gap={3}>
						<VStack alignItems="stretch" gap={1.5}>
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Days open
							</Text>
							<HStack gap={2} flexWrap="wrap">
								{DAY_OPTIONS.map((day) => {
									const active = hours.days.includes(day.value)
									return (
										<styled.button
											key={day.value}
											type="button"
											onClick={() => handleToggleDay(day.value)}
											aria-pressed={active}
											minWidth="44px"
											minHeight="36px"
											paddingBlock={2}
											paddingInline={3}
											background={active ? 'primary' : 'transparent'}
											color={active ? 'surface' : 'onSurface'}
											border="1px solid"
											borderColor={active ? 'primary' : 'outlineVariant/50'}
											borderRadius="md"
											cursor="pointer"
											transition="all 0.15s"
											_hover={{
												background: active ? 'primary/90' : 'onSurface/4',
											}}
											_focusVisible={{
												outline: '2px solid',
												outlineColor: 'primary',
												outlineOffset: '2px',
											}}
										>
											<Text as="span" textStyle="label.sm" color={active ? 'surface' : 'onSurface'}>
												{day.label}
											</Text>
										</styled.button>
									)
								})}
							</HStack>
						</VStack>

						<Grid columns={2} gap={4}>
							<VStack alignItems="stretch" gap={1.5}>
								<styled.label htmlFor="hours-start">
									<Text textStyle="label.sm" color="onSurfaceVariant">
										Opens at
									</Text>
								</styled.label>
								<styled.input
									id="hours-start"
									type="time"
									required
									value={hours.start}
									onChange={(e) => setHours((prev) => ({ ...prev, start: e.target.value }))}
									{...inputStyles}
								/>
							</VStack>
							<VStack alignItems="stretch" gap={1.5}>
								<styled.label htmlFor="hours-end">
									<Text textStyle="label.sm" color="onSurfaceVariant">
										Closes at
									</Text>
								</styled.label>
								<styled.input
									id="hours-end"
									type="time"
									required
									value={hours.end}
									onChange={(e) => setHours((prev) => ({ ...prev, end: e.target.value }))}
									{...inputStyles}
								/>
							</VStack>
						</Grid>
					</VStack>
				</VStack>

				<Button type="submit" variant="solid" size="lg" disabled={saving}>
					{saving ? 'Saving...' : 'Save changes'}
				</Button>
			</VStack>
		</styled.form>
	)
}
