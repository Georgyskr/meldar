import { Box, styled, VStack } from '@styled-system/jsx'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AppUsage } from '@/entities/xray-result/model/types'
import { XRayCard } from '@/entities/xray-result/ui/XRayCard'
import { XRayCardActions } from '@/entities/xray-result/ui/XRayCardActions'
import { getDb } from '@/server/db/client'
import { xrayResults } from '@/server/db/schema'
import { SITE_CONFIG } from '@/shared/config/seo'

type PageProps = {
	params: Promise<{ id: string }>
}

async function getXRay(id: string) {
	const db = getDb()
	const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
	return rows[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params
	const xray = await getXRay(id)
	if (!xray) return { title: 'Not Found' }

	return {
		title: `${xray.totalHours}h/day Screen Time | ${SITE_CONFIG.name}`,
		description: `${xray.topApp} is the top app at ${xray.totalHours} hours/day. Get your own Time X-Ray free.`,
		openGraph: {
			title: `${xray.totalHours}h/day — and ${xray.topApp} is the culprit`,
			description: `See your own screen time breakdown. Free, instant, private.`,
			url: `${SITE_CONFIG.url}/xray/${id}`,
			images: [`${SITE_CONFIG.url}/xray/${id}/og`],
		},
		twitter: {
			card: 'summary_large_image',
			title: `${xray.totalHours}h/day Screen Time`,
			description: `${xray.topApp} takes the crown. Get your own X-Ray.`,
			images: [`${SITE_CONFIG.url}/xray/${id}/og`],
		},
		alternates: { canonical: `${SITE_CONFIG.url}/xray/${id}` },
	}
}

export default async function XRayResultPage({ params }: PageProps) {
	const { id } = await params
	const xray = await getXRay(id)
	if (!xray) notFound()

	const apps = xray.apps as AppUsage[]
	const insights = [
		{
			headline: xray.insight,
			comparison: `${xray.topApp} is the top app`,
			suggestion: 'Want help fixing this?',
			severity: xray.totalHours > 6 ? ('high' as const) : ('medium' as const),
		},
	]

	return (
		<styled.main paddingBlock={16} paddingInline={6} minHeight="100dvh">
			<VStack gap={8} maxWidth="640px" marginInline="auto">
				<VStack gap={2} textAlign="center">
					<styled.h1
						fontFamily="heading"
						fontSize={{ base: '2xl', md: '3xl' }}
						fontWeight="800"
						color="onSurface"
						letterSpacing="-0.02em"
					>
						Time X-Ray
					</styled.h1>
				</VStack>

				<XRayCard
					totalHours={xray.totalHours}
					topApp={xray.topApp}
					apps={apps}
					pickups={xray.pickups}
					insights={insights}
				/>

				<XRayCardActions xrayId={id} />

				{/* CTA for viewers */}
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
							Get your own Time X-Ray
						</styled.p>
						<styled.p fontSize="sm" color="white/80">
							Free. Takes 30 seconds. Your screenshot is deleted immediately.
						</styled.p>
						<styled.a
							href="/xray"
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
						>
							Upload your screenshot
						</styled.a>
					</VStack>
				</Box>
			</VStack>
		</styled.main>
	)
}
