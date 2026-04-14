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
				glassShimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
				softPulse: {
					'0%, 100%': { opacity: '0.6', boxShadow: '0 0 0 0 rgba(98,49,83,0)' },
					'50%': { opacity: '1', boxShadow: '0 0 8px 2px rgba(98,49,83,0.15)' },
				},
				checkIn: {
					'0%': { opacity: '0', transform: 'scale(0.8)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				toastSlideIn: {
					'0%': { opacity: '0', transform: 'translateX(16px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
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
					success: { value: '#22c55e' },
					error: { value: '#ef4444' },
					errorMuted: { value: '#991b1b' },
					errorBg: { value: '#fef2f2' },
					errorBorder: { value: '#fecaca' },
					warning: { value: '#f59e0b' },
					info: { value: '#3b82f6' },
				},
			},
			textStyles: {
				/* ========================================================
				 * Primary — titles, headings, the most prominent text
				 * Six T-shirt sizes mapping to semantic H1–H6.
				 * ======================================================== */
				'primary.xxl': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '4xl', md: '6xl', lg: '7xl' },
						fontWeight: '800',
						letterSpacing: '-0.04em',
						lineHeight: '0.95',
					},
				},
				'primary.xl': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '3xl', md: '5xl', lg: '6xl' },
						fontWeight: '700',
						letterSpacing: '-0.035em',
						lineHeight: '0.98',
					},
				},
				'primary.lg': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '2xl', md: '4xl', lg: '5xl' },
						fontWeight: '700',
						letterSpacing: '-0.03em',
						lineHeight: '1.05',
					},
				},
				'primary.md': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: 'xl', md: '3xl' },
						fontWeight: '700',
						letterSpacing: '-0.025em',
						lineHeight: '1.12',
					},
				},
				'primary.sm': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: 'lg', md: 'xl' },
						fontWeight: '700',
						letterSpacing: '-0.02em',
						lineHeight: '1.2',
					},
				},
				'primary.xs': {
					value: {
						fontFamily: 'heading',
						fontSize: 'md',
						fontWeight: '700',
						letterSpacing: '-0.015em',
						lineHeight: '1.3',
					},
				},

				/* ========================================================
				 * Secondary — body paragraphs, descriptions, supporting text
				 * Five sizes. Always Inter 300.
				 * ======================================================== */
				'secondary.xl': {
					value: {
						fontFamily: 'body',
						fontSize: { base: 'md', md: 'lg', lg: 'xl' },
						fontWeight: '300',
						lineHeight: '1.6',
					},
				},
				'secondary.lg': {
					value: {
						fontFamily: 'body',
						fontSize: { base: 'md', md: 'lg' },
						fontWeight: '300',
						lineHeight: '1.65',
					},
				},
				'secondary.md': {
					value: {
						fontFamily: 'body',
						fontSize: 'md',
						fontWeight: '300',
						lineHeight: '1.65',
					},
				},
				'secondary.sm': {
					value: {
						fontFamily: 'body',
						fontSize: 'sm',
						fontWeight: '300',
						lineHeight: '1.6',
					},
				},
				'secondary.xs': {
					value: {
						fontFamily: 'body',
						fontSize: 'xs',
						fontWeight: '300',
						lineHeight: '1.55',
					},
				},

				/* ========================================================
				 * Tertiary — eyebrows, labels, captions, metadata
				 * Uppercase letterspaced small text.
				 * ======================================================== */
				'tertiary.xl': {
					value: {
						fontFamily: 'heading',
						fontSize: 'sm',
						fontWeight: '700',
						letterSpacing: '0.22em',
						textTransform: 'uppercase',
						lineHeight: '1',
					},
				},
				'tertiary.lg': {
					value: {
						fontFamily: 'heading',
						fontSize: 'xs',
						fontWeight: '700',
						letterSpacing: '0.22em',
						textTransform: 'uppercase',
						lineHeight: '1',
					},
				},
				'tertiary.md': {
					value: {
						fontFamily: 'heading',
						fontSize: '2xs',
						fontWeight: '700',
						letterSpacing: '0.22em',
						textTransform: 'uppercase',
						lineHeight: '1',
					},
				},
				'tertiary.sm': {
					value: {
						fontFamily: 'heading',
						fontSize: '2xs',
						fontWeight: '500',
						letterSpacing: '0.18em',
						textTransform: 'uppercase',
						lineHeight: '1.2',
					},
				},
				'tertiary.xs': {
					value: {
						fontFamily: 'body',
						fontSize: '2xs',
						fontWeight: '600',
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						lineHeight: '1',
					},
				},

				/* ========================================================
				 * Label — strong UI text, non-uppercase
				 * For sheet headers, glass card titles, button labels
				 * that need more weight than body but aren't headlines.
				 * ======================================================== */
				'label.lg': {
					value: {
						fontFamily: 'body',
						fontSize: 'md',
						fontWeight: '600',
						lineHeight: '1.3',
					},
				},
				'label.md': {
					value: {
						fontFamily: 'body',
						fontSize: 'sm',
						fontWeight: '500',
						lineHeight: '1.4',
					},
				},
				'label.sm': {
					value: {
						fontFamily: 'body',
						fontSize: 'xs',
						fontWeight: '500',
						lineHeight: '1.4',
					},
				},

				/* ========================================================
				 * Display — huge numeric stat displays
				 * For "2,847", "62%", chapter numbers, etc.
				 * ======================================================== */
				'display.xl': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '5xl', md: '7xl' },
						fontWeight: '800',
						letterSpacing: '-0.04em',
						lineHeight: '0.9',
					},
				},
				'display.lg': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '4xl', md: '6xl' },
						fontWeight: '800',
						letterSpacing: '-0.04em',
						lineHeight: '0.9',
					},
				},
				'display.md': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: '3xl', md: '5xl' },
						fontWeight: '800',
						letterSpacing: '-0.035em',
						lineHeight: '0.95',
					},
				},
				'display.sm': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: 'lg', md: '2xl' },
						fontWeight: '800',
						letterSpacing: '-0.02em',
						lineHeight: '1',
					},
				},

				/* ========================================================
				 * Italic — Bricolage italic flourishes
				 * For pull-quotes, asides, "— no credit card" moments.
				 * ======================================================== */
				'italic.lg': {
					value: {
						fontFamily: 'heading',
						fontSize: { base: 'md', md: 'lg' },
						fontWeight: '500',
						fontStyle: 'italic',
						letterSpacing: '-0.01em',
						lineHeight: '1.4',
					},
				},
				'italic.md': {
					value: {
						fontFamily: 'heading',
						fontSize: 'md',
						fontWeight: '500',
						fontStyle: 'italic',
						lineHeight: '1.4',
					},
				},
				'italic.sm': {
					value: {
						fontFamily: 'heading',
						fontSize: 'sm',
						fontWeight: '400',
						fontStyle: 'italic',
						lineHeight: '1.5',
					},
				},

				/* ========================================================
				 * Button — CTA label text
				 * ======================================================== */
				'button.lg': {
					value: {
						fontFamily: 'heading',
						fontSize: 'md',
						fontWeight: '700',
						letterSpacing: '-0.01em',
					},
				},
				'button.md': {
					value: {
						fontFamily: 'heading',
						fontSize: 'sm',
						fontWeight: '600',
						letterSpacing: '-0.005em',
					},
				},
				'button.sm': {
					value: {
						fontFamily: 'heading',
						fontSize: '2xs',
						fontWeight: '700',
						letterSpacing: '0.18em',
						textTransform: 'uppercase',
					},
				},
				'link.inline': {
					value: {
						fontFamily: 'body',
						fontWeight: '600',
						textDecoration: 'none',
					},
				},
			},
			recipes: {
				button: {
					base: {
						fontFamily: 'heading',
						fontWeight: '600',
						cursor: 'pointer',
						transition: 'all 0.2s ease',
						borderRadius: 'md',
						minHeight: '44px',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						border: 'none',
						_focusVisible: {
							outline: '2px solid',
							outlineColor: 'primary',
							outlineOffset: '2px',
						},
						_disabled: {
							opacity: 0.5,
							cursor: 'not-allowed',
						},
					},
					variants: {
						variant: {
							solid: {
								background: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)',
								color: 'white',
								_hover: { opacity: 0.9 },
							},
							primary: {
								background: 'primary',
								color: 'onPrimary',
								_hover: { bg: 'primary/90' },
							},
							outline: {
								background: 'transparent',
								border: '1px solid',
								borderColor: 'outlineVariant',
								color: 'onSurface',
								_hover: { bg: 'surfaceContainer' },
							},
							ghost: {
								background: 'transparent',
								color: 'primary',
								_hover: { color: 'onSurface' },
							},
						},
						size: {
							md: { paddingInline: '6', paddingBlock: '3', fontSize: 'sm' },
							lg: { paddingInline: '6', paddingBlock: '3.5', fontSize: 'sm' },
						},
					},
					defaultVariants: {
						variant: 'primary',
						size: 'md',
					},
				},
			},
		},
	},

	jsxFramework: 'react',
	outdir: 'styled-system',
})
