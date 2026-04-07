// This file will be rewritten by the /api/write endpoint to prove that runtime
// file injection (the core "AI generates code → iframe updates" loop) works.
// Edit it to test HMR manually.

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
					fontSize: '3rem',
					fontWeight: 700,
					background: 'linear-gradient(135deg, #623153 0%, #ffb876 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
					marginBottom: '1rem',
				}}
			>
				Hello Meldar
			</h1>
			<p style={{ fontSize: '1.25rem', color: '#4f434a', marginBottom: '2rem' }}>
				Next.js 16 running inside a Cloudflare Sandbox container
			</p>
			<p
				style={{
					fontSize: '0.875rem',
					color: '#81737a',
					fontFamily: 'monospace',
				}}
			>
				Rendered at {new Date().toISOString()}
			</p>
		</main>
	)
}
