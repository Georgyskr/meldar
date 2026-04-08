'use client'

import { TEMPLATE_SUMMARIES } from '@meldar/orchestrator'
import { Box, Flex, Grid, HStack, styled, VStack } from '@styled-system/jsx'
import { ArrowRight, Lightbulb, ListChecks, Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { TokenBalancePill } from '@/features/token-economy'
import { type DiscoveryAnalysis, discoveryAnalysisSchema } from '@/shared/types/discovery'

export type FirstTimeWelcomeProps = {
	readonly email: string
	readonly tokenBalance: number
}

const createProjectResponseSchema = z.object({
	projectId: z.string().uuid(),
})

async function createProject(name: string): Promise<string> {
	const res = await fetch('/api/workspace/projects', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name }),
	})
	if (!res.ok) {
		let message = `Could not create project (${res.status})`
		try {
			const json = (await res.json()) as { error?: { message?: string } }
			if (json.error?.message) message = json.error.message
		} catch {}
		throw new Error(message)
	}
	const parsed = createProjectResponseSchema.safeParse(await res.json())
	if (!parsed.success) throw new Error('Server returned an unexpected response')
	return parsed.data.projectId
}

async function applyTemplate(projectId: string, templateId: string): Promise<void> {
	const res = await fetch(`/api/workspace/${projectId}/apply-template`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ templateId }),
	})
	if (!res.ok) {
		const data = (await res.json()) as { error?: { message?: string } }
		throw new Error(data.error?.message ?? `HTTP ${res.status}`)
	}
}

type Status = 'idle' | 'creating'

