import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/server/identity/jwt'
import { sanitizeNextParam } from '@/shared/lib/sanitize-next-param'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
	const cookieStore = await cookies()
	const session = verifyToken(cookieStore.get('meldar-auth')?.value ?? '')
	if (!session) {
		const requestHeaders = await headers()
		const candidate =
			requestHeaders.get('next-url') ?? extractPathnameFromReferer(requestHeaders.get('referer'))
		const next = sanitizeNextParam(candidate, { mustStartWith: '/workspace' })
		redirect(`/sign-in?next=${encodeURIComponent(next)}`)
	}
	return <>{children}</>
}

function extractPathnameFromReferer(referer: string | null): string | null {
	if (!referer) return null
	try {
		return new URL(referer).pathname
	} catch {
		return null
	}
}
