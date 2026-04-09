'use client'

import { Box } from '@styled-system/jsx'
import { useEffect, useRef, useState } from 'react'
import { Text } from './typography'

type Props = {
	src: string
	plateNumber: string
	caption: string
	aspectRatio?: string
	priority?: boolean
}

export function EditorialPlate({
	src,
	plateNumber,
	caption,
	aspectRatio = '3/4',
	priority = false,
}: Props) {
	const ref = useRef<HTMLDivElement>(null)
	const [offset, setOffset] = useState(0)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		let frame = 0
		function update() {
			if (!el) return
			const rect = el.getBoundingClientRect()
			const viewport = window.innerHeight
			const mid = rect.top + rect.height / 2
			const dist = mid - viewport / 2
			const normalized = Math.max(-1, Math.min(1, dist / viewport))
			setOffset(normalized * -18)
		}
		function onScroll() {
			cancelAnimationFrame(frame)
			frame = requestAnimationFrame(update)
		}
		update()
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			cancelAnimationFrame(frame)
			window.removeEventListener('scroll', onScroll)
		}
	}, [])

	return (
		<Box ref={ref} position="relative">
			<Box
				as="figure"
				margin={0}
				position="relative"
				overflow="hidden"
				style={{
					aspectRatio,
					animation: priority ? 'plateFadeIn 1s ease-out 0.2s both' : undefined,
				}}
			>
				<Box
					position="absolute"
					inset={0}
					bg="linear-gradient(180deg, #3a1829 0%, #623153 60%, #874a72 100%)"
				/>
				<Box
					position="absolute"
					inset={0}
					style={{
						backgroundImage: `url(${src})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						transform: `translateY(${offset}px)`,
						transition: 'transform 0.2s linear',
					}}
				/>
				<Box
					position="absolute"
					inset={0}
					bg="linear-gradient(180deg, transparent 60%, rgba(58,24,41,0.3) 100%)"
				/>
				<Box
					position="absolute"
					bottom="20px"
					right="20px"
					width="12px"
					height="12px"
					borderRadius="full"
					bg="secondaryLight"
					style={{
						boxShadow: '0 0 24px #FFB876, 0 0 8px #FFB876',
						animation: 'gentleBreathe 3s ease-in-out infinite',
					}}
				/>
			</Box>
			<Box
				marginBlockStart={2}
				paddingBlockStart={2}
				borderTop="1px solid"
				borderColor="outlineVariant/30"
				display="flex"
				justifyContent="space-between"
				gap={4}
			>
				<Text textStyle="tertiary.sm" color="primary">
					Plate {plateNumber}
				</Text>
				<Text textStyle="italic.sm" color="onSurfaceVariant/70">
					{caption}
				</Text>
			</Box>
		</Box>
	)
}
