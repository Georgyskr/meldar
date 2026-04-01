'use client'

import { Box } from '@styled-system/jsx'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export function FadeInOnScroll({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
	const ref = useRef<HTMLDivElement>(null)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setVisible(true)
			},
			{ threshold: 0.1 },
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	return (
		<Box
			ref={ref}
			opacity={visible ? 1 : 0}
			transform={visible ? 'translateY(0)' : 'translateY(20px)'}
			transition={`opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`}
		>
			{children}
		</Box>
	)
}
