import { Box, styled, VStack } from '@styled-system/jsx'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LockedRecommendationCard } from '@/features/discovery-flow'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'
import type { DiscoveryAnalysis } from '@/server/discovery/parsers/types'
import { SITE_CONFIG } from '@/shared/config/seo'

type PageProps = {
	params: Promise<{ id: string }>
}

async function getSession(id: string) {
	const db = getDb()
	const rows = await db
		.select()
		.from(discoverySessions)
		.where(eq(discoverySessions.id, id))
		.limit(1)
	return rows[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params
	const session = await getSession(id)
	if (!session) return { title: 'Not Found' }

	const analysis = session.analysis as DiscoveryAnalysis | null
	const description = analysis
		? `Meldar analyzed my data and found the perfect app to build: ${analysis.recommendedApp.name}. Try it free.`
		: 'Meldar is analyzing my data to find the perfect app to build. Try it free.'

	return {
		title: `Meldar found my #1 app to build | ${SITE_CONFIG.name}`,
		description,
		openGraph: {
			title: 'Meldar found my #1 app to build',
			description,
			url: `${SITE_CONFIG.url}/start/${id}`,
			images: [`${SITE_CONFIG.url}/start/${id}/og`],
		},
		twitter: {
			card: 'summary_large_image',
			title: 'Meldar found my #1 app to build',
			description,
			images: [`${SITE_CONFIG.url}/start/${id}/og`],
		},
		alternates: { canonical: `${SITE_CONFIG.url}/start/${id}` },
	}
}

export default async function SharedResultPage({ params }: PageProps) {
	const { id } = await params
	const session = await getSession(id)
	if (!session) notFound()

	const analysis = session.analysis as DiscoveryAnalysis | null

	if (!analysis) {
		return (
			<styled.main paddingBlock={24} paddingInline={6} minHeight="100dvh">
				<VStack gap={6} maxWidth="440px" marginInline="auto" textAlign="center">
					<styled.span fontSize="4xl">&#9881;</styled.span>
					<styled.h1
						fontFamily="heading"
						fontSize="2xl"
						fontWeight="800"
						color="onSurface"
						letterSpacing="-0.02em"
					>
						This analysis is still in progress
					</styled.h1>
					<styled.p textStyle="body.base" color="onSurfaceVariant" lineHeight="1.7">
						The results aren&apos;t ready yet. Check back in a few minutes.
					</styled.p>
					<styled.a
						href="/start"
						paddingInline={6}
						paddingBlock={3}
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						borderRadius="md"
						fontFamily="heading"
						fontWeight="700"
						fontSize="sm"
						textDecoration="none"
						transition="opacity 0.2s ease"
						_hover={{ opacity: 0.9 }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
					>
						Start your own analysis
					</styled.a>
				</VStack>
			</styled.main>
		)
	}

	const allApps = [
		analysis.recommendedApp,
		...(analysis.additionalApps || []).slice(0, 2).map((a) => ({
			...a,
			complexity: undefined as 'beginner' | 'intermediate' | undefined,
			estimatedBuildTime: undefined as string | undefined,
		})),
	]

	return (
		<styled.main paddingBlock={16} paddingInline={6} minHeight="100dvh">
			<VStack gap={10} maxWidth="640px" marginInline="auto">
				{/* Header */}
				<VStack gap={2} textAlign="center">
					<styled.h1 textStyle="heading.section" color="onSurface">
						Meldar found my #1 app to build
					</styled.h1>
					<styled.p textStyle="body.lead" color="onSurfaceVariant">
						Based on {analysis.dataProfile.totalSourcesAnalyzed} data source
						{analysis.dataProfile.totalSourcesAnalyzed !== 1 ? 's' : ''} analyzed
					</styled.p>
				</VStack>

				{/* App recommendations */}
				<VStack gap={4} width="100%">
					<styled.h3 textStyle="label.upper" color="onSurfaceVariant/60">
						App recommendations
					</styled.h3>

					{allApps.map((app, i) => {
						const position = i === 0 ? 'first' : i === 1 ? 'second' : 'third'
						return (
							<LockedRecommendationCard
								key={`${position}-${app.name}`}
								app={app}
								position={position}
								index={i}
							/>
						)
					})}
				</VStack>

				{/* Key insights */}
				{analysis.keyInsights.length > 0 && (
					<VStack gap={4} width="100%">
						<styled.h3 textStyle="label.upper" color="onSurfaceVariant/60">
							Key insights
						</styled.h3>
						<VStack gap={3} width="100%">
							{analysis.keyInsights.slice(0, 3).map((insight) => (
								<Box
									key={insight.headline}
									width="100%"
									padding={4}
									borderRadius="12px"
									border="1px solid"
									borderColor="outlineVariant/15"
									bg="surfaceContainerLowest"
								>
									<VStack gap={1} alignItems="flex-start">
										<styled.span
											fontFamily="heading"
											fontWeight="700"
											fontSize="sm"
											color="onSurface"
										>
											{insight.headline}
										</styled.span>
										<styled.span textStyle="body.sm" color="onSurfaceVariant">
											{insight.detail}
										</styled.span>
									</VStack>
								</Box>
							))}
						</VStack>
					</VStack>
				)}

				{/* CTA */}
				<Box
					width="100%"
					maxWidth="440px"
					marginInline="auto"
					padding={6}
					borderRadius="xl"
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					textAlign="center"
				>
					<VStack gap={3}>
						<styled.p fontFamily="heading" fontWeight="700" fontSize="lg" color="white">
							Get your own analysis — free
						</styled.p>
						<styled.p fontSize="sm" color="white/80">
							See what app Meldar would build for you. Takes 2 minutes.
						</styled.p>
						<styled.a
							href="/start"
							paddingInline={6}
							paddingBlock={3}
							bg="white"
							color="#623153"
							borderRadius="md"
							fontFamily="heading"
							fontWeight="700"
							fontSize="sm"
							textDecoration="none"
							_hover={{ opacity: 0.9 }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							Start my analysis
						</styled.a>
					</VStack>
				</Box>
			</VStack>
		</styled.main>
	)
}
