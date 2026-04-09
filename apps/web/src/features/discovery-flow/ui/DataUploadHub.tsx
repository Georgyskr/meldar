'use client'

import { Box, Flex, styled, VStack } from '@styled-system/jsx'
import { useAtom } from 'jotai'
import type { LucideIcon } from 'lucide-react'
import {
	Battery,
	Brain,
	CalendarDays,
	Camera,
	HardDrive,
	Heart,
	Lock,
	MessageSquare,
	Search,
	Wallet,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { trackEvent } from '@/features/analytics'
import { Heading, Text } from '@/shared/ui'
import {
	DATA_TERMS_CHANGED_EVENT,
	getDataTermsAccepted,
	revokeDataTerms,
	setDataTermsAccepted,
} from '../lib/data-terms'
import { extractText, waitForOcr } from '../lib/ocr-client'
import { uploadStatusAtom } from '../model/atoms'
import { UploadCard, type UploadStatus } from './UploadCard'

type SourceConfig = {
	id: string
	title: string
	description: string
	timeEstimate: string
	accept: string
	icon: LucideIcon
}

type DataUploadHubProps = {
	ensureSession: () => Promise<string | null>
	onGenerateResults: () => void
	onSkip: () => void
}

const INSTANT_SOURCES: SourceConfig[] = [
	{
		id: 'screentime',
		title: 'Screen Time',
		description: '3 screenshots: Most Used, Pickups, Notifications',
		timeEstimate: '1 min',
		accept: 'image/jpeg,image/png,image/webp',
		icon: Camera,
	},
	{
		id: 'subscriptions',
		title: 'App Subscriptions',
		description: 'Your active subscriptions list',
		timeEstimate: '30 sec',
		accept: 'image/jpeg,image/png,image/webp',
		icon: Wallet,
	},
	{
		id: 'battery',
		title: 'Battery Usage',
		description: 'Which apps drain your battery',
		timeEstimate: '30 sec',
		accept: 'image/jpeg,image/png,image/webp',
		icon: Battery,
	},
	{
		id: 'storage',
		title: 'Storage',
		description: 'What takes up space on your phone',
		timeEstimate: '30 sec',
		accept: 'image/jpeg,image/png,image/webp',
		icon: HardDrive,
	},
	{
		id: 'calendar',
		title: 'Calendar',
		description: 'Your week at a glance',
		timeEstimate: '5 sec',
		accept: 'image/jpeg,image/png,image/webp',
		icon: CalendarDays,
	},
	{
		id: 'health',
		title: 'Health',
		description: 'Your health dashboard',
		timeEstimate: '5 sec',
		accept: 'image/jpeg,image/png,image/webp',
		icon: Heart,
	},
]

const DEEP_SOURCES: SourceConfig[] = [
	{
		id: 'chatgpt',
		title: 'ChatGPT History',
		description: 'Export takes hours, emailed to you',
		timeEstimate: '2 min + wait',
		accept: '.zip',
		icon: MessageSquare,
	},
	{
		id: 'claude',
		title: 'Claude History',
		description: 'Export takes hours',
		timeEstimate: '2 min + wait',
		accept: '.json',
		icon: Brain,
	},
	{
		id: 'google',
		title: 'Google Takeout',
		description: 'Export takes hours/days',
		timeEstimate: '5 min + wait',
		accept: '.zip',
		icon: Search,
	},
]

function ScreenTimeInstructions() {
	return (
		<VStack gap={4} alignItems="flex-start" width="100%">
			<VStack gap={1} alignItems="flex-start">
				<Text textStyle="tertiary.lg" color="onSurface">
					We need 3 screenshots
				</Text>
				<Text textStyle="secondary.sm" color="onSurfaceVariant">
					Go to Settings &rarr; Screen Time &rarr; See All Activity
				</Text>
			</VStack>
			<VStack gap={2} alignItems="flex-start" width="100%">
				<Text textStyle="secondary.sm" color="primary">
					1. &ldquo;Most Used&rdquo; &mdash; screenshot the app list with times
				</Text>
				<Text textStyle="secondary.sm" color="primary">
					2. &ldquo;Pickups&rdquo; &mdash; scroll down, screenshot the pickups section
				</Text>
				<Text textStyle="secondary.sm" color="primary">
					3. &ldquo;Notifications&rdquo; &mdash; scroll down more, screenshot notifications
				</Text>
			</VStack>
			<Text textStyle="secondary.sm" color="onSurfaceVariant/60">
				Android: Settings &rarr; Digital Wellbeing &rarr; Dashboard. Same 3 sections.
			</Text>
		</VStack>
	)
}

function SubscriptionsInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1. Settings &rarr; [your name] &rarr; Subscriptions
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				2. Screenshot the list
			</Text>
		</VStack>
	)
}

function BatteryInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1. Settings &rarr; Battery
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				2. Screenshot the app list
			</Text>
		</VStack>
	)
}

function StorageInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1. Settings &rarr; General &rarr; iPhone Storage
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				2. Screenshot the app list
			</Text>
		</VStack>
	)
}

function ChatGPTInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1.{' '}
				<styled.a
					href="https://chatgpt.com/#settings/DataControls"
					target="_blank"
					rel="noopener noreferrer"
					color="primary"
					textDecoration="underline"
					textDecorationColor="primary/30"
					_hover={{ textDecorationColor: 'primary' }}
				>
					Open ChatGPT Data Controls
				</styled.a>
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				2. Click &ldquo;Export data&rdquo;
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				3. Wait for the email (can take hours)
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				4. Download the .zip and upload it here
			</Text>
		</VStack>
	)
}

function ClaudeInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1.{' '}
				<styled.a
					href="https://claude.ai/settings/privacy"
					target="_blank"
					rel="noopener noreferrer"
					color="primary"
					textDecoration="underline"
					textDecorationColor="primary/30"
					_hover={{ textDecorationColor: 'primary' }}
				>
					Open Claude Privacy Settings
				</styled.a>
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				2. Click &ldquo;Export data&rdquo;
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				3. Wait for the download email (can take hours)
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				4. Upload the .json file here
			</Text>
		</VStack>
	)
}

function CalendarInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1. Open Calendar app &rarr; Week view
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				2. Screenshot
			</Text>
		</VStack>
	)
}

function HealthInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1. Open Health app (or Google Fit) &rarr; Summary
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				2. Screenshot
			</Text>
		</VStack>
	)
}

function GoogleInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				1.{' '}
				<styled.a
					href="https://takeout.google.com"
					target="_blank"
					rel="noopener noreferrer"
					color="primary"
					textDecoration="underline"
					textDecorationColor="primary/30"
					_hover={{ textDecorationColor: 'primary' }}
				>
					Go to Google Takeout
				</styled.a>
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				2. Select only: Search, YouTube, Chrome
			</Text>
			<Text textStyle="secondary.sm" color="onSurfaceVariant">
				3. Click &ldquo;Create export&rdquo; and wait (hours/days)
			</Text>
			<Text textStyle="secondary.sm" color="primary">
				4. Download the .zip and upload it here
			</Text>
		</VStack>
	)
}

const INSTRUCTION_MAP: Record<string, () => ReactNode> = {
	screentime: ScreenTimeInstructions,
	subscriptions: SubscriptionsInstructions,
	battery: BatteryInstructions,
	storage: StorageInstructions,
	calendar: CalendarInstructions,
	health: HealthInstructions,
	chatgpt: ChatGPTInstructions,
	claude: ClaudeInstructions,
	google: GoogleInstructions,
}

