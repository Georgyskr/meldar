/* biome-ignore-all lint/suspicious: 3D scene graph + Html overlays */
/* biome-ignore-all lint/a11y: R3F Html uses native click handlers */
/* biome-ignore-all lint/correctness: intentional patterns */
'use client'

import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GalaxyMilestone, GalaxyTask, GalaxyTaskStatus } from '../model/types'
import { PreviewThumbnail } from './PreviewThumbnail'

type TaskStatus = GalaxyTaskStatus
type SpatialTask = GalaxyTask
type SpatialMilestone = GalaxyMilestone

interface Props {
	milestones: readonly GalaxyMilestone[]
	previewUrl?: string | null
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
}

type ViewState = 'focus' | 'overview'

/* ─── Layout: focused around the ready task ─── */
function computePositions(milestones: readonly SpatialMilestone[]): {
	positions: Map<string, THREE.Vector3>
	readyTaskId: string | null
	overviewCenter: THREE.Vector3
} {
	const positions = new Map<string, THREE.Vector3>()
	const flat: { task: SpatialTask; milestoneIndex: number }[] = []
	milestones.forEach((m, mi) => {
		m.tasks.forEach((t) => flat.push({ task: t, milestoneIndex: mi }))
	})

	const readyIdx = flat.findIndex((f) => f.task.status === 'ready')
	const readyTaskId = readyIdx >= 0 ? flat[readyIdx].task.id : null

	const doneTasks = flat.filter((f) => f.task.status === 'done')
	const activeTasks = flat.filter((f) => f.task.status === 'active')
	const lockedTasks = flat.filter((f) => f.task.status === 'locked' || f.task.status === 'todo')
	const readyTask = readyIdx >= 0 ? flat[readyIdx] : null

	if (readyTask) {
		positions.set(readyTask.task.id, new THREE.Vector3(0, 0.1, 0))
	}

	activeTasks.forEach((f, i) => {
		const angle = (i / Math.max(activeTasks.length, 1)) * Math.PI - Math.PI / 2
		positions.set(
			f.task.id,
			new THREE.Vector3(Math.cos(angle) * 1.3 - 1.2, -0.1, Math.sin(angle) * 0.4),
		)
	})

	doneTasks.forEach((f, i) => {
		const row = Math.floor(i / 3)
		const col = i % 3
		const x = (col - 1) * 0.9 + ((i * 37) % 10) / 50
		const y = -0.5 - row * 0.25 + ((i * 17) % 10) / 100
		const z = 2.5 + row * 1.2 + ((i * 23) % 10) / 40
		positions.set(f.task.id, new THREE.Vector3(x, y, z))
	})

	lockedTasks.forEach((f, i) => {
		const row = Math.floor(i / 4)
		const col = i % 4
		const x = (col - 1.5) * 1.2
		const y = 0.4 + row * 0.35 + ((i * 13) % 10) / 80
		const z = -3.5 - row * 1.4 - ((i * 29) % 10) / 30
		positions.set(f.task.id, new THREE.Vector3(x, y, z))
	})

	return { positions, readyTaskId, overviewCenter: new THREE.Vector3(0, 0, 0) }
}

