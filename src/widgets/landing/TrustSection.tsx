import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { Check, Trash2, Unlock, X } from 'lucide-react'

export function TrustSection() {
	return (
		<styled.section
			paddingBlock={32}
			paddingInline={8}
			bg="primary/3"
			overflow="hidden"
			position="relative"
		>
			<Box
				position="absolute"
				right="-80px"
				top="-80px"
				width="384px"
				height="384px"
				background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
				borderRadius="full"
				filter="blur(120px)"
				opacity={0.08}
			/>

			<VStack maxWidth="breakpoint-xl" marginInline="auto" gap={12} position="relative" zIndex={1}>
				<styled.h2 textStyle="heading.section" textAlign="center" color="onSurface">
					Your stuff stays your stuff
				</styled.h2>

				<Grid columns={{ base: 1, md: 2 }} gap={{ base: 8, md: 12 }} width="100%">
					<VStack alignItems="flex-start" gap={6}>
						<VStack alignItems="flex-start" gap={3}>
							<styled.h3 fontFamily="heading" fontSize="lg" fontWeight="700">
								What we can see
							</styled.h3>
							<SeeItem positive>Which apps you switch between during the day</SeeItem>
							<SeeItem positive>How often you repeat the same task</SeeItem>
							<SeeItem positive>Patterns in how you spend your time</SeeItem>
						</VStack>
						<VStack alignItems="flex-start" gap={3}>
							<styled.h3 fontFamily="heading" fontSize="lg" fontWeight="700">
								What we can never see
							</styled.h3>
							<SeeItem positive={false}>What you type, read, or look at</SeeItem>
							<SeeItem positive={false}>Your passwords, messages, or files</SeeItem>
							<SeeItem positive={false}>Your screen. We don&apos;t record anything.</SeeItem>
						</VStack>
					</VStack>

					<VStack alignItems="flex-start" gap={6}>
						<TrustBlock
							icon={Unlock}
							title="Leave whenever you want"
							body="Your apps are yours. Your work is yours. Take it all, delete your account, no questions asked. Nothing breaks when you go."
						/>
						<TrustBlock
							icon={Trash2}
							title="Delete everything in one click"
							body="Not just deactivate. Actually gone. We erase your data within 30 days. European law requires it, and we like it that way."
						/>
					</VStack>
				</Grid>

				<Flex
					direction="column"
					alignItems="center"
					gap={3}
					paddingBlockStart={12}
					borderBlockStart="1px solid"
					borderColor="outlineVariant/15"
					width="100%"
				>
					<styled.p textStyle="body.base" color="onSurface" fontWeight="600" textAlign="center">
						Built by a founder who uses the same AI tools you&apos;re about to learn.
					</styled.p>
					<styled.p textStyle="body.sm" color="onSurfaceVariant" textAlign="center">
						Refined every day since launch.
					</styled.p>
					<styled.p textStyle="body.sm" color="onSurfaceVariant" textAlign="center">
						EU-registered company. GDPR compliant. Data auto-purges in 30 days.
					</styled.p>
					<styled.p textStyle="body.sm" color="onSurfaceVariant" textAlign="center">
						Your screenshot is processed in your browser using OCR. The image never reaches our
						servers.
					</styled.p>
				</Flex>
			</VStack>
		</styled.section>
	)
}

function SeeItem({ positive, children }: { positive: boolean; children: React.ReactNode }) {
	return (
		<Flex gap={3} alignItems="flex-start">
			{positive ? (
				<Check
					size={18}
					color="#22C55E"
					strokeWidth={2}
					style={{ flexShrink: 0, marginTop: 3 }}
					aria-hidden="true"
				/>
			) : (
				<X
					size={18}
					color="#ba1a1a"
					strokeWidth={2}
					style={{ flexShrink: 0, marginTop: 3 }}
					aria-hidden="true"
				/>
			)}
			<styled.p textStyle="body.base" color="onSurfaceVariant">
				{children}
			</styled.p>
		</Flex>
	)
}

function TrustBlock({
	icon: Icon,
	title,
	body,
}: {
	icon: typeof Unlock
	title: string
	body: string
}) {
	return (
		<VStack alignItems="flex-start" gap={2}>
			<Flex alignItems="center" gap={2}>
				<Icon size={20} color="#623153" strokeWidth={1.5} aria-hidden="true" />
				<styled.h3 fontFamily="heading" fontSize="md" fontWeight="700">
					{title}
				</styled.h3>
			</Flex>
			<styled.p textStyle="body.base" color="onSurfaceVariant">
				{body}
			</styled.p>
		</VStack>
	)
}
