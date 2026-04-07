'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { trackEvent } from '../lib/track'

export function TrackFaqOpen({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!ref.current) return
		const details = ref.current.querySelectorAll('details')

		function handleToggle(e: Event) {
			const el = e.target as HTMLDetailsElement
			if (el.open) {
				const summary = el.querySelector('summary span')?.textContent ?? ''
				trackEvent({ name: 'faq_opened', question: summary })
			}
		}

		for (const d of details) d.addEventListener('toggle', handleToggle)
		return () => {
			for (const d of details) d.removeEventListener('toggle', handleToggle)
		}
	}, [])

	return <div ref={ref}>{children}</div>
}
