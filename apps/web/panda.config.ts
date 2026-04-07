import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import sand from '@park-ui/panda-preset/colors/sand'

export default defineConfig({
	preflight: true,

	presets: [
		createPreset({
			accentColor: sand,
			grayColor: sand,
			radius: 'sm',
		}),
	],

	include: ['./src/**/*.{js,jsx,ts,tsx}'],
	exclude: [],

	globalCss: {
		body: {
			fontFamily: 'body',
			bg: 'surface',
			color: 'onSurface',
		},
		'::selection': {
			bg: 'primaryContainer',
			color: 'onPrimaryContainer',
		},
		// Programmatic focus (tabIndex={-1}) should never show a ring.
		// Only keyboard focus (:focus-visible) should show focus indicators.
		'[tabindex="-1"]:focus:not(:focus-visible)': {
			outline: 'none',
		},
	},

	theme: {
		extend: {
			keyframes: {
				fadeInUp: {
					'0%': { opacity: '0', transform: 'translateY(24px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				blink: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0' },
				},
			},
			tokens: {
				fonts: {
					heading: { value: "var(--font-headline), 'Bricolage Grotesque', system-ui, sans-serif" },
					body: { value: "var(--font-body), 'Inter', system-ui, sans-serif" },
					mono: { value: "'JetBrains Mono', ui-monospace, monospace" },
				},
				colors: {
					/* Stitch palette */
					primary: { value: '#623153' },
					primaryMid: { value: '#874a72' },
					primaryDark: { value: '#481b3c' },
					onPrimary: { value: '#ffffff' },
					primaryContainer: { value: '#623153' },
					onPrimaryContainer: { value: '#db9bc3' },
					secondary: { value: '#875219' },
					secondaryLight: { value: '#FFB876' },
					onSecondary: { value: '#ffffff' },
					surface: { value: '#faf9f6' },
					surfaceDim: { value: '#dbdad7' },
					surfaceContainer: { value: '#efeeeb' },
					surfaceContainerLow: { value: '#f4f3f1' },
					surfaceContainerHigh: { value: '#e9e8e5' },
					surfaceContainerHighest: { value: '#e3e2e0' },
					surfaceContainerLowest: { value: '#ffffff' },
					onSurface: { value: '#1a1c1a' },
					onSurfaceVariant: { value: '#4f434a' },
					outline: { value: '#81737a' },
					outlineVariant: { value: '#d3c2ca' },
					inverseSurface: { value: '#2f312f' },
					inverseOnSurface: { value: '#f1f1ee' },
					inversePrimary: { value: '#f5b3dc' },
				},
			},
			textStyles: {
				'heading.hero': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '3xl', md: '5xl', lg: '7xl' },
						fontWeight: '700',
						letterSpacing: '-0.04em',
						lineHeight: '1.1',
					},
				},
				'heading.display': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '3xl', md: '4xl', lg: '5xl' },
						fontWeight: '700',
						letterSpacing: '-0.03em',
						lineHeight: '1.1',
					},
				},
				'heading.section': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '2xl', md: '3xl', lg: '4xl' },
						fontWeight: '700',
						letterSpacing: '-0.02em',
						lineHeight: '1.15',
					},
				},
				'heading.card': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: 'lg', md: 'xl' },
						fontWeight: '700',
						lineHeight: '1.3',
					},
				},
				'body.lead': {
					value: {
						fontFamily: 'body',
						fontSize: { base: 'md', md: 'lg', lg: 'xl' },
						fontWeight: '300',
						lineHeight: '1.7',
					},
				},
				'body.base': {
					value: {
						fontFamily: 'body',
						fontSize: 'md',
						fontWeight: '300',
						lineHeight: '1.7',
					},
				},
				'body.sm': {
					value: {
						fontFamily: 'body',
						fontSize: 'sm',
						fontWeight: '300',
						lineHeight: '1.6',
					},
				},
				'label.upper': {
					value: {
						fontFamily: 'body',
						fontSize: 'xs',
						fontWeight: '500',
						letterSpacing: '0.2em',
						textTransform: 'uppercase',
					},
				},
			},
			recipes: {
				button: {
					base: {
						fontFamily: 'body',
						fontWeight: '500',
						cursor: 'pointer',
						transition: 'all 0.2s ease',
					},
					variants: {
						variant: {
							solid: {
								background: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)',
								color: 'white',
								_hover: { opacity: 0.9 },
							},
							outline: {
								borderColor: 'outlineVariant',
								color: 'onSurface',
								_hover: { bg: 'surfaceContainer' },
							},
							ghost: {
								color: 'outline',
								_hover: { color: 'onSurface' },
							},
						},
					},
				},
			},
		},
	},

	jsxFramework: 'react',
	outdir: 'styled-system',
})
