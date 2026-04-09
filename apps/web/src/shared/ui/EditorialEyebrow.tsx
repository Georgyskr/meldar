import { Box } from '@styled-system/jsx'
import { Text } from './typography'

type Props = {
	number: string
	label: string
	align?: 'left' | 'center'
	tone?: 'mauve' | 'ink' | 'cream'
}

const TONE = {
	mauve: { color: 'primary', rule: 'primary' },
	ink: { color: 'onSurface', rule: 'onSurface' },
	cream: { color: 'surface', rule: 'surface' },
} as const

export function EditorialEyebrow({ number, label, align = 'left', tone = 'mauve' }: Props) {
	const t = TONE[tone]
	return (
		<Box
			display="inline-flex"
			flexDir="column"
			alignItems={align === 'center' ? 'center' : 'flex-start'}
			gap={1.5}
			style={{ animation: 'eyebrowSlideIn 0.6s ease-out both' }}
		>
			<Box
				height="1px"
				width="48px"
				bg={t.rule}
				transformOrigin="left center"
				style={{ animation: 'ruleDraw 0.5s ease-out 0.15s both' }}
			/>
			<Box display="inline-flex" alignItems="baseline" gap={2}>
				<Text textStyle="tertiary.md" color={t.color}>
					Nº {number}
				</Text>
				<Text textStyle="tertiary.md" color={t.color} opacity={0.4}>
					—
				</Text>
				<Text textStyle="tertiary.sm" color={t.color}>
					{label}
				</Text>
			</Box>
		</Box>
	)
}
