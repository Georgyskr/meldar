'use client'

import { Box, Grid, HStack, styled, VStack } from '@styled-system/jsx'
import { Calendar, ClipboardList, Inbox } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Heading, Text, toast } from '@/shared/ui'
import { ApprovalInbox } from './ApprovalInbox'
import { BookingsList } from './BookingsList'

type Tab = 'overview' | 'bookings' | 'approvals'

type DashboardStats = {
	totalBookings: number
	pendingApprovals: number
	recentBookings: Array<{
		id: string
		clientName: string
		serviceName: string
		date: string
		time: string
		status: 'confirmed' | 'pending' | 'cancelled'
	}>
}

type Props = {
	readonly projectId: string
	readonly businessName: string
}

export function AdminDashboard({ projectId, businessName }: Props) {
	const [tab, setTab] = useState<Tab>('overview')
	const [stats, setStats] = useState<DashboardStats | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const [bookingsRes, tasksRes] = await Promise.all([
					fetch(`/api/workspace/${projectId}/bookings`),
					fetch(`/api/workspace/${projectId}/agent/tasks`),
				])

				if (!bookingsRes.ok || !tasksRes.ok) {
					throw new Error('Failed to load dashboard data')
				}

				const bookingsData = (await bookingsRes.json()) as {
					bookings: DashboardStats['recentBookings']
				}
				const tasksData = (await tasksRes.json()) as {
					tasks: Array<{ status: string }>
				}

				if (!cancelled) {
					setStats({
						totalBookings: bookingsData.bookings.length,
						pendingApprovals: tasksData.tasks.filter((t) => t.status === 'proposed').length,
						recentBookings: bookingsData.bookings.slice(0, 5),
					})
				}
			} catch (err) {
				if (!cancelled) {
					toast.error(
						'Could not load dashboard',
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

	return (
		<VStack alignItems="stretch" gap={6}>
			<VStack alignItems="stretch" gap={2}>
				<Heading as="h1" textStyle="heading.2" color="onSurface">
					{businessName}
				</Heading>
				<Text textStyle="body.md" color="onSurfaceVariant">
					Manage your bookings and review AI actions.
				</Text>
			</VStack>

			<HStack gap={1} borderBlockEnd="1px solid" borderColor="outlineVariant/30">
				<TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
					Overview
				</TabButton>
				<TabButton active={tab === 'bookings'} onClick={() => setTab('bookings')}>
					Bookings
				</TabButton>
				<TabButton active={tab === 'approvals'} onClick={() => setTab('approvals')}>
					Approvals
				</TabButton>
			</HStack>

			{tab === 'overview' && <OverviewTab stats={stats} loading={loading} />}
			{tab === 'bookings' && <BookingsList projectId={projectId} />}
			{tab === 'approvals' && <ApprovalInbox projectId={projectId} />}
		</VStack>
	)
}

function TabButton({
	active,
	onClick,
	children,
}: {
	readonly active: boolean
	readonly onClick: () => void
	readonly children: React.ReactNode
}) {
	return (
		<styled.button
			type="button"
			onClick={onClick}
			paddingBlock={3}
			paddingInline={4}
			background="transparent"
			color={active ? 'primary' : 'onSurfaceVariant'}
			border="none"
			borderBlockEnd="2px solid"
			borderColor={active ? 'primary' : 'transparent'}
			cursor="pointer"
			transition="all 0.15s"
			_hover={{ color: active ? 'primary' : 'onSurface' }}
			_focusVisible={{
				outline: '2px solid',
				outlineColor: 'primary',
				outlineOffset: '-2px',
			}}
		>
			<Text as="span" textStyle="label.md" color="inherit">
				{children}
			</Text>
		</styled.button>
	)
}

function OverviewTab({
	stats,
	loading,
}: {
	readonly stats: DashboardStats | null
	readonly loading: boolean
}) {
	if (loading) {
		return (
			<Box paddingBlock={6}>
				<Text textStyle="body.sm" color="onSurfaceVariant">
					Loading dashboard...
				</Text>
			</Box>
		)
	}

	if (!stats) {
		return (
			<Box paddingBlock={6}>
				<Text textStyle="body.sm" color="onSurfaceVariant">
					Could not load dashboard data.
				</Text>
			</Box>
		)
	}

	return (
		<VStack alignItems="stretch" gap={6}>
			<Grid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
				<StatCard
					icon={<Calendar size={20} aria-hidden="true" />}
					label="Total bookings"
					value={String(stats.totalBookings)}
				/>
				<StatCard
					icon={<Inbox size={20} aria-hidden="true" />}
					label="Pending approvals"
					value={String(stats.pendingApprovals)}
					highlight={stats.pendingApprovals > 0}
				/>
				<StatCard
					icon={<ClipboardList size={20} aria-hidden="true" />}
					label="Recent"
					value={stats.recentBookings.length > 0 ? `${stats.recentBookings.length} new` : 'None'}
				/>
			</Grid>

			{stats.recentBookings.length > 0 && (
				<VStack alignItems="stretch" gap={3}>
					<Heading as="h2" textStyle="heading.4" color="onSurface">
						Recent bookings
					</Heading>
					<VStack alignItems="stretch" gap={0}>
						{stats.recentBookings.map((booking) => (
							<HStack
								key={booking.id}
								gap={4}
								paddingBlock={3}
								paddingInline={4}
								borderBlockEnd="1px solid"
								borderColor="outlineVariant/15"
							>
								<Box
									width="8px"
									height="8px"
									borderRadius="50%"
									background={
										booking.status === 'confirmed'
											? 'success'
											: booking.status === 'pending'
												? 'warning'
												: 'onSurfaceVariant/40'
									}
									flexShrink={0}
									marginBlockStart={1.5}
								/>
								<VStack alignItems="stretch" gap={0} flex={1}>
									<Text textStyle="body.md" color="onSurface">
										{booking.clientName}
									</Text>
									<Text textStyle="body.sm" color="onSurfaceVariant">
										{booking.serviceName} &middot; {booking.date} at {booking.time}
									</Text>
								</VStack>
							</HStack>
						))}
					</VStack>
				</VStack>
			)}
		</VStack>
	)
}

function StatCard({
	icon,
	label,
	value,
	highlight = false,
}: {
	readonly icon: React.ReactNode
	readonly label: string
	readonly value: string
	readonly highlight?: boolean
}) {
	return (
		<Box
			paddingBlock={5}
			paddingInline={5}
			background="surface"
			border="1px solid"
			borderColor={highlight ? 'primary/30' : 'outlineVariant/30'}
			borderRadius="lg"
		>
			<VStack alignItems="flex-start" gap={3}>
				<Box color={highlight ? 'primary' : 'onSurfaceVariant'}>{icon}</Box>
				<VStack alignItems="flex-start" gap={0.5}>
					<Heading as="h3" textStyle="heading.3" color={highlight ? 'primary' : 'onSurface'}>
						{value}
					</Heading>
					<Text textStyle="label.sm" color="onSurfaceVariant">
						{label}
					</Text>
				</VStack>
			</VStack>
		</Box>
	)
}
