import { type NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/server/identity/jwt'

const PUBLIC_POST_PATHS = ['/bookings']

function isPublicBookingPost(request: NextRequest): boolean {
	if (request.method !== 'POST') return false
	return PUBLIC_POST_PATHS.some((p) => request.nextUrl.pathname.endsWith(p))
}

export function middleware(request: NextRequest): NextResponse | undefined {
	if (!request.nextUrl.pathname.startsWith('/api/workspace')) {
		return undefined
	}

	if (isPublicBookingPost(request)) {
		return NextResponse.next()
	}

	const user = getUserFromRequest(request)
	if (!user) {
		return NextResponse.json(
			{ error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
			{ status: 401 },
		)
	}

	return NextResponse.next()
}

export const config = {
	matcher: '/api/workspace/:path*',
}
