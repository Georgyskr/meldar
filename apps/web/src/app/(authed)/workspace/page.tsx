import { getDb } from '@meldar/db/client'
import { getTokenBalance } from '@meldar/tokens'
import { Box, Flex, Grid, styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { SignOutButton } from '@/features/auth'
import { verifyToken } from '@/server/identity/jwt'
import {
	listUserProjects,
	type WorkspaceProjectListItem,
} from '@/server/projects/list-user-projects'
import { formatRelative } from '@/shared/lib/format-relative'
import { EmailVerificationBanner, FirstTimeWelcome, NewProjectButton } from '@/widgets/workspace'

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
	let tokenBalance = 0

	const db = getDb()
	const [projectsResult, balanceResult] = await Promise.all([
		listUserProjects(session.userId).catch((err) => {
			console.error('[workspace/page] listUserProjects failed', err)
			return null
		}),
		getTokenBalance(db, session.userId).catch((err) => {
			console.error('[workspace/page] getTokenBalance failed', err)
			return 0
		}),
	])

	tokenBalance = balanceResult

	if (projectsResult === null) {
		loadFailed = true
	} else {
		projectsList = projectsResult
	}

	return (
		<styled.main minHeight="100vh" bg="surface" paddingBlock={{ base: 12, md: 16 }}>
			<Box maxWidth="breakpoint-lg" marginInline="auto" paddingInline={{ base: 6, md: 10 }}>
				<EmailVerificationBanner email={session.email} verified={session.emailVerified} />
				<Flex
					direction={{ base: 'column', sm: 'row' }}
					alignItems={{ base: 'flex-start', sm: 'center' }}
					justifyContent="space-between"
					gap={4}
					marginBlockEnd={12}
				>
					<Box>
						<styled.h1
							fontFamily="heading"
							fontSize={{ base: '3xl', md: '4xl' }}
							fontWeight="700"
							letterSpacing="-0.03em"
							color="onSurface"
						>
							Your projects
						</styled.h1>
						<styled.p textStyle="body.sm" color="onSurfaceVariant" marginBlockStart={2}>
							{session.email}
						</styled.p>
					</Box>
					<SignOutButton />
				</Flex>

				{loadFailed ? (
					<styled.div
						role="alert"
						paddingInline={4}
						paddingBlock={3}
						bg="surfaceContainerHigh"
						color="red.500"
						borderRadius="md"
					>
						We couldn&apos;t load your projects. Refresh and try again.
					</styled.div>
				) : projectsList.length === 0 ? (
					<FirstTimeWelcome email={session.email} tokenBalance={tokenBalance} />
				) : (
					<ProjectsGrid projects={projectsList} />
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
				gap={5}
			>
				{projects.map((project) => (
					<ProjectCard key={project.id} project={project} />
				))}
			</Grid>
		</Box>
	)
}

const StyledLink = styled(Link)

function ProjectCard({ project }: { project: WorkspaceProjectListItem }) {
	const subtitle = project.lastBuildAt
		? `Last build ${formatRelative(project.lastBuildAt.getTime())}`
		: 'No builds yet'

	return (
		<styled.article
			bg="surfaceContainerLowest"
			border="1px solid"
			borderColor="outlineVariant"
			borderRadius="lg"
			transition="all 0.2s ease"
			_hover={{
				borderColor: 'primary',
				transform: 'translateY(-2px)',
				boxShadow: '0 8px 24px rgba(98,49,83,0.08)',
			}}
			_focusWithin={{
				borderColor: 'primary',
			}}
		>
			<StyledLink
				href={`/workspace/${project.id}`}
				display="block"
				padding={5}
				color="onSurface"
				textDecoration="none"
				_focusVisible={{
					outline: '2px solid',
					outlineColor: 'primary',
					outlineOffset: '2px',
					borderRadius: 'lg',
				}}
			>
				<styled.h3
					fontFamily="heading"
					fontSize="lg"
					fontWeight="600"
					color="onSurface"
					marginBlockEnd={2}
					textOverflow="ellipsis"
					overflow="hidden"
					whiteSpace="nowrap"
				>
					{project.name}
				</styled.h3>
				<styled.p textStyle="body.xs" color="onSurfaceVariant/70">
					{subtitle}
				</styled.p>
			</StyledLink>
		</styled.article>
	)
}
