import type { BookingPageParams } from './booking-page'

export function buildPersonalizationPrompt(
	params: BookingPageParams,
	userDescription?: string,
): string {
	const { businessName, verticalLabel, services, hours } = params

	const servicesBlock = services
		.map((s) => `- ${s.name} (${s.durationMinutes} min, €${s.priceEur})`)
		.join('\n')

	const daysBlock = hours.days.join(', ')

	const userContext = userDescription
		? `\nThe user described their business as: "${userDescription}"\n`
		: ''

	return `You are personalizing an existing booking page for "${businessName}", a ${verticalLabel} business.
${userContext}
The page already has all sections built with correct Panda CSS (styled-system/jsx, styled-system/css).
Your job is to make it feel bespoke — not templated.

Business details:
- Name: ${businessName}
- Vertical: ${verticalLabel}
- Services:
${servicesBlock}
- Hours: ${daysBlock}, ${hours.start}–${hours.end}

What to personalize:
1. Hero headline — make it specific to ${verticalLabel}, not generic. One compelling sentence.
2. Hero subheadline — mention what makes this ${verticalLabel.toLowerCase()} professional worth visiting.
3. Service descriptions — add a one-line description under each service name if relevant.
4. The booking form "Notes" placeholder — tailor it to ${verticalLabel.toLowerCase()} (e.g. "Reference photos welcome" for tattoo, "Any injuries we should know about?" for PT).
5. Footer — keep minimal.

Rules:
- Do NOT change the component structure, layout, or visual styling.
- Do NOT add new sections or remove existing ones.
- Do NOT change imports, CSS tokens, or Panda CSS patterns.
- Only modify text content, labels, placeholders, and copy.
- Keep the same file paths (src/app/page.tsx).
- Output the complete file — do not use partial snippets or ellipsis.`
}
