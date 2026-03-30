import { eq } from 'drizzle-orm'
import { ImageResponse } from 'next/og'
import type { AppUsage } from '@/entities/xray-result/model/types'
import { getDb } from '@/server/db/client'
import { xrayResults } from '@/server/db/schema'

export const runtime = 'nodejs'

type RouteProps = {
	params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteProps) {
	const { id } = await params
	const db = getDb()
	const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
	const xray = rows[0]

	if (!xray) {
		return new Response('Not found', { status: 404 })
	}

	const apps = (xray.apps as AppUsage[]).slice(0, 3)

	return new ImageResponse(
		<div
			style={{
				width: '1200',
				height: '630',
				display: 'flex',
				flexDirection: 'column',
				background: '#faf9f6',
				fontFamily: 'system-ui, sans-serif',
			}}
		>
			{/* Gradient header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '24px 48px',
					background: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)',
				}}
			>
				<span style={{ color: 'white', fontSize: 24, fontWeight: 700, letterSpacing: '0.05em' }}>
					YOUR TIME X-RAY
				</span>
				<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>meldar.ai</span>
			</div>

			{/* Content */}
			<div
				style={{ display: 'flex', flex: 1, padding: '40px 48px', flexDirection: 'column', gap: 24 }}
			>
				{/* Total hours */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
					<span style={{ fontSize: 28, color: '#666' }}>Total screen time</span>
					<span style={{ fontSize: 64, fontWeight: 800, color: '#1a1a1a' }}>
						{xray.totalHours}h/day
					</span>
				</div>

				{/* Top apps */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{apps.map((app, i) => (
						<div
							key={app.name}
							style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28 }}
						>
							<span style={{ color: '#1a1a1a' }}>
								{i + 1}. {app.name}
							</span>
							<span style={{ color: '#623153', fontWeight: 600 }}>
								{(app.usageMinutes / 60).toFixed(1)}h
							</span>
						</div>
					))}
				</div>

				{/* Pickups */}
				{xray.pickups && (
					<div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
						<span style={{ fontSize: 22, color: '#666' }}>Daily pickups:</span>
						<span style={{ fontSize: 22, fontWeight: 700, color: '#623153' }}>{xray.pickups}</span>
					</div>
				)}
			</div>

			{/* Footer */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					padding: '16px 48px',
					borderTop: '1px solid #eee',
				}}
			>
				<span style={{ fontSize: 20, color: '#999' }}>Get your own free X-Ray at meldar.ai</span>
			</div>
		</div>,
		{ width: 1200, height: 630 },
	)
}
