import { styled } from '@styled-system/jsx'
import { Text } from '../typography'

export function MeldarBadge() {
	return (
		<styled.a
			href="https://meldar.ai/?ref=badge"
			target="_blank"
			rel="noopener noreferrer"
			position="fixed"
			insetBlockEnd={3}
			insetInlineEnd={3}
			display="inline-flex"
			alignItems="center"
			gap={1.5}
			paddingBlock={1.5}
			paddingInline={3}
			bg="primary"
			borderRadius="full"
			textDecoration="none"
			zIndex={50}
			boxShadow="0 2px 8px rgba(0,0,0,0.15)"
			transition="opacity 0.2s"
			_hover={{ opacity: 0.9 }}
		>
			<styled.span
				width="14px"
				height="14px"
				borderRadius="sm"
				background="linear-gradient(135deg, #623153, #FFB876)"
			/>
			<Text as="span" textStyle="label.sm" color="onPrimary">
				Made with Meldar
			</Text>
		</styled.a>
	)
}
