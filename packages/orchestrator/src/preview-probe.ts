import { PREVIEW_PROBE_BODY_PREVIEW_MAX, type PreviewProbeData } from '@meldar/storage'

export const PREVIEW_PROBE_TIMEOUT_MS = 10_000 as const

export type PreviewProbeFetch = (
	url: string,
	init: { signal: AbortSignal },
) => Promise<{ status: number; text: () => Promise<string> }>

export async function probePreviewUrl(
	url: string,
	options?: { fetchImpl?: PreviewProbeFetch; timeoutMs?: number },
): Promise<PreviewProbeData> {
	const fetchImpl: PreviewProbeFetch =
		options?.fetchImpl ?? ((u, init) => fetch(u, init) as unknown as ReturnType<PreviewProbeFetch>)
	const timeoutMs = options?.timeoutMs ?? PREVIEW_PROBE_TIMEOUT_MS

	try {
		const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) })
		const body = await response.text()
		return {
			status: response.status,
			bodyLength: body.length,
			bodyPreview: body.slice(0, PREVIEW_PROBE_BODY_PREVIEW_MAX),
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return {
			status: -1,
			bodyLength: 0,
			bodyPreview: message.slice(0, PREVIEW_PROBE_BODY_PREVIEW_MAX),
		}
	}
}
