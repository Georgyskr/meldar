import { Bricolage_Grotesque, Inter } from 'next/font/google'
import '@/shared/styles/globals.css'

const headline = Bricolage_Grotesque({
	subsets: ['latin'],
	variable: '--font-headline',
	display: 'swap',
})

const body = Inter({
	subsets: ['latin'],
	variable: '--font-body',
	weight: ['300', '400', '500'],
	display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${headline.variable} ${body.variable}`}>
			<body>{children}</body>
		</html>
	)
}
