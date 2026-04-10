import { getDb } from '@meldar/db/client'
import { type DeploymentStatus, deploymentLog } from '@meldar/db/schema'

export type RecordDeploymentArgs = {
	readonly userId: string
	readonly projectId?: string
	readonly buildId?: string
	readonly vercelProjectId?: string
	readonly vercelDeploymentId?: string
	readonly slug?: string
	readonly url?: string
	readonly status: DeploymentStatus
	readonly errorCode?: string
	readonly errorMessage?: string
	readonly apiLatencyMs: number
	readonly buildDurationMs?: number
	readonly completedAt?: Date
}

export function recordDeployment(args: RecordDeploymentArgs): void {
	try {
		const db = getDb()
		void db
			.insert(deploymentLog)
			.values({
				userId: args.userId,
				projectId: args.projectId ?? null,
				buildId: args.buildId ?? null,
				vercelProjectId: args.vercelProjectId ?? null,
				vercelDeploymentId: args.vercelDeploymentId ?? null,
				slug: args.slug ?? null,
				url: args.url ?? null,
				status: args.status,
				errorCode: args.errorCode ?? null,
				errorMessage: args.errorMessage ?? null,
				apiLatencyMs: args.apiLatencyMs,
				buildDurationMs: args.buildDurationMs ?? 0,
				completedAt: args.completedAt ?? null,
			})
			.catch((err) => {
				console.error(
					'[deployment-log] insert failed',
					err instanceof Error ? err.message : 'Unknown',
				)
			})
	} catch (err) {
		console.error(
			'[deployment-log] fire-and-forget threw',
			err instanceof Error ? err.message : 'Unknown',
		)
	}
}
