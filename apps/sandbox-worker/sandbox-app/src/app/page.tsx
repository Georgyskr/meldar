export default function HomePage() {
	return (
		<main
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '100vh',
				padding: '2rem',
				textAlign: 'center',
			}}
		>
			<h1
				style={{
					fontSize: '2.5rem',
					fontWeight: 700,
					marginBottom: '1rem',
				}}
			>
				Meldar sandbox
			</h1>
			<p style={{ maxWidth: 480, color: '#555' }}>
				Preview stub — replaced by the LLM when the user submits a prompt.
			</p>
		</main>
	)
}