export function DataUploadHub({ ensureSession, onGenerateResults, onSkip }: DataUploadHubProps) {
	const [sources, setSources] = useAtom(uploadStatusAtom)
	const [optedIn, setOptedInState] = useState(false)
	const [adhdMode, setAdhdMode] = useState(false)

	useEffect(() => {
		setOptedInState(getDataTermsAccepted())
		const handle = (e: Event) => {
			if ((e as CustomEvent).detail === 'reopen') {
				revokeDataTerms()
				setOptedInState(false)
			} else {
				setOptedInState(getDataTermsAccepted())
			}
		}
		window.addEventListener(DATA_TERMS_CHANGED_EVENT, handle)
		return () => window.removeEventListener(DATA_TERMS_CHANGED_EVENT, handle)
	}, [])

	function acceptTerms() {
		setDataTermsAccepted(true)
		setOptedInState(true)
	}

	function getStatus(id: string): UploadStatus {
		return sources[id]?.status ?? 'idle'
	}

	function getError(id: string): string | undefined {
		return sources[id]?.errorMessage
	}

	function getUploadCount(id: string): number {
		return sources[id]?.uploadCount ?? 0
	}

	const SCREENTIME_MAX_FILES = 3

	const instantDoneCount = INSTANT_SOURCES.filter(
		(s) => getStatus(s.id) === 'done' || getUploadCount(s.id) > 0,
	).length
	const deepDoneCount = DEEP_SOURCES.filter((s) => getStatus(s.id) === 'done').length
	const totalDone = instantDoneCount + deepDoneCount
	const hasAnyUpload = totalDone > 0
	const isAnyActive = [...INSTANT_SOURCES, ...DEEP_SOURCES].some((s) => {
		const st = getStatus(s.id)
		return st === 'uploading' || st === 'processing'
	})

	const [trialLoading, setTrialLoading] = useState(false)

	async function handleStartTrial() {
		setTrialLoading(true)
		// Trial CTA points at the v3 Builder subscription (EUR 19/mo with 7-day
		// free trial). The retired `starter` slug is no longer accepted by
		// /api/billing/checkout.
		trackEvent({ name: 'checkout_initiated', product: 'builder' })
		try {
			const res = await fetch('/api/billing/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ product: 'builder' }),
			})
			const data = await res.json()
			if (data.url) {
				window.location.href = data.url
				return
			}
			setTrialLoading(false)
		} catch {
			setTrialLoading(false)
		}
	}

	const isImagePlatform = (id: string) =>
		INSTANT_SOURCES.some((s) => s.id === id) || id === 'adaptive'

	async function handleFile(platformId: string, file: File) {
		if (!optedIn) return
		trackEvent({ name: 'scan_started' })

		setSources((prev) => ({
			...prev,
			[platformId]: {
				...prev[platformId],
				status: 'uploading',
				uploadCount: prev[platformId]?.uploadCount ?? 0,
			},
		}))

		try {
			// Lazy session creation — first upload triggers Neon write
			const sid = await ensureSession()
			if (!sid) {
				setSources((prev) => ({
					...prev,
					[platformId]: {
						...prev[platformId],
						status: 'error',
						errorMessage: 'Could not create session. Try again.',
					},
				}))
				return
			}

			const formData = new FormData()
			formData.append('platform', platformId)
			formData.append('sessionId', sid)

			// For image screenshots: try client-side OCR first (cheaper + more private)
			let usedOcr = false
			if (isImagePlatform(platformId)) {
				const ocrReady = await waitForOcr()
				if (ocrReady) {
					const ocrText = await extractText(file)
					if (ocrText) {
						formData.append('ocrText', ocrText)
						usedOcr = true
					}
				}
			}

			// Fallback: send raw file (for ZIPs, or if OCR failed/not ready)
			if (!usedOcr) {
				formData.append('file', file)
			}

			setSources((prev) => ({
				...prev,
				[platformId]: { ...prev[platformId], status: 'processing' },
			}))

			const res = await fetch('/api/discovery/upload', {
				method: 'POST',
				body: formData,
			})

			if (!res.ok) {
				const data = await res.json()
				trackEvent({ name: 'scan_failed', reason: data.error?.message || 'upload_error' })
				setSources((prev) => ({
					...prev,
					[platformId]: {
						...prev[platformId],
						status: (prev[platformId]?.uploadCount ?? 0) > 0 ? 'done' : 'error',
						errorMessage: data.error?.message || 'Upload failed. Try again.',
					},
				}))
				return
			}

			const responseData = await res.json()
			trackEvent({ name: 'scan_completed' })
			setSources((prev) => {
				const existing = prev[platformId]?.preview
				const incoming = responseData.preview
				// Merge previews: keep the richest data from multiple uploads
				const merged =
					existing && incoming
						? {
								...existing,
								...incoming,
								// Keep the app list with more entries
								apps:
									Array.isArray(incoming.apps) &&
									incoming.apps.length > (Array.isArray(existing.apps) ? existing.apps.length : 0)
										? incoming.apps
										: existing.apps,
								// Keep pickups/notifications if either has them
								pickups: incoming.pickups ?? existing.pickups,
								totalScreenTimeMinutes:
									incoming.totalScreenTimeMinutes ?? existing.totalScreenTimeMinutes,
							}
						: (incoming ?? existing)
				return {
					...prev,
					[platformId]: {
						status: 'done',
						uploadCount: (prev[platformId]?.uploadCount ?? 0) + 1,
						errorMessage: undefined,
						preview: merged,
					},
				}
			})
		} catch {
			trackEvent({ name: 'scan_failed', reason: 'network_error' })
			setSources((prev) => ({
				...prev,
				[platformId]: {
					...prev[platformId],
					status: (prev[platformId]?.uploadCount ?? 0) > 0 ? 'done' : 'error',
					errorMessage: 'Connection failed. Try again.',
				},
			}))
		}
	}

	function handleExportStarted(platformId: string) {
		setSources((prev) => ({
			...prev,
			[platformId]: { status: 'waiting' },
		}))
	}

	function handleFileReady(platformId: string) {
		setSources((prev) => ({
			...prev,
			[platformId]: { status: 'idle' },
		}))
	}

	function renderSourceCard(source: SourceConfig, index: number, isDelayed: boolean) {
		const InstructionComponent = INSTRUCTION_MAP[source.id]
		const maxFiles = source.id === 'screentime' ? SCREENTIME_MAX_FILES : 1
		const uploadCount = getUploadCount(source.id)
		return (
			<Box
				key={source.id}
				style={{ animation: `staggerFadeIn 0.4s ease-out ${index * 0.1}s both` }}
				data-testid={`upload-card-${source.id}`}
			>
				<UploadCard
					title={source.title}
					description={source.description}
					timeEstimate={source.timeEstimate}
					accept={source.accept}
					icon={source.icon}
					status={getStatus(source.id)}
					errorMessage={getError(source.id)}
					onFile={(file) => handleFile(source.id, file)}
					instructions={InstructionComponent ? <InstructionComponent /> : null}
					isDelayed={isDelayed}
					onExportStarted={isDelayed ? () => handleExportStarted(source.id) : undefined}
					onFileReady={() => handleFileReady(source.id)}
					maxFiles={maxFiles}
					uploadCount={uploadCount}
					preview={sources[source.id]?.preview}
					disabled={!optedIn}
				/>
			</Box>
		)
	}

	return (
		<VStack gap={6} width="100%" style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}>
			{/* Header */}
			<VStack gap={2} textAlign="center">
				<Heading textStyle="primary.lg" color="onSurface">
					Add your data
				</Heading>
				<Text as="p" textStyle="secondary.xl" color="onSurfaceVariant/70">
					The more you add, the sharper your results
				</Text>
			</VStack>

			{/* Data terms: persisted to localStorage like cookie consent */}
			{!optedIn ? (
				<Box
					id="data-terms"
					width="100%"
					padding={6}
					borderRadius="16px"
					bg="surfaceContainerLowest"
					border="1.5px solid"
					borderColor="primary/20"
				>
					<VStack gap={4} alignItems="stretch">
						<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant">
							Your data will be processed by Meldar to generate personalized recommendations. Data
							is analyzed and deleted — never stored raw.{' '}
							<styled.a
								href="/privacy-policy"
								target="_blank"
								color="primary"
								textDecoration="underline"
								textDecorationColor="primary/30"
								_hover={{ textDecorationColor: 'primary' }}
								rel="noopener"
							>
								Privacy Policy
							</styled.a>{' '}
							&middot;{' '}
							<styled.a
								href="/terms"
								target="_blank"
								color="primary"
								textDecoration="underline"
								textDecorationColor="primary/30"
								_hover={{ textDecorationColor: 'primary' }}
								rel="noopener"
							>
								Terms
							</styled.a>
						</Text>
						<styled.button
							onClick={acceptTerms}
							paddingInline={5}
							paddingBlock={3}
							background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
							color="white"
							fontFamily="heading"
							fontWeight="700"
							fontSize="sm"
							borderRadius="md"
							border="none"
							cursor="pointer"
							transition="opacity 0.2s ease"
							_hover={{ opacity: 0.9 }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							I agree, let me upload
						</styled.button>
					</VStack>
				</Box>
			) : (
				<Flex justifyContent="space-between" alignItems="center" width="100%">
					<styled.button
						onClick={() => {
							revokeDataTerms()
							setOptedInState(false)
						}}
						display="flex"
						alignItems="center"
						gap={1.5}
						paddingInline={3}
						paddingBlock={1}
						fontSize="xs"
						fontWeight="500"
						color="onSurfaceVariant/50"
						bg="surfaceContainer/50"
						border="1px solid"
						borderColor="outlineVariant/15"
						borderRadius="full"
						cursor="pointer"
						transition="all 0.2s ease"
						_hover={{ color: 'onSurfaceVariant', borderColor: 'outlineVariant/30' }}
					>
						<Lock size={10} />
						Data terms accepted
					</styled.button>
					<styled.button
						onClick={() => setAdhdMode((v) => !v)}
						display="flex"
						alignItems="center"
						gap={1.5}
						paddingInline={3}
						paddingBlock={1}
						fontSize="xs"
						fontWeight="600"
						fontFamily="heading"
						color={adhdMode ? 'primary' : 'onSurfaceVariant/50'}
						bg={adhdMode ? 'primary/8' : 'surfaceContainer/50'}
						border="1px solid"
						borderColor={adhdMode ? 'primary/30' : 'outlineVariant/15'}
						borderRadius="full"
						cursor="pointer"
						transition="all 0.2s ease"
						_hover={{ borderColor: 'primary/40' }}
						aria-pressed={adhdMode}
					>
						<Brain size={12} />
						ADHD mode
					</styled.button>
				</Flex>
			)}

			<Flex gap={0} width="100%" flexDir={{ base: 'column', md: 'row' }} alignItems="stretch">
				{/* Section 1: Quick scans */}
				<VStack gap={4} flex={1}>
					<Flex gap={2} justifyContent="space-between" alignItems="center" width="100%">
						<VStack gap={0} alignItems="flex-start">
							<Heading textStyle="tertiary.lg" as="h3" color="onSurface">
								Quick scans
							</Heading>
							<Text textStyle="secondary.xs" color="onSurfaceVariant/50">
								Free &middot; screenshots you already have
							</Text>
						</VStack>
						<Text textStyle="secondary.xs" color="onSurfaceVariant/50">
							{instantDoneCount} of {INSTANT_SOURCES.length} done
						</Text>
					</Flex>

					{/* Progress dots */}
					<Flex gap={2} alignItems="center">
						{INSTANT_SOURCES.map((s) => (
							<Box
								key={s.id}
								width="10px"
								height="10px"
								borderRadius="full"
								bg={getStatus(s.id) === 'done' ? 'primary' : 'outlineVariant/20'}
								transition="all 0.3s ease"
							/>
						))}
					</Flex>

					<VStack gap={4} width="100%">
						{INSTANT_SOURCES.map((s, i) => renderSourceCard(s, i, false))}
					</VStack>
				</VStack>

				{/* Vertical divider — md+ only */}
				<Box
					display={{ base: 'none', md: 'block' }}
					width="1px"
					bg="outlineVariant/15"
					marginInline={6}
					flexShrink={0}
				/>

				{/* Section 2: Deep analysis */}
				<VStack gap={4} flex={1}>
					<Flex gap={2} justifyContent="space-between" alignItems="center" width="100%">
						<VStack gap={0} alignItems="flex-start">
							<Flex gap={2} alignItems="center">
								<Heading textStyle="tertiary.lg" as="h3" color="onSurface">
									Deep analysis
								</Heading>
								<Flex
									gap={1}
									alignItems="center"
									paddingInline={2}
									paddingBlock={0.5}
									borderRadius="md"
									bg="orange.100"
								>
									<Lock size={10} color="#d97706" />
									<Text textStyle="primary.xs" color="orange.700">
										EUR 9.99/mo
									</Text>
								</Flex>
							</Flex>
							<Text textStyle="secondary.xs" color="onSurfaceVariant/50">
								Requires async exports (hours/days)
							</Text>
						</VStack>
						<Text textStyle="secondary.xs" color="onSurfaceVariant/50">
							{deepDoneCount} of {DEEP_SOURCES.length} done
						</Text>
					</Flex>

					{/* Progress dots */}
					<Flex gap={2} alignItems="center">
						{DEEP_SOURCES.map((s) => (
							<Box
								key={s.id}
								width="10px"
								height="10px"
								borderRadius="full"
								bg={
									getStatus(s.id) === 'done'
										? 'primary'
										: getStatus(s.id) === 'waiting'
											? 'orange.400'
											: 'outlineVariant/20'
								}
								transition="all 0.3s ease"
							/>
						))}
					</Flex>

					{/* Start free trial CTA */}
					<styled.button
						onClick={handleStartTrial}
						disabled={trialLoading}
						display="flex"
						alignItems="center"
						justifyContent="center"
						gap={2}
						width="100%"
						paddingBlock={3}
						borderRadius="12px"
						border="1.5px solid"
						borderColor="primary/20"
						bg="primary/4"
						cursor="pointer"
						fontSize="sm"
						fontWeight="700"
						fontFamily="heading"
						color="primary"
						transition="all 0.2s ease"
						_hover={{ bg: 'primary/8', borderColor: 'primary/40' }}
						_disabled={{ opacity: 0.6, cursor: 'wait' }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
						data-testid="start-trial-button"
					>
						<Lock size={14} />
						{trialLoading ? 'Redirecting...' : 'Start free trial'}
					</styled.button>

					<VStack gap={4} width="100%">
						{DEEP_SOURCES.map((s, i) => renderSourceCard(s, i, true))}
					</VStack>
				</VStack>
			</Flex>

			{/* CTAs */}
			<VStack gap={3} width="100%" maxWidth="400px" marginInline="auto" paddingBlockStart={2}>
				<styled.button
					onClick={onGenerateResults}
					disabled={!hasAnyUpload || isAnyActive}
					width="100%"
					paddingBlock={3.5}
					paddingInline={6}
					borderRadius="14px"
					border="none"
					background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
					color="white"
					fontFamily="heading"
					fontWeight="700"
					fontSize="md"
					cursor="pointer"
					transition="all 0.2s ease"
					boxShadow={hasAnyUpload ? '0 4px 20px rgba(98, 49, 83, 0.25)' : 'none'}
					_hover={{ opacity: 0.9 }}
					_disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
					data-testid="generate-results-button"
				>
					Generate my results
				</styled.button>

				<styled.button
					onClick={onSkip}
					disabled={isAnyActive}
					width="100%"
					paddingBlock={2.5}
					bg="transparent"
					border="none"
					fontSize="sm"
					fontWeight="500"
					color="onSurfaceVariant/50"
					cursor="pointer"
					transition="color 0.15s ease"
					_hover={{ color: 'onSurface' }}
					_disabled={{ cursor: 'not-allowed' }}
					_focusVisible={{
						outline: '2px solid',
						outlineColor: 'primary',
						outlineOffset: '2px',
					}}
					data-testid="skip-button"
				>
					Skip — just use my quiz answers
				</styled.button>
			</VStack>
		</VStack>
	)
}
