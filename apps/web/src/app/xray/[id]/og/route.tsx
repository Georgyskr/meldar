import { ImageResponse } from 'next/og'
import type { AppUsage } from '@/entities/xray-result/model/types'
import { getXRay } from '../get-xray'

export const runtime = 'nodejs'

type RouteProps = {
	params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteProps) {
	const { id } = await params
	const xray = await getXRay(id)

	if (!xray) {
		return new Response('Not found', { status: 404 })
	}

	const apps = (xray.apps as AppUsage[]).slice(0, 5)
	const maxMinutes = apps[0]?.usageMinutes || 1

	return new ImageResponse(
		<div
			style={{
				width: '1200',
				height: '630',
				display: 'flex',
				flexDirection: 'column',
				background: '#1a1c1a',
				fontFamily: 'system-ui, sans-serif',
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Background gradient glow */}
			<div
				style={{
					position: 'absolute',
					top: '-100px',
					right: '-100px',
					width: '500px',
					height: '500px',
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(98,49,83,0.3), transparent 70%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: '-80px',
					left: '-80px',
					width: '400px',
					height: '400px',
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(255,184,118,0.15), transparent 70%)',
				}}
			/>

			{/* Header bar */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '28px 56px',
					background: 'linear-gradient(135deg, #623153 0%, #874a72 40%, #FFB876 100%)',
				}}
			>
				<span
					style={{
						color: 'white',
						fontSize: 18,
						fontWeight: 700,
						letterSpacing: '0.12em',
						textTransform: 'uppercase' as const,
					}}
				>
					Your Digital Footprint
				</span>
				<span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 300 }}>
					meldar.ai
				</span>
			</div>

			{/* Main content */}
			<div
				style={{
					display: 'flex',
					flex: 1,
					padding: '40px 56px 32px',
					flexDirection: 'column',
					gap: 28,
				}}
			>
				{/* Hero number */}
				<div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
					<span
						style={{
							fontSize: 128,
							fontWeight: 800,
							color: 'white',
							lineHeight: 1,
							letterSpacing: '-0.04em',
						}}
					>
						{xray.totalHours}
					</span>
					<span style={{ fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
						hrs/day
					</span>
				</div>

				{/* App bars */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
					{apps.map((app, i) => {
						const barWidth = Math.max((app.usageMinutes / maxMinutes) * 100, 5)
						return (
							<div key={app.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
								<span
									style={{
										fontSize: 18,
										fontWeight: 600,
										color: 'rgba(255,255,255,0.3)',
										width: '24px',
										textAlign: 'right' as const,
									}}
								>
									{i + 1}
								</span>
								<span
									style={{
										fontSize: 22,
										fontWeight: 500,
										color: 'rgba(255,255,255,0.9)',
										width: '140px',
									}}
								>
									{app.name}
								</span>
								<div
									style={{
										flex: 1,
										height: '12px',
										borderRadius: '6px',
										background: 'rgba(255,255,255,0.06)',
										display: 'flex',
									}}
								>
									<div
										style={{
											width: `${barWidth}%`,
											height: '100%',
											borderRadius: '6px',
											background:
												i === 0 ? 'linear-gradient(90deg, #623153, #FFB876)' : 'rgba(98,49,83,0.5)',
										}}
									/>
								</div>
								<span
									style={{
										fontSize: 22,
										fontWeight: 700,
										color: i === 0 ? '#FFB876' : 'rgba(255,255,255,0.6)',
										width: '64px',
										textAlign: 'right' as const,
									}}
								>
									{(app.usageMinutes / 60).toFixed(1)}h
								</span>
							</div>
						)
					})}
				</div>

				{/* Footer stats */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						borderTop: '1px solid rgba(255,255,255,0.08)',
						paddingTop: 20,
					}}
				>
					<div style={{ display: 'flex', gap: 32 }}>
						{xray.pickups && (
							<div style={{ display: 'flex', flexDirection: 'column' }}>
								<span
									style={{
										fontSize: 14,
										color: 'rgba(255,255,255,0.35)',
										textTransform: 'uppercase' as const,
										letterSpacing: '0.08em',
									}}
								>
									Daily pickups
								</span>
								<span style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>
									{xray.pickups}
								</span>
							</div>
						)}
						<div style={{ display: 'flex', flexDirection: 'column' }}>
							<span
								style={{
									fontSize: 14,
									color: 'rgba(255,255,255,0.35)',
									textTransform: 'uppercase' as const,
									letterSpacing: '0.08em',
								}}
							>
								Top app
							</span>
							<span style={{ fontSize: 28, fontWeight: 800, color: '#FFB876' }}>{xray.topApp}</span>
						</div>
					</div>
					<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }}>
						Get yours free at meldar.ai
					</span>
				</div>
			</div>
		</div>,
		{ width: 1200, height: 630 },
	)
}
