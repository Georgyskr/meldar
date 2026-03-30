'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
import { Castle, DoorOpen, Sparkles } from 'lucide-react'
import { useState } from 'react'

const stages = [
	{
		icon: DoorOpen,
		label: 'Stage I',
		title: 'The Invitation',
		desc: 'Step into AI without touching a single line of code. We walk you in, hand by hand.',
		whisper: '"I\u2019m not a dev"',
		whisperColor: '#ba1a1a',
	},
	{
		icon: Sparkles,
		label: 'Stage II',
		title: 'The Discovery',
		desc: 'Uncover the time-wasters hiding in your daily routine. See what\u2019s worth building.',
		whisper: 'Eliminate manual toil',
		whisperColor: '#623153',
	},
	{
		icon: Castle,
		label: 'Stage III',
		title: 'The Foundation',
		desc: 'Your personal app, built to last. Stable, upgradable, and truly yours.',
		whisper: 'Scales with you',
		whisperColor: '#623153',
	},
]

export function HeroSection() {
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!email) return
		setStatus('loading')
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			})
			if (!res.ok) throw new Error()
			setStatus('done')
		} catch {
			setStatus('done')
		}
	}

	return (
		<styled.section
			minHeight="calc(100vh - 72px)"
			display="flex"
			flexDir="column"
			maxWidth="breakpoint-xl"
			marginInline="auto"
			width="100%"
			paddingInline={{ base: 5, md: 12 }}
			paddingBlockStart={8}
			paddingBlockEnd={12}
		>
			{/* Headline — top left, commanding */}
			<Box marginBlockEnd={12} maxWidth="640px">
				<styled.h1
					fontFamily="heading"
					fontSize={{ base: '4xl', lg: '6xl' }}
					fontWeight="700"
					color="primary"
					letterSpacing="-0.04em"
					lineHeight="0.95"
					marginBlockEnd={4}
				>
					You don&apos;t need to <styled.br />
					become technical.
				</styled.h1>
				<styled.p fontFamily="body" fontWeight="300" fontSize="xl" color="onSurfaceVariant">
					You need{' '}
					<styled.span color="primary" fontWeight="500">
						Meldar
					</styled.span>
					.
				</styled.p>
			</Box>

			{/* Bottom area — cards + CTA, pushed to bottom */}
			<Flex flex={1} flexDir="column" justifyContent="flex-end" gap={12}>
				{/* 3-column architectural grid */}
				<Grid
					columns={{ base: 1, md: 3 }}
					gap="1px"
					bg="outlineVariant/10"
					borderRadius="xl"
					overflow="hidden"
					border="1px solid"
					borderColor="outlineVariant/20"
					boxShadow="sm"
				>
					{stages.map((stage, i) => (
						<styled.div
							key={stage.label}
							bg="surfaceContainerLowest"
							padding={8}
							display="flex"
							flexDir="column"
							transition="background 0.5s ease"
							_hover={{ bg: 'surface' }}
							borderInline={{ md: i === 1 ? '1px solid' : 'none' }}
							borderColor="outlineVariant/10"
							className="group"
						>
							<VStack alignItems="flex-start" gap={3} marginBlockEnd={8}>
								<styled.span
									display="inline-block"
									paddingInline={2}
									paddingBlock={1}
									bg="surfaceContainerLow"
									fontSize="2xs"
									fontWeight="500"
									letterSpacing="0.2em"
									textTransform="uppercase"
									color="secondary"
									borderRadius="sm"
								>
									{stage.label}
								</styled.span>
								<styled.h3 fontFamily="heading" fontSize="2xl" color="primary">
									{stage.title}
								</styled.h3>
								<styled.p
									fontSize="sm"
									fontWeight="300"
									color="onSurfaceVariant"
									lineHeight="relaxed"
									maxWidth="240px"
								>
									{stage.desc}
								</styled.p>
							</VStack>

							<Flex marginBlockStart="auto" alignItems="center" justifyContent="space-between">
								<stage.icon
									size={32}
									color="#623153"
									strokeWidth={1}
									opacity={0.4}
									aria-hidden="true"
								/>
								<styled.span
									fontSize="2xs"
									fontWeight="500"
									fontStyle="italic"
									color={stage.whisperColor}
									opacity={0}
									transition="opacity 0.3s ease"
									_groupHover={{ opacity: 0.6 }}
								>
									{stage.whisper}
								</styled.span>
							</Flex>
						</styled.div>
					))}
				</Grid>

				{/* Email capture — centered, integrated */}
				<Flex flexDir="column" alignItems="center" id="early-access">
					{status === 'done' ? (
						<styled.p fontWeight="500" color="primary">
							&#10003; You&apos;re in. Check your email.
						</styled.p>
					) : (
						<styled.form onSubmit={handleSubmit} width="100%" maxWidth="440px">
							<Flex
								alignItems="center"
								padding={1}
								bg="white"
								border="1px solid"
								borderColor="outlineVariant/30"
								borderRadius="lg"
								boxShadow="sm"
								transition="box-shadow 0.2s ease"
								_focusWithin={{ boxShadow: '0 0 0 1px rgba(98,49,83,0.2)' }}
							>
								<styled.input
									type="email"
									required
									aria-label="Your email"
									placeholder="you@email.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									flex={1}
									bg="transparent"
									border="none"
									outline="none"
									fontSize="sm"
									fontWeight="300"
									paddingInline={4}
									paddingBlock={3}
									color="onSurface"
									_placeholder={{ color: 'outline' }}
								/>
								<styled.button
									type="submit"
									disabled={status === 'loading'}
									background="linear-gradient(135deg, #623153 0%, #ffb876 100%)"
									color="white"
									paddingInline={6}
									paddingBlock="10px"
									borderRadius="md"
									fontWeight="500"
									fontSize="xs"
									textTransform="uppercase"
									letterSpacing="widest"
									border="none"
									cursor="pointer"
									transition="opacity 0.2s ease"
									_hover={{ opacity: 0.95 }}
									_disabled={{ opacity: 0.7 }}
									whiteSpace="nowrap"
								>
									{status === 'loading' ? '...' : 'Time Audit'}
								</styled.button>
							</Flex>

							<Flex marginBlockStart={4} alignItems="center" justifyContent="center" gap={3}>
								<styled.div height="1px" width={8} bg="outlineVariant/30" />
								<styled.p
									fontSize="3xs"
									color="outline"
									textTransform="uppercase"
									letterSpacing="0.25em"
									fontWeight="500"
								>
									Free forever &middot; No credit card
								</styled.p>
								<styled.div height="1px" width={8} bg="outlineVariant/30" />
							</Flex>
						</styled.form>
					)}
				</Flex>
			</Flex>
		</styled.section>
	)
}
