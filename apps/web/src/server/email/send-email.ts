import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export function getBaseUrl(): string {
	return process.env.NEXT_PUBLIC_BASE_URL || 'https://meldar.ai'
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function emailWrapper(content: string): string {
	return `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">${content}</div>`
}

function ctaButton(href: string, label: string): string {
	return `<a href="${href}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #623153, #FFB876); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${escapeHtml(label)}</a>`
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
		html: emailWrapper(`
			<h1 style="font-size: 24px; color: #623153;">Verify your email</h1>
			<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
				Welcome to Meldar. Click below to verify your email address. This link expires in 24 hours.
			</p>
			${ctaButton(`${baseUrl}/api/auth/verify-email?token=${token}`, 'Verify email')}
			<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
				If you didn't sign up for Meldar, you can ignore this email.
			</p>
		`),
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
		html: emailWrapper(`
			<h1 style="font-size: 24px; color: #623153;">Reset your password</h1>
			<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
				Click below to set a new password. This link expires in 1 hour.
			</p>
			${ctaButton(`${baseUrl}/reset-password?token=${token}`, 'Reset password')}
			<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
				If you didn't request this, ignore this email.
			</p>
		`),
	})
}

export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
	const baseUrl = getBaseUrl()
	const greeting = name ? `You're in, ${escapeHtml(name)}.` : "You're in."

	await resend.emails.send({
		from: 'Meldar <hello@meldar.ai>',
		to,
		subject: 'Welcome to Meldar',
		html: emailWrapper(`
			<h1 style="font-size: 24px; color: #623153;">Welcome to Meldar</h1>
			<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
				${greeting} Start by telling Meldar what you want to build.
			</p>
			${ctaButton(`${baseUrl}/workspace`, 'Go to your workspace')}
			<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
				If you didn't sign up for Meldar, you can ignore this email.
			</p>
		`),
	})
}

export async function sendFirstBuildEmail(to: string, projectName: string): Promise<void> {
	const baseUrl = getBaseUrl()

	await resend.emails.send({
		from: 'Meldar <hello@meldar.ai>',
		to,
		subject: 'Your first app just took shape',
		html: emailWrapper(`
			<h1 style="font-size: 24px; color: #623153;">Your first app just took shape</h1>
			<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
				Your ${escapeHtml(projectName)} just got its first code. Come see it.
			</p>
			${ctaButton(`${baseUrl}/workspace`, 'See your preview')}
		`),
	})
}

export async function sendNudgeEmail(
	to: string,
	name: string | null,
	daysSinceSignup: number,
): Promise<void> {
	const baseUrl = getBaseUrl()

	if (daysSinceSignup <= 3) {
		const greeting = name ? `Hey ${escapeHtml(name)},` : 'Hey,'
		await resend.emails.send({
			from: 'Meldar <hello@meldar.ai>',
			to,
			subject: 'Your app is waiting',
			html: emailWrapper(`
				<h1 style="font-size: 24px; color: #623153;">Your app is waiting</h1>
				<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
					${greeting} you signed up yesterday but haven't started building yet. It takes 2 minutes.
				</p>
				${ctaButton(`${baseUrl}/workspace`, 'Start building')}
				<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
					If you no longer wish to receive these emails, simply ignore this message.
				</p>
			`),
		})
	} else {
		const greeting = name ? `${escapeHtml(name)}, it's` : "It's"
		await resend.emails.send({
			from: 'Meldar <hello@meldar.ai>',
			to,
			subject: 'One week with Meldar',
			html: emailWrapper(`
				<h1 style="font-size: 24px; color: #623153;">One week with Meldar</h1>
				<p style="font-size: 16px; color: #4f434a; line-height: 1.6;">
					${greeting} been a week since you joined. Ready to build something?
				</p>
				${ctaButton(`${baseUrl}/workspace`, 'Start building')}
				<p style="font-size: 14px; color: #81737a; margin-top: 24px;">
					If you no longer wish to receive these emails, simply ignore this message.
				</p>
			`),
		})
	}
}
