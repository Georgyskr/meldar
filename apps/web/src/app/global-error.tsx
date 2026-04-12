'use client'

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html lang="en">
			<body
				style={{
					fontFamily: 'Inter, system-ui, sans-serif',
					background: '#faf9f6',
					color: '#1a1c1a',
					display: 'flex',
					minHeight: '100vh',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '24px',
				}}
			>
				<div style={{ maxWidth: 480, textAlign: 'center' }}>
					<h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
					<p style={{ fontSize: 16, color: '#4f434a', marginBottom: 24, lineHeight: 1.6 }}>
						We hit an unexpected error. This has been logged.
					</p>
					{error.digest && (
						<p style={{ fontSize: 12, color: '#81737a', marginBottom: 16 }}>
							Reference: {error.digest}
						</p>
					)}
					<button
						type="button"
						onClick={reset}
						style={{
							padding: '12px 24px',
							background: '#623153',
							color: '#fff',
							border: 'none',
							borderRadius: 8,
							cursor: 'pointer',
							fontSize: 14,
							fontWeight: 600,
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	)
}
