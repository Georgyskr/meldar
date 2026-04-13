import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

export const HAS_AUTH = !!process.env.AUTH_SECRET
export const HAS_RESEND = !!process.env.RESEND_API_KEY
export const HAS_ANTHROPIC = !!process.env.ANTHROPIC_API_KEY
export const HAS_SANDBOX =
	!!process.env.CF_SANDBOX_WORKER_URL && !!process.env.CF_SANDBOX_HMAC_SECRET
export const HAS_DATABASE = !!process.env.DATABASE_URL

export function createAnthropicClient(): Anthropic {
	return new Anthropic()
}

export function createResendClient(): Resend {
	return new Resend(process.env.RESEND_API_KEY)
}
