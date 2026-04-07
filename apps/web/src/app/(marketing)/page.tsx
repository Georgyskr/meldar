import { styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { FadeInWithTracking, TrackFaqOpen } from '@/features/analytics'
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

export const metadata: Metadata = {
	title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
	description: SITE_CONFIG.description,
	openGraph: {
		title: SITE_CONFIG.tagline,
		description: SITE_CONFIG.description,
		url: SITE_CONFIG.url,
		siteName: SITE_CONFIG.name,
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: SITE_CONFIG.tagline,
		description: SITE_CONFIG.description,
	},
	alternates: { canonical: SITE_CONFIG.url },
}

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
				text: 'The Digital Footprint Scan is free. The Build tier is EUR 79 one-time — a founder builds you a working app in 72 hours. The Bundle is EUR 9.99/month for ongoing access to the skills library and bundled APIs.',
			},
		},
		{
			'@type': 'Question',
			name: 'What if it does not work?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'The free tier costs nothing. If something breaks, we fix it. If you are unhappy, delete your account — no strings attached.',
			},
		},
		{
			'@type': 'Question',
			name: 'I tried AI tools before and gave up. Why is this different?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Those tools gave you a blank screen. Meldar connects to how you already work, finds the time-wasters you did not notice, and builds the fix.',
			},
		},
		{
			'@type': 'Question',
			name: 'What if I want to stop using Meldar?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Everything you built is yours. Your apps run on your computer. If you leave, they keep working.',
			},
		},
		{
			'@type': 'Question',
			name: 'Can I talk to a real person?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'Yes. Reply to any email. A human reads it.',
			},
		},
		{
			'@type': 'Question',
			name: 'What data do you actually need?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'A screenshot of your Screen Time. That is it for the free tier. For deeper analysis, you can optionally upload your Google Takeout or ChatGPT export.',
			},
		},
		{
			'@type': 'Question',
			name: 'Who built this?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'One person in Helsinki, using the same AI tools Meldar teaches you to use.',
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
		<styled.main id="main-content">
			<JsonLd
				data={{
					'@context': 'https://schema.org',
					'@type': 'Organization',
					name: SITE_CONFIG.name,
					legalName: BUSINESS_INFO.legalName,
					url: SITE_CONFIG.url,
					description: SITE_CONFIG.description,
					foundingDate: '2026',
					founder: {
						'@type': 'Person',
						name: 'Georgy Skryuchenkov',
						jobTitle: 'Founder',
					},
					address: {
						'@type': 'PostalAddress',
						streetAddress: BUSINESS_INFO.address,
						addressLocality: BUSINESS_INFO.city,
						postalCode: BUSINESS_INFO.postalCode,
						addressCountry: BUSINESS_INFO.country,
					},
					contactPoint: {
						'@type': 'ContactPoint',
						contactType: 'customer support',
						email: BUSINESS_INFO.email,
					},
				}}
			/>
			<JsonLd
				data={{
					'@context': 'https://schema.org',
					'@type': 'WebApplication',
					name: SITE_CONFIG.name,
					url: SITE_CONFIG.url,
					description: SITE_CONFIG.description,
					applicationCategory: 'ProductivityApplication',
					operatingSystem: 'Web',
					browserRequirements: 'Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.',
					offers: [
						{
							'@type': 'Offer',
							name: 'Digital Footprint Scan',
							price: '0',
							priceCurrency: 'EUR',
							description: 'Free screen time analysis. Upload a screenshot, get your real numbers.',
						},
						{
							'@type': 'Offer',
							name: 'Build',
							price: '79',
							priceCurrency: 'EUR',
							description: 'Founder builds you a working app in 72 hours. One-time payment.',
						},
						{
							'@type': 'Offer',
							name: 'Bundle',
							price: '9.99',
							priceCurrency: 'EUR',
							description: 'Monthly access to skills library and bundled third-party APIs.',
							priceSpecification: {
								'@type': 'UnitPriceSpecification',
								price: '9.99',
								priceCurrency: 'EUR',
								billingDuration: 'P1M',
							},
						},
					],
					author: {
						'@type': 'Organization',
						name: BUSINESS_INFO.legalName,
						url: SITE_CONFIG.url,
					},
				}}
			/>
			<JsonLd data={faqSchema} />
			<JsonLd
				data={{
					'@context': 'https://schema.org',
					'@type': 'HowTo',
					name: 'How to find and fix your biggest time wasters with Meldar',
					description:
						'Upload your screen time data, get an AI analysis, and receive a custom-built app that solves your problem.',
					totalTime: 'PT2M',
					step: [
						{
							'@type': 'HowToStep',
							position: 1,
							name: 'Upload your Screen Time screenshot',
							text: "Take a screenshot of your phone's Screen Time settings and upload it to Meldar. The image is processed in your browser and deleted immediately.",
						},
						{
							'@type': 'HowToStep',
							position: 2,
							name: 'See your real numbers',
							text: 'Meldar analyzes your screen time data using AI and shows you exactly where your time goes, which apps dominate, and what patterns emerge.',
						},
						{
							'@type': 'HowToStep',
							position: 3,
							name: 'Get a personal app built for you',
							text: 'Based on your analysis, Meldar recommends what to build. Order a Build (EUR 79) and a founder builds you a working app in 72 hours.',
						},
					],
				}}
			/>

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
			<FadeInWithTracking event={{ name: 'pricing_viewed' }}>
				<TiersSection />
			</FadeInWithTracking>
			<FadeInOnScroll>
				<EarlyAdopterSection />
			</FadeInOnScroll>
			<FadeInOnScroll>
				<TrackFaqOpen>
					<FaqSection />
				</TrackFaqOpen>
			</FadeInOnScroll>
			<FinalCtaSection />
		</styled.main>
	)
}
