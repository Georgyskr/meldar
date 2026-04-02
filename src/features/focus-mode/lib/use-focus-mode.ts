'use client'

import { useEffect, useState } from 'react'

const COOKIE_NAME = 'meldar-focus'
const FOCUS_CHANGED_EVENT = 'focus-mode-changed'

function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
	return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, maxAgeDays: number): void {
	const maxAge = maxAgeDays * 24 * 60 * 60
	// biome-ignore lint/suspicious/noDocumentCookie: Focus mode preference cookie
	document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`
}

function deleteCookie(name: string): void {
	// biome-ignore lint/suspicious/noDocumentCookie: Focus mode preference cookie
	document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function getFocusMode(): boolean {
	return getCookie(COOKIE_NAME) === '1'
}

export function setFocusMode(enabled: boolean): void {
	if (enabled) {
		setCookie(COOKIE_NAME, '1', 365)
	} else {
		deleteCookie(COOKIE_NAME)
	}
	window.dispatchEvent(new CustomEvent(FOCUS_CHANGED_EVENT))
}

export function useFocusMode(): { focusMode: boolean; toggle: () => void } {
	const [focusMode, setFocusModeState] = useState(false)

	useEffect(() => {
		setFocusModeState(getFocusMode())

		const handleChange = () => setFocusModeState(getFocusMode())
		window.addEventListener(FOCUS_CHANGED_EVENT, handleChange)
		return () => window.removeEventListener(FOCUS_CHANGED_EVENT, handleChange)
	}, [])

	function toggle() {
		setFocusMode(!getFocusMode())
	}

	return { focusMode, toggle }
}
