import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockSendFirstBuildEmail = vi.fn()

vi.mock('@meldar/db/client', () => ({
	getDb: () => ({
		select: () => ({
			from: () => ({
				where: () => ({
					limit: mockSelect,
				}),
			}),
		}),
		update: () => ({
			set: () => ({
				where: mockUpdate,
			}),
		}),
	}),
}))

vi.mock('@meldar/db/schema', () => ({
	users: { id: 'id', email: 'email', name: 'name', firstBuildEmailSentAt: 'firstBuildEmailSentAt' },
	projects: { id: 'id', name: 'name', userId: 'userId' },
	kanbanCards: { id: 'id', projectId: 'projectId', taskType: 'taskType', tokenCostEstimateMin: 'tokenCostEstimateMin' },
}))

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((...args: unknown[]) => args),
	and: vi.fn((...args: unknown[]) => args),
	isNull: vi.fn((col: unknown) => ['isNull', col]),
}))

vi.mock('@meldar/orchestrator', () => ({
	buildOrchestratorDeps: vi.fn(),
	formatSseDone: vi.fn(() => ''),
	formatSseEvent: vi.fn(() => ''),
	orchestrateBuild: vi.fn(),
	routeModel: vi.fn(() => 'claude-sonnet-4-6'),
	slugForProjectId: vi.fn(() => 'test-slug'),
}))

vi.mock('@meldar/storage', () => ({}))
vi.mock('@meldar/tokens', () => ({
	creditTokens: vi.fn(),
	debitTokens: vi.fn(),
	InsufficientBalanceError: class extends Error {},
}))

vi.mock('@/server/deploy/guarded-deploy-call', () => ({
	guardedDeployCall: vi.fn(),
}))

vi.mock('@/server/email', () => ({
	sendFirstBuildEmail: mockSendFirstBuildEmail,
}))

vi.mock('@/server/lib/ai-call-log', () => ({
	recordAiCall: vi.fn(),
}))

vi.mock('@/server/lib/spend-ceiling', () => ({
	createSpendGuardForUser: vi.fn(),
}))

describe('triggerFirstBuildEmail TOCTOU fix', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('does not send email when UPDATE rowCount is 0 (concurrent call already sent)', async () => {
		mockSelect.mockResolvedValueOnce([
			{ email: 'user@example.com', name: 'Test', firstBuildEmailSentAt: null },
		])

		mockSelect.mockResolvedValueOnce([
			{ name: 'My Project' },
		])

		mockUpdate.mockResolvedValueOnce({ rowCount: 0 })

		const mod = await import('../run-build')
		const { triggerFirstBuildEmail } = mod as unknown as {
			triggerFirstBuildEmail: (userId: string, projectId: string) => Promise<void>
		}

		await triggerFirstBuildEmail('user_1', 'proj_1')

		expect(mockSendFirstBuildEmail).not.toHaveBeenCalled()
	})

	it('sends email when UPDATE rowCount is 1 (first caller wins)', async () => {
		mockSelect.mockResolvedValueOnce([
			{ email: 'user@example.com', name: 'Test', firstBuildEmailSentAt: null },
		])

		mockSelect.mockResolvedValueOnce([
			{ name: 'My Project' },
		])

		mockUpdate.mockResolvedValueOnce({ rowCount: 1 })

		const mod = await import('../run-build')
		const { triggerFirstBuildEmail } = mod as unknown as {
			triggerFirstBuildEmail: (userId: string, projectId: string) => Promise<void>
		}

		await triggerFirstBuildEmail('user_1', 'proj_1')

		expect(mockSendFirstBuildEmail).toHaveBeenCalledOnce()
		expect(mockSendFirstBuildEmail).toHaveBeenCalledWith('user@example.com', 'My Project')
	})
})
