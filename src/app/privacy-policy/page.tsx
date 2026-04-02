import { styled, VStack } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { BUSINESS_INFO, SITE_CONFIG } from '@/shared/config'
import { B, Li, P, Section, Ul } from '@/shared/ui/legal-primitives'

export const metadata: Metadata = {
	title: 'Privacy Policy \u2014 Meldar',
	description: 'How Meldar handles your data. GDPR-compliant privacy policy.',
	alternates: { canonical: `${SITE_CONFIG.url}/privacy-policy` },
}

const email = BUSINESS_INFO.email
const company = BUSINESS_INFO.legalName
const businessId = BUSINESS_INFO.businessId
const address = `${BUSINESS_INFO.address}, ${BUSINESS_INFO.postalCode} ${BUSINESS_INFO.city}, Finland`

export default function PrivacyPolicyPage() {
	return (
		<styled.main
			paddingBlockStart="120px"
			paddingBlockEnd={32}
			paddingInline={{ base: 5, md: 12 }}
			bg="surface"
		>
			<VStack maxWidth="breakpoint-md" marginInline="auto" gap={8} alignItems="flex-start">
				<styled.h1 fontFamily="heading" fontSize="4xl" fontWeight="700" color="primary">
					Privacy Policy
				</styled.h1>

				<styled.p fontSize="sm" color="onSurfaceVariant">
					Last updated: March 30, 2026
				</styled.p>

				<Section title="Who we are">
					<P>
						Meldar is a service operated by {company} (Business ID: {businessId}), registered in
						Finland at {address}. For any privacy-related questions, contact us at {email}.
					</P>
				</Section>

				<Section title="What data we collect">
					<P>We collect the following categories of data:</P>
					<Ul>
						<Li>
							<B>Account data:</B> Your email address when you sign up.
						</Li>
						<Li>
							<B>Self-reported data:</B> Answers to our quiz or chat questions about your daily
							routine.
						</Li>
						<Li>
							<B>Uploaded data:</B> Files you voluntarily upload, such as Screen Time screenshots or
							Google Takeout exports. These are processed in your browser and are not stored on our
							servers unless you explicitly choose to save results.
						</Li>
						<Li>
							<B>Usage data:</B> If you accept cookies, we collect anonymized analytics via Google
							Analytics 4 (page views, session duration, device type). No personal identifiers.
						</Li>
					</Ul>
				</Section>

				<Section title="What we do NOT collect">
					<Ul>
						<Li>We do not read your emails, messages, or files.</Li>
						<Li>We do not record your screen.</Li>
						<Li>We do not track your location.</Li>
						<Li>We do not sell, share, or trade your data with third parties for advertising.</Li>
					</Ul>
				</Section>

				<Section title="How we use your data">
					<Ul>
						<Li>To show you where your time goes (your Time X-Ray).</Li>
						<Li>To suggest automations tailored to your patterns.</Li>
						<Li>To send you the weekly automation tip and product updates (if subscribed).</Li>
						<Li>To improve the service based on anonymized, aggregated usage patterns.</Li>
					</Ul>
				</Section>

				<Section title="Cookies">
					<P>
						We use cookies only for analytics (Google Analytics 4). Analytics cookies are loaded
						ONLY after you explicitly accept them via our cookie banner. If you reject cookies, no
						tracking scripts are loaded and no cookies are set.
					</P>
					<P>
						You can change your cookie preferences at any time via the &ldquo;Cookie Settings&rdquo;
						link in the footer.
					</P>
					<P>Cookies we use when consent is given:</P>
					<Ul>
						<Li>
							<B>_ga:</B> Google Analytics identifier. Expires after 2 years.
						</Li>
						<Li>
							<B>_ga_5HB6Q8ZVB8:</B> Google Analytics session cookie. Expires after 2 years.
						</Li>
					</Ul>
					<P>
						Google Analytics is configured with ad_storage, ad_user_data, and ad_personalization set
						to &ldquo;denied&rdquo; at all times. We only use analytics to understand how visitors
						use the site, not for advertising.
					</P>
				</Section>

				<Section title="Data processing and storage">
					<P>
						Files you upload (screenshots, Takeout exports) are processed in your browser using
						client-side JavaScript. The raw file data does not leave your device. Only derived
						insights (e.g., &ldquo;you spend 3 hours/week in email&rdquo;) are sent to our server if
						you choose to save your report.
					</P>
					<P>
						Account and analytics data is stored in the European Union. We use GDPR-compliant
						infrastructure providers.
					</P>
				</Section>

				<Section title="Your rights under GDPR">
					<P>
						As a data subject under the EU General Data Protection Regulation, you have the right
						to:
					</P>
					<Ul>
						<Li>
							<B>Access:</B> Request a copy of all data we hold about you.
						</Li>
						<Li>
							<B>Rectification:</B> Correct any inaccurate data.
						</Li>
						<Li>
							<B>Erasure:</B> Request deletion of all your data. We will comply within 30 days.
						</Li>
						<Li>
							<B>Data portability:</B> Receive your data in a machine-readable format.
						</Li>
						<Li>
							<B>Restrict processing:</B> Limit how we use your data.
						</Li>
						<Li>
							<B>Object:</B> Object to processing based on legitimate interest.
						</Li>
						<Li>
							<B>Withdraw consent:</B> Withdraw cookie consent at any time via the footer link.
						</Li>
					</Ul>
					<P>To exercise any of these rights, email {email}. We will respond within 30 days.</P>
				</Section>

				<Section title="Legal basis for processing">
					<Ul>
						<Li>
							<B>Consent:</B> Analytics cookies (you can withdraw anytime).
						</Li>
						<Li>
							<B>Contract:</B> Processing needed to deliver the service you signed up for.
						</Li>
						<Li>
							<B>Legitimate interest:</B> Aggregated, anonymized analysis to improve the service.
						</Li>
					</Ul>
				</Section>

				<Section title="International data transfers">
					<P>
						Google Analytics may process data outside the EU. This is covered by Google&apos;s
						Standard Contractual Clauses and their EU-U.S. Data Privacy Framework certification.
					</P>
				</Section>

				<Section title="Data controller">
					<P>
						{company}
						<br />
						Business ID: {businessId}
						<br />
						{address}
						<br />
						Email: {email}
					</P>
				</Section>

				<Section title="Supervisory authority">
					<P>
						If you believe we have not handled your data correctly, you have the right to file a
						complaint with the Finnish Data Protection Authority (Tietosuojavaltuutetun toimisto) at
						tietosuoja.fi.
					</P>
				</Section>

				<Section title="Screenshot processing">
					<P>
						When you upload a Screen Time screenshot, it is processed in server memory for
						approximately 3-5 seconds, then permanently discarded. Your screenshot is never written
						to disk, database, or any file storage system. Only the extracted data (app names, usage
						times, categories) is retained.
					</P>
				</Section>

				<Section title="AI processing">
					<P>
						Meldar uses Anthropic&apos;s Claude AI to extract data from screenshots and generate
						insights. We send only the minimum data needed for processing. Anthropic does not retain
						your data or use it for model training under their commercial API terms.
					</P>
				</Section>

				<Section title="Payment processing">
					<P>
						Payments are processed by Stripe. We never see or store your credit card number.
						Transaction records are retained for 6 years as required by Finnish accounting law
						(Kirjanpitolaki 2:10).
					</P>
				</Section>

				<Section title="Third-party processors">
					<P>We use the following third-party processors to operate the service:</P>
					<Ul>
						<Li>
							<B>Stripe:</B> Payment processing (EU + US, Data Privacy Framework)
						</Li>
						<Li>
							<B>Anthropic:</B> AI screenshot analysis, in-transit only, not stored (US, SCCs/DPF)
						</Li>
						<Li>
							<B>Vercel:</B> Application hosting (EU + US)
						</Li>
						<Li>
							<B>Resend:</B> Email delivery (US, DPF)
						</Li>
						<Li>
							<B>Neon:</B> Database storage (EU, Frankfurt)
						</Li>
						<Li>
							<B>Upstash:</B> Rate limiting (EU, Frankfurt)
						</Li>
						<Li>
							<B>Google:</B> Analytics, anonymized, consent-gated (US, DPF)
						</Li>
					</Ul>
				</Section>

				<Section title="Data retention">
					<Ul>
						<Li>
							<B>Uploaded screenshots:</B> 0 seconds (in-memory only, deleted after processing)
						</Li>
						<Li>
							<B>X-Ray results:</B> Retained until you request deletion
						</Li>
						<Li>
							<B>Subscriber email addresses:</B> Until you unsubscribe or request deletion
						</Li>
						<Li>
							<B>Payment records:</B> 6 years (Finnish accounting law)
						</Li>
						<Li>
							<B>Analytics data:</B> Anonymized, retained per Google Analytics defaults
						</Li>
					</Ul>
				</Section>

				<Section title="Rate limiting and IP addresses">
					<P>
						To prevent abuse, we temporarily process your IP address for rate limiting purposes. IP
						addresses are stored in Upstash Redis (EU, Frankfurt) for a maximum of 1 hour and are
						not linked to your account or personal data. Legal basis: legitimate interest (Art.
						6(1)(f) GDPR).
					</P>
				</Section>

				<Section title="Changes to this policy">
					<P>
						We may update this policy from time to time. Changes will be posted on this page with an
						updated &ldquo;Last updated&rdquo; date. We will not reduce your rights under this
						policy without your explicit consent.
					</P>
				</Section>
			</VStack>
		</styled.main>
	)
}
