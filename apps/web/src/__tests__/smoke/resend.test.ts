import { describe, expect, it } from 'vitest'
import { HAS_RESEND } from './setup'

describe.skipIf(!HAS_RESEND)('resend smoke — real Resend API', () => {
	it('sendIsolatedEmail delivers to test sink and returns resendId', async () => {
		process.env.RESEND_SEND_DOMAIN = 'meldar.ai'

		const { sendIsolatedEmail } = await import('@/server/agents/email-sender')

		const result = await sendIsolatedEmail({
			slug: 'hello',
			businessName: 'Meldar',
			to: 'delivered@resend.dev',
			subject: 'Smoke test',
			html: '<p>Smoke test — safe to ignore</p>',
		})

		expect(result.success).toBe(true)
		expect(result.resendId).toBeTruthy()
		expect(typeof result.resendId).toBe('string')
	})
})
