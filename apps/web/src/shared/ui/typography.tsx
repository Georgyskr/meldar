import { styled } from '@styled-system/jsx'

/**
 * Text — the only way to render body, label, caption, or inline text.
 * Never use styled.span / styled.p / styled.em / styled.strong directly.
 * Always pass a textStyle token. Use `as` to switch the underlying element.
 *
 * <Text textStyle="secondary.md">…</Text>
 * <Text as="em" textStyle="italic.lg">…</Text>
 * <Text as="p" textStyle="secondary.lg">…</Text>
 */
export const Text = styled('span')

/**
 * Heading — the only way to render titles (h1–h6). Defaults to h2.
 * Never use styled.h1 / styled.h2 / etc directly.
 *
 * <Heading as="h1" textStyle="primary.xxl">…</Heading>
 * <Heading as="h3" textStyle="primary.md">…</Heading>
 */
export const Heading = styled('h2')
