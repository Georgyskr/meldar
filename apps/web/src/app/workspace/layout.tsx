import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/server/identity/jwt'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
	const cookieStore = await cookies()
	const session = verifyToken(cookieStore.get('meldar-auth')?.value ?? '')
	if (!session) {
		redirect('/')
	}
	return <>{children}</>
}
