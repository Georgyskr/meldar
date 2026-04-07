'use client'

import { styled } from '@styled-system/jsx'
import type { HTMLStyledProps } from '@styled-system/types'
import type { ReactNode } from 'react'
import { trackEvent } from '../lib/track'

type TrackedCtaProps = {
	href: string
	location: string
	children: ReactNode
} & Omit<HTMLStyledProps<'a'>, 'href' | 'children'>

export function TrackedCta({ href, location, children, ...props }: TrackedCtaProps) {
	return (
		<styled.a href={href} onClick={() => trackEvent({ name: 'cta_clicked', location })} {...props}>
			{children}
		</styled.a>
	)
}
