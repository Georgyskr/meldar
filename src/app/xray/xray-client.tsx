'use client'

import { Box, styled, VStack } from '@styled-system/jsx'
import { useState } from 'react'
import type { XRayResponse } from '@/entities/xray-result/model/types'
import { XRayCard } from '@/entities/xray-result/ui/XRayCard'
import { XRayCardActions } from '@/entities/xray-result/ui/XRayCardActions'
import { RevealStagger, XRayCardReveal } from '@/entities/xray-result/ui/XRayCardReveal'
import { UpsellBlock } from '@/features/billing'
import { ResultEmailCapture, UploadZone } from '@/features/screenshot-upload'

type ResultData = XRayResponse & { id: string }

export function XRayPageClient() {
	const [result, setResult] = useState<ResultData | null>(null)
	const [showDeletionBanner, setShowDeletionBanner] = useState(false)

	function handleResult(data: ResultData) {
		setResult(data)
		setShowDeletionBanner(true)
		setTimeout(() => setShowDeletionBanner(false), 5000)
	}

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
						Your Time X-Ray
					</styled.h1>
					<styled.p textStyle="body.base" color="onSurfaceVariant" maxWidth="480px">
						Upload a Screen Time screenshot. We&apos;ll show you where your time actually goes.
					</styled.p>
				</VStack>

				{!result && <UploadZone onResult={handleResult} />}

				{result && (
					<VStack gap={6} width="100%">
						{/* Deletion confirmation */}
						{showDeletionBanner && (
							<Box
								width="100%"
								maxWidth="440px"
								marginInline="auto"
								paddingInline={4}
								paddingBlock={3}
								bg="green.50"
								borderRadius="lg"
								textAlign="center"
							>
								<styled.span textStyle="body.sm" color="green.700" fontWeight="500">
									&#10003; Screenshot deleted. Only the extracted data remains below.
								</styled.span>
							</Box>
						)}

						{/* X-Ray Card */}
						<XRayCardReveal>
							<XRayCard
								totalHours={Math.round((result.extraction.totalScreenTimeMinutes / 60) * 10) / 10}
								topApp={result.extraction.apps[0]?.name || 'Unknown'}
								apps={result.extraction.apps}
								pickups={result.extraction.pickups}
								insights={result.insights}
							/>
						</XRayCardReveal>

						{/* Share actions */}
						<RevealStagger delay={400}>
							<XRayCardActions xrayId={result.id} />
						</RevealStagger>

						{/* Additional insights */}
						{result.insights.length > 1 && (
							<RevealStagger delay={600}>
								<VStack gap={3} width="100%" maxWidth="440px" marginInline="auto">
									{result.insights.slice(1).map((insight) => (
										<Box
											key={insight.headline}
											width="100%"
											padding={4}
											borderRadius="lg"
											bg="surfaceContainerLowest"
											border="1px solid"
											borderColor="outlineVariant/10"
										>
											<styled.p textStyle="body.sm" fontWeight="500" color="onSurface">
												{insight.headline}
											</styled.p>
											<styled.p textStyle="body.sm" color="onSurfaceVariant" marginBlockStart={1}>
												{insight.comparison}
											</styled.p>
										</Box>
									))}
								</VStack>
							</RevealStagger>
						)}

						{/* Upsell */}
						<RevealStagger delay={800}>
							<UpsellBlock upsells={result.upsells} xrayId={result.id} />
						</RevealStagger>

						{/* Email capture */}
						<RevealStagger delay={1000}>
							<ResultEmailCapture xrayId={result.id} />
						</RevealStagger>

						{/* Try another */}
						<styled.button
							onClick={() => setResult(null)}
							paddingInline={6}
							paddingBlock={3}
							bg="transparent"
							border="1px solid"
							borderColor="outlineVariant"
							borderRadius="md"
							fontSize="sm"
							fontWeight="500"
							color="onSurfaceVariant"
							cursor="pointer"
							_hover={{ bg: 'surfaceContainer' }}
						>
							Upload another screenshot
						</styled.button>
					</VStack>
				)}
			</VStack>
		</styled.main>
	)
}
