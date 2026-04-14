import type { AuthResult } from '@/server/identity/authenticate-session'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'

export type RedirectDecision =
	| { kind: 'redirect'; to: string }
	| { kind: 'render'; errorMessage: string | null }

const ERROR_COPY: Record<string, string> = {
	'session-expired': 'Your session expired. Please sign in again.',
}

export function decideSignInRedirect(
	auth: AuthResult,
	params: { next?: string; error?: string },
): RedirectDecision {
	if (auth.state === 'valid') {
		return {
			kind: 'redirect',
			to: sanitizeNextParam(params.next, { mustStartWith: '/workspace' }),
		}
	}
	const errorMessage = params.error ? (ERROR_COPY[params.error] ?? null) : null
	return { kind: 'render', errorMessage }
}