/* ─── Focused Glass Card (ready or active) ─── */
function FocusedCard({
	task,
	position,
	isPrimary,
	expanded,
	dimmed,
	onSelect,
	onClose,
	onBuild,
	entranceDelay,
}: {
	task: SpatialTask
	position: THREE.Vector3
	isPrimary: boolean
	expanded: boolean
	dimmed: boolean
	onSelect: () => void
	onClose: () => void
	onBuild: () => void
	entranceDelay: number
}) {
	const [hovered, setHovered] = useState(false)
	const [visible, setVisible] = useState(false)
	const glowRef = useRef<THREE.Mesh>(null)

	useEffect(() => {
		const t = setTimeout(() => setVisible(true), entranceDelay)
		return () => clearTimeout(t)
	}, [entranceDelay])

	useFrame((state) => {
		if (!glowRef.current || !isPrimary) return
		const mat = glowRef.current.material as THREE.MeshBasicMaterial
		mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 1.6) * 0.04
	})

	if (!visible) return null

	const isReady = task.status === 'ready'
	const baseWidth = isPrimary ? 220 : 160
	const expandedWidth = 320
	const borderColor = isReady ? C.peach : C.primary

	return (
		<group>
			{isPrimary && isReady && (
				<mesh ref={glowRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
					<ringGeometry args={[0.4, 0.5, 48]} />
					<meshBasicMaterial color={C.peach} transparent opacity={0.1} side={THREE.DoubleSide} />
				</mesh>
			)}

			<mesh position={position}>
				<planeGeometry args={[1.2, 0.7]} />
				<meshBasicMaterial transparent opacity={0.01} side={THREE.DoubleSide} />
			</mesh>

			<Html
				center
				position={position}
				style={{
					pointerEvents: dimmed ? 'none' : 'auto',
					opacity: dimmed ? 0.2 : 1,
					transition: 'opacity 0.4s ease',
				}}
			>
				<div
					onClick={(e) => {
						e.stopPropagation()
						if (expanded) onClose()
						else onSelect()
					}}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					style={{
						width: expanded ? expandedWidth : baseWidth,
						padding: expanded ? '18px 22px' : isPrimary ? '14px 18px' : '10px 14px',
						background: 'rgba(250,249,246,0.82)',
						backdropFilter: 'blur(24px)',
						WebkitBackdropFilter: 'blur(24px)',
						border: `1px solid rgba(98,49,83,${hovered || expanded ? '0.22' : '0.1'})`,
						borderLeft: `3px solid ${borderColor}`,
						borderRadius: 14,
						boxShadow:
							hovered || expanded
								? isReady
									? `0 0 32px rgba(255,184,118,0.28), 0 12px 32px rgba(0,0,0,0.1)`
									: `0 12px 32px rgba(0,0,0,0.1)`
								: isReady
									? `0 0 24px rgba(255,184,118,0.18), 0 6px 20px rgba(0,0,0,0.06)`
									: `0 6px 20px rgba(0,0,0,0.06)`,
						cursor: 'pointer',
						fontFamily: 'Inter, sans-serif',
						transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
						transform: hovered && !expanded ? 'scale(1.03)' : 'scale(1)',
						animation: 'spatialCardIn 0.6s cubic-bezier(0.16,1,0.3,1) both',
					}}
				>
					{/* Status label */}
					<div
						style={{
							fontSize: 9,
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
							color: isReady ? C.peach : C.primary,
							fontWeight: 600,
							marginBottom: 6,
						}}
					>
						{isReady ? 'Your next step' : 'In progress'}
					</div>

					{/* Title */}
					<div
						style={{
							fontSize: expanded ? 18 : isPrimary ? 16 : 13,
							fontWeight: 600,
							color: C.text,
							lineHeight: 1.25,
							marginBottom: isPrimary || expanded ? 8 : 4,
						}}
					>
						{task.title}
					</div>

					{/* Learn text — visible on primary always, on hover for secondary */}
					{(isPrimary || expanded || hovered) && (
						<div
							style={{
								fontSize: expanded ? 13 : 12,
								color: C.muted,
								fontStyle: 'italic',
								lineHeight: 1.4,
								marginBottom: isPrimary || expanded ? 14 : 0,
							}}
						>
							You'll learn: {task.learn}
						</div>
					)}

					{/* Make this now — always visible on primary ready card */}
					{isReady && isPrimary && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								onBuild()
							}}
							style={{
								width: '100%',
								padding: '12px 0',
								background: C.primary,
								color: '#fff',
								border: 'none',
								borderRadius: 8,
								fontSize: 13,
								fontWeight: 500,
								cursor: 'pointer',
								fontFamily: 'Inter, sans-serif',
								letterSpacing: '0.02em',
								transition: 'background 0.15s, transform 0.15s',
								boxShadow: `0 4px 12px rgba(98,49,83,0.2)`,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = '#7a3e69'
								e.currentTarget.style.transform = 'translateY(-1px)'
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = C.primary
								e.currentTarget.style.transform = 'translateY(0)'
							}}
						>
							Make this now
						</button>
					)}

					{/* In-progress indicator */}
					{task.status === 'active' && (
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								marginTop: isPrimary ? 4 : 2,
							}}
						>
							<div
								style={{
									width: 10,
									height: 10,
									borderRadius: '50%',
									border: `1.5px solid ${C.primary}`,
									borderTopColor: 'transparent',
									animation: 'spin 1s linear infinite',
								}}
							/>
							<span style={{ fontSize: 11, color: C.primary, fontStyle: 'italic' }}>
								Meldar is working...
							</span>
						</div>
					)}
				</div>
			</Html>
		</group>
	)
}

