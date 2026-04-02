import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { BUSINESS_INFO, SITE_CONFIG } from '@/shared/config'
import { Li, P, Section, Ul } from '@/shared/ui/legal-primitives'

export const metadata: Metadata = {
	title: 'Terms of Service \u2014 Meldar',
	description: 'Terms of service for using Meldar.',
	alternates: { canonical: `${SITE_CONFIG.url}/terms` },
}

const email = BUSINESS_INFO.email
const company = BUSINESS_INFO.legalName
const businessId = BUSINESS_INFO.businessId

export default function TermsPage() {
	return (
		<styled.main
			paddingBlockStart="120px"
			paddingBlockEnd={32}
			paddingInline={{ base: 5, md: 12 }}
			bg="surface"
		>
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={8} alignItems="flex-start">
				<styled.h1 fontFamily="heading" fontSize="4xl" fontWeight="700" color="primary">
					Terms of Service
				</styled.h1>

				<styled.p fontSize="sm" color="onSurfaceVariant">
					Last updated: March 30, 2026
				</styled.p>

				<Section title="Agreement">
					<P>
						By using Meldar (&ldquo;the Service&rdquo;), you agree to these terms. The Service is
						operated by {company} (Business ID: {businessId}), registered in Finland.
					</P>
				</Section>

				<Section title="The service">
					<P>
						Meldar helps you discover automation opportunities in your daily routine and builds
						personal apps to address them. We provide a free tier (Time X-Ray) and paid tiers for
						AI-powered app building.
					</P>
				</Section>

				<Section title="Your account">
					<P>
						You need a valid email address to use the Service. You are responsible for keeping your
						login credentials secure. You must be at least 16 years old.
					</P>
				</Section>

				<Section title="Your data">
					<P>
						Any data you upload (screenshots, files, quiz answers) remains yours. We process it to
						deliver the Service as described in our Privacy Policy. We do not claim ownership of
						your data or the apps we build for you.
					</P>
					<P>
						Apps built through Meldar are yours. You own the output. If you leave, your apps
						continue to work independently.
					</P>
				</Section>

				<Section title="Payments">
					<P>
						The Time X-Ray is free. Paid services (Personal Time Audit, App Build) are one-time
						payments processed by Stripe in EUR. Subscription plans are billed monthly. All prices
						include VAT. You can cancel subscriptions at any time.
					</P>
					<P>
						Under EU Consumer Rights Directive, you have 14 days to withdraw from a digital
						purchase. By purchasing, you agree that delivery begins immediately and acknowledge that
						the right of withdrawal is waived once the service is delivered.
					</P>
					<P>
						If we determine we cannot deliver an App Build for your use case, we will issue a full
						refund within 48 hours.
					</P>
				</Section>

				<Section title="AI processing">
					<P>
						Parts of the Service use artificial intelligence (Anthropic Claude) to analyze
						screenshots and generate insights. AI outputs may contain errors or inaccuracies. You
						should verify AI-generated recommendations before acting on them. We are not liable for
						decisions made based on AI output.
					</P>
				</Section>

				<Section title="File processing and retention">
					<P>
						Screenshots you upload are processed in server memory for approximately 3-5 seconds and
						are never stored. Only derived data (app names, usage times) is retained for 30 days to
						enable shareable X-Ray links. You can request deletion of your data at any time by
						emailing {email}.
					</P>
				</Section>

				<Section title="Beta / Early access">
					<P>
						Meldar is in early access. Features may change, be modified, or be removed. Founding
						member pricing will be honored regardless of feature changes. We do not guarantee any
						specific level of availability (no SLA).
					</P>
				</Section>

				<Section title="Acceptable use">
					<P>You agree not to:</P>
					<Ul>
						<Li>Use the Service for illegal purposes.</Li>
						<Li>Attempt to reverse-engineer, scrape, or overload the Service.</Li>
						<Li>Upload malicious files or content.</Li>
						<Li>Impersonate others or misrepresent your identity.</Li>
					</Ul>
				</Section>

				<Section title="Availability">
					<P>
						We aim for high availability but do not guarantee uninterrupted service. We may modify,
						suspend, or discontinue features with reasonable notice.
					</P>
				</Section>

				<Section title="Limitation of liability">
					<P>
						The Service is provided &ldquo;as is.&rdquo; To the maximum extent permitted by Finnish
						law, we are not liable for indirect, incidental, or consequential damages arising from
						your use of the Service.
					</P>
				</Section>

				<Section title="Governing law">
					<P>
						These terms are governed by the laws of Finland. Disputes will be resolved in the courts
						of Helsinki, Finland.
					</P>
				</Section>

				<Section title="Changes">
					<P>
						We may update these terms. Material changes will be communicated via email or an in-app
						notice at least 30 days before they take effect.
					</P>
				</Section>

				<Section title="Contact">
					<P>Questions about these terms? Email {email}.</P>
				</Section>
			</VStack>
		</styled.main>
	)
}
