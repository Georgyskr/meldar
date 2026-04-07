'use client'

import { Box, styled } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { z } from 'zod'

const createProjectResponseSchema = z.object({
	projectId: z.string().uuid(),
})

type Status = 'idle' | 'creating' | 'cooldown'

const COOLDOWN_MS = 1_000

export function NewProjectButton() {
	const router = useRouter()
	const [status, setStatus] = useState<Status>('idle')
	const [error, setError] = useState<string | null>(null)

	const handleClick = useCallback(async () => {
		if (status !== 'idle') return
		setStatus('creating')
		setError(null)
		try {
			const res = await fetch('/api/workspace/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})
			if (!res.ok) {
				let message = `Could not create project (${res.status})`
				try {
					const json = (await res.json()) as { error?: { message?: string } }
					if (json.error?.message) message = json.error.message
				} catch {}
				setError(message)
				setStatus('cooldown')
				setTimeout(() => setStatus('idle'), COOLDOWN_MS)
				return
			}
			const json = createProjectResponseSchema.safeParse(await res.json())
			if (!json.success) {
				setError('Server returned an unexpected response')
				setStatus('cooldown')
				setTimeout(() => setStatus('idle'), COOLDOWN_MS)
				return
			}
			setStatus('cooldown')
			setTimeout(() => setStatus('idle'), COOLDOWN_MS)
			router.push(`/workspace/${json.data.projectId}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Network error')
			setStatus('cooldown')
			setTimeout(() => setStatus('idle'), COOLDOWN_MS)
		}
	}, [router, status])

	const busy = status !== 'idle'

	return (
		<Box position="relative">
			<styled.button
				type="button"
				onClick={handleClick}
				disabled={busy}
				paddingInline={4}
				paddingBlock={1.5}
				fontSize="xs"
				fontWeight="600"
				fontFamily="heading"
				background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
				color="white"
				borderRadius="md"
				border="none"
				cursor={busy ? 'wait' : 'pointer'}
				opacity={busy ? 0.6 : 1}
				transition="opacity 0.2s ease"
				_hover={{ opacity: busy ? 0.6 : 0.9 }}
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
				}}
			>
				{status === 'creating' ? 'Creating…' : '+ New project'}
			</styled.button>
			{error && (
				<styled.span
					role="alert"
					position="absolute"
					insetBlockStart="100%"
					insetInlineEnd={0}
					marginBlockStart={2}
					paddingInline={3}
					paddingBlock={2}
					bg="surfaceContainerHigh"
					color="red.500"
					textStyle="body.xs"
					borderRadius="md"
					whiteSpace="nowrap"
					boxShadow="0 4px 12px rgba(0,0,0,0.08)"
				>
					{error}
				</styled.span>
			)}
		</Box>
	)
}
