import { z } from 'zod'

export const signInInputSchema = z.object({
	email: z.string().trim().email('Enter a valid email address'),
	password: z.string().min(1, 'Enter your password'),
})

export type SignInInput = z.infer<typeof signInInputSchema>

const signInResponseSchema = z.object({
	success: z.literal(true),
	user: z.object({
		id: z.string().uuid(),
		email: z.string().email(),
		name: z.string().nullable(),
	}),
})

export type SignInResult = { ok: true; userId: string } | { ok: false; message: string }

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password'

export async function submitSignIn(
	rawInput: unknown,
	fetchImpl: typeof fetch = fetch,
): Promise<SignInResult> {
	const parsed = signInInputSchema.safeParse(rawInput)
	if (!parsed.success) {
		return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' }
	}

	let res: Response
	try {
		res = await fetchImpl('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(parsed.data),
		})
	} catch {
		return { ok: false, message: 'Network error. Try again.' }
	}

	if (res.status === 401) {
		return { ok: false, message: INVALID_CREDENTIALS_MESSAGE }
	}

	if (!res.ok) {
		let message = `Could not sign in (${res.status})`
		try {
			const json = (await res.json()) as { error?: { message?: string } }
			if (json.error?.message) message = json.error.message
		} catch {}
		return { ok: false, message }
	}

	let json: unknown
	try {
		json = await res.json()
	} catch {
		return { ok: false, message: 'Server returned an unexpected response' }
	}

	const responseParsed = signInResponseSchema.safeParse(json)
	if (!responseParsed.success) {
		return { ok: false, message: 'Server returned an unexpected response' }
	}

	return { ok: true, userId: responseParsed.data.user.id }
}
