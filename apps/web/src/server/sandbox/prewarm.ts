import { CloudflareSandboxProvider } from '@meldar/sandbox'

export async function prewarmSandbox(projectId: string): Promise<void> {
	try {
		const provider = CloudflareSandboxProvider.fromEnv()
		await provider.prewarm(projectId)
	} catch (err) {
		console.warn(
			`[prewarmSandbox] failed for ${projectId}:`,
			err instanceof Error ? err.message : err,
		)
	}
}
