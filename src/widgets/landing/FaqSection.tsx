import { styled, VStack } from '@styled-system/jsx'

const faqs = [
	{
		q: 'Do I need to know how to code?',
		a: "No. You tell Meldar what bothers you, and it handles the rest. If you can code, you'll get more out of it. Not required.",
	},
	{
		q: 'What does it actually cost?',
		a: "The Digital Footprint Scan is completely free. If you want us to build your first app, it's a one-time EUR 79. After that, the Bundle subscription is EUR 9.99 a month for access to our skills library and bundled AI tools. No hidden fees. Cancel anytime.",
	},
	{
		q: "What if it doesn't work?",
		a: "Then you haven't lost anything. The free tier costs nothing. If something breaks, we fix it. If you don't like it, delete your account. We'd rather be honest than keep someone who isn't happy.",
	},
	{
		q: 'I tried AI tools before and gave up. Why is this different?',
		a: 'Those tools gave you a blank screen and said "figure it out." Meldar connects to how you already work, finds the time-wasters you didn\'t even notice, and builds the fix. You don\'t have to know what to ask for.',
	},
	{
		q: 'What if I want to stop using Meldar?',
		a: 'Everything you built is yours. It runs on your computer. If you leave, your apps keep working. You just lose the suggestions and the setup help.',
	},
	{
		q: 'Can I talk to a real person?',
		a: 'Yes. Reply to any email. A human reads it.',
	},
	{
		q: 'What data do you actually need?',
		a: "A screenshot of your Screen Time. That's it for the free tier. For deeper analysis, you can optionally upload your Google Takeout or ChatGPT export.",
	},
	{
		q: 'Who built this?',
		a: "One person in Helsinki, using the same AI tools Meldar teaches you to use. That's kind of the whole point.",
	},
	{
		q: 'Is this another AI chatbot?',
		a: 'No. Chatbots give advice. Meldar builds actual apps that run on your computer and do the work for you.',
	},
]

export function FaqSection() {
	return (
		<styled.section paddingBlock={20} paddingInline={8} bg="surface">
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={12}>
				<styled.h2 fontFamily="heading" fontSize="3xl" fontWeight="700" textAlign="center">
					Fair questions
				</styled.h2>

				<VStack gap={0} width="100%">
					{faqs.map((faq) => (
						<styled.details
							key={faq.q}
							borderBlockEnd="1px solid"
							borderColor="outlineVariant"
							width="100%"
							css={{
								'&[open] .faq-chevron': { transform: 'rotate(180deg)' },
								'&[open] .faq-content': {
									gridTemplateRows: '1fr',
									opacity: 1,
								},
							}}
						>
							<styled.summary
								display="flex"
								justifyContent="space-between"
								alignItems="center"
								gap={4}
								paddingBlock={5}
								paddingInline={0}
								cursor="pointer"
								listStyle="none"
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '-2px',
									borderRadius: 'sm',
								}}
								css={{ '&::-webkit-details-marker': { display: 'none' } }}
							>
								<styled.span fontFamily="heading" fontWeight="500" color="onSurface">
									{faq.q}
								</styled.span>
								<styled.span
									className="faq-chevron"
									transition="transform 0.2s ease"
									flexShrink={0}
								>
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="#4f434a"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="m6 9 6 6 6-6" />
									</svg>
								</styled.span>
							</styled.summary>

							<styled.div
								className="faq-content"
								display="grid"
								gridTemplateRows="0fr"
								opacity={0}
								transition="grid-template-rows 0.3s ease, opacity 0.3s ease"
							>
								<styled.div overflow="hidden">
									<styled.p textStyle="body.base" color="onSurfaceVariant" paddingBlockEnd={5}>
										{faq.a}
									</styled.p>
								</styled.div>
							</styled.div>
						</styled.details>
					))}
				</VStack>
			</VStack>
		</styled.section>
	)
}
