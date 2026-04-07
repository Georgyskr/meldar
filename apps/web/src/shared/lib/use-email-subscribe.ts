'use client'

import { useState } from 'react'

export function useEmailSubscribe() {
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

	async function subscribe(extra?: Record<string, unknown>): Promise<boolean> {
		if (!email) return false
		setStatus('loading')
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, ...extra }),
			})
			if (!res.ok) throw new Error()
			setStatus('success')
			return true
		} catch {
			setStatus('error')
			return false
		}
	}

	return { email, setEmail, status, subscribe }
}
