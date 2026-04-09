'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
	readonly fallback: ReactNode
	readonly children: ReactNode
}

interface State {
	readonly hasError: boolean
}

export class GalaxyErrorBoundary extends Component<Props, State> {
	override state: State = { hasError: false }

	static getDerivedStateFromError(): State {
		return { hasError: true }
	}

	override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error('[GalaxyErrorBoundary] Canvas crashed, falling back to 2D view:', error, info)
	}

	override render() {
		if (this.state.hasError) {
			return this.props.fallback
		}
		return this.props.children
	}
}
