'use client'

import { styled, VStack } from '@styled-system/jsx'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqs = [
	{
		q: 'Do I need to know how to code?',
		a: "No. You tell Meldar what bothers you, and it handles the rest. If you can code, great \u2014 you'll get even more out of it. But it's not required.",
	},
	{
		q: 'What does it actually cost?',
		a: 'The Discover tier is free. When you start using AI to build things, most people spend $5\u201320 a month. We add a 5% fee on top. You see exactly what you pay for on every invoice.',
	},
	{
		q: "What if it doesn't work?",
		a: "Then you haven't lost anything. The free tier costs nothing. If something breaks, we fix it. If you don't like it, delete your account. We'd rather be honest than keep someone who isn't happy.",
	},
	{
		q: 'I tried AI tools before and gave up. Why is this different?',
		a: 'Those tools dropped you into a blank screen and said "figure it out." Meldar connects to how you already work, finds the time-wasters you didn\'t even notice, and builds the fix. You don\'t have to know what to ask for.',
	},
	{
		q: 'What if I want to stop using Meldar?',
		a: 'Everything you built is yours. It runs on your computer. If you leave, your apps keep working. You just lose the suggestions and the setup help.',
	},
	{
		q: 'Can I talk to a real person?',
		a: "Yes. We're a small team and we read every message. If you get stuck, reply to any email from us or use the contact link. A human answers.",
	},
]

export function FaqSection() {
	const [openIndex, setOpenIndex] = useState<number | null>(null)

	return (
		<styled.section paddingBlock={32} paddingInline={8} bg="surface">
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={12}>
				<styled.h2 fontFamily="heading" fontSize="3xl" fontWeight="700" textAlign="center">
					Fair questions
				</styled.h2>

				<VStack gap={0} width="100%">
					{faqs.map((faq, i) => (
						<styled.div
							key={faq.q}
							borderBlockEnd="1px solid"
							borderColor="outlineVariant"
							width="100%"
						>
							<styled.button
								width="100%"
								display="flex"
								justifyContent="space-between"
								alignItems="center"
								gap={4}
								paddingBlock={5}
								paddingInline={0}
								bg="transparent"
								border="none"
								cursor="pointer"
								textAlign="left"
								_focusVisible={{
									outline: '2px solid',
									outlineColor: 'primary',
									outlineOffset: '-2px',
									borderRadius: 'sm',
								}}
								onClick={() => setOpenIndex(openIndex === i ? null : i)}
								aria-expanded={openIndex === i}
							>
								<styled.span fontFamily="heading" fontWeight="500" color="onSurface">
									{faq.q}
								</styled.span>
								<styled.span
									transition="transform 0.2s ease"
									transform={openIndex === i ? 'rotate(180deg)' : 'rotate(0)'}
									flexShrink={0}
								>
									<ChevronDown size={20} color="#4f434a" aria-hidden="true" />
								</styled.span>
							</styled.button>

							{openIndex === i && (
								<styled.div paddingBlockEnd={5}>
									<styled.p textStyle="body.base" color="onSurfaceVariant">
										{faq.a}
									</styled.p>
								</styled.div>
							)}
						</styled.div>
					))}
				</VStack>
			</VStack>
		</styled.section>
	)
}
