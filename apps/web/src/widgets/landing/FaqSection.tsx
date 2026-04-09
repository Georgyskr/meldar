import { Box, Flex, styled } from '@styled-system/jsx'
import { EditorialEyebrow, Heading, Text } from '@/shared/ui'

const faqs = [
	{
		number: '01',
		q: 'Do I need to know how to code?',
		a: "No. You tell Meldar what bothers you, and it handles the rest. If you can code, you'll get more out of it. Not required.",
	},
	{
		number: '02',
		q: 'What does it actually cost?',
		a: "The Time X-Ray is completely free. If you want us to make your first app, it's a one-time EUR 79. After that, the Starter subscription is EUR 9.99 a month for access to our skills library and bundled AI tools. No hidden fees. Cancel anytime.",
	},
	{
		number: '03',
		q: "What if it doesn't work?",
		a: "Then you haven't lost anything. The free tier costs nothing. If something breaks, we fix it. If you don't like it, delete your account. We'd rather be honest than keep someone who isn't happy.",
	},
	{
		number: '04',
		q: 'I tried AI tools before and gave up. Why is this different?',
		a: 'Those tools gave you a blank screen and said "figure it out." Meldar connects to how you already work, finds the time-wasters you didn\'t even notice, and makes the fix. You don\'t have to know what to ask for.',
	},
	{
		number: '05',
		q: 'What if I want to stop using Meldar?',
		a: 'Everything you made is yours. It runs on your computer. If you leave, your apps keep working. You just lose the suggestions and the setup help.',
	},
	{
		number: '06',
		q: 'Can I talk to a real person?',
		a: 'Yes. Reply to any email. A human reads it.',
	},
	{
		number: '07',
		q: 'What data do you actually need?',
		a: "A screenshot of your Screen Time. That's it for the free tier. For deeper analysis, you can optionally upload your Google Takeout or ChatGPT export.",
	},
	{
		number: '08',
		q: 'Who made this?',
		a: "One person in Helsinki, using the same AI tools Meldar teaches you to use. That's kind of the whole point.",
	},
	{
		number: '09',
		q: 'Is this another AI chatbot?',
		a: 'No. Chatbots give advice. Meldar makes actual apps that run on your computer and do the work for you.',
	},
]

export function FaqSection() {
	return (
		<styled.section
			paddingBlock={{ base: 20, md: 28 }}
			paddingInline={{ base: 5, md: 12 }}
			bg="surface"
			position="relative"
			overflow="hidden"
		>
			<Box maxWidth="breakpoint-lg" marginInline="auto">
				<Box marginBlockEnd={{ base: 12, md: 16 }}>
					<EditorialEyebrow number="010" label="Fair questions" />
				</Box>

				<Flex
					justifyContent="space-between"
					alignItems="flex-start"
					flexDir={{ base: 'column', md: 'row' }}
					gap={{ base: 8, md: 16 }}
					marginBlockEnd={{ base: 12, md: 16 }}
				>
					<Heading as="h2" textStyle="primary.xl" color="onSurface">
						Fair questions,
						<br />
						<Text as="em" textStyle="italic.lg" color="primary">
							honest answers.
						</Text>
					</Heading>
					<Text as="p" textStyle="secondary.lg" color="onSurfaceVariant" maxWidth="380px">
						The nine things people ask most. Click any to expand.
					</Text>
				</Flex>

				<Box borderTop="2px solid" borderColor="onSurface">
					{faqs.map((faq) => (
						<FaqRow key={faq.number} {...faq} />
					))}
				</Box>
			</Box>
		</styled.section>
	)
}

function FaqRow({ number, q, a }: { number: string; q: string; a: string }) {
	return (
		<styled.details
			borderBottom="1px solid"
			borderColor="onSurface/20"
			width="100%"
			transition="all 0.3s ease"
			_hover={{ bg: 'primary/3' }}
			css={{
				'&[open] .faq-chevron': { transform: 'rotate(180deg)' },
				'&[open] .faq-content': {
					gridTemplateRows: '1fr',
					opacity: 1,
				},
				'&[open]': { bg: 'primary/4' },
			}}
		>
			<styled.summary
				display="grid"
				gridTemplateColumns={{ base: 'auto 1fr auto', md: '80px 1fr auto' }}
				alignItems="center"
				gap={{ base: 4, md: 6 }}
				paddingBlock={{ base: 5, md: 7 }}
				paddingInline={{ base: 0, md: 4 }}
				cursor="pointer"
				listStyle="none"
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '-2px',
				}}
				css={{ '&::-webkit-details-marker': { display: 'none' } }}
			>
				<Text textStyle="tertiary.md" color="primary">
					Nº {number}
				</Text>
				<Text textStyle="primary.sm" color="onSurface">
					{q}
				</Text>
				<Box className="faq-chevron" transition="transform 0.3s ease" flexShrink={0}>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#623153"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</Box>
			</styled.summary>

			<Box
				className="faq-content"
				display="grid"
				gridTemplateRows="0fr"
				opacity={0}
				transition="grid-template-rows 0.35s ease, opacity 0.35s ease"
			>
				<Box overflow="hidden">
					<Box
						paddingBlockEnd={{ base: 6, md: 7 }}
						paddingInlineStart={{ base: 12, md: 24 }}
						paddingInlineEnd={{ base: 8, md: 16 }}
					>
						<Text as="p" textStyle="secondary.md" color="onSurfaceVariant">
							{a}
						</Text>
					</Box>
				</Box>
			</Box>
		</styled.details>
	)
}
