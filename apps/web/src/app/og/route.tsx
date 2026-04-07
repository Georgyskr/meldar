import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
	return new ImageResponse(
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'flex-start',
				padding: '80px 100px',
				background: 'linear-gradient(145deg, #faf9f6 0%, #f0eee8 40%, #e9dfe4 70%, #d8c4d0 100%)',
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Subtle gradient orb */}
			<div
				style={{
					position: 'absolute',
					right: '-100px',
					bottom: '-100px',
					width: '500px',
					height: '500px',
					borderRadius: '50%',
					background:
						'radial-gradient(circle, rgba(98,49,83,0.15) 0%, rgba(255,184,118,0.08) 50%, transparent 70%)',
				}}
			/>

			{/* Logo circle */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '16px',
					marginBottom: '40px',
				}}
			>
				<div
					style={{
						width: '32px',
						height: '32px',
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)',
					}}
				/>
				<span
					style={{
						fontSize: '28px',
						fontWeight: 700,
						color: '#623153',
						letterSpacing: '-0.04em',
					}}
				>
					Meldar
				</span>
			</div>

			{/* Main headline */}
			<div
				style={{
					fontSize: '64px',
					fontWeight: 700,
					color: '#1a1c1a',
					lineHeight: 1.05,
					letterSpacing: '-0.04em',
					marginBottom: '24px',
					maxWidth: '700px',
				}}
			>
				Your AI.
				<br />
				Your app.
				<br />
				<span style={{ color: '#623153' }}>Nobody else&apos;s.</span>
			</div>

			{/* Tagline */}
			<div
				style={{
					fontSize: '22px',
					fontWeight: 300,
					color: '#4f434a',
					maxWidth: '500px',
					lineHeight: 1.5,
				}}
			>
				We find what wastes your time. Then we build a personal app that fixes it.
			</div>

			{/* Domain */}
			<div
				style={{
					position: 'absolute',
					bottom: '40px',
					right: '60px',
					fontSize: '16px',
					fontWeight: 500,
					color: '#81737a',
					letterSpacing: '0.1em',
					textTransform: 'uppercase' as const,
				}}
			>
				meldar.ai
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
		},
	)
}
