import { styled, VStack } from '@styled-system/jsx'

const steps = [
	{
		num: '01',
		title: 'Take back your data',
		desc: 'We show you how to download what Google, Apple, and Meta know about you. Takes 3 minutes. It\u2019s your legal right. Most people have no idea what\u2019s in there.',
	},
	{
		num: '02',
		title: 'See your real numbers',
		desc: 'Drop the file in. It never leaves your device. You see which apps eat your hours, what you search repeatedly, where your week goes. The gap between what you think and what\u2019s real is the moment.',
	},
	{
		num: '03',
		title: 'Pick a fix. We build it.',
		desc: 'Your analysis ranks it: most wasted time first, with what to build to fix each one. Pick one. Build it yourself or we build it for you.',
	},
]

export function HowItWorksSection() {
	return (
		<styled.section id="how-it-works" paddingBlock={20} paddingInline={8} bg="surfaceContainerLow">
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={10}>
				<VStack gap={3} textAlign="center">
					<styled.h2 textStyle="heading.section" color="onSurface">
						How it actually works
					</styled.h2>
					<styled.p textStyle="body.lead" color="onSurfaceVariant" maxWidth="480px">
						No installs. No permissions. Just a file you already own.
					</styled.p>
				</VStack>

				{steps.map((step) => (
					<styled.div
						key={step.num}
						display="flex"
						flexDir={{ base: 'column', md: 'row' }}
						gap={6}
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
