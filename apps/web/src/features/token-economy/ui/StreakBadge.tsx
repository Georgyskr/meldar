import { Flex } from '@styled-system/jsx'
import { Flame } from 'lucide-react'
import { Text } from '@/shared/ui'

export type StreakBadgeProps = {
	readonly streak: number
	readonly isNewDay: boolean
}

export function StreakBadge({ streak, isNewDay }: StreakBadgeProps) {
	if (streak <= 0) return null

	return (
		<Flex
			role="status"
			aria-label={`${streak}-day visit streak`}
			alignItems="center"
			gap={2}
			paddingInline={3}
			paddingBlock={1.5}
			border="1px solid"
			borderColor={isNewDay ? 'primary' : 'onSurface/20'}
			bg={isNewDay ? 'primary/6' : 'transparent'}
			style={isNewDay ? { animation: 'meldarFadeSlideUp 0.4s ease-out both' } : undefined}
		>
			<Flame
				size={14}
				color={isNewDay ? '#623153' : '#623153'}
				strokeWidth={2}
				aria-hidden="true"
				style={isNewDay ? { animation: 'flameFlicker 2s ease-in-out infinite' } : undefined}
			/>
			<Text textStyle="tertiary.sm" color={isNewDay ? 'primary' : 'onSurface/70'}>
				Day {streak}
			</Text>
		</Flex>
	)
}
