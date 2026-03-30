import { styled } from '@styled-system/jsx'
import { button } from '@styled-system/recipes'
import type { ComponentProps } from 'react'

export type ButtonProps = ComponentProps<typeof Button>

export const Button = styled('button', button)
