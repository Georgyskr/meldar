import { css } from '@styled-system/css'

export const gradientButton = css({
	paddingBlock: '3',
	paddingInline: '6',
	borderRadius: 'lg',
	background: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)',
	color: 'white',
	fontFamily: 'heading',
	fontWeight: '600',
	fontSize: 'sm',
	cursor: 'pointer',
	border: 'none',
	transition: 'opacity 0.2s',
	_hover: { opacity: 0.9 },
	_disabled: { opacity: 0.5, cursor: 'not-allowed' },
})

export const outlineButton = css({
	paddingBlock: '3',
	paddingInline: '6',
	borderRadius: 'lg',
	background: 'transparent',
	color: 'onSurfaceVariant',
	fontFamily: 'heading',
	fontWeight: '500',
	fontSize: 'sm',
	cursor: 'pointer',
	border: '1px solid',
	borderColor: 'outlineVariant',
	transition: 'all 0.2s',
	_hover: { borderColor: 'outline', color: 'onSurface' },
})