export function FirstTimeWelcome({ email, tokenBalance }: FirstTimeWelcomeProps) {
	const router = useRouter()
	const inFlight = useRef(false)
	const [status, setStatus] = useState<Status>('idle')
	const [error, setError] = useState<string | null>(null)
	const [scanData, setScanData] = useState<DiscoveryAnalysis | null>(null)
	const [freeformValue, setFreeformValue] = useState('')

	useEffect(() => {
		try {
			const raw = localStorage.getItem('meldar-analysis')
			if (raw) {
				const parsed = discoveryAnalysisSchema.safeParse(JSON.parse(raw))
				if (parsed.success) setScanData(parsed.data)
			}
		} catch {}
	}, [])

	const handleTemplateClick = useCallback(
		async (templateId: string, templateName: string) => {
			if (inFlight.current) return
			inFlight.current = true
			setStatus('creating')
			setError(null)
			try {
				const projectId = await createProject(templateName)
				try {
					await applyTemplate(projectId, templateId)
				} catch {
					// Template apply failed — project exists, navigate anyway.
					// The project will show the template picker as fallback.
				}
				router.push(`/workspace/${projectId}`)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Something went wrong')
				setStatus('idle')
			} finally {
				inFlight.current = false
			}
		},
		[router],
	)

	const handleScanBuild = useCallback(async () => {
		if (inFlight.current || !scanData?.recommendedApp) return
		inFlight.current = true
		setStatus('creating')
		setError(null)
		try {
			const projectId = await createProject(scanData.recommendedApp.name)
			router.push(`/workspace/${projectId}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setStatus('idle')
		} finally {
			inFlight.current = false
		}
	}, [router, scanData])

	const handleFreeformSubmit = useCallback(async () => {
		const trimmed = freeformValue.trim()
		if (inFlight.current || !trimmed) return
		inFlight.current = true
		setStatus('creating')
		setError(null)
		try {
			const projectId = await createProject(trimmed)
			router.push(`/workspace/${projectId}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setStatus('idle')
		} finally {
			inFlight.current = false
		}
	}, [router, freeformValue])

	const busy = status !== 'idle'
	const displayName = email.split('@')[0]

	return (
		<VStack alignItems="stretch" gap={8} maxWidth="640px" marginInline="auto">
			<styled.h2
				fontFamily="heading"
				fontSize={{ base: '2xl', md: '3xl' }}
				fontWeight="700"
				letterSpacing="-0.02em"
				color="onSurface"
			>
				Let's build your first app, {displayName}
			</styled.h2>

			{scanData?.recommendedApp && (
				<styled.button
					type="button"
					onClick={() => handleScanBuild()}
					disabled={busy}
					textAlign="left"
					paddingBlock={5}
					paddingInline={5}
					borderRadius="lg"
					border="1px solid"
					borderColor="outlineVariant/50"
					bg="surfaceContainerHigh"
					borderInlineStart="4px solid"
					borderInlineStartColor="#623153"
					cursor={busy ? 'wait' : 'pointer'}
					transition="all 0.15s"
					_hover={{ borderColor: 'primary', background: 'primary/5' }}
					_disabled={{ opacity: 0.6 }}
				>
					<VStack alignItems="flex-start" gap={2}>
						<styled.span textStyle="body.xs" color="onSurfaceVariant" fontWeight="500">
							Based on your scan
						</styled.span>
						<styled.span
							textStyle="body.base"
							fontWeight="700"
							fontFamily="heading"
							color="onSurface"
						>
							We think you'd love: "{scanData.recommendedApp.name}"
						</styled.span>
						<styled.span textStyle="body.sm" color="onSurfaceVariant">
							{scanData.recommendedApp.description}
						</styled.span>
						<HStack gap={1} alignItems="center">
							<styled.span textStyle="body.sm" fontWeight="600" color="primary">
								Build this
							</styled.span>
							<ArrowRight size={14} color="#623153" />
						</HStack>
					</VStack>
				</styled.button>
			)}

			<VStack alignItems="stretch" gap={3}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
					{scanData?.recommendedApp ? 'Or pick a template:' : 'Pick a template to get started:'}
				</styled.p>
				<Grid
					gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
					gap={3}
				>
					{TEMPLATE_SUMMARIES.map((template) => (
						<styled.button
							key={template.id}
							type="button"
							onClick={() => handleTemplateClick(template.id, template.name)}
							disabled={busy}
							textAlign="left"
							paddingBlock={4}
							paddingInline={5}
							borderRadius="lg"
							border="1px solid"
							borderColor="outlineVariant/50"
							bg="surfaceContainerLowest"
							cursor={busy ? 'wait' : 'pointer'}
							transition="all 0.15s"
							_hover={{
								borderColor: 'primary',
								background: 'primary/5',
								transform: 'translateY(-2px)',
								boxShadow: '0 4px 12px rgba(98,49,83,0.08)',
							}}
							_disabled={{ opacity: 0.5 }}
						>
							<VStack alignItems="flex-start" gap={1.5}>
								<styled.span
									textStyle="body.sm"
									fontWeight="600"
									fontFamily="heading"
									color="onSurface"
								>
									{template.name}
								</styled.span>
								<styled.span textStyle="body.xs" color="onSurfaceVariant">
									{template.description}
								</styled.span>
								<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
									{template.milestoneCount} milestones
								</styled.span>
							</VStack>
						</styled.button>
					))}
				</Grid>
			</VStack>

			<VStack alignItems="stretch" gap={2}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant" fontWeight="500">
					Or describe what you want:
				</styled.p>
				<Flex gap={2}>
					<styled.input
						type="text"
						value={freeformValue}
						onChange={(e) => setFreeformValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleFreeformSubmit()
						}}
						placeholder="Tell Meldar what to build..."
						disabled={busy}
						flex="1"
						paddingBlock={2.5}
						paddingInline={4}
						borderRadius="md"
						border="1px solid"
						borderColor="outlineVariant/50"
						bg="surfaceContainerLowest"
						color="onSurface"
						textStyle="body.sm"
						transition="border-color 0.15s"
						_focus={{ borderColor: 'primary', outline: 'none' }}
						_disabled={{ opacity: 0.5 }}
						_placeholder={{ color: 'onSurfaceVariant/50' }}
					/>
					<styled.button
						type="button"
						onClick={() => handleFreeformSubmit()}
						disabled={busy || !freeformValue.trim()}
						paddingInline={4}
						paddingBlock={2.5}
						borderRadius="md"
						border="none"
						background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
						color="white"
						fontWeight="600"
						fontSize="sm"
						cursor={busy ? 'wait' : 'pointer'}
						opacity={busy || !freeformValue.trim() ? 0.5 : 1}
						transition="opacity 0.15s"
						_hover={{ opacity: busy || !freeformValue.trim() ? 0.5 : 0.9 }}
						_focusVisible={{
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						}}
						aria-label="Submit"
					>
						<ArrowRight size={18} />
					</styled.button>
				</Flex>
			</VStack>

			{error && (
				<Box paddingBlock={2} paddingInline={3} borderRadius="md" background="error/10">
					<styled.p role="alert" textStyle="body.xs" color="error">
						{error}
					</styled.p>
				</Box>
			)}

			<Box borderBlockStart="1px solid" borderColor="outlineVariant/20" paddingBlockStart={6}>
				<styled.p textStyle="body.sm" color="onSurfaceVariant/70" marginBlockEnd={4}>
					How it works:
				</styled.p>
				<Grid gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4}>
					<HStack gap={2.5} alignItems="flex-start">
						<Box flexShrink={0} marginBlockStart={0.5}>
							<Lightbulb size={16} color="#81737a" />
						</Box>
						<VStack alignItems="flex-start" gap={0.5}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								1. Pick or describe
							</styled.span>
							<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
								Choose a template or tell us what you want
							</styled.span>
						</VStack>
					</HStack>
					<HStack gap={2.5} alignItems="flex-start">
						<Box flexShrink={0} marginBlockStart={0.5}>
							<ListChecks size={16} color="#81737a" />
						</Box>
						<VStack alignItems="flex-start" gap={0.5}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								2. We plan it
							</styled.span>
							<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
								AI breaks it into milestones
							</styled.span>
						</VStack>
					</HStack>
					<HStack gap={2.5} alignItems="flex-start">
						<Box flexShrink={0} marginBlockStart={0.5}>
							<Rocket size={16} color="#81737a" />
						</Box>
						<VStack alignItems="flex-start" gap={0.5}>
							<styled.span textStyle="body.xs" fontWeight="600" color="onSurfaceVariant">
								3. Build with AI
							</styled.span>
							<styled.span textStyle="body.xs" color="onSurfaceVariant/70">
								Click Build, watch it happen
							</styled.span>
						</VStack>
					</HStack>
				</Grid>
			</Box>

			<Flex justifyContent="center">
				<TokenBalancePill balance={tokenBalance} />
			</Flex>
		</VStack>
	)
}
