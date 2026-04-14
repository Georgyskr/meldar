import { styled } from '@styled-system/jsx'

export const Input = styled('input', {
	base: {
		width: '100%',
		minHeight: '44px',
		paddingInline: '3.5',
		paddingBlock: '2.5',
		border: '1px solid',
		borderColor: 'outlineVariant',
		borderRadius: 'md',
		fontFamily: 'body',
		fontSize: 'sm',
		color: 'onSurface',
		background: 'transparent',
		outline: 'none',
		transition: 'border-color 0.15s',
		_focusVisible: {
			borderColor: 'primary',
			outline: '2px solid',
			outlineColor: 'primary/30',
			outlineOffset: '0',
		},
		_placeholder: {
			color: 'onSurfaceVariant/60',
		},
		_disabled: {
			opacity: 0.5,
			cursor: 'not-allowed',
		},
	},
})

export const Textarea = styled('textarea', {
	base: {
		width: '100%',
		paddingInline: '3.5',
		paddingBlock: '2.5',
		border: '1px solid',
		borderColor: 'outlineVariant',
		borderRadius: 'md',
		fontFamily: 'body',
		fontSize: 'sm',
		lineHeight: '1.6',
		color: 'onSurface',
		background: 'surfaceContainerLowest',
		outline: 'none',
		resize: 'none',
		transition: 'border-color 0.15s',
		_focusVisible: {
			borderColor: 'primary',
			outline: '2px solid',
			outlineColor: 'primary/30',
		},
		_placeholder: {
			color: 'onSurfaceVariant/60',
		},
	},
})
