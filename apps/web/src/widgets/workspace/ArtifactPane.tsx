'use client'

import { Box, Flex, HStack, styled, VStack } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import type { KanbanCard } from '@/entities/kanban-card'
import { DecisionsCard, PromptEditor } from '@/features/teaching'
import type { BuildReceipt, DeploymentPhase, WrittenFile } from '@/features/workspace'
import { Heading, Text } from '@/shared/ui'

type Props = {
	readonly projectId: string
	readonly selectedCard: KanbanCard | null
	readonly activeBuildCardId: string | null
	readonly writtenFiles: readonly WrittenFile[]
	readonly lastBuildReceipt: BuildReceipt | null
	readonly failureMessage: string | null
	readonly deployment: DeploymentPhase
	readonly buildsCompleted: number
	readonly lastBuildId: string | null
	readonly onMakeThis: (cardId: string, prompt: string) => void
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ArtifactPane({
	projectId,
	selectedCard,
	activeBuildCardId,
	writtenFiles,
	lastBuildReceipt,
	failureMessage,
	deployment,
	buildsCompleted,
	lastBuildId,
	onMakeThis,
}: Props) {
	const isBuilding = activeBuildCardId !== null
	const hasReceipt = lastBuildReceipt !== null && writtenFiles.length > 0 && !isBuilding
	const doneRef = useRef<HTMLDivElement>(null)

	let state: 'empty' | 'task-focus' | 'streaming' | 'done' | 'failed'
	if (failureMessage && !isBuilding) state = 'failed'
	else if (isBuilding) state = 'streaming'
	else if (hasReceipt) state = 'done'
	else if (selectedCard) state = 'task-focus'
	else state = 'empty'

	const prevStateRef = useRef(state)
	useEffect(() => {
		const prev = prevStateRef.current
		prevStateRef.current = state
		if (prev === 'streaming' && (state === 'done' || state === 'failed')) {
			doneRef.current?.focus()
		}
	}, [state])

	return (
		<Flex
			direction="column"
			flex="1"
			height="100%"
			background="surface"
			overflowY="auto"
			overflowX="hidden"
		>
			<Box
				paddingBlock={4}
				paddingInline={6}
				borderBlockEnd="1px solid"
				borderColor="outlineVariant/30"
			>
				<HStack gap={2} alignItems="center">
					<Box
						width="8px"
						height="8px"
						borderRadius="50%"
						background={
							state === 'streaming'
								? 'primary'
								: state === 'done'
									? 'success'
									: state === 'failed'
										? 'error'
										: 'onSurfaceVariant/30'
						}
						boxShadow={state === 'streaming' ? '0 0 8px rgba(98, 49, 83, 0.4)' : undefined}
					/>
					<Text textStyle="label.sm" color="onSurfaceVariant">
						{state === 'streaming'
							? 'Making it now'
							: state === 'done'
								? 'Made just now'
								: state === 'failed'
									? 'Something went wrong'
									: state === 'task-focus'
										? 'Ready to make'
										: 'Nothing made yet'}
					</Text>
				</HStack>
			</Box>

			<Box flex="1" paddingBlock={6} paddingInline={6}>
				{state === 'empty' && (
					<VStack alignItems="stretch" gap={3} maxWidth="480px">
						<Heading as="h2" textStyle="heading.3" color="onSurface">
							Pick a step on the left
						</Heading>
						<Text as="p" textStyle="body.md" color="onSurfaceVariant">
							When you click <strong>Make this now</strong>, Meldar writes the code for that step
							and shows you every file it made, right here.
						</Text>
					</VStack>
				)}

				{state === 'task-focus' && selectedCard && (
					<PromptEditor
						projectId={projectId}
						card={selectedCard}
						buildsCompleted={buildsCompleted}
						onMake={onMakeThis}
					/>
				)}

				{state === 'streaming' && (
					<VStack alignItems="stretch" gap={4} maxWidth="640px" aria-live="polite">
						<VStack alignItems="stretch" gap={2}>
							<Text textStyle="label.sm" color="onSurfaceVariant">
								Making now
							</Text>
							<Heading as="h2" textStyle="heading.3" color="onSurface">
								{selectedCard?.title ?? 'Your next step'}
							</Heading>
						</VStack>

						<Box
							background="surfaceContainerLowest"
							border="1px solid"
							borderColor="outlineVariant/40"
							borderRadius="md"
							padding={4}
						>
							{writtenFiles.length === 0 ? (
								<Text textStyle="body.sm" color="onSurfaceVariant">
									Reading your plan and thinking about the code&hellip;
								</Text>
							) : (
								<VStack alignItems="stretch" gap={1.5}>
									<Text textStyle="label.sm" color="onSurfaceVariant" marginBlockEnd={1}>
										Files written so far
									</Text>
									{writtenFiles.map((file) => (
										<HStack key={`${file.path}-${file.writtenAt}`} gap={3}>
											<Text
												as="code"
												textStyle="secondary.sm"
												color="onSurface"
												fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
												flex="1"
											>
												{file.path}
											</Text>
											<Text textStyle="secondary.xs" color="onSurfaceVariant/60">
												{formatBytes(file.sizeBytes)}
											</Text>
										</HStack>
									))}
								</VStack>
							)}
						</Box>
					</VStack>
				)}

				{state === 'done' && lastBuildReceipt && (
					<Box ref={doneRef} tabIndex={-1} outline="none">
						<DonePanel
							projectId={projectId}
							receipt={lastBuildReceipt}
							writtenFiles={writtenFiles}
							deployment={deployment}
							buildsCompleted={buildsCompleted}
							lastBuildId={lastBuildId}
						/>
					</Box>
				)}

				{state === 'failed' && (
					<VStack
						ref={doneRef}
						tabIndex={-1}
						alignItems="stretch"
						gap={3}
						maxWidth="560px"
						outline="none"
						aria-live="assertive"
					>
						<VStack alignItems="stretch" gap={2}>
							<Text textStyle="label.sm" color="error">
								Something went wrong
							</Text>
							<Heading as="h2" textStyle="heading.3" color="onSurface">
								Meldar couldn't finish this step
							</Heading>
						</VStack>
						<Text as="p" textStyle="body.sm" color="onSurfaceVariant">
							{failureMessage}
						</Text>
						{selectedCard && (
							<HStack gap={3} paddingBlockStart={2}>
								<styled.button
									type="button"
									onClick={() =>
										onMakeThis(
											selectedCard.id,
											selectedCard.description ?? `Make the ${selectedCard.title} step.`,
										)
									}
									paddingBlock={2.5}
									paddingInline={4}
									background="primary"
									color="surface"
									border="none"
									borderRadius="md"
									cursor="pointer"
									_hover={{ background: 'primary/90' }}
								>
									<Text as="span" textStyle="button.sm" color="surface">
										Try again
									</Text>
								</styled.button>
							</HStack>
						)}
					</VStack>
				)}
			</Box>
		</Flex>
	)
}

function DonePanel({
	projectId,
	receipt,
	writtenFiles,
	deployment,
	buildsCompleted,
	lastBuildId,
}: {
	readonly projectId: string
	readonly receipt: BuildReceipt
	readonly writtenFiles: readonly WrittenFile[]
	readonly deployment: DeploymentPhase
	readonly buildsCompleted: number
	readonly lastBuildId: string | null
}) {
	const firstPath = writtenFiles[0]?.path ?? null
	const [selectedPath, setSelectedPath] = useState<string | null>(firstPath)

	useEffect(() => {
		setSelectedPath(writtenFiles[0]?.path ?? null)
	}, [writtenFiles])

	return (
		<VStack alignItems="stretch" gap={4} maxWidth="900px">
			<DeployStrip deployment={deployment} />

			{lastBuildId && (
				<DecisionsCard
					projectId={projectId}
					buildId={lastBuildId}
					buildsCompleted={buildsCompleted}
				/>
			)}

			<VStack alignItems="stretch" gap={2}>
				<Text textStyle="label.sm" color="onSurfaceVariant">
					Done
				</Text>
				<Heading as="h2" textStyle="heading.3" color="onSurface">
					Meldar wrote {receipt.fileCount} file{receipt.fileCount === 1 ? '' : 's'} for{' '}
					<em>{receipt.subtaskTitle}</em>
				</Heading>
			</VStack>

			<Box
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/40"
				borderRadius="md"
				padding={4}
			>
				<VStack alignItems="stretch" gap={1}>
					<Text textStyle="label.sm" color="onSurfaceVariant" marginBlockEnd={2}>
						Files ({writtenFiles.length})
					</Text>
					{writtenFiles.map((file) => {
						const isSelected = file.path === selectedPath
						return (
							<styled.button
								key={`${file.path}-${file.writtenAt}`}
								type="button"
								onClick={() => setSelectedPath(file.path)}
								display="flex"
								alignItems="center"
								gap={3}
								paddingBlock={1.5}
								paddingInline={2}
								background={isSelected ? 'primary/8' : 'transparent'}
								border="none"
								borderRadius="sm"
								textAlign="left"
								cursor="pointer"
								transition="background 0.1s ease"
								_hover={{ background: isSelected ? 'primary/8' : 'onSurface/4' }}
							>
								<Text
									as="code"
									textStyle="secondary.sm"
									color={isSelected ? 'primary' : 'onSurface'}
									fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
									flex="1"
								>
									{file.path}
								</Text>
								<Text textStyle="secondary.xs" color="onSurfaceVariant/60">
									{formatBytes(file.sizeBytes)}
								</Text>
							</styled.button>
						)
					})}
				</VStack>
			</Box>

			{selectedPath && <CodeViewer projectId={projectId} path={selectedPath} />}

			<Text textStyle="secondary.xs" color="onSurfaceVariant/60">
				Spent {receipt.tokenCost} energy
			</Text>
		</VStack>
	)
}

function DeployStrip({ deployment }: { readonly deployment: DeploymentPhase }) {
	if (deployment.type === 'idle') return null

	if (deployment.type === 'deploying') {
		return (
			<Box
				padding={5}
				borderRadius="lg"
				background="surfaceContainerLowest"
				border="1px solid"
				borderColor="outlineVariant/40"
				aria-live="polite"
			>
				<VStack alignItems="stretch" gap={3}>
					<HStack gap={3} alignItems="center">
						<Box
							width="10px"
							height="10px"
							borderRadius="50%"
							background="primary"
							boxShadow="0 0 12px rgba(98, 49, 83, 0.5)"
							animation="pulse 1.6s ease-in-out infinite"
						/>
						<Text textStyle="label.sm" color="onSurfaceVariant">
							Going live
						</Text>
					</HStack>
					<Heading as="h3" textStyle="heading.4" color="onSurface">
						Deploying your app&hellip;
					</Heading>
					<Text as="p" textStyle="body.sm" color="onSurfaceVariant">
						Your app will appear at{' '}
						<Text as="code" fontFamily="ui-monospace, monospace" color="onSurface">
							{deployment.hostname}
						</Text>
						. This takes about a minute the first time.
					</Text>
				</VStack>
			</Box>
		)
	}

	if (deployment.type === 'deployed') {
		return (
			<Box
				padding={6}
				borderRadius="lg"
				background="primary/5"
				border="1px solid"
				borderColor="primary/20"
			>
				<VStack alignItems="stretch" gap={4}>
					<VStack alignItems="stretch" gap={2}>
						<HStack gap={2} alignItems="center">
							<Box width="10px" height="10px" borderRadius="50%" background="success" />
							<Text textStyle="label.sm" color="primary">
								It's live
							</Text>
						</HStack>
						<Heading as="h2" textStyle="heading.2" color="onSurface">
							Your app is ready
						</Heading>
					</VStack>

					<Text
						as="code"
						textStyle="body.md"
						fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
						color="primary"
						wordBreak="break-all"
					>
						{deployment.url.replace(/^https?:\/\//, '')}
					</Text>

					<HStack gap={3} flexWrap="wrap">
						<styled.a
							href={deployment.url}
							target="_blank"
							rel="noopener noreferrer"
							display="inline-flex"
							alignItems="center"
							gap={2}
							minHeight="44px"
							paddingBlock={3}
							paddingInline={5}
							background="primary"
							color="surface"
							borderRadius="md"
							textDecoration="none"
							transition="all 0.15s"
							_hover={{ background: 'primary/90', transform: 'translateY(-1px)' }}
							_focusVisible={{
								outline: '2px solid',
								outlineColor: 'primary',
								outlineOffset: '2px',
							}}
						>
							<Text as="span" textStyle="button.md" color="surface">
								Open your app ↗
							</Text>
						</styled.a>
						<CopyLinkButton url={deployment.url} />
					</HStack>
				</VStack>
			</Box>
		)
	}

	// failed
	return (
		<Box
			padding={5}
			borderRadius="lg"
			background="errorBg"
			border="1px solid"
			borderColor="errorBorder"
		>
			<VStack alignItems="stretch" gap={3}>
				<HStack gap={2} alignItems="center">
					<Box width="10px" height="10px" borderRadius="50%" background="error" />
					<Text textStyle="label.sm" color="errorMuted">
						Deploy didn't work
					</Text>
				</HStack>
				<Heading as="h3" textStyle="heading.4" color="onSurface">
					We couldn't put your app online just yet
				</Heading>
				<Text as="p" textStyle="body.sm" color="onSurfaceVariant">
					{deployment.reason}
				</Text>
				<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/60">
					Your code is saved. Try the step again in a minute.
				</Text>
			</VStack>
		</Box>
	)
}

function CopyLinkButton({ url }: { readonly url: string }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// Clipboard unavailable — silent no-op, the user can triple-click the URL text
		}
	}

	return (
		<styled.button
			type="button"
			onClick={handleCopy}
			aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
			minHeight="44px"
			minWidth="44px"
			paddingBlock={3}
			paddingInline={5}
			background="transparent"
			color="onSurface"
			border="1px solid"
			borderColor="outlineVariant/50"
			borderRadius="md"
			cursor="pointer"
			transition="all 0.15s"
			_hover={{ background: 'onSurface/4' }}
			_focusVisible={{
				outline: '2px solid',
				outlineColor: 'primary',
				outlineOffset: '2px',
			}}
		>
			<Text as="span" textStyle="button.md" color="onSurface">
				{copied ? 'Copied!' : 'Copy link'}
			</Text>
		</styled.button>
	)
}

type FileResponse = {
	readonly path: string
	readonly content: string
	readonly html: string
	readonly lang: string
	readonly sizeBytes: number
	readonly truncated: boolean
}

function CodeViewer({ projectId, path }: { readonly projectId: string; readonly path: string }) {
	const [state, setState] = useState<
		| { status: 'loading' }
		| { status: 'ok'; data: FileResponse }
		| { status: 'error'; message: string }
	>({ status: 'loading' })

	useEffect(() => {
		let cancelled = false
		setState({ status: 'loading' })

		const url = `/api/workspace/${projectId}/files?path=${encodeURIComponent(path)}`
		fetch(url)
			.then(async (res) => {
				if (!res.ok) {
					const body = (await res.json().catch(() => ({}))) as {
						error?: { message?: string }
					}
					throw new Error(body.error?.message ?? `HTTP ${res.status}`)
				}
				return (await res.json()) as FileResponse
			})
			.then((data) => {
				if (!cancelled) setState({ status: 'ok', data })
			})
			.catch((err) => {
				if (!cancelled) {
					setState({
						status: 'error',
						message: err instanceof Error ? err.message : 'Failed to load file',
					})
				}
			})

		return () => {
			cancelled = true
		}
	}, [projectId, path])

	return (
		<Box
			background="surfaceContainerLowest"
			border="1px solid"
			borderColor="outlineVariant/40"
			borderRadius="md"
			overflow="hidden"
		>
			<HStack
				gap={2}
				paddingBlock={2}
				paddingInline={3}
				background="surfaceContainerLowest"
				borderBlockEnd="1px solid"
				borderColor="outlineVariant/30"
			>
				<Text
					as="code"
					textStyle="secondary.xs"
					color="onSurfaceVariant"
					fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
					flex="1"
				>
					{path}
				</Text>
				{state.status === 'ok' && state.data.truncated && (
					<Text textStyle="secondary.xs" color="onSurfaceVariant/60">
						Truncated
					</Text>
				)}
			</HStack>

			<Box
				maxHeight="480px"
				overflowY="auto"
				overflowX="auto"
				padding={3}
				fontSize="12.5px"
				lineHeight="1.55"
				fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
				css={{
					'& pre': {
						margin: 0,
						background: 'transparent !important',
					},
					'& code': {
						background: 'transparent',
					},
				}}
			>
				{state.status === 'loading' && (
					<Text textStyle="body.sm" color="onSurfaceVariant">
						Loading&hellip;
					</Text>
				)}
				{state.status === 'error' && (
					<Text textStyle="body.sm" color="error">
						{state.message}
					</Text>
				)}
				{state.status === 'ok' && (
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output from trusted server route
					<div dangerouslySetInnerHTML={{ __html: state.data.html }} />
				)}
			</Box>
		</Box>
	)
}
