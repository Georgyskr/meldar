import { styled } from '@styled-system/jsx'
import { BUSINESS_INFO, SITE_CONFIG } from '@/shared/config'
import { FadeInOnScroll, JsonLd } from '@/shared/ui'
import {
	ComparisonSection,
	DataReceiptSection,
	EarlyAdopterSection,
	FaqSection,
	FinalCtaSection,
	HeroSection,
	HowItWorksSection,
	ProblemSection,
	SkillCardsSection,
	TiersSection,
	TrustSection,
} from '@/widgets/landing'

const faqSchema = {
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: [
		{
			'@type': 'Question',
			name: 'Do I need to know how to code to use Meldar?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'No. You tell Meldar what bothers you, and it handles the rest. No coding required.',
			},
		},
		{
			'@type': 'Question',
			name: 'What does Meldar cost?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'The analysis is free. When you use AI to build things, most people spend $5-20 a month with a small convenience fee.',
			},
		},
		{
			'@type': 'Question',
			name: 'Is my data safe with Meldar?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Your data is parsed in your browser and never leaves your device. We only see the patterns, not the raw data.',
			},
		},
		{
			'@type': 'Question',
			name: 'Can I talk to a real person at Meldar?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Yes. We are a small team and read every message. A human answers.',
			},
		},
		{
			'@type': 'Question',
			name: 'What data do you actually need?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: "A screenshot of your Screen Time. That's it for the free tier. For deeper analysis, you can optionally upload your Google Takeout or ChatGPT export.",
			},
		},
		{
			'@type': 'Question',
			name: 'Who built this?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: "One person in Helsinki, using the same AI tools Meldar teaches you to use. That's kind of the whole point.",
			},
		},
		{
			'@type': 'Question',
			name: 'Is this another AI chatbot?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'No. Chatbots give advice. Meldar builds actual apps that run on your computer and do the work for you.',
			},
		},
	],
}

export default function HomePage() {
	return (
		<styled.main id="main-content" paddingBlockStart="72px">
			<JsonLd
				data={{
					'@context': 'https://schema.org',
					'@type': 'SoftwareApplication',
					name: SITE_CONFIG.name,
					description: SITE_CONFIG.description,
					applicationCategory: 'LifestyleApplication',
					operatingSystem: 'macOS, Windows, Linux, iOS, Android',
					offers: {
						'@type': 'Offer',
						price: '0',
						priceCurrency: 'USD',
						description: 'Free analysis. Pay only for what you use.',
					},
					author: {
						'@type': 'Organization',
						name: BUSINESS_INFO.legalName,
						url: SITE_CONFIG.url,
					},
				}}
			/>
			<JsonLd data={faqSchema} />

			<HeroSection />
			<FadeInOnScroll>
				<ProblemSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<ComparisonSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<HowItWorksSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<DataReceiptSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<SkillCardsSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<TrustSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<TiersSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<EarlyAdopterSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<FaqSection />
			</FadeInOnScroll>
			<FinalCtaSection />
		</styled.main>
	)
}
