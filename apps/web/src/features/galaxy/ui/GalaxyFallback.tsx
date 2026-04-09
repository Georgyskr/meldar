/* biome-ignore-all lint/suspicious: inline styles for prototype-stage fallback view */
/* biome-ignore-all lint/a11y: to be ported to Panda primitives */
/* biome-ignore-all lint/correctness: intentional patterns */
'use client'

import { useEffect, useState } from 'react'
import type { GalaxyMilestone, GalaxyTask, GalaxyTaskStatus } from '../model/types'

type TaskStatus = GalaxyTaskStatus

type Mode = 'plan' | 'taskFocus' | 'building' | 'review'

interface Props {
	milestones: readonly GalaxyMilestone[]
	previewUrl?: string | null
	selectedTaskId?: string | null
	mode?: Mode
	onTaskSelect?: (task: GalaxyTask) => void
	onTaskDeselect?: () => void
	onBuildTask?: (task: GalaxyTask) => void
}

const C = {
	primary: '#623153',
	peach: '#FFB876',
	done: '#22c55e',
	locked: '#d4cdd0',
	surface: '#faf9f6',
	text: '#1a1a1a',
	muted: '#81737a',
	border: 'rgba(98,49,83,0.1)',
	glass: 'rgba(250,249,246,0.82)',
	glassBorder: 'rgba(98,49,83,0.08)',
}

function allTasks(milestones: readonly GalaxyMilestone[]): GalaxyTask[] {
	return milestones.flatMap((m) => m.tasks)
}

function findTask(milestones: readonly GalaxyMilestone[], id: string): GalaxyTask | undefined {
	return allTasks(milestones).find((t) => t.id === id)
}

function doneCount(milestones: readonly GalaxyMilestone[]): number {
	return allTasks(milestones).filter((t) => t.status === 'done').length
}

function totalCount(milestones: readonly GalaxyMilestone[]): number {
	return allTasks(milestones).length
}

function readyTask(milestones: readonly GalaxyMilestone[]): GalaxyTask | undefined {
	return allTasks(milestones).find((t) => t.status === 'ready')
}

function statusDot(status: TaskStatus, size = 8) {
	const color =
		status === 'done'
			? C.done
			: status === 'ready'
				? C.peach
				: status === 'active'
					? C.primary
					: C.locked
	return (
		<span
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				background: color,
				display: 'inline-block',
				flexShrink: 0,
				boxShadow: status === 'ready' ? `0 0 8px ${C.peach}` : undefined,
			}}
		/>
	)
}

function checkIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
			<title>Done</title>
			<circle cx="7" cy="7" r="7" fill={C.done} />
			<path
				d="M4 7l2 2 4-4"
				stroke="#fff"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function TopBar({ milestones }: { milestones: readonly GalaxyMilestone[] }) {
	const done = doneCount(milestones)
	const total = totalCount(milestones)
	const pct = total > 0 ? Math.round((done / total) * 100) : 0
	const currentStep = total > 0 ? Math.min(done + 1, total) : 0

	return (
		<div
			style={{
				height: 52,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				paddingInline: 24,
				borderBottom: `2px solid ${C.text}`,
				background: C.surface,
				fontFamily: 'Inter, sans-serif',
				position: 'relative',
				zIndex: 40,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
				<span
					style={{
						fontSize: 10,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						color: C.primary,
						fontWeight: 500,
					}}
				>
					meldar
				</span>
				<span style={{ color: C.locked }}>/</span>
				<span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Weight Tracker</span>
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<div
						style={{
							width: 100,
							height: 3,
							background: 'rgba(0,0,0,0.06)',
							borderRadius: 2,
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								height: '100%',
								width: `${pct}%`,
								background: C.primary,
								borderRadius: 2,
								transition: 'width 0.5s ease',
							}}
						/>
					</div>
					<span style={{ fontSize: 11, color: C.muted }}>
						Step {currentStep} of {total}
					</span>
				</div>
				<span
					style={{
						fontSize: 11,
						color: C.primary,
						padding: '3px 10px',
						border: `1px solid ${C.glassBorder}`,
						borderRadius: 12,
					}}
				>
					45 energy
				</span>
			</div>
		</div>
	)
}

function ChapterRail({
	milestones,
	focusedTaskId,
	onTaskClick,
}: {
	milestones: readonly GalaxyMilestone[]
	focusedTaskId: string | null
	onTaskClick: (task: GalaxyTask) => void
}) {
	return (
		<div
			style={{
				width: 280,
				borderRight: `1px solid ${C.border}`,
				overflowY: 'auto',
				background: C.surface,
				fontFamily: 'Inter, sans-serif',
			}}
		>
			{milestones.map((m, mi) => (
				<div key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
					<div
						style={{ padding: '14px 20px 8px', display: 'flex', alignItems: 'baseline', gap: 8 }}
					>
						<span
							style={{
								fontSize: 9,
								letterSpacing: '0.1em',
								textTransform: 'uppercase',
								color: C.primary,
								fontWeight: 500,
							}}
						>
							Ch {mi + 1}
						</span>
						<span
							style={{
								fontSize: 13,
								fontWeight: 600,
								color: m.status === 'locked' ? C.locked : C.text,
							}}
						>
							{m.title}
						</span>
						{m.completionPct === 100 && <span style={{ fontSize: 10, color: C.done }}>Done</span>}
						{m.completionPct > 0 && m.completionPct < 100 && (
							<span style={{ fontSize: 10, color: C.muted }}>{m.completionPct}%</span>
						)}
					</div>
					{m.tasks.map((t) => {
						const focused = focusedTaskId === t.id
						const isReady = t.status === 'ready'
						const isLocked = t.status === 'locked' || t.status === 'todo'
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => onTaskClick(t)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 10,
									width: '100%',
									padding: '10px 20px',
									border: 'none',
									borderLeft: focused
										? `3px solid ${C.primary}`
										: isReady
											? `3px solid ${C.peach}`
											: '3px solid transparent',
									background: focused
										? 'rgba(98,49,83,0.04)'
										: isReady
											? 'rgba(255,184,118,0.04)'
											: 'transparent',
									cursor: isLocked ? 'default' : 'pointer',
									opacity: isLocked ? 0.45 : 1,
									fontFamily: 'Inter, sans-serif',
									textAlign: 'left',
									transition: 'all 0.15s ease',
								}}
							>
								{t.status === 'done' ? checkIcon() : statusDot(t.status)}
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontSize: 12,
											fontWeight: isReady ? 600 : 400,
											color: isLocked ? C.locked : C.text,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										{t.title}
									</div>
									{isReady && (
										<div style={{ fontSize: 10, color: C.peach, marginTop: 2, fontWeight: 500 }}>
											Ready to create
										</div>
									)}
								</div>
							</button>
						)
					})}
				</div>
			))}
		</div>
	)
}

