export type BookingPageParams = {
	readonly businessName: string
	readonly verticalLabel: string
	readonly services: ReadonlyArray<{
		readonly name: string
		readonly durationMinutes: number
		readonly priceEur: number
	}>
	readonly hours: {
		readonly days: readonly string[]
		readonly start: string
		readonly end: string
	}
}

export function escapeForJsxSource(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/`/g, '\\`')
		.replace(/\$/g, '\\$')
		.replace(/\{/g, '&#123;')
		.replace(/\}/g, '&#125;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

const DAY_LABELS: Record<string, string> = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday',
}

function formatDays(days: readonly string[]): string {
	const labels = days.map((d) => DAY_LABELS[d] ?? d)
	if (labels.length <= 2) return labels.join(' & ')
	return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`
}

function formatDuration(minutes: number): string {
	if (minutes < 60) return `${minutes} min`
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatPrice(eur: number): string {
	if (eur === 0) return 'Free'
	return `€${eur}`
}

export function renderBookingPageTemplate(
	params: BookingPageParams,
): Array<{ path: string; content: string }> {
	const { businessName, verticalLabel, services, hours } = params
	const safeName = escapeForJsxSource(businessName)
	const safeVertical = escapeForJsxSource(verticalLabel)
	const safeVerticalLower = escapeForJsxSource(verticalLabel.toLowerCase())
	const daysFormatted = formatDays(hours.days)

	const servicesJsx = services
		.map(
			(s) => `
						<Box
							key="${escapeForJsxSource(s.name)}"
							padding="6"
							borderRadius="lg"
							border="1px solid"
							borderColor="border.subtle"
							background="bg.default"
							_hover={{ borderColor: 'border.default', transform: 'translateY(-2px)' }}
							transition="all 0.2s"
							cursor="pointer"
						>
							<Flex justifyContent="space-between" alignItems="flex-start" gap="4">
								<Box>
									<Box fontWeight="600" color="fg.default" fontSize="md">
										${escapeForJsxSource(s.name)}
									</Box>
									<Box color="fg.muted" fontSize="sm" marginBlockStart="1">
										${formatDuration(s.durationMinutes)}
									</Box>
								</Box>
								<Box
									fontWeight="700"
									color="fg.default"
									fontSize="lg"
									whiteSpace="nowrap"
								>
									${formatPrice(s.priceEur)}
								</Box>
							</Flex>
						</Box>`,
		)
		.join('\n')

	const pageTsx = `import { Box, Flex, VStack } from 'styled-system/jsx'
import { css } from 'styled-system/css'

const heroGradient = css({
	background: 'linear-gradient(180deg, sand.2 0%, bg.canvas 100%)',
})

const sectionDivider = css({
	width: '40px',
	height: '2px',
	background: 'sand.8',
	marginBlockEnd: '6',
})

export default function Page() {
	return (
		<Box minHeight="100vh" background="bg.canvas">

			{/* ── Hero ── */}
			<Box className={heroGradient} paddingBlock="20" paddingInline="6">
				<VStack gap="5" maxWidth="640px" marginInline="auto" textAlign="center">
					<Box
						fontSize="xs"
						fontWeight="600"
						letterSpacing="0.1em"
						textTransform="uppercase"
						color="sand.9"
					>
						${safeVertical}
					</Box>
					<Box
						fontSize="4xl"
						fontWeight="800"
						letterSpacing="-0.02em"
						lineHeight="1.1"
						color="fg.default"
					>
						${safeName}
					</Box>
					<Box fontSize="lg" color="fg.muted" maxWidth="480px" lineHeight="1.6">
						Quality ${safeVerticalLower} services tailored to you.
						Book your appointment online — simple, fast, no phone calls.
					</Box>
					<a
						href="#booking"
						className={css({
							display: 'inline-block',
							marginBlockStart: '4',
							paddingBlock: '14px',
							paddingInline: '32px',
							background: 'sand.12',
							color: 'sand.1',
							fontSize: 'sm',
							fontWeight: '600',
							letterSpacing: '0.04em',
							borderRadius: 'lg',
							textDecoration: 'none',
							transition: 'opacity 0.2s',
							_hover: { opacity: 0.85 },
						})}
					>
						Book now
					</a>
				</VStack>
			</Box>

			{/* ── Services ── */}
			<Box paddingBlock="16" paddingInline="6" id="services">
				<VStack gap="8" maxWidth="640px" marginInline="auto">
					<Box>
						<div className={sectionDivider} />
						<Box
							fontSize="2xl"
							fontWeight="700"
							letterSpacing="-0.01em"
							color="fg.default"
						>
							Services
						</Box>
					</Box>
					<VStack gap="3" width="100%">
${servicesJsx}
					</VStack>
				</VStack>
			</Box>

			{/* ── Hours ── */}
			<Box
				paddingBlock="16"
				paddingInline="6"
				background="sand.2"
				id="hours"
			>
				<VStack gap="6" maxWidth="640px" marginInline="auto">
					<Box>
						<div className={sectionDivider} />
						<Box
							fontSize="2xl"
							fontWeight="700"
							letterSpacing="-0.01em"
							color="fg.default"
						>
							Hours
						</Box>
					</Box>
					<Box width="100%" padding="6" borderRadius="lg" background="bg.default">
						<VStack gap="3" alignItems="flex-start">
							<Flex gap="3" alignItems="center">
								<Box
									width="8px"
									height="8px"
									borderRadius="full"
									background="sand.9"
								/>
								<Box color="fg.default" fontWeight="500">
									${daysFormatted}
								</Box>
							</Flex>
							<Box color="fg.muted" paddingInlineStart="5">
								${hours.start} – ${hours.end}
							</Box>
						</VStack>
					</Box>
				</VStack>
			</Box>

			{/* ── Booking ── */}
			<BookingSection businessName="${safeName}" />

			{/* ── Footer ── */}
			<Box
				paddingBlock="8"
				paddingInline="6"
				borderBlockStart="1px solid"
				borderColor="border.subtle"
			>
				<Flex
					maxWidth="640px"
					marginInline="auto"
					justifyContent="space-between"
					alignItems="center"
				>
					<Box fontSize="sm" color="fg.muted">
						© ${new Date().getFullYear()} ${safeName}
					</Box>
					<Box fontSize="xs" color="fg.subtle">
						Made with Meldar
					</Box>
				</Flex>
			</Box>
		</Box>
	)
}

function BookingSection({ businessName }: { businessName: string }) {
	return (
		<Box paddingBlock="16" paddingInline="6" id="booking">
			<VStack gap="8" maxWidth="640px" marginInline="auto">
				<Box>
					<div className={sectionDivider} />
					<Box
						fontSize="2xl"
						fontWeight="700"
						letterSpacing="-0.01em"
						color="fg.default"
					>
						Book an appointment
					</Box>
					<Box fontSize="md" color="fg.muted" marginBlockStart="2">
						Pick a date and time that works for you.
					</Box>
				</Box>

				<Box
					width="100%"
					padding="8"
					borderRadius="lg"
					border="1px solid"
					borderColor="border.subtle"
					background="bg.default"
				>
					<VStack gap="5" alignItems="stretch">
						<Box>
							<Box
								as="label"
								fontSize="sm"
								fontWeight="600"
								color="fg.default"
								marginBlockEnd="2"
								display="block"
							>
								Your name
							</Box>
							<input
								type="text"
								placeholder="Jane Smith"
								className={css({
									width: '100%',
									padding: '10px 14px',
									border: '1px solid',
									borderColor: 'border.default',
									borderRadius: 'md',
									fontSize: 'sm',
									color: 'fg.default',
									background: 'bg.canvas',
									outline: 'none',
									_focus: { borderColor: 'sand.8', boxShadow: '0 0 0 1px var(--colors-sand-8)' },
									_placeholder: { color: 'fg.subtle' },
								})}
							/>
						</Box>
						<Box>
							<Box
								as="label"
								fontSize="sm"
								fontWeight="600"
								color="fg.default"
								marginBlockEnd="2"
								display="block"
							>
								Email
							</Box>
							<input
								type="email"
								placeholder="jane@example.com"
								className={css({
									width: '100%',
									padding: '10px 14px',
									border: '1px solid',
									borderColor: 'border.default',
									borderRadius: 'md',
									fontSize: 'sm',
									color: 'fg.default',
									background: 'bg.canvas',
									outline: 'none',
									_focus: { borderColor: 'sand.8', boxShadow: '0 0 0 1px var(--colors-sand-8)' },
									_placeholder: { color: 'fg.subtle' },
								})}
							/>
						</Box>
						<Flex gap="4">
							<Box flex="1">
								<Box
									as="label"
									fontSize="sm"
									fontWeight="600"
									color="fg.default"
									marginBlockEnd="2"
									display="block"
								>
									Date
								</Box>
								<input
									type="date"
									className={css({
										width: '100%',
										padding: '10px 14px',
										border: '1px solid',
										borderColor: 'border.default',
										borderRadius: 'md',
										fontSize: 'sm',
										color: 'fg.default',
										background: 'bg.canvas',
										outline: 'none',
										_focus: { borderColor: 'sand.8', boxShadow: '0 0 0 1px var(--colors-sand-8)' },
									})}
								/>
							</Box>
							<Box flex="1">
								<Box
									as="label"
									fontSize="sm"
									fontWeight="600"
									color="fg.default"
									marginBlockEnd="2"
									display="block"
								>
									Time
								</Box>
								<input
									type="time"
									className={css({
										width: '100%',
										padding: '10px 14px',
										border: '1px solid',
										borderColor: 'border.default',
										borderRadius: 'md',
										fontSize: 'sm',
										color: 'fg.default',
										background: 'bg.canvas',
										outline: 'none',
										_focus: { borderColor: 'sand.8', boxShadow: '0 0 0 1px var(--colors-sand-8)' },
									})}
								/>
							</Box>
						</Flex>
						<Box>
							<Box
								as="label"
								fontSize="sm"
								fontWeight="600"
								color="fg.default"
								marginBlockEnd="2"
								display="block"
							>
								Notes (optional)
							</Box>
							<textarea
								rows={3}
								placeholder="Anything we should know beforehand?"
								className={css({
									width: '100%',
									padding: '10px 14px',
									border: '1px solid',
									borderColor: 'border.default',
									borderRadius: 'md',
									fontSize: 'sm',
									color: 'fg.default',
									background: 'bg.canvas',
									outline: 'none',
									resize: 'vertical',
									_focus: { borderColor: 'sand.8', boxShadow: '0 0 0 1px var(--colors-sand-8)' },
									_placeholder: { color: 'fg.subtle' },
								})}
							/>
						</Box>
						<button
							type="button"
							className={css({
								width: '100%',
								padding: '14px',
								background: 'sand.12',
								color: 'sand.1',
								fontSize: 'sm',
								fontWeight: '600',
								letterSpacing: '0.04em',
								borderRadius: 'lg',
								border: 'none',
								cursor: 'pointer',
								transition: 'opacity 0.2s',
								_hover: { opacity: 0.85 },
							})}
						>
							Request booking
						</button>
						<Box fontSize="xs" color="fg.subtle" textAlign="center">
							You will receive a confirmation email from {businessName}.
						</Box>
					</VStack>
				</Box>
			</VStack>
		</Box>
	)
}
`

	return [
		{ path: 'src/app/page.tsx', content: pageTsx },
		{ path: 'src/app/globals.css', content: '@layer reset, base, tokens, recipes, utilities;\n' },
	]
}
