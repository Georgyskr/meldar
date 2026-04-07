'use client'

import { Box } from '@styled-system/jsx'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export function FadeInOnScroll({
	children,
	delay = 0,
	onVisible,
}: {
	children: ReactNode
	delay?: number
	onVisible?: () => void
}) {
	const ref = useRef<HTMLDivElement>(null)
	const [visible, setVisible] = useState(false)
	const onVisibleRef = useRef(onVisible)
	onVisibleRef.current = onVisible

	useEffect(() => {
		const el = ref.current
		if (!el) return
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true)
					onVisibleRef.current?.()
					observer.disconnect()
				}
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
