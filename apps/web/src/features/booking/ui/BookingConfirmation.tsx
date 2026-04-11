import { Box, VStack } from '@styled-system/jsx'
import { CalendarCheck, Mail } from 'lucide-react'
import { Heading, Text } from '@/shared/ui'

type Props = {
	readonly date: string
	readonly time: string
	readonly serviceName: string
	readonly businessName: string
}

function formatDate(iso: string): string {
	const d = new Date(`${iso}T00:00:00`)
	return d.toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
}

export function BookingConfirmation({ date, time, serviceName, businessName }: Props) {
	return (
		<VStack alignItems="center" gap={6} paddingBlock={10} paddingInline={6} textAlign="center">
			<Box
				display="flex"
				alignItems="center"
				justifyContent="center"
				width="64px"
				height="64px"
				borderRadius="full"
				background="primary/10"
			>
				<CalendarCheck size={28} color="var(--colors-primary)" aria-hidden="true" />
			</Box>

			<VStack alignItems="center" gap={2}>
				<Heading as="h2" textStyle="heading.2" color="onSurface">
					Booking request sent
				</Heading>
				<Text as="p" textStyle="body.lg" color="onSurfaceVariant">
					{businessName} will confirm your appointment shortly.
				</Text>
			</VStack>

			<Box
				width="100%"
				maxWidth="400px"
				paddingBlock={5}
				paddingInline={6}
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/30"
				borderRadius="lg"
			>
				<VStack alignItems="stretch" gap={3}>
					<VStack alignItems="stretch" gap={0.5}>
						<Text textStyle="label.sm" color="onSurfaceVariant">
							Service
						</Text>
						<Text textStyle="body.md" color="onSurface">
							{serviceName}
						</Text>
					</VStack>
					<VStack alignItems="stretch" gap={0.5}>
						<Text textStyle="label.sm" color="onSurfaceVariant">
							Date
						</Text>
						<Text textStyle="body.md" color="onSurface">
							{formatDate(date)}
						</Text>
					</VStack>
					<VStack alignItems="stretch" gap={0.5}>
						<Text textStyle="label.sm" color="onSurfaceVariant">
							Time
						</Text>
						<Text textStyle="body.md" color="onSurface">
							{time}
						</Text>
					</VStack>
				</VStack>
			</Box>

			<Box
				display="flex"
				alignItems="center"
				gap={2}
				paddingBlock={3}
				paddingInline={4}
				background="primary/5"
				borderRadius="md"
			>
				<Mail size={16} color="var(--colors-primary)" aria-hidden="true" />
				<Text textStyle="body.sm" color="primary">
					Check your email for the confirmation.
				</Text>
			</Box>
		</VStack>
	)
}
