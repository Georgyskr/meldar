'use client'

/**
 * BuildComposer — the prompt input for triggering a workspace build.
 *
 * Sprint 1.5 puts the prompt textarea directly in the build panel because
 * the kanban UI hasn't shipped yet. In Sprint 2 each kanban card becomes the
 * canonical entry point and this composer either moves into the card editor
 * or gets retired in favor of card-driven submission. Until then, this is
 * the temporary "raw prompt" path so we can validate the orchestrator
 * end-to-end.
 *
 * Pure presentational component: takes a `disabled` flag (so the parent can
 * lock it during a streaming build) and an `onSubmit` callback. Owns nothing
 * except the textarea's local draft state.
 */

import { Box, HStack, styled, VStack } from '@styled-system/jsx'
import { useState } from 'react'

export type BuildComposerProps = {
	readonly disabled: boolean
	readonly onSubmit: (prompt: string) => void
}

export function BuildComposer({ disabled, onSubmit }: BuildComposerProps) {
	const [draft, setDraft] = useState('')

	const trimmed = draft.trim()
	const canSubmit = !disabled && trimmed.length > 0

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!canSubmit) return
		onSubmit(trimmed)
		setDraft('')
	}

	return (
		<Box
			as="form"
			onSubmit={handleSubmit}
			padding={4}
			borderBlockStart="1px solid"
			borderColor="outlineVariant/30"
			background="surfaceContainerLowest"
		>
			<VStack alignItems="stretch" gap={2}>
				<styled.label
					htmlFor="build-prompt"
					textStyle="body.xs"
					color="onSurfaceVariant"
					textTransform="uppercase"
					letterSpacing="wide"
					fontWeight="600"
				>
					What should Meldar build?
				</styled.label>
				<styled.textarea
					id="build-prompt"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					disabled={disabled}
					rows={3}
					placeholder="e.g. Add a contact form with name, email, and message fields"
					padding={3}
					borderRadius="md"
					border="1px solid"
					borderColor="outlineVariant/50"
					background="surface"
					color="onSurface"
					textStyle="body.sm"
					fontFamily="body"
					resize="vertical"
					_focus={{
						outline: 'none',
						borderColor: 'primary',
						boxShadow: '0 0 0 2px token(colors.primary/20)',
					}}
					_disabled={{
						opacity: 0.5,
						cursor: 'not-allowed',
					}}
				/>
				<HStack justifyContent="space-between" alignItems="center">
					<styled.span textStyle="body.xs" color="onSurfaceVariant">
						{disabled ? 'Streaming a build…' : 'Enter your prompt and hit Build.'}
					</styled.span>
					<styled.button
						type="submit"
						disabled={!canSubmit}
						paddingBlock={2}
						paddingInline={4}
						borderRadius="md"
						background="primary"
						color="onPrimary"
						fontWeight="600"
						textStyle="body.sm"
						cursor="pointer"
						transition="opacity 0.15s"
						_hover={{ opacity: 0.9 }}
						_disabled={{
							opacity: 0.4,
							cursor: 'not-allowed',
						}}
					>
						Build
					</styled.button>
				</HStack>
			</VStack>
		</Box>
	)
}
