import { sendIsolatedEmail } from '@/server/agents/email-sender'

export interface BookingConfirmationPayload {
	recipientEmail: string
	businessName: string
	slug: string
	bookingDetails: {
		date: string
		time: string
		service: string
		location?: string
		notes?: string
	}
}

export interface ExecutorResult {
	success: boolean
	resendId?: string
	error?: string
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function formatConfirmationHtml(payload: BookingConfirmationPayload): string {
	const { businessName, bookingDetails } = payload
	const locationRow = bookingDetails.location
		? `<tr><td style="padding:8px 0;color:#81737a;">Location</td><td style="padding:8px 0;color:#1a1a1a;">${escapeHtml(bookingDetails.location)}</td></tr>`
		: ''
	const notesRow = bookingDetails.notes
		? `<tr><td style="padding:8px 0;color:#81737a;">Notes</td><td style="padding:8px 0;color:#1a1a1a;">${escapeHtml(bookingDetails.notes)}</td></tr>`
		: ''

	return `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
	<h1 style="font-size:24px;color:#623153;">Booking confirmed</h1>
	<p style="font-size:16px;color:#4f434a;line-height:1.6;">
		Your booking with ${escapeHtml(businessName)} is confirmed.
	</p>
	<table style="width:100%;border-collapse:collapse;margin:24px 0;">
		<tr><td style="padding:8px 0;color:#81737a;">Date</td><td style="padding:8px 0;color:#1a1a1a;">${escapeHtml(bookingDetails.date)}</td></tr>
		<tr><td style="padding:8px 0;color:#81737a;">Time</td><td style="padding:8px 0;color:#1a1a1a;">${escapeHtml(bookingDetails.time)}</td></tr>
		<tr><td style="padding:8px 0;color:#81737a;">Service</td><td style="padding:8px 0;color:#1a1a1a;">${escapeHtml(bookingDetails.service)}</td></tr>
		${locationRow}
		${notesRow}
	</table>
	<p style="font-size:14px;color:#81737a;margin-top:24px;">
		Sent by Meldar on behalf of ${escapeHtml(businessName)}.
	</p>
</div>`
}

export async function executeBookingConfirmation(
	payload: BookingConfirmationPayload,
): Promise<ExecutorResult> {
	const html = formatConfirmationHtml(payload)

	return sendIsolatedEmail({
		slug: payload.slug,
		businessName: payload.businessName,
		to: payload.recipientEmail,
		subject: `Booking confirmed — ${payload.bookingDetails.service}`,
		html,
	})
}
