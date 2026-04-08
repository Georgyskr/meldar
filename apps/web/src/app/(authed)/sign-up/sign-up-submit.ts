import { z } from 'zod'

export const signUpInputSchema = z.object({
	email: z.string().trim().email('Enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignUpInput = z.infer<typeof signUpInputSchema>

const signUpResponseSchema = z.object({
	success: z.literal(true),
	userId: z.string().uuid(),
})

export type SignUpResult =
	| { ok: true; userId: string }
	| { ok: false; message: string; field?: 'email' | 'password' | 'form' }

export async function submitSignUp(
	rawInput: unknown,
	fetchImpl: typeof fetch = fetch,
): Promise<SignUpResult> {
	const parsed = signUpInputSchema.safeParse(rawInput)
	if (!parsed.success) {
		const first = parsed.error.issues[0]
		const field = first?.path[0]
		return {
			ok: false,
			message: first?.message ?? 'Invalid input',
			field: field === 'email' || field === 'password' ? field : 'form',
		}
	}

	let res: Response
	try {
		res = await fetchImpl('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(parsed.data),
		})
	} catch {
		return { ok: false, message: 'Network error. Try again.', field: 'form' }
	}

	if (!res.ok) {
		let message = `Could not create account (${res.status})`
		try {
			const json = (await res.json()) as { error?: { message?: string } }
			if (json.error?.message) message = json.error.message
		} catch {}
		return { ok: false, message, field: 'form' }
	}

	let json: unknown
	try {
		json = await res.json()
	} catch {
		return { ok: false, message: 'Server returned an unexpected response', field: 'form' }
	}

	const responseParsed = signUpResponseSchema.safeParse(json)
	if (!responseParsed.success) {
		return { ok: false, message: 'Server returned an unexpected response', field: 'form' }
	}

	return { ok: true, userId: responseParsed.data.userId }
}
