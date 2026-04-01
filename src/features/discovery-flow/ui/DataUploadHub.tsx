'use client'

import { Box, Flex, Grid, styled, VStack } from '@styled-system/jsx'
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
import { type ReactNode, useState } from 'react'
import { trackEvent } from '@/features/analytics'
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

/* ─── Instruction components ─── */

function ScreenTimeInstructions() {
	return (
		<VStack gap={4} alignItems="flex-start" width="100%">
			<VStack gap={1} alignItems="flex-start">
				<styled.span
					fontSize="xs"
					fontWeight="700"
					fontFamily="heading"
					color="onSurface"
					textTransform="uppercase"
					letterSpacing="0.05em"
				>
					We need 3 screenshots
				</styled.span>
				<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
					Go to Settings &rarr; Screen Time &rarr; See All Activity
				</styled.span>
			</VStack>
			<VStack gap={2} alignItems="flex-start" width="100%">
				<styled.span textStyle="body.sm" color="primary" fontWeight="600" lineHeight="1.5">
					1. &ldquo;Most Used&rdquo; &mdash; screenshot the app list with times
				</styled.span>
				<styled.span textStyle="body.sm" color="primary" fontWeight="600" lineHeight="1.5">
					2. &ldquo;Pickups&rdquo; &mdash; scroll down, screenshot the pickups section
				</styled.span>
				<styled.span textStyle="body.sm" color="primary" fontWeight="600" lineHeight="1.5">
					3. &ldquo;Notifications&rdquo; &mdash; scroll down more, screenshot notifications
				</styled.span>
			</VStack>
			<styled.span textStyle="body.sm" color="onSurfaceVariant/60" lineHeight="1.5">
				Android: Settings &rarr; Digital Wellbeing &rarr; Dashboard. Same 3 sections.
			</styled.span>
		</VStack>
	)
}

function SubscriptionsInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Settings &rarr; [your name] &rarr; Subscriptions
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				2. Screenshot the list
			</styled.span>
		</VStack>
	)
}

function BatteryInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Settings &rarr; Battery
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				2. Screenshot the app list
			</styled.span>
		</VStack>
	)
}

function StorageInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Settings &rarr; General &rarr; iPhone Storage
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				2. Screenshot the app list
			</styled.span>
		</VStack>
	)
}

function ChatGPTInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
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
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				2. Click &ldquo;Export data&rdquo;
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				3. Wait for the email (can take hours)
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				4. Download the .zip and upload it here
			</styled.span>
		</VStack>
	)
}

function ClaudeInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
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
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				2. Click &ldquo;Export data&rdquo;
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				3. Wait for the download email (can take hours)
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				4. Upload the .json file here
			</styled.span>
		</VStack>
	)
}

function CalendarInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Open Calendar app &rarr; Week view
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				2. Screenshot
			</styled.span>
		</VStack>
	)
}

function HealthInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				1. Open Health app (or Google Fit) &rarr; Summary
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				2. Screenshot
			</styled.span>
		</VStack>
	)
}

