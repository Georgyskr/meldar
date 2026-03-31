import { styled } from '@styled-system/jsx'
import type { Metadata } from 'next'
import { FocusAmbient } from '@/features/focus-mode'
import { PainQuiz } from '@/features/quiz'

export const metadata: Metadata = {
	title: 'What eats your time? \u2014 Meldar Quiz',
	description:
		'Pick the things that waste your time. See what Meldar would build for you. No signup needed.',
}

export default function QuizPage() {
	return (
		<styled.main
			paddingBlockStart="96px"
			paddingBlockEnd={32}
			paddingInline={8}
			bg="surface"
			position="relative"
		>
			<FocusAmbient />
			<PainQuiz />
		</styled.main>
	)
}
