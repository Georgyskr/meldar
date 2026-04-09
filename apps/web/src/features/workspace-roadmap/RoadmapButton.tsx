'use client'

import { styled } from '@styled-system/jsx'
import { useState } from 'react'
import { RoadmapDrawer } from './RoadmapDrawer'

export function RoadmapButton() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<styled.button
				type="button"
				onClick={() => setOpen(true)}
				textStyle="secondary.xs"
				color="onSurface"
				fontWeight="600"
				bg="transparent"
				border="1px solid"
				borderColor="outlineVariant/40"
				borderRadius="full"
				paddingBlock={1}
				paddingInline={3}
				cursor="pointer"
				transition="background 120ms ease, border-color 120ms ease"
				_hover={{ bg: 'surfaceContainerHigh', borderColor: 'outline' }}
			>
				Roadmap
			</styled.button>
			<RoadmapDrawer open={open} onClose={() => setOpen(false)} />
		</>
	)
}
