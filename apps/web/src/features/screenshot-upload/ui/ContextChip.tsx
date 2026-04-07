'use client'

import { Flex, styled } from '@styled-system/jsx'
import { BookOpen, Briefcase, Laptop, Search } from 'lucide-react'

const OPTIONS = [
	{ id: 'student', label: 'Student', icon: BookOpen },
	{ id: 'working', label: 'Working', icon: Briefcase },
	{ id: 'freelance', label: 'Freelance', icon: Laptop },
	{ id: 'job-hunting', label: 'Job hunt', icon: Search },
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
		<Flex gap={2} flexWrap="wrap" justifyContent="center" width="100%">
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
						paddingBlock="10px"
						borderRadius="12px"
						border="1.5px solid"
						borderColor={isSelected ? 'primary' : 'outlineVariant/20'}
						bg={isSelected ? 'primary/6' : 'surfaceContainerLowest'}
						color={isSelected ? 'primary' : 'onSurfaceVariant'}
						fontSize="sm"
						fontWeight="500"
						fontFamily="heading"
						cursor="pointer"
						transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
						transform={isSelected ? 'scale(1.03)' : 'scale(1)'}
						boxShadow={
							isSelected ? '0 2px 12px rgba(98, 49, 83, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
						}
						_hover={{
							borderColor: isSelected ? 'primary' : 'outlineVariant/50',
							bg: isSelected ? 'primary/6' : 'surfaceContainer',
							transform: 'scale(1.03)',
							boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
						}}
						_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}
						aria-pressed={isSelected}
					>
						<opt.icon size={15} strokeWidth={isSelected ? 2 : 1.5} />
						{opt.label}
					</styled.button>
				)
			})}
		</Flex>
	)
}