/* ─── Done Dot (minimal) ─── */
function DoneDot({
	task,
	position,
	dimmed,
	entranceDelay,
}: {
	task: SpatialTask
	position: THREE.Vector3
	dimmed: boolean
	entranceDelay: number
}) {
	const meshRef = useRef<THREE.Mesh>(null)
	const [hovered, setHovered] = useState(false)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const t = setTimeout(() => setVisible(true), entranceDelay)
		return () => clearTimeout(t)
	}, [entranceDelay])

	useFrame(() => {
		if (!meshRef.current || !visible) return
		const target = hovered ? 1.5 : 1
		const s = meshRef.current.scale.x
		meshRef.current.scale.setScalar(s + (target - s) * 0.1)
	})

	if (!visible) return null

	return (
		<group>
			<mesh
				ref={meshRef}
				position={position}
				onPointerOver={(e) => {
					e.stopPropagation()
					setHovered(true)
				}}
				onPointerOut={() => setHovered(false)}
			>
				<sphereGeometry args={[0.08, 16, 16]} />
				<meshStandardMaterial
					color={C.done}
					emissive={C.done}
					emissiveIntensity={0.3}
					roughness={0.4}
					metalness={0.3}
					transparent
					opacity={dimmed ? 0.15 : 0.6}
				/>
			</mesh>

			{hovered && !dimmed && (
				<Html
					center
					position={[position.x, position.y + 0.2, position.z]}
					style={{ pointerEvents: 'none' }}
				>
					<div
						style={{
							whiteSpace: 'nowrap',
							padding: '3px 10px',
							background: 'rgba(250,249,246,0.92)',
							backdropFilter: 'blur(8px)',
							borderRadius: 12,
							border: '1px solid rgba(34,197,94,0.2)',
							fontSize: 10,
							fontFamily: 'Inter, sans-serif',
							color: C.text,
							fontWeight: 500,
						}}
					>
						{task.title} · <span style={{ color: C.done, fontSize: 9 }}>done</span>
					</div>
				</Html>
			)}
		</group>
	)
}

/* ─── Locked Dot (barely there) ─── */
function LockedDot({
	position,
	dimmed,
	entranceDelay,
}: {
	position: THREE.Vector3
	dimmed: boolean
	entranceDelay: number
}) {
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const t = setTimeout(() => setVisible(true), entranceDelay)
		return () => clearTimeout(t)
	}, [entranceDelay])

	if (!visible) return null

	return (
		<mesh position={position}>
			<sphereGeometry args={[0.04, 12, 12]} />
			<meshStandardMaterial
				color={C.locked}
				emissive={C.locked}
				emissiveIntensity={0.02}
				roughness={0.6}
				transparent
				opacity={dimmed ? 0.05 : 0.2}
			/>
		</mesh>
	)
}

