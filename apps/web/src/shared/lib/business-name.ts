import { z } from 'zod'

export const businessNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.regex(/^[\p{L}\p{N}\p{Zs}\-'.&,!()/]+$/u, {
		message: 'Business name contains invalid characters',
	})