function MainContent({
	mode,
	task,
	milestones,
	onMakeThis,
	onBack,
	onNextStep,
	onOpenChat,
}: {
	mode: Mode
	task: GalaxyTask | null
	milestones: readonly GalaxyMilestone[]
	onMakeThis: () => void
	onBack: () => void
	onNextStep: () => void
	onOpenChat: () => void
}) {
	const [buildPhase, setBuildPhase] = useState(0)

	useEffect(() => {
		if (mode !== 'building') {
			setBuildPhase(0)
			return
		}
		const t1 = setTimeout(() => setBuildPhase(1), 1200)
		const t2 = setTimeout(() => setBuildPhase(2), 2800)
		return () => {
			clearTimeout(t1)
			clearTimeout(t2)
		}
	}, [mode])

	if (mode === 'plan' || !task) {
		const ready = readyTask(milestones)
		return (
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 16,
					fontFamily: 'Inter, sans-serif',
					padding: 40,
				}}
			>
				<div
					style={{
						fontSize: 10,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						color: C.primary,
					}}
				>
					Your next step
				</div>
				{ready && (
					<>
						<div style={{ fontSize: 24, fontWeight: 600, color: C.text, textAlign: 'center' }}>
							{ready.title}
						</div>
						<div
							style={{
								fontSize: 14,
								color: C.muted,
								fontStyle: 'italic',
								textAlign: 'center',
								maxWidth: 360,
							}}
						>
							You'll learn: {ready.learn}
						</div>
						<button
							type="button"
							onClick={onMakeThis}
							style={{
								marginTop: 12,
								padding: '12px 32px',
								background: C.primary,
								color: '#fff',
								border: 'none',
								borderRadius: 8,
								fontSize: 14,
								fontWeight: 500,
								cursor: 'pointer',
								fontFamily: 'Inter, sans-serif',
								letterSpacing: '0.02em',
								transition: 'background 0.15s',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = '#7a3e69'
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = C.primary
							}}
						>
							Make this now
						</button>
					</>
				)}
			</div>
		)
	}

	if (mode === 'taskFocus') {
		return (
			<div style={{ flex: 1, display: 'flex', fontFamily: 'Inter, sans-serif' }}>
				<div
					style={{
						flex: 1,
						padding: 40,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						maxWidth: 480,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
						{statusDot(task.status, 10)}
						<span
							style={{
								fontSize: 10,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								color: C.primary,
								fontWeight: 500,
							}}
						>
							{task.status === 'done'
								? 'Completed'
								: task.status === 'ready'
									? 'Ready to create'
									: task.status === 'active'
										? 'In progress'
										: 'Locked'}
						</span>
					</div>
					<h2
						style={{
							fontSize: 28,
							fontWeight: 600,
							color: C.text,
							margin: '0 0 12px',
							lineHeight: 1.2,
						}}
					>
						{task.title}
					</h2>
					<p
						style={{
							fontSize: 15,
							color: C.muted,
							fontStyle: 'italic',
							margin: '0 0 24px',
							lineHeight: 1.5,
						}}
					>
						You'll learn: {task.learn}
					</p>

					{task.status === 'ready' && (
						<button
							type="button"
							onClick={onMakeThis}
							style={{
								padding: '14px 32px',
								background: C.primary,
								color: '#fff',
								border: 'none',
								borderRadius: 8,
								fontSize: 14,
								fontWeight: 500,
								cursor: 'pointer',
								fontFamily: 'Inter, sans-serif',
								alignSelf: 'flex-start',
								transition: 'background 0.15s',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = '#7a3e69'
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = C.primary
							}}
						>
							Make this now
						</button>
					)}
					{task.status === 'done' && (
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: '10px 14px',
								background: 'rgba(34,197,94,0.06)',
								borderRadius: 6,
							}}
						>
							{checkIcon()}
							<span style={{ fontSize: 13, color: C.done, fontWeight: 500 }}>Completed</span>
						</div>
					)}
					{(task.status === 'locked' || task.status === 'todo') && (
						<div
							style={{ padding: '10px 14px', background: 'rgba(212,205,208,0.1)', borderRadius: 6 }}
						>
							<span style={{ fontSize: 12, color: C.muted }}>
								Waiting for:{' '}
								{task.dependsOn
									.map((id) => findTask(milestones, id)?.title)
									.filter(Boolean)
									.join(', ') || 'previous steps'}
							</span>
						</div>
					)}
					<button
						type="button"
						onClick={onBack}
						style={{
							marginTop: 24,
							fontSize: 12,
							color: C.muted,
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							fontFamily: 'Inter, sans-serif',
							padding: 0,
							textDecoration: 'underline',
							textUnderlineOffset: 3,
						}}
					>
						Back to overview
					</button>
				</div>

				<div
					style={{
						width: 320,
						borderLeft: `1px solid ${C.border}`,
						padding: 20,
						display: 'flex',
						flexDirection: 'column',
						fontFamily: 'Inter, sans-serif',
					}}
				>
					<div
						style={{
							fontSize: 10,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
							color: C.primary,
							fontWeight: 500,
							marginBottom: 12,
						}}
					>
						Ask about this step
					</div>
					<div
						style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
					>
						<div
							style={{
								padding: '8px 12px',
								background: 'rgba(98,49,83,0.04)',
								borderRadius: '2px 10px 10px 10px',
								fontSize: 12,
								color: C.text,
								lineHeight: 1.4,
							}}
						>
							I'll add a progress summary that shows your weight trend over time. Want me to include
							a weekly average too?
						</div>
						<div
							style={{
								padding: '8px 12px',
								background: 'rgba(255,184,118,0.08)',
								borderRadius: '10px 2px 10px 10px',
								fontSize: 12,
								color: C.text,
								lineHeight: 1.4,
								alignSelf: 'flex-end',
							}}
						>
							Yes, and show the difference from last week
						</div>
						<div
							style={{
								padding: '8px 12px',
								background: 'rgba(98,49,83,0.04)',
								borderRadius: '2px 10px 10px 10px',
								fontSize: 12,
								color: C.text,
								lineHeight: 1.4,
							}}
						>
							Got it! The summary will show daily weight, a 7-day rolling average, and a
							week-over-week change indicator.
						</div>
					</div>
					<div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
						<input
							type="text"
							placeholder="Ask Meldar anything..."
							style={{
								flex: 1,
								padding: '10px 12px',
								border: `1px solid ${C.glassBorder}`,
								borderRadius: 8,
								fontSize: 12,
								fontFamily: 'Inter, sans-serif',
								background: '#fff',
								outline: 'none',
								color: C.text,
							}}
						/>
						<button
							type="button"
							style={{
								padding: '10px 14px',
								background: C.primary,
								color: '#fff',
								border: 'none',
								borderRadius: 8,
								fontSize: 11,
								cursor: 'pointer',
								fontFamily: 'Inter, sans-serif',
								fontWeight: 500,
							}}
						>
							Send
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (mode === 'building') {
		const phases = ['Thinking...', 'Writing code...', 'Almost done...']
		return (
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 20,
					fontFamily: 'Inter, sans-serif',
					padding: 40,
				}}
			>
				<div
					style={{
						width: 48,
						height: 48,
						borderRadius: '50%',
						border: `2px solid ${C.glassBorder}`,
						borderTopColor: C.primary,
						animation: 'spin 1s linear infinite',
					}}
				/>
				<div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{task.title}</div>
				<div style={{ fontSize: 13, color: C.primary, fontStyle: 'italic' }}>
					{phases[buildPhase]}
				</div>
				<div
					style={{
						width: 200,
						height: 4,
						background: 'rgba(0,0,0,0.06)',
						borderRadius: 2,
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							height: '100%',
							width: `${[30, 65, 90][buildPhase]}%`,
							background: `linear-gradient(90deg, ${C.primary}, ${C.peach})`,
							borderRadius: 2,
							transition: 'width 1s ease',
						}}
					/>
				</div>
				<div style={{ fontSize: 11, color: C.muted }}>Meldar is creating this for you</div>
			</div>
		)
	}

	if (mode === 'review') {
		return (
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 16,
					fontFamily: 'Inter, sans-serif',
					padding: 40,
				}}
			>
				<div
					style={{
						width: 48,
						height: 48,
						borderRadius: '50%',
						background: 'rgba(34,197,94,0.1)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
						<title>Complete</title>
						<path
							d="M6 12l4 4 8-8"
							stroke={C.done}
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
				<div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>
					{task.title} is in your app
				</div>
				<div style={{ fontSize: 13, color: C.done, fontWeight: 500 }}>
					You just learned: {task.learn}
				</div>
				<div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
					<button
						type="button"
						onClick={onOpenChat}
						style={{
							padding: '10px 20px',
							background: 'transparent',
							color: C.primary,
							border: `1px solid ${C.glassBorder}`,
							borderRadius: 8,
							fontSize: 13,
							cursor: 'pointer',
							fontFamily: 'Inter, sans-serif',
						}}
					>
						Ask for changes
					</button>
					<button
						type="button"
						onClick={onNextStep}
						style={{
							padding: '10px 20px',
							background: C.primary,
							color: '#fff',
							border: 'none',
							borderRadius: 8,
							fontSize: 13,
							fontWeight: 500,
							cursor: 'pointer',
							fontFamily: 'Inter, sans-serif',
							transition: 'background 0.15s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = '#7a3e69'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = C.primary
						}}
					>
						Next step
					</button>
				</div>
			</div>
		)
	}

	return null
}

