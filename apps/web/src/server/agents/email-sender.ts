import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_DOMAIN = process.env.RESEND_SEND_DOMAIN ?? 'send.meldar.ai'

export function senderAddress(slug: string): string {
	return `${slug}@${BASE_DOMAIN}`
}

export function senderName(businessName: string): string {
	return `${businessName} via Meldar`
}

export async function sendIsolatedEmail(opts: {
	slug: string
	businessName: string
	to: string
	subject: string
	html: string
}): Promise<{ success: boolean; resendId?: string; error?: string }> {
	const from = `${senderName(opts.businessName)} <${senderAddress(opts.slug)}>`
	try {
		const result = await resend.emails.send({
			from,
			to: opts.to,
			subject: opts.subject,
			html: opts.html,
		})

		if (result.error) {
			return { success: false, error: result.error.message }
		}

		return { success: true, resendId: result.data?.id }
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
	}
}
