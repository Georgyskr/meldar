'use client'

import { useState } from 'react'

const WEIGHT_TRACKER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, system-ui, sans-serif; background: #fff; color: #1a1a1a; }
  .nav { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-bottom: 1px solid #eee; }
  .nav-logo { width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(135deg, #623153, #FFB876); }
  .nav-title { font-size: 11px; font-weight: 600; }
  .main { padding: 14px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
  .stat { padding: 10px; border: 1px solid #f0eeec; }
  .stat-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #623153; margin-bottom: 2px; }
  .stat-value { font-size: 20px; font-weight: 300; }
  .stat-unit { font-size: 9px; color: #999; }
  .stat-change { font-size: 9px; color: #22c55e; margin-top: 2px; }
  .chart { height: 80px; border-left: 1px solid #f0eeec; border-bottom: 1px solid #f0eeec; margin-bottom: 14px; }
  .chart svg { width: 100%; height: 100%; }
  .chart-line { fill: none; stroke: #623153; stroke-width: 1.5; }
  .chart-area { fill: url(#g); opacity: 0.12; }
  .chart-dot { fill: #623153; }
  .chart-dot.latest { fill: #FFB876; stroke: #623153; stroke-width: 1; }
  .chart-goal { stroke: #22c55e; stroke-width: 0.5; stroke-dasharray: 4 3; }
  .highlight { background: rgba(255,184,118,0.12); border: 1px solid rgba(255,184,118,0.3); padding: 10px; }
  .highlight-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #623153; margin-bottom: 4px; }
  .highlight-title { font-size: 11px; font-weight: 600; }
</style>
</head>
<body>
  <div class="nav">
    <div class="nav-logo"></div>
    <span class="nav-title">Weight Tracker</span>
  </div>
  <div class="main">
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Current</div>
        <div class="stat-value">72.4 <span class="stat-unit">kg</span></div>
        <div class="stat-change">-0.3 this week</div>
      </div>
      <div class="stat">
        <div class="stat-label">Goal</div>
        <div class="stat-value">68.0 <span class="stat-unit">kg</span></div>
      </div>
      <div class="stat">
        <div class="stat-label">Today</div>
        <div class="stat-value">1,840 <span class="stat-unit">kcal</span></div>
      </div>
    </div>
    <div class="chart">
      <svg viewBox="0 0 400 80" preserveAspectRatio="none">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#623153"/><stop offset="100%" stop-color="#623153" stop-opacity="0"/></linearGradient></defs>
        <line class="chart-goal" x1="10" y1="60" x2="390" y2="60"/>
        <path class="chart-area" d="M10,10 L50,15 L90,12 L140,22 L180,28 L220,32 L260,35 L300,33 L340,38 L380,42 L380,75 L10,75 Z"/>
        <path class="chart-line" d="M10,10 L50,15 L90,12 L140,22 L180,28 L220,32 L260,35 L300,33 L340,38 L380,42"/>
        <circle class="chart-dot latest" cx="380" cy="42" r="3"/>
      </svg>
    </div>
    <div class="highlight">
      <div class="highlight-label">Last change</div>
      <div class="highlight-title">Weight chart — added progress line</div>
    </div>
  </div>
</body>
</html>`

export function PreviewThumbnail({
	onOpen,
	previewUrl,
}: {
	onOpen?: () => void
	previewUrl?: string | null
}) {
	const [hovered, setHovered] = useState(false)

	return (
		<button
			type="button"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onClick={onOpen}
			style={{
				position: 'absolute',
				bottom: 20,
				right: 20,
				width: hovered ? 320 : 260,
				height: hovered ? 220 : 180,
				zIndex: 8,
				borderRadius: 16,
				overflow: 'hidden',
				border: hovered ? '1.5px solid rgba(98,49,83,0.4)' : '1px solid rgba(98,49,83,0.15)',
				boxShadow: hovered
					? '0 8px 40px rgba(98,49,83,0.2), 0 0 0 1px rgba(250,249,246,0.5)'
					: '0 4px 20px rgba(0,0,0,0.08)',
				background: 'rgba(255,255,255,0.85)',
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)',
				cursor: 'pointer',
				transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
				transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
				pointerEvents: 'auto',
			}}
		>
			<iframe
				srcDoc={previewUrl ? undefined : WEIGHT_TRACKER_HTML}
				src={previewUrl ?? undefined}
				title="App preview"
				sandbox="allow-scripts"
				style={{
					width: '100%',
					height: '100%',
					border: 'none',
					display: 'block',
					pointerEvents: 'none',
					borderRadius: 16,
				}}
			/>
			{hovered && (
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						left: 0,
						right: 0,
						padding: '8px 12px',
						background: 'linear-gradient(transparent, rgba(250,249,246,0.95))',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<span
						style={{
							fontSize: 10,
							fontFamily: 'Inter, sans-serif',
							color: '#623153',
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
							fontWeight: 500,
						}}
					>
						Preview
					</span>
					<span
						style={{
							fontSize: 10,
							fontFamily: 'Inter, sans-serif',
							color: '#81737a',
						}}
					>
						Click to open
					</span>
				</div>
			)}
			{!hovered && (
				<div
					style={{
						position: 'absolute',
						top: 8,
						right: 8,
						width: 8,
						height: 8,
						borderRadius: '50%',
						background: '#22c55e',
						boxShadow: '0 0 6px rgba(34,197,94,0.4)',
					}}
				/>
			)}
		</button>
	)
}