/* ─── Camera Controller ─── */
function CameraController({
	target,
	viewState,
}: {
	target: THREE.Vector3 | null
	viewState: ViewState
}) {
	const { camera } = useThree()
	const lookRef = useRef(new THREE.Vector3(0, 0, 0))
	const focusPos = useMemo(() => new THREE.Vector3(0, 0.6, 3.2), [])
	const overviewPos = useMemo(() => new THREE.Vector3(0, 2, 8.5), [])

	useFrame(() => {
		if (target) {
			const desired = target.clone().add(new THREE.Vector3(0, 0.2, 1.6))
			camera.position.lerp(desired, 0.05)
			lookRef.current.lerp(target, 0.05)
		} else if (viewState === 'focus') {
			camera.position.lerp(focusPos, 0.03)
			lookRef.current.lerp(new THREE.Vector3(0, 0.1, 0), 0.03)
		} else {
			camera.position.lerp(overviewPos, 0.03)
			lookRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.03)
		}
		camera.lookAt(lookRef.current)
	})

	return null
}

/* ─── Scene ─── */
function Scene({
	milestones,
	onTaskSelect,
	onTaskDeselect,
	onBuildTask,
	viewState,
}: Props & { viewState: ViewState }) {
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [selectedPos, setSelectedPos] = useState<THREE.Vector3 | null>(null)

	const { positions, readyTaskId } = useMemo(() => computePositions(milestones), [milestones])

	const handleSelect = useCallback(
		(task: SpatialTask) => {
			if (selectedId === task.id) {
				setSelectedId(null)
				setSelectedPos(null)
				onTaskDeselect?.()
			} else {
				setSelectedId(task.id)
				setSelectedPos(positions.get(task.id) ?? null)
				onTaskSelect?.(task)
			}
		},
		[selectedId, positions, onTaskSelect, onTaskDeselect],
	)

	const handleClose = useCallback(() => {
		setSelectedId(null)
		setSelectedPos(null)
		onTaskDeselect?.()
	}, [onTaskDeselect])

	let taskIndex = 0

	return (
		<>
			{/* Explicit scene background — prevents WebGL default black clear */}
			<color attach="background" args={[C.surface]} />

			{/* Warm ambient lighting — like a lit room, not space */}
			<ambientLight intensity={0.95} />
			<directionalLight position={[4, 6, 4]} intensity={0.7} color="#fff8f0" />
			<pointLight position={[-3, 2, 2]} intensity={0.25} color={C.primary} />
			<pointLight position={[0, 0, 3]} intensity={0.3} color={C.peach} />

			{/* Soft fog matching the cream surface */}
			<fog attach="fog" args={[C.surface, 8, 22]} />

			{milestones
				.flatMap((m) => m.tasks)
				.map((t) => {
					const pos = positions.get(t.id)
					if (!pos) return null

					const delay = taskIndex * 140
					taskIndex++
					const isDimmed = selectedId !== null && selectedId !== t.id
					const isExpanded = selectedId === t.id
					const isPrimary = t.id === readyTaskId

					if (t.status === 'ready' || t.status === 'active') {
						return (
							<FocusedCard
								key={t.id}
								task={t}
								position={pos}
								isPrimary={isPrimary || t.status === 'active'}
								expanded={isExpanded}
								dimmed={isDimmed}
								onSelect={() => handleSelect(t)}
								onClose={handleClose}
								onBuild={() => onBuildTask?.(t)}
								entranceDelay={delay}
							/>
						)
					}

					if (t.status === 'done') {
						return (
							<DoneDot key={t.id} task={t} position={pos} dimmed={isDimmed} entranceDelay={delay} />
						)
					}

					return <LockedDot key={t.id} position={pos} dimmed={isDimmed} entranceDelay={delay} />
				})}

			<CameraController target={selectedPos} viewState={viewState} />
			<OrbitControls
				makeDefault
				enablePan={false}
				enableZoom
				enableRotate
				minDistance={2.5}
				maxDistance={12}
				autoRotate={false}
				dampingFactor={0.08}
				enableDamping
				maxPolarAngle={Math.PI * 0.65}
				minPolarAngle={Math.PI * 0.28}
				target={[0, 0, 0]}
			/>
		</>
	)
}

