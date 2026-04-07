'use client'

import { styled } from '@styled-system/jsx'
import type { ReactNode } from 'react'

export function XRayCardReveal({ children }: { children: ReactNode }) {
	return (
		<styled.div style={{ animation: 'meldarFadeSlideUp 0.6s ease-out both' }}>
			{children}
		</styled.div>
	)
}

export function RevealStagger({ children, delay }: { children: ReactNode; delay: number }) {
	return (
		<styled.div
			style={{
				opacity: 0,
				animation: 'meldarFadeSlideUp 0.5s ease-out both',
				animationDelay: `${delay}ms`,
			}}
		>
			{children}
		</styled.div>
	)
}
