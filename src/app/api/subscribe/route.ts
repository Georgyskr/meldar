import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { getDb } from '@/server/db/client'
import { subscribers } from '@/server/db/schema'
import { checkRateLimit, subscribeLimit } from '@/server/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

const subscribeSchema = z.object({
	email: z.string().email(),
	founding: z.boolean().optional(),
	xrayId: z.string().optional(),
	source: z.string().optional(),
})

function escapeHtml(str: string) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
	try {
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
		const { success } = await checkRateLimit(subscribeLimit, ip)
		if (!success) {
			return NextResponse.json(
				{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
				{ status: 429 },
			)
		}

		const body = await request.json()
		const parsed = subscribeSchema.safeParse(body)

		if (!parsed.success) {
			return NextResponse.json(
				{ error: { code: 'VALIDATION_ERROR', message: 'Valid email required' } },
				{ status: 400 },
			)
		}

		const { email, founding, xrayId, source } = parsed.data

		const db = getDb()
		await db
			.insert(subscribers)
			.values({
				email,
				source: source || (xrayId ? 'xray' : founding ? 'founding' : 'landing'),
				xrayId: xrayId || null,
				foundingMember: !!founding,
			})
			.onConflictDoNothing()

		const safeEmail = escapeHtml(email)

		await resend.emails.send({
			from: 'Meldar <hello@meldar.ai>',
			to: email,
			subject: 'Your Digital Footprint Scan is coming',
			html: `
				<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
					<h1 style="font-size: 24px; color: #623153; margin-bottom: 16px;">Welcome to Meldar</h1>
					<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
						You're in. Here's what happens next:
					</p>
					<ol style="font-size: 15px; color: #4f434a; line-height: 1.8; padding-left: 20px;">
						<li><strong>Take the quiz</strong> — pick what wastes your time. Takes 15 seconds.<br/>
							<a href="https://meldar.ai/quiz" style="color: #623153;">meldar.ai/quiz</a>
						</li>
						<li><strong>Upload a Screen Time screenshot</strong> — we'll show you your real numbers.</li>
						<li><strong>We'll send your Digital Footprint Scan</strong> — a personal report on where your hours go.</li>
					</ol>
					<p style="font-size: 14px; color: #81737a; margin-top: 32px;">
						Questions? Just reply to this email. A human reads it.<br/>
						— The Meldar team
					</p>
				</div>
			`,
		})

		// Notify founder (escaped email to prevent HTML injection)
		await resend.emails.send({
			from: 'Meldar <hello@meldar.ai>',
			to: 'gosha.skryuchenkov@gmail.com',
			subject: `New Meldar signup: ${safeEmail}`,
			html: `<p>New signup: <strong>${safeEmail}</strong></p><p>Time: ${new Date().toISOString()}</p>`,
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Subscribe error:', error instanceof Error ? error.message : 'Unknown error')
		return NextResponse.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to subscribe' } },
			{ status: 500 },
		)
	}
}
