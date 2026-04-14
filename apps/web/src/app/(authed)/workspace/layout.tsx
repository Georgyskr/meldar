import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authenticateSession } from '@/server/identity/authenticate-session'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'
import { EmailVerificationBanner } from '@/widgets/workspace'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
	const cookieValue = (await cookies()).get('meldar-auth')?.value ?? ''
	const result = await authenticateSession(cookieValue)

	if (result.state === 'valid') {
		return (
			<>
				<EmailVerificationBanner
					email={result.session.email}
					verified={result.session.emailVerified}
				/>
				{children}
			</>
		)
	}

	if (result.state === 'stale') {
		redirect('/sign-in?error=session-expired')
	}

	const requestHeaders = await headers()
	const candidate =
		requestHeaders.get('next-url') ?? extractPathnameFromReferer(requestHeaders.get('referer'))
	const next = sanitizeNextParam(candidate, { mustStartWith: '/workspace' })
	redirect(`/sign-in?next=${encodeURIComponent(next)}`)
}

function extractPathnameFromReferer(referer: string | null): string | null {
	if (!referer) return null
	try {
		return new URL(referer).pathname
	} catch {
		return null
	}
}