function GoogleInstructions() {
	return (
		<VStack gap={1} alignItems="flex-start">
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
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
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				2. Select only: Search, YouTube, Chrome
			</styled.span>
			<styled.span textStyle="body.sm" color="onSurfaceVariant" lineHeight="1.5">
				3. Click &ldquo;Create export&rdquo; and wait (hours/days)
			</styled.span>
			<styled.span textStyle="body.sm" color="primary" fontWeight="500" lineHeight="1.5">
				4. Download the .zip and upload it here
			</styled.span>
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

/* ─── Main component ─── */

export function DataUploadHub({ ensureSession, onGenerateResults, onSkip }: DataUploadHubProps) {
	const [sources, setSources] = useAtom(uploadStatusAtom)
	const [optedIn, setOptedIn] = useState(false)

	function getStatus(id: string): UploadStatus {
		return sources[id]?.status ?? 'idle'
	}

	function getError(id: string): string | undefined {
		return sources[id]?.errorMessage
	}

	function getUploadCount(id: string): number {
		return sources[id]?.uploadCount ?? 0
	}

	const SCREENTIME_MAX_FILES = 4

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
		trackEvent({ name: 'checkout_initiated', product: 'starter' })
		try {
			const res = await fetch('/api/billing/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ product: 'starter' }),
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

		const prevCount = sources[platformId]?.uploadCount ?? 0
		setSources((prev) => ({
			...prev,
			[platformId]: { ...prev[platformId], status: 'uploading', uploadCount: prevCount },
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
				setSources((prev) => ({
					...prev,
					[platformId]: {
						...prev[platformId],
						status: prevCount > 0 ? 'done' : 'error',
						errorMessage: data.error?.message || 'Upload failed. Try again.',
					},
				}))
				return
			}

			const responseData = await res.json()
			const newCount = prevCount + 1
			setSources((prev) => ({
				...prev,
				[platformId]: {
					status: 'done',
					uploadCount: newCount,
					errorMessage: undefined,
					preview: responseData.preview ?? prev[platformId]?.preview,
				},
			}))
		} catch {
			setSources((prev) => ({
				...prev,
				[platformId]: {
					...prev[platformId],
					status: prevCount > 0 ? 'done' : 'error',
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
				/>
			</Box>
		)
	}

	return (
		<VStack
			gap={6}
			width="100%"
			maxWidth="640px"
			marginInline="auto"
			style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}
		>
			{/* Header */}
			<VStack gap={2} textAlign="center">
				<styled.h2 textStyle="heading.section" color="onSurface">
					Add your data
				</styled.h2>
				<styled.p textStyle="body.lead" color="onSurfaceVariant/70">
					The more you add, the sharper your results
				</styled.p>
			</VStack>

			{/* Opt-in: data doesn't leave device until user agrees */}
			{!optedIn && (
				<Box
					width="100%"
					padding={5}
					borderRadius="16px"
					bg="surfaceContainerLowest"
					border="1.5px solid"
					borderColor="primary/15"
				>
					<Flex gap={3} alignItems="flex-start">
						<styled.input
							id="data-opt-in"
							type="checkbox"
							checked={optedIn}
							onChange={(e) => setOptedIn(e.target.checked)}
							width="20px"
							height="20px"
							flexShrink={0}
							marginBlockStart="2px"
							cursor="pointer"
							accentColor="#623153"
						/>
						<styled.label
							htmlFor="data-opt-in"
							textStyle="body.sm"
							color="onSurfaceVariant"
							lineHeight="1.5"
							cursor="pointer"
						>
							I agree that my uploaded data will be processed by Meldar to generate personalized
							recommendations. Data is analyzed and deleted — never stored raw.{' '}
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
								Terms of Service
							</styled.a>
						</styled.label>
					</Flex>
				</Box>
			)}

			{/* Section 1: Quick scans */}
			<VStack gap={4} width="100%">
				<Flex gap={2} justifyContent="space-between" alignItems="center" width="100%">
					<VStack gap={0} alignItems="flex-start">
						<styled.h3
							fontSize="xs"
							fontWeight="700"
							fontFamily="heading"
							color="onSurface"
							textTransform="uppercase"
							letterSpacing="0.05em"
						>
							Quick scans
						</styled.h3>
						<styled.span fontSize="xs" color="onSurfaceVariant/50">
							Free &middot; screenshots you already have
						</styled.span>
					</VStack>
					<styled.span fontSize="xs" fontWeight="500" color="onSurfaceVariant/50">
						{instantDoneCount} of {INSTANT_SOURCES.length} done
					</styled.span>
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

				<Grid columns={{ base: 1, md: 2 }} gap={4} width="100%">
					{INSTANT_SOURCES.map((s, i) => renderSourceCard(s, i, false))}
				</Grid>
			</VStack>

			{/* Divider */}
			<VStack gap={3} width="100%" paddingBlock={2}>
				<Box width="100%" height="1px" bg="outlineVariant/15" />
				<styled.p
					textStyle="body.sm"
					color="onSurfaceVariant/60"
					textAlign="center"
					fontWeight="500"
					paddingInline={4}
				>
					Want deeper insights? These take a bit longer but reveal way more.
				</styled.p>
				<Box width="100%" height="1px" bg="outlineVariant/15" />
			</VStack>

			{/* Section 2: Deep analysis */}
			<VStack gap={4} width="100%">
				<Flex gap={2} justifyContent="space-between" alignItems="center" width="100%">
					<VStack gap={0} alignItems="flex-start">
						<Flex gap={2} alignItems="center">
							<styled.h3
								fontSize="xs"
								fontWeight="700"
								fontFamily="heading"
								color="onSurface"
								textTransform="uppercase"
								letterSpacing="0.05em"
							>
								Deep analysis
							</styled.h3>
							<Flex
								gap={1}
								alignItems="center"
								paddingInline={2}
								paddingBlock={0.5}
								borderRadius="md"
								bg="orange.100"
							>
								<Lock size={10} color="#d97706" />
								<styled.span fontSize="10px" fontWeight="600" color="orange.700">
									EUR 9.99/mo
								</styled.span>
							</Flex>
						</Flex>
						<styled.span fontSize="xs" color="onSurfaceVariant/50">
							Requires async exports (hours/days)
						</styled.span>
					</VStack>
					<styled.span fontSize="xs" fontWeight="500" color="onSurfaceVariant/50">
						{deepDoneCount} of {DEEP_SOURCES.length} done
					</styled.span>
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

				<Grid columns={{ base: 1, md: 2 }} gap={4} width="100%">
					{DEEP_SOURCES.map((s, i) => renderSourceCard(s, i, true))}
				</Grid>
			</VStack>

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
