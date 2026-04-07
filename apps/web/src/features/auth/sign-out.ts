export type SignOutResult = { ok: true } | { ok: false; message: string }

export async function performSignOut(fetchImpl: typeof fetch = fetch): Promise<SignOutResult> {
	let res: Response
	try {
		res = await fetchImpl('/api/auth/me', { method: 'DELETE' })
	} catch {
		return { ok: false, message: 'Network error. Try again.' }
	}
	if (!res.ok) {
		return { ok: false, message: 'Sign out failed. Try again.' }
	}
	return { ok: true }
}
