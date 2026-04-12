import { trackVisitStreak } from '@meldar/tokens'
import { Box, Flex, Grid, styled } from '@styled-system/jsx'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/features/auth'
import { StreakBadge } from '@/features/token-economy'
import { verifyToken } from '@/server/identity/jwt'
import {
	listUserProjects,
	type WorkspaceProjectListItem,
} from '@/server/projects/list-user-projects'
import { formatRelative } from '@/shared/lib/format-relative'
import { Heading, Text } from '@/shared/ui'
import { ContinueBanner, NewProjectButton } from '@/widgets/workspace'

export const metadata: Metadata = {
	title: 'Workspace — Meldar',
	description: 'Your Meldar projects.',
	robots: { index: false, follow: false },
}

export default async function WorkspaceDashboardPage() {
	const cookieStore = await cookies()
	const session = verifyToken(cookieStore.get('meldar-auth')?.value ?? '')
	if (!session) {
		throw new Error(
			'WorkspaceDashboardPage reached without a session — layout should have redirected',
		)
	}

	let projectsList: WorkspaceProjectListItem[] = []
	let loadFailed = false
	let streak = 0
	let isNewDay = false

	const [projectsResult, streakResult] = await Promise.all([
		listUserProjects(session.userId).catch((err) => {
			console.error('[workspace/page] listUserProjects failed', err)
			return null
		}),
		trackVisitStreak(session.userId).catch((err) => {
			console.error('[workspace/page] trackVisitStreak failed', err)
			return { streak: 0, isNewDay: false }
		}),
	])

	streak = streakResult.streak
	isNewDay = streakResult.isNewDay

	if (projectsResult === null) {
		loadFailed = true
	} else {
		projectsList = projectsResult
	}

	if (!loadFailed && projectsList.length === 0) {
		redirect('/onboarding')
	}

	const activeProject = projectsList.find(
		(p) => p.builtSubtasks > 0 && p.builtSubtasks < p.totalSubtasks,
	)

	return (
		<styled.main minHeight="100vh" bg="surface" paddingBlock={{ base: 12, md: 16 }}>
			<Box maxWidth="breakpoint-lg" marginInline="auto" paddingInline={{ base: 6, md: 10 }}>
				<Box
					borderBottom="2px solid"
					borderColor="onSurface"
					paddingBlockEnd={6}
					marginBlockEnd={8}
				>
					<Flex
						direction={{ base: 'column', sm: 'row' }}
						alignItems={{ base: 'flex-start', sm: 'center' }}
						justifyContent="space-between"
						gap={4}
					>
						<Flex alignItems="center" gap={4}>
							<Box>
								<Heading textStyle="primary.xl" as="h1" color="onSurface">
									Your projects
								</Heading>
								<Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" marginBlockStart={2}>
									{session.email}
								</Text>
							</Box>
							<StreakBadge streak={streak} isNewDay={isNewDay} />
						</Flex>
						<SignOutButton />
					</Flex>
				</Box>

				{loadFailed ? (
					<Box
						role="alert"
						paddingInline={6}
						paddingBlock={4}
						border="1px solid"
						borderColor="red.300"
						bg="red.50"
					>
						<Text textStyle="secondary.sm" color="red.700">
							We couldn&apos;t load your projects. Refresh and try again.
						</Text>
					</Box>
				) : projectsList.length === 0 ? (
					<NewProjectButton />
				) : (
					<>
						{activeProject && (
							<ContinueBanner
								projectId={activeProject.id}
								projectName={activeProject.name}
								nextCardTitle={activeProject.nextCardTitle}
							/>
						)}
						<ProjectsGrid projects={projectsList} />
					</>
				)}
			</Box>
		</styled.main>
	)
}

function ProjectsGrid({ projects }: { projects: WorkspaceProjectListItem[] }) {
	return (
		<Box>
			<Flex justifyContent="flex-end" marginBlockEnd={6}>
				<NewProjectButton />
			</Flex>
			<Grid
				gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
				gap={0}
			>
				{projects.map((project, i) => (
					<ProjectCard key={project.id} project={project} number={String(i + 1).padStart(2, '0')} />
				))}
			</Grid>
		</Box>
	)
}

type ProjectStatus = 'planning' | 'ready' | 'in_progress' | 'needs_attention' | 'shipped'

