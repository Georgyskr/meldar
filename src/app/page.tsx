import { styled } from '@styled-system/jsx'
import { BUSINESS_INFO, SITE_CONFIG } from '@/shared/config'
import { JsonLd } from '@/shared/ui'
import {
	EarlyAdopterSection,
	FaqSection,
	FinalCtaSection,
	HeroSection,
	HowItWorksSection,
	ProblemSection,
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
	],
}

export default function HomePage() {
	return (
		<styled.main paddingBlockStart="72px">
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
			<ProblemSection />
			<HowItWorksSection />
			<TrustSection />
			<EarlyAdopterSection />
			<FaqSection />
			<FinalCtaSection />
		</styled.main>
	)
}