const PREVIEW_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#1a1a1a}
.nav{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid #eee}
.logo{width:18px;height:18px;border-radius:4px;background:linear-gradient(135deg,#623153,#FFB876)}
.title{font-size:12px;font-weight:600}.main{padding:16px}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
.stat{padding:12px;border:1px solid #f0eeec}.stat-label{font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:#623153;margin-bottom:2px}
.stat-value{font-size:22px;font-weight:300}.stat-unit{font-size:10px;color:#999}
.chart{height:80px;border-left:1px solid #f0eeec;border-bottom:1px solid #f0eeec;margin-bottom:16px}
.chart svg{width:100%;height:100%}.form{border:1px solid #f0eeec;padding:12px}
.form-title{font-size:11px;font-weight:600;margin-bottom:8px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.input{padding:6px 8px;border:1px solid #e5e5e5;font-size:11px;background:#faf9f6}
.btn{padding:8px 16px;background:#1a1a1a;color:#fff;border:none;font-size:11px;cursor:pointer}
</style></head><body>
<div class="nav"><div class="logo"></div><span class="title">Weight Tracker</span></div>
<div class="main"><div class="stats">
<div class="stat"><div class="stat-label">Current</div><div class="stat-value">72.4 <span class="stat-unit">kg</span></div></div>
<div class="stat"><div class="stat-label">Goal</div><div class="stat-value">68.0 <span class="stat-unit">kg</span></div></div>
<div class="stat"><div class="stat-label">Today</div><div class="stat-value">1,840 <span class="stat-unit">kcal</span></div></div></div>
<div class="chart"><svg viewBox="0 0 400 80" preserveAspectRatio="none">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#623153"/><stop offset="100%" stop-color="#623153" stop-opacity="0"/></linearGradient></defs>
<path d="M10,10 L50,15 L90,12 L140,22 L180,28 L220,32 L260,35 L300,33 L340,38 L380,42 L380,75 L10,75 Z" fill="url(#g)" opacity="0.12"/>
<path d="M10,10 L50,15 L90,12 L140,22 L180,28 L220,32 L260,35 L300,33 L340,38 L380,42" fill="none" stroke="#623153" stroke-width="1.5"/>
</svg></div>
<div class="form"><div class="form-title">Add meal</div>
<div class="form-row"><input class="input" value="Chicken salad"/><input class="input" type="number" value="420"/></div>
<button class="btn">Log meal</button></div></div></body></html>`

function PreviewPane({ mode, previewUrl }: { mode: Mode; previewUrl?: string | null }) {
	const isExpanded = mode === 'review'
	return (
		<div
			style={{
				width: isExpanded ? '50%' : '38%',
				borderLeft: `1px solid ${C.border}`,
				background: '#fff',
				position: 'relative',
				transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					padding: '10px 16px',
					borderBottom: `1px solid ${C.border}`,
					display: 'flex',
					alignItems: 'center',
					gap: 6,
				}}
			>
				<span
					style={{
						width: 6,
						height: 6,
						borderRadius: '50%',
						background: mode === 'building' ? C.peach : C.done,
						boxShadow: mode === 'building' ? `0 0 6px ${C.peach}` : undefined,
						animation: mode === 'building' ? 'pulse-dot 1.5s ease-in-out infinite' : undefined,
					}}
				/>
				<span
					style={{
						fontSize: 10,
						letterSpacing: '0.06em',
						textTransform: 'uppercase',
						color: C.muted,
						fontFamily: 'Inter, sans-serif',
					}}
				>
					{mode === 'building' ? 'Updating...' : 'Your app'}
				</span>
			</div>
			<iframe
				srcDoc={previewUrl ? undefined : PREVIEW_HTML}
				src={previewUrl ?? undefined}
				title="App preview"
				sandbox="allow-scripts"
				style={{ width: '100%', height: 'calc(100% - 37px)', border: 'none', display: 'block' }}
			/>
			{mode === 'review' && (
				<div
					style={{
						position: 'absolute',
						top: 45,
						left: 8,
						right: 8,
						padding: '6px 12px',
						background: 'rgba(34,197,94,0.08)',
						border: '1px solid rgba(34,197,94,0.2)',
						borderRadius: 6,
						fontSize: 11,
						color: C.done,
						fontFamily: 'Inter, sans-serif',
						fontWeight: 500,
						textAlign: 'center',
						animation: 'fadeIn 0.3s ease',
					}}
				>
					Updated just now
				</div>
			)}
		</div>
	)
}

export function GalaxyFallback({
	milestones,
	previewUrl,
	selectedTaskId: controlledTaskId,
	mode: controlledMode,
	onTaskSelect,
	onTaskDeselect,
	onBuildTask,
}: Props) {
	const [localMode, setLocalMode] = useState<Mode>('plan')
	const [localTaskId, setLocalTaskId] = useState<string | null>(null)

	// Controlled mode: when parent provides selectedTaskId + mode, use those.
	// Uncontrolled: fall back to local state (useful for tests / previews).
	const isControlled = controlledTaskId !== undefined
	const focusedTaskId = isControlled ? controlledTaskId : localTaskId
	const mode = isControlled ? (controlledMode ?? 'plan') : localMode

	const focusedTask = focusedTaskId ? (findTask(milestones, focusedTaskId) ?? null) : null
	const ready = readyTask(milestones)

	const handleTaskClick = (task: GalaxyTask) => {
		if (!isControlled) {
			setLocalTaskId(task.id)
			setLocalMode('taskFocus')
		}
		onTaskSelect?.(task)
	}

	const handleMakeThis = () => {
		const target = focusedTask ?? ready
		if (!target) return
		if (!isControlled) {
			setLocalTaskId(target.id)
			setLocalMode('building')
		}
		onBuildTask?.(target)
	}

	const handleBack = () => {
		if (!isControlled) {
			setLocalTaskId(null)
			setLocalMode('plan')
		}
		onTaskDeselect?.()
	}

	const handleNextStep = () => {
		if (ready) {
			if (!isControlled) {
				setLocalTaskId(ready.id)
				setLocalMode('taskFocus')
			}
			onTaskSelect?.(ready)
		} else {
			handleBack()
		}
	}

	return (
		<div
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				background: C.surface,
				borderRadius: 4,
				overflow: 'hidden',
				border: `1px solid ${C.border}`,
			}}
		>
			<style>{`
				@keyframes spin { to { transform: rotate(360deg) } }
				@keyframes pulse-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
				@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
			`}</style>
			<TopBar milestones={milestones} />
			<div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
				<ChapterRail
					milestones={milestones}
					focusedTaskId={focusedTaskId}
					onTaskClick={handleTaskClick}
				/>
				<MainContent
					mode={mode}
					task={focusedTask}
					milestones={milestones}
					onMakeThis={handleMakeThis}
					onBack={handleBack}
					onNextStep={handleNextStep}
					onOpenChat={() => {}}
				/>
				<PreviewPane mode={mode} previewUrl={previewUrl} />
			</div>
		</div>
	)
}
