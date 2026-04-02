'use client'

import type { ReactNode } from 'react'
import { useRef } from 'react'
import { FadeInOnScroll } from '@/shared/ui/FadeInOnScroll'
import { trackEvent } from '../lib/track'

export function FadeInWithTracking({
	event,
	children,
	delay,
}: {
	event: Parameters<typeof trackEvent>[0]
	children: ReactNode
	delay?: number
}) {
	const eventRef = useRef(event)
	eventRef.current = event

	return (
		<FadeInOnScroll delay={delay} onVisible={() => trackEvent(eventRef.current)}>
			{children}
		</FadeInOnScroll>
	)
}
