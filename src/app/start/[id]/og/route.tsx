import { eq } from 'drizzle-orm'
import { ImageResponse } from 'next/og'
import { getDb } from '@/server/db/client'
import { discoverySessions } from '@/server/db/schema'
import type { DiscoveryAnalysis } from '@/server/discovery/parsers/types'

export const runtime = 'nodejs'

type RouteProps = {
	params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteProps) {
	const { id } = await params
	const db = getDb()
	const rows = await db
		.select()
		.from(discoverySessions)
		.where(eq(discoverySessions.id, id))
		.limit(1)
	const session = rows[0]

	if (!session) {
		return new Response('Not found', { status: 404 })
	}

	const analysis = session.analysis as DiscoveryAnalysis | null
	const appName = analysis?.recommendedApp.name ?? 'Your perfect app'
	const insights = analysis?.keyInsights.slice(0, 3) ?? []

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
					Meldar Analysis
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
					padding: '48px 56px 32px',
					flexDirection: 'column',
					gap: 24,
				}}
			>
				{/* App name */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<span
						style={{
							fontSize: 14,
							fontWeight: 500,
							color: 'rgba(255,255,255,0.4)',
							textTransform: 'uppercase' as const,
							letterSpacing: '0.15em',
						}}
					>
						#1 recommended app
					</span>
					<span
						style={{
							fontSize: 64,
							fontWeight: 800,
							color: 'white',
							lineHeight: 1.1,
							letterSpacing: '-0.03em',
						}}
					>
						{appName}
					</span>
					<span
						style={{
							fontSize: 24,
							fontWeight: 300,
							color: 'rgba(255,255,255,0.5)',
						}}
					>
						Built for you
					</span>
				</div>

				{/* Insights */}
				{insights.length > 0 && (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 12,
							flex: 1,
							justifyContent: 'center',
						}}
					>
						{insights.map((insight) => (
							<div
								key={insight.headline}
								style={{ display: 'flex', alignItems: 'center', gap: 12 }}
							>
								<div
									style={{
										width: 6,
										height: 6,
										borderRadius: '50%',
										background: 'linear-gradient(135deg, #623153, #FFB876)',
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										fontSize: 20,
										fontWeight: 500,
										color: 'rgba(255,255,255,0.75)',
									}}
								>
									{insight.headline}
								</span>
							</div>
						))}
					</div>
				)}

				{/* Footer */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						borderTop: '1px solid rgba(255,255,255,0.08)',
						paddingTop: 20,
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<span
							style={{
								fontSize: 14,
								color: 'rgba(255,255,255,0.35)',
								textTransform: 'uppercase' as const,
								letterSpacing: '0.08em',
							}}
						>
							Sources analyzed
						</span>
						<span style={{ fontSize: 28, fontWeight: 800, color: '#FFB876' }}>
							{analysis?.dataProfile.totalSourcesAnalyzed ?? 0}
						</span>
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
