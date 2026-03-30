import { styled, VStack } from '@styled-system/jsx'

const steps = [
	{
		num: '01',
		title: 'Take back your data',
		desc: 'We show you exactly how to download what Google, Apple, and Meta already know about you. It takes 3 minutes. It\u2019s your legal right. Most people have no idea how much is in there.',
	},
	{
		num: '02',
		title: 'See your Time X-Ray',
		desc: 'Drop the file into Meldar. It never leaves your device. In seconds, you see your real numbers: which apps eat your hours, what you search for over and over, where your week actually goes. The gap between what you think and what\u2019s real is the aha moment.',
	},
	{
		num: '03',
		title: 'Pick a fix. We build it.',
		desc: 'Your X-Ray shows a ranked list: "This wastes the most time. Here\u2019s what we\u2019d build to fix it." Tap the one you want. Meldar builds your personal app. You approve it before it goes live. Done.',
	},
]

export function HowItWorksSection() {
	return (
		<styled.section id="how-it-works" paddingBlock={32} paddingInline={8} bg="surfaceContainerLow">
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={24}>
				<VStack gap={4} textAlign="center">
					<styled.h2 textStyle="heading.section" color="onSurface">
						How it actually works
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant" maxWidth="480px">
						No installs. No permissions. No trust required upfront. Just a file you already own.
					</styled.p>
				</VStack>

				{steps.map((step) => (
					<styled.div
						key={step.num}
						display="flex"
						flexDir={{ base: 'column', md: 'row' }}
						gap={12}
						alignItems="flex-start"
					>
						<styled.span
							fontFamily="heading"
							fontSize="5xl"
							fontWeight="800"
							color="primary/40"
							lineHeight={1}
							flexShrink={0}
						>
							{step.num}
						</styled.span>
						<VStack alignItems="flex-start" gap={4}>
							<styled.h3 fontFamily="heading" fontSize="2xl" fontWeight="700">
								{step.title}
							</styled.h3>
							<styled.p textStyle="body.base" color="onSurfaceVariant">
								{step.desc}
							</styled.p>
						</VStack>
					</styled.div>
				))}
			</VStack>
		</styled.section>
	)
}
