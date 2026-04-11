import * as schema from '@meldar/db/schema'
import { describe, expect, it } from 'vitest'

describe('agent_events table', () => {
	it('has required columns', () => {
		const cols = schema.agentEvents
		expect(cols.id).toBeDefined()
		expect(cols.projectId).toBeDefined()
		expect(cols.userId).toBeDefined()
		expect(cols.eventType).toBeDefined()
		expect(cols.payload).toBeDefined()
		expect(cols.createdAt).toBeDefined()
	})
})

describe('agent_tasks table', () => {
	it('has required columns', () => {
		const cols = schema.agentTasks
		expect(cols.id).toBeDefined()
		expect(cols.projectId).toBeDefined()
		expect(cols.agentType).toBeDefined()
		expect(cols.status).toBeDefined()
		expect(cols.payload).toBeDefined()
		expect(cols.result).toBeDefined()
		expect(cols.autoApproved).toBeDefined()
		expect(cols.proposedAt).toBeDefined()
		expect(cols.approvedAt).toBeDefined()
		expect(cols.executedAt).toBeDefined()
		expect(cols.verifiedAt).toBeDefined()
	})

	it('exports task status type', () => {
		const valid: schema.AgentTaskStatus = 'proposed'
		expect(valid).toBe('proposed')
	})

	it('exports agent type', () => {
		const valid: schema.AgentType = 'booking_confirmation'
		expect(valid).toBe('booking_confirmation')
	})
})

describe('project_domains table', () => {
	it('has required columns', () => {
		const cols = schema.projectDomains
		expect(cols.id).toBeDefined()
		expect(cols.projectId).toBeDefined()
		expect(cols.type).toBeDefined()
		expect(cols.domain).toBeDefined()
		expect(cols.state).toBeDefined()
		expect(cols.registrarId).toBeDefined()
		expect(cols.failureReason).toBeDefined()
		expect(cols.retryCount).toBeDefined()
		expect(cols.expiresAt).toBeDefined()
		expect(cols.createdAt).toBeDefined()
		expect(cols.updatedAt).toBeDefined()
	})

	it('exports domain state type', () => {
		const valid: schema.DomainState = 'active'
		expect(valid).toBe('active')
	})

	it('exports domain type', () => {
		const valid: schema.DomainType = 'subdomain'
		expect(valid).toBe('subdomain')
	})
})