/* ─── Export ─── */
export function GalaxyCanvas({
	milestones,
	previewUrl,
	onTaskSelect,
	onTaskDeselect,
	onBuildTask,
}: Props) {
	const [viewState, setViewState] = useState<ViewState>('focus')

	const doneCount = useMemo(
		() => milestones.flatMap((m) => m.tasks).filter((t) => t.status === 'done').length,
		[milestones],
	)
	const totalCount = useMemo(() => milestones.flatMap((m) => m.tasks).length, [milestones])

	return (
		<>
			<style>{`
				@keyframes spatialCardIn { from { opacity: 0; transform: scale(0.85) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
				@keyframes spin { to { transform: rotate(360deg) } }
				@keyframes hintFade { 0%,100% { opacity: 0.5 } 50% { opacity: 0.9 } }
			`}</style>

			<Canvas
				camera={{ position: [0, 0.6, 3.2], fov: 48 }}
				dpr={[1, 2]}
				gl={{ antialias: true, alpha: false }}
				style={{ background: C.surface, position: 'absolute', inset: 0, zIndex: 2 }}
			>
				<Scene
					milestones={milestones}
					onTaskSelect={onTaskSelect}
					onTaskDeselect={onTaskDeselect}
					onBuildTask={onBuildTask}
					viewState={viewState}
				/>
			</Canvas>

			{/* Progress context — top-left */}
			<div
				style={{
					position: 'absolute',
					top: 20,
					left: 24,
					zIndex: 10,
					pointerEvents: 'none',
					fontFamily: 'Inter, sans-serif',
				}}
			>
				<div
					style={{
						fontSize: 9,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						color: C.primary,
						fontWeight: 500,
						marginBottom: 2,
					}}
				>
					Progress
				</div>
				<div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
					{doneCount} of {totalCount} steps
				</div>
			</div>

			{/* View toggle — top-right */}
			<div
				style={{
					position: 'absolute',
					top: 20,
					right: 24,
					zIndex: 10,
					display: 'flex',
					gap: 0,
					border: '1px solid rgba(98,49,83,0.15)',
					borderRadius: 6,
					overflow: 'hidden',
					background: 'rgba(250,249,246,0.85)',
					backdropFilter: 'blur(12px)',
				}}
			>
				{(['focus', 'overview'] as const).map((v) => (
					<button
						key={v}
						type="button"
						onClick={() => setViewState(v)}
						style={{
							padding: '7px 14px',
							fontSize: 10,
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
							fontWeight: 500,
							border: 'none',
							background: viewState === v ? 'rgba(98,49,83,0.1)' : 'transparent',
							color: viewState === v ? C.primary : C.muted,
							cursor: 'pointer',
							fontFamily: 'Inter, sans-serif',
							transition: 'all 0.15s',
						}}
					>
						{v === 'focus' ? 'Focus' : 'See full plan'}
					</button>
				))}
			</div>

			{/* Bottom hint */}
			<div
				style={{
					position: 'absolute',
					bottom: 24,
					left: '50%',
					transform: 'translateX(-50%)',
					zIndex: 10,
					pointerEvents: 'none',
					fontFamily: 'Inter, sans-serif',
					fontSize: 10,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					color: C.muted,
					animation: 'hintFade 3s ease-in-out infinite',
				}}
			>
				{viewState === 'focus'
					? 'Drag to look around · Scroll to zoom'
					: 'See how everything connects'}
			</div>

			{/* Persistent app preview thumbnail */}
			<PreviewThumbnail previewUrl={previewUrl} />
		</>
	)
}
