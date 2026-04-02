'use client'

const STORAGE_KEY = 'data-terms'
const VERSION = 1
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000
export const DATA_TERMS_CHANGED_EVENT = 'data-terms-changed'

type DataTermsRecord = {
	version: number
	timestamp: number
	accepted: boolean
}

function parse(raw: string | null): DataTermsRecord | null {
	if (!raw) return null
	try {
		const record = JSON.parse(raw) as DataTermsRecord
		if (record.version !== VERSION) return null
		if (Date.now() - record.timestamp > MAX_AGE_MS) return null
		return record
	} catch {
		return null
	}
}

export function getDataTermsAccepted(): boolean {
	if (typeof window === 'undefined') return false
	const record = parse(localStorage.getItem(STORAGE_KEY))
	return record?.accepted ?? false
}

export function setDataTermsAccepted(accepted: boolean): void {
	const record: DataTermsRecord = { version: VERSION, timestamp: Date.now(), accepted }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
	window.dispatchEvent(new CustomEvent(DATA_TERMS_CHANGED_EVENT))
}

export function revokeDataTerms(): void {
	localStorage.removeItem(STORAGE_KEY)
	window.dispatchEvent(new CustomEvent(DATA_TERMS_CHANGED_EVENT))
}

export function requestDataTermsReopen(): void {
	window.dispatchEvent(new CustomEvent(DATA_TERMS_CHANGED_EVENT, { detail: 'reopen' }))
}
