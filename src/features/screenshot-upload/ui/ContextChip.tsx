'use client'

import { Flex, styled } from '@styled-system/jsx'
import { BookOpen, Briefcase, Laptop, Search } from 'lucide-react'

const OPTIONS = [
	{ id: 'student', label: 'Student', icon: BookOpen },
	{ id: 'working', label: 'Working', icon: Briefcase },
	{ id: 'freelance', label: 'Freelance', icon: Laptop },
	{ id: 'job-hunting', label: 'Job hunting', icon: Search },
] as const

export type LifeStage = (typeof OPTIONS)[number]['id']

export function ContextChip({
	selected,
	onSelect,
}: {
	selected: LifeStage | null
	onSelect: (stage: LifeStage) => void
}) {
	return (
		<Flex flexDir="column" gap={3} alignItems="center" width="100%">
			<styled.p
				fontFamily="heading"
				fontWeight="600"
				fontSize="sm"
				color="onSurface"
				textAlign="center"
			>
				What&apos;s your week about?
			</styled.p>
			<Flex gap={2} flexWrap="wrap" justifyContent="center">
				{OPTIONS.map((opt) => {
					const isSelected = selected === opt.id
					return (
						<styled.button
							key={opt.id}
							onClick={() => onSelect(opt.id)}
							display="flex"
							alignItems="center"
							gap={2}
							paddingInline={4}
							paddingBlock={2}
							borderRadius="full"
							border="1.5px solid"
							borderColor={isSelected ? 'primary' : 'outlineVariant/30'}
							bg={isSelected ? 'primary/8' : 'surfaceContainerLowest'}
							color={isSelected ? 'primary' : 'onSurfaceVariant'}
							fontSize="sm"
							fontWeight="500"
							cursor="pointer"
							transition="all 0.15s ease"
							_hover={{
								borderColor: isSelected ? 'primary' : 'outlineVariant/60',
								bg: isSelected ? 'primary/8' : 'surfaceContainer',
							}}
						>
							<opt.icon size={14} strokeWidth={1.5} />
							{opt.label}
						</styled.button>
					)
				})}
			</Flex>
		</Flex>
	)
}
