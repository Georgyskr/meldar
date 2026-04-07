import type { NextRequest } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export function getBaseUrl(request: NextRequest | Request): string {
	const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'meldar.ai'
	const protocol = host.includes('localhost') ? 'http' : 'https'
	return `${protocol}://${host}`
}

export async function sendVerificationEmail(
	to: string,
	token: string,
	baseUrl: string,
): Promise<void> {
	await resend.emails.send({
		from: 'Meldar <hello@meldar.ai>',
		to,
		subject: 'Verify your Meldar email',
		html: `
			<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
				<h1 style="font-size: 24px; color: #623153;">Verify your email</h1>
				<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
					Welcome to Meldar. Click below to verify your email address. This link expires in 24 hours.
				</p>
				<a href="${baseUrl}/api/auth/verify-email?token=${token}"
					style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #623153, #FFB876); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
					Verify email
				</a>
				<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
					If you didn't sign up for Meldar, you can ignore this email.
				</p>
			</div>
		`,
	})
}

export async function sendPasswordResetEmail(
	to: string,
	token: string,
	baseUrl: string,
): Promise<void> {
	await resend.emails.send({
		from: 'Meldar <hello@meldar.ai>',
		to,
		subject: 'Reset your Meldar password',
		html: `
			<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
				<h1 style="font-size: 24px; color: #623153;">Reset your password</h1>
				<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
					Click below to set a new password. This link expires in 1 hour.
				</p>
				<a href="${baseUrl}/reset-password?token=${token}"
					style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #623153, #FFB876); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
					Reset password
				</a>
				<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
					If you didn't request this, ignore this email.
				</p>
			</div>
		`,
	})
}
