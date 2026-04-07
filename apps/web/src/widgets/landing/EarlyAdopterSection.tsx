import { Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { HandHelping, Mail, Users, Zap } from 'lucide-react'
import { FoundingCounter, FoundingEmailCapture } from '@/features/founding-program'

const perks = [
	{
		icon: HandHelping,
		title: '1-on-1 onboarding call (15 min, with the founder)',
		desc: 'Never touched AI? Perfect. We sit with you (virtually) and walk you through everything. Not a video tutorial you watch alone. Actual help, from a real person, until it works.',
	},
	{
		icon: Zap,
		title: 'Custom time audit report sent within 48 hours',
		desc: "Tell us what your week looks like. We send you a custom report: here's where your hours go, here's what to automate first, here's how.",
	},
	{
		icon: Mail,
		title: 'Weekly email: one automation you can set up in 10 minutes',
		desc: "Every week, one specific thing you can automate right now with free tools. Practical, not theoretical. You'll start saving time before Meldar even launches.",
	},
	{
		icon: Users,
		title: 'Vote on the next feature (founding members only)',
		desc: 'Vote on which features ship first. Your input decides what Meldar becomes. Early members keep this power forever.',
	},
]

export function EarlyAdopterSection() {
	return (
		<styled.section paddingBlock={20} paddingInline={8} bg="primary/6">
			<VStack maxWidth="breakpoint-xl" marginInline="auto" gap={8} alignItems="center">
				<VStack gap={3} textAlign="center" maxWidth="600px">
					<styled.span textStyle="label.upper" color="primary">
						Founding members
					</styled.span>
					<styled.h2 textStyle="heading.section" color="onSurface">
						We don&apos;t hand you a tool. We walk you in.
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant">
						The real barrier isn&apos;t the tech. Nobody shows you the door. We do.
					</styled.p>
				</VStack>

				<Grid columns={{ base: 1, md: 2 }} gap={4} width="100%">
					{perks.map((perk) => (
						<VStack
							key={perk.title}
							alignItems="flex-start"
							gap={3}
							padding={6}
							bg="surfaceContainerLowest"
							borderRadius="xl"
							border="1px solid"
							borderColor="outlineVariant/5"
						>
							<Flex
								alignItems="center"
								justifyContent="center"
								width="40px"
								height="40px"
								borderRadius="lg"
								bg="surfaceContainerHigh"
							>
								<perk.icon size={20} color="#623153" strokeWidth={1.5} aria-hidden="true" />
							</Flex>
							<styled.h3 fontFamily="heading" fontWeight="700">
								{perk.title}
							</styled.h3>
							<styled.p textStyle="body.sm" color="onSurfaceVariant">
								{perk.desc}
							</styled.p>
						</VStack>
					))}
				</Grid>

				<VStack alignItems="center" gap={4} paddingBlockStart={4}>
					<FoundingCounter />
					<FoundingEmailCapture />
				</VStack>
			</VStack>
		</styled.section>
	)
}
