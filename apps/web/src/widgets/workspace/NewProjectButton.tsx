'use client'

import { styled } from '@styled-system/jsx'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { z } from 'zod'
import { Text, toast } from '@/shared/ui'

const createProjectResponseSchema = z.object({
	projectId: z.string().uuid(),
})

type Status = 'idle' | 'creating'

export function NewProjectButton() {
	const router = useRouter()
	const [status, setStatus] = useState<Status>('idle')
	const inFlight = useRef(false)

	const handleClick = useCallback(async () => {
		if (inFlight.current) return
		inFlight.current = true
		setStatus('creating')
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
				toast.error('Failed to create project', message)
				setStatus('idle')
				return
			}
			const json = createProjectResponseSchema.safeParse(await res.json())
			if (!json.success) {
				toast.error('Failed to create project', 'Server returned an unexpected response')
				setStatus('idle')
				return
			}
			router.push(`/workspace/${json.data.projectId}`)
		} catch (err) {
			toast.error('Network error', err instanceof Error ? err.message : 'Please check your connection')
			setStatus('idle')
		} finally {
			inFlight.current = false
		}
	}, [router])

	const busy = status !== 'idle'

	return (
		<styled.button
			type="button"
			onClick={() => handleClick()}
			disabled={busy}
			paddingInline={4}
			paddingBlock={1.5}
			bg="onSurface"
			color="surface"
			border="none"
			cursor={busy ? 'wait' : 'pointer'}
			opacity={busy ? 0.6 : 1}
			transition="all 0.2s ease"
			_hover={{ bg: 'primary', opacity: busy ? 0.6 : 1 }}
			_focusVisible={{
				outline: '2px solid',
				outlineColor: 'primary',
				outlineOffset: '2px',
			}}
		>
			<Text textStyle="button.sm" color="surface">
				{status === 'creating' ? 'Creating…' : '+ New project'}
			</Text>
		</styled.button>
	)
}
