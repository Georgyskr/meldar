'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie-consent'
const CONSENT_VERSION = 1
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000
const CONSENT_CHANGED_EVENT = 'consent-changed'
export const REOPEN_CONSENT_EVENT = 'reopen-consent'

type ConsentRecord = {
	version: number
	timestamp: number
	analytics: boolean
}

export type ConsentState = 'undecided' | 'accepted' | 'rejected'

let cachedRecord: ConsentRecord | null | undefined

function invalidateCache() {
	cachedRecord = undefined
}

function parseRecord(raw: string | null): ConsentRecord | null {
	if (!raw) return null
	try {
		const record = JSON.parse(raw) as ConsentRecord
		if (record.version !== CONSENT_VERSION) return null
		if (Date.now() - record.timestamp > CONSENT_MAX_AGE_MS) return null
		return record
	} catch {
		return null
	}
}

export function getConsentRecord(): ConsentRecord | null {
	if (typeof window === 'undefined') return null
	if (cachedRecord !== undefined) return cachedRecord
	cachedRecord = parseRecord(localStorage.getItem(STORAGE_KEY))
	return cachedRecord
}

export function getStoredConsent(): ConsentState {
	const record = getConsentRecord()
	if (!record) return 'undecided'
	return record.analytics ? 'accepted' : 'rejected'
}

export function saveConsent(analytics: boolean): void {
	const record: ConsentRecord = {
		version: CONSENT_VERSION,
		timestamp: Date.now(),
		analytics,
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
	cachedRecord = record
	window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT))
}

const EXPIRED = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'

function clearAnalyticsCookies(): void {
	const cookies = document.cookie.split(';')
	for (const cookie of cookies) {
		const name = cookie.split('=')[0].trim()
		if (name.startsWith('_ga')) {
			const domains = [window.location.hostname, `.${window.location.hostname}`]
			for (const domain of domains) {
				// biome-ignore lint/suspicious/noDocumentCookie: GDPR cookie cleanup
				document.cookie = `${name}=;${EXPIRED};path=/;domain=${domain}`
			}
			// biome-ignore lint/suspicious/noDocumentCookie: GDPR cookie cleanup
			document.cookie = `${name}=;${EXPIRED};path=/`
		}
	}
}

export function revokeConsent(): void {
	clearAnalyticsCookies()
	saveConsent(false)
}

export function requestConsentReopen(): void {
	window.dispatchEvent(new CustomEvent(REOPEN_CONSENT_EVENT))
}

export function useConsentState(): ConsentState {
	const [consent, setConsent] = useState<ConsentState>('undecided')

	useEffect(() => {
		setConsent(getStoredConsent())
		const handleSameTab = () => setConsent(getStoredConsent())
		const handleCrossTab = () => {
			invalidateCache()
			setConsent(getStoredConsent())
		}
		window.addEventListener('storage', handleCrossTab)
		window.addEventListener(CONSENT_CHANGED_EVENT, handleSameTab)
		return () => {
			window.removeEventListener('storage', handleCrossTab)
			window.removeEventListener(CONSENT_CHANGED_EVENT, handleSameTab)
		}
	}, [])

	return consent
}
