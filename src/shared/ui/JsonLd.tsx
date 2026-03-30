export function JsonLd({ data }: { data: Record<string, unknown> }) {
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, '\\u003c'),
			}}
		/>
	)
}