function deriveProjectStatus(p: WorkspaceProjectListItem): ProjectStatus {
	if (p.totalSubtasks === 0 && p.totalMilestones === 0) return 'planning'
	if (p.totalSubtasks > 0 && p.builtSubtasks === 0) return 'ready'
	if (p.failedSubtasks > 0) return 'needs_attention'
	if (p.builtSubtasks === p.totalSubtasks && p.totalSubtasks > 0) return 'shipped'
	return 'in_progress'
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
	planning: { label: 'Planning', color: 'onSurfaceVariant' },
	ready: { label: 'Ready', color: 'primary' },
	in_progress: { label: 'In progress', color: 'primary' },
	needs_attention: { label: 'Attention', color: 'amber.700' },
	shipped: { label: 'Shipped', color: 'green.700' },
}

const StyledLink = styled(Link)

function ProjectCard({ project, number }: { project: WorkspaceProjectListItem; number: string }) {
	const status = deriveProjectStatus(project)
	const config = STATUS_CONFIG[status]
	const progressPct =
		project.totalSubtasks > 0
			? Math.round((project.builtSubtasks / project.totalSubtasks) * 100)
			: 0

	const subtitle =
		project.totalMilestones > 0
			? `Milestone ${Math.min(project.completedMilestones + 1, project.totalMilestones)} of ${project.totalMilestones}`
			: project.lastBuildAt
				? `Last activity ${formatRelative(project.lastBuildAt.getTime())}`
				: 'No activity yet'

	const ctaLabel = status === 'planning' ? 'Set up' : status === 'shipped' ? 'Open' : 'Continue'

	return (
		<styled.article
			bg="surface"
			border="1px solid"
			borderColor="onSurface/15"
			transition="all 0.2s ease"
			_hover={{ bg: 'primary/3', borderColor: 'onSurface/40' }}
			_focusWithin={{ borderColor: 'primary' }}
		>
			<StyledLink
				href={`/workspace/${project.id}`}
				display="block"
				paddingBlock={{ base: 5, md: 6 }}
				paddingInline={{ base: 5, md: 6 }}
				color="onSurface"
				textDecoration="none"
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '-2px',
				}}
			>
				<Flex justifyContent="space-between" alignItems="baseline" marginBlockEnd={4}>
					<Text textStyle="tertiary.sm" color="primary">
						Nº {number}
					</Text>
					<Text textStyle="tertiary.sm" color={config.color}>
						{config.label}
					</Text>
				</Flex>

				<Heading
					textStyle="primary.sm"
					as="h3"
					color="onSurface"
					textOverflow="ellipsis"
					overflow="hidden"
					whiteSpace="nowrap"
				>
					{project.name}
				</Heading>

				<Text as="p" textStyle="secondary.xs" color="onSurfaceVariant/70" marginBlockStart={1}>
					{subtitle}
				</Text>

				{project.totalSubtasks > 0 && (
					<Box marginBlockStart={4}>
						<Box
							role="progressbar"
							aria-valuenow={progressPct}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label={`Project progress: ${progressPct}%`}
							height="2px"
							bg="onSurface/10"
							overflow="hidden"
						>
							<Box
								height="100%"
								width={`${progressPct}%`}
								bg={status === 'shipped' ? 'green.600' : 'primary'}
								transition="width 0.3s ease"
								style={{ transformOrigin: 'left', animation: 'inkProgress 0.8s ease-out both' }}
							/>
						</Box>
						<Text as="p" textStyle="tertiary.sm" color="onSurfaceVariant/50" marginBlockStart={2}>
							{project.builtSubtasks} of {project.totalSubtasks} steps
						</Text>
					</Box>
				)}

				{project.nextCardTitle && status !== 'shipped' && (
					<Text
						textStyle="italic.sm"
						as="p"
						color="onSurfaceVariant/60"
						marginBlockStart={3}
						textOverflow="ellipsis"
						overflow="hidden"
						whiteSpace="nowrap"
					>
						— Next: {project.nextCardTitle}
					</Text>
				)}

				<Flex
					alignItems="center"
					gap={2}
					marginBlockStart={4}
					paddingBlockStart={4}
					borderTop="1px solid"
					borderColor="onSurface/10"
				>
					<Text textStyle="primary.xs" color="primary">
						{ctaLabel}
					</Text>
					<ArrowRight size={14} color="#623153" />
				</Flex>
			</StyledLink>
		</styled.article>
	)
}
