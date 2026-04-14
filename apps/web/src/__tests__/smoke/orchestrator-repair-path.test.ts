import type Anthropic from '@anthropic-ai/sdk'
import { type OrchestratorEvent, orchestrateBuild } from '@meldar/orchestrator'
import { InMemoryBlobStorage, InMemoryProjectStorage } from '@meldar/storage'
import { InMemoryTokenLedger, MODELS } from '@meldar/tokens'
import { describe, expect, it } from 'vitest'
import { createAnthropicClient, HAS_ANTHROPIC } from './setup'

const EMPTY_USAGE: Anthropic.Messages.Usage = {
	input_tokens: 0,
	output_tokens: 0,
	cache_creation: null,
	cache_creation_input_tokens: null,
	cache_read_input_tokens: null,
	inference_geo: null,
	server_tool_use: null,
	service_tier: null,
}

describe.skipIf(!HAS_ANTHROPIC)(
	'orchestrator smoke — messages contract against real Anthropic',
	() => {
		// This test guards against a class of bug we just shipped in production:
		// the orchestrator's self-repair call was sending an assistant message
		// containing `tool_use` blocks followed by a user message that was plain
		// text, which the Anthropic API rejects with
		// "tool_use ids were found without tool_result blocks immediately after".
		//
		// Unit tests (in packages/orchestrator) verify the OUR code constructs
		// the right shape. This smoke verifies that what we think is "the right
		// shape" is what the Anthropic API actually accepts — i.e. it catches
		// regressions both in our code AND in our model of their contract.
		//
		// Strategy: mock only the first Anthropic call (to deterministically
		// produce a file that fails local validation, forcing the repair path),
		// and route the repair call to the real API.
		it('repair call after validation failure is accepted by Anthropic (no invalid_request_error)', async () => {
			const realClient = createAnthropicClient()
			const blob = new InMemoryBlobStorage()
			const storage = new InMemoryProjectStorage(blob)
			const ledger = new InMemoryTokenLedger({ ceilingCentsPerDay: 5000 })

			const { project } = await storage.createProject({
				userId: 'smoke-user',
				name: 'Smoke: repair-path contract',
				templateId: 'next-landing-v1',
				initialFiles: [
					{
						path: 'src/app/page.tsx',
						content: 'export default function Page() { return <div /> }',
					},
				],
			})

			let callIndex = 0
			const hybridClient = {
				messages: {
					stream: (body: unknown, opts?: unknown) => {
						callIndex++
						if (callIndex === 1) {
							// Deterministically return a tool_use that writes a file importing
							// a denied package (`next/dynamic`). This forces validateBuildFiles
							// to fail, triggering the repair call on index 2.
							return {
								finalMessage: async (): Promise<Anthropic.Messages.Message> => ({
									id: 'msg_forced_invalid',
									type: 'message',
									role: 'assistant',
									model: MODELS.SONNET,
									stop_reason: 'end_turn',
									stop_sequence: null,
									container: null,
									content: [
										{
											type: 'tool_use',
											id: 'toolu_forced_01',
											name: 'write_file',
											input: {
												path: 'src/app/page.tsx',
												content:
													"import dynamic from 'next/dynamic'\nexport default function Page() { return <div /> }",
											},
											caller: { type: 'direct' },
										},
									],
									usage: { ...EMPTY_USAGE, input_tokens: 800, output_tokens: 200 },
								}),
							}
						}
						// Repair call goes to the real API. We only need Anthropic to
						// accept the messages shape — we don't care what the model
						// writes. Cap max_tokens so the smoke stays cheap on every CI.
						const trimmedBody = {
							...(body as Anthropic.Messages.MessageCreateParamsNonStreaming),
							max_tokens: 512,
						}
						return realClient.messages.stream(trimmedBody, opts as Anthropic.RequestOptions)
					},
				},
			} as unknown as Anthropic

			const events: OrchestratorEvent[] = []
			for await (const e of orchestrateBuild(
				{
					projectId: project.id,
					userId: 'smoke-user',
					prompt: 'Add a hero heading',
				},
				{ storage, sandbox: null, ledger, anthropic: hybridClient },
			)) {
				events.push(e)
			}

			// We don't care whether the build ultimately commits — the repair model
			// might still write files that fail a second round of validation, and
			// the orchestrator handles that. What we DO care about is that the
			// repair CALL itself was accepted. The ONLY way we'd see a thrown
			// `invalid_request_error` in this test is if the messages shape was
			// malformed — and that's exactly the bug we're guarding against.
			const failure = events.find((e) => e.type === 'failed')
			if (failure?.type === 'failed') {
				expect(failure.reason).not.toMatch(/invalid_request_error/i)
				expect(failure.reason).not.toMatch(/tool_use ids were found without tool_result/i)
				expect(failure.reason).not.toMatch(/400/)
			}

			// At minimum we must have issued the repair call to the real API.
			expect(callIndex).toBeGreaterThanOrEqual(2)
		}, 60_000)
	},
)
