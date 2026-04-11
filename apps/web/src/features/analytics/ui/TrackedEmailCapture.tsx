'use client'

import { EmailCapture } from '@/shared/ui/EmailCapture'
import { trackEvent } from '../lib/track'

export function TrackedEmailCapture({
	id,
	dark,
	source = 'landing',
}: {
	id?: string
	dark?: boolean
	source?: string
}) {
	return (
		<EmailCapture
			id={id}
			dark={dark}
			onSuccess={() => trackEvent({ name: 'email_captured', source })}
		/>
	)
}
