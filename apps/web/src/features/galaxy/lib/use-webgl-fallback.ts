import { useEffect, useState } from 'react'

export interface WebGLFallback {
	readonly supported: boolean
	readonly isMobile: boolean
	readonly lowDpr: boolean
	readonly reducedMotion: boolean
	readonly ready: boolean
}

function checkWebGL(): boolean {
	if (typeof window === 'undefined') return false
	try {
		const canvas = document.createElement('canvas')
		return !!(
			canvas.getContext('webgl2') ??
			canvas.getContext('webgl') ??
			canvas.getContext('experimental-webgl')
		)
	} catch {
		return false
	}
}

function checkMobile(): boolean {
	if (typeof window === 'undefined') return false
	return (
		navigator.maxTouchPoints > 0 &&
		window.matchMedia('(pointer: coarse)').matches &&
		window.innerWidth < 1024
	)
}

function checkReducedMotion(): boolean {
	if (typeof window === 'undefined') return false
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useWebGLFallback(): WebGLFallback {
	const [result, setResult] = useState<WebGLFallback>({
		supported: true,
		isMobile: false,
		lowDpr: false,
		reducedMotion: false,
		ready: false,
	})

	useEffect(() => {
		setResult({
			supported: checkWebGL(),
			isMobile: checkMobile(),
			lowDpr: window.devicePixelRatio < 1.5,
			reducedMotion: checkReducedMotion(),
			ready: true,
		})
	}, [])

	return result
}
