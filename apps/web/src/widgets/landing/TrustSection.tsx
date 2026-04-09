import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { Check, Trash2, Unlock, X } from 'lucide-react'
import { EditorialEyebrow, EditorialPlate, Heading, Text } from '@/shared/ui'

export function TrustSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surface"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-xl" marginInline="auto" position="relative">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="007" label="Your stuff stays your stuff" />
				</Box>

				<Grid
					gridTemplateColumns={{ base: '1fr', md: '2fr 3fr' }}
					gap={{ base: 12, md: 20 }}
					alignItems="start"
				>
					<Box>
						<Heading as="h2" textStyle="primary.xl" color="onSurface" marginBlockEnd={8}>
							We are{' '}
							<Text as="em" textStyle="italic.lg" color="primary">
								not
							</Text>{' '}
							the product.{' '}
							<Text as="em" textStyle="italic.lg" color="primary">
								You
							</Text>{' '}
							are not the product.
						</Heading>
						<Box display={{ base: 'none', md: 'block' }}>
							<EditorialPlate
								src="/brand/editorial-plate-05-trust.jpg"
								plateNumber="05"
								caption="The shelter."
								aspectRatio="4/5"
							/>
						</Box>
					</Box>

					<VStack alignItems="stretch" gap={0}>
						{/* What we see */}
						<SeeBlock
							number="I"
							title="What we can see"
							tone="positive"
							items={[
								'Which apps you switch between during the day',
								'How often you repeat the same task',
								'Patterns in how you spend your time',
							]}
						/>
						{/* What we never see */}
						<SeeBlock
							number="II"
							title="What we never see"
							tone="negative"
							items={[
								'What you type, read, or look at',
								'Your passwords, messages, or files',
								"Your screen. We don't record anything.",
							]}
						/>

						<TrustRow
							number="III"
							icon={Unlock}
							title="Leave whenever you want"
							body="Your apps are yours. Your work is yours. Take it all, delete your account, no questions asked. Nothing breaks when you go."
						/>
						<TrustRow
							number="IV"
							icon={Trash2}
							title="Delete everything in one click"
							body="Not just deactivate. Actually gone. We erase your data within 30 days. European law requires it, and we like it that way."
							last
						/>
					</VStack>
				</Grid>

				{/* Signature block */}
				<Box
					marginBlockStart={{ base: 16, md: 20 }}
					paddingBlock={8}
					paddingInline={{ base: 6, md: 10 }}
					borderTop="2px solid"
					borderBottom="1px solid"
					borderColor="onSurface"
					bg="surface"
				>
					<Grid
						gridTemplateColumns={{ base: '1fr', md: 'auto 1fr' }}
						gap={{ base: 4, md: 10 }}
						alignItems="center"
					>
						<Text textStyle="tertiary.md" color="primary">
							The promise —
						</Text>
						<Text as="p" textStyle="italic.lg" color="onSurface">
							Made by one person who uses the same tools you&apos;re about to learn. We read the
							file, show you the results, throw it away. Your screenshot never leaves your phone.
						</Text>
					</Grid>
				</Box>
			</Box>
		</styled.section>
	)
}

function SeeBlock({
	number,
	title,
	tone,
	items,
}: {
	number: string
	title: string
	tone: 'positive' | 'negative'
	items: string[]
}) {
	return (
		<Box
			paddingBlock={{ base: 6, md: 8 }}
			borderTop="2px solid"
			borderColor="onSurface"
			transition="all 0.35s ease"
			_hover={{ bg: 'primary/3' }}
		>
			<Flex alignItems="baseline" gap={4} marginBlockEnd={5}>
				<Text textStyle="display.sm" color="primary">
					§{number}
				</Text>
				<Heading as="h3" textStyle="primary.md" color="onSurface">
					{title}
				</Heading>
			</Flex>
			<VStack alignItems="stretch" gap={3} paddingInlineStart={{ base: 0, md: 20 }}>
				{items.map((item) => (
					<Flex key={item} gap={3} alignItems="flex-start">
						{tone === 'positive' ? (
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
						<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
							{item}
						</Text>
					</Flex>
				))}
			</VStack>
		</Box>
	)
}

function TrustRow({
	number,
	icon: Icon,
	title,
	body,
	last = false,
}: {
	number: string
	icon: typeof Unlock
	title: string
	body: string
	last?: boolean
}) {
	return (
		<Box
			paddingBlock={{ base: 6, md: 8 }}
			borderTop="2px solid"
			borderBottom={last ? '2px solid' : 'none'}
			borderColor="onSurface"
			transition="all 0.35s ease"
			_hover={{ bg: 'primary/3' }}
		>
			<Flex alignItems="baseline" gap={4} marginBlockEnd={3}>
				<Text textStyle="display.sm" color="primary">
					§{number}
				</Text>
				<Flex alignItems="center" gap={3}>
					<Icon size={22} color="#623153" strokeWidth={1.5} aria-hidden="true" />
					<Heading as="h3" textStyle="primary.md" color="onSurface">
						{title}
					</Heading>
				</Flex>
			</Flex>
			<Text
				as="p"
				textStyle="secondary.md"
				color="onSurfaceVariant"
				paddingInlineStart={{ base: 0, md: 20 }}
				maxWidth="640px"
			>
				{body}
			</Text>
		</Box>
	)
}
