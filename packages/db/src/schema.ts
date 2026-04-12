import { sql } from 'drizzle-orm'
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'

export type TokenTransactionReason =
	| 'build'
	| 'improve_prompt'
	| 'chat'
	| 'daily_bonus'
	| 'signup_bonus'
	| 'referral_bonus'
	| 'monthly_allowance'
	| 'refund'

export const xrayResults = pgTable(
	'xray_results',
	{
		id: text('id').primaryKey(), // nanoid (12 chars, URL-safe)
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		email: text('email'),
		quizPains: text('quiz_pains').array(),
		apps: jsonb('apps').notNull(), // [{name, usageMinutes, category}]
		totalHours: real('total_hours').notNull(),
		topApp: text('top_app').notNull(),
		pickups: integer('pickups'),
		insight: text('insight').notNull(),
		suggestions: jsonb('suggestions'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	() => [],
)

export const auditOrders = pgTable(
	'audit_orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: text('email').notNull(),
		stripeCheckoutSessionId: text('stripe_checkout_session_id').notNull().unique(),
		stripeCustomerId: text('stripe_customer_id'),
		product: text('product').notNull(), // 'time_audit' | 'app_build'
		amountCents: integer('amount_cents').notNull(),
		currency: text('currency').notNull().default('eur'),
		xrayId: text('xray_id').references(() => xrayResults.id, { onDelete: 'set null' }),
		status: text('status').notNull().default('paid'), // 'paid' | 'in_progress' | 'delivered'
		deliveredAt: timestamp('delivered_at', { withTimezone: true }),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('idx_audit_email').on(table.email)],
)

export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: text('email').notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		name: text('name'),
		emailVerified: boolean('email_verified').notNull().default(false),
		verifyToken: text('verify_token'),
		verifyTokenExpiresAt: timestamp('verify_token_expires_at', { withTimezone: true }),
		resetToken: text('reset_token'),
		resetTokenExpiresAt: timestamp('reset_token_expires_at', { withTimezone: true }),
		xrayUsageCount: integer('xray_usage_count').notNull().default(0),
		marketingConsent: boolean('marketing_consent').notNull().default(false),
		welcomeEmailSentAt: timestamp('welcome_email_sent_at', { withTimezone: true }),
		firstBuildEmailSentAt: timestamp('first_build_email_sent_at', { withTimezone: true }),
		lastNudgeSentAt: timestamp('last_nudge_sent_at', { withTimezone: true }),
		authProvider: text('auth_provider').notNull().default('email'),
		tokenVersion: integer('token_version').notNull().default(0),
		tokenBalance: integer('token_balance').notNull().default(200),
		referralCode: text('referral_code').unique(),
		lifetimeTokensEarned: integer('lifetime_tokens_earned').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('idx_users_created_at').on(table.createdAt),
		check('users_token_balance_non_negative', sql`${table.tokenBalance} >= 0`),
	],
)

export const subscribers = pgTable(
	'subscribers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: text('email').notNull().unique(),
		source: text('source').notNull().default('landing'), // 'landing' | 'xray' | 'quiz' | 'checkout'
		xrayId: text('xray_id').references(() => xrayResults.id, { onDelete: 'set null' }),
		foundingMember: boolean('founding_member').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(_table) => [],
)

export const discoverySessions = pgTable(
	'discovery_sessions',
	{
		id: text('id').primaryKey(), // nanoid(16)
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		email: text('email'),

		occupation: text('occupation'),
		ageBracket: text('age_bracket'),
		quizPicks: text('quiz_picks').array(),
		aiComfort: integer('ai_comfort'), // 1-4
		aiToolsUsed: text('ai_tools_used').array(),

		screenTimeData: jsonb('screen_time_data'),
		chatgptData: jsonb('chatgpt_data'),
		claudeData: jsonb('claude_data'),
		googleData: jsonb('google_data'),
		subscriptionsData: jsonb('subscriptions_data'),
		batteryData: jsonb('battery_data'),
		storageData: jsonb('storage_data'),
		calendarData: jsonb('calendar_data'),
		healthData: jsonb('health_data'),
		adaptiveData: jsonb('adaptive_data'),
		sourcesProvided: text('sources_provided').array().notNull().default([]),

		analysis: jsonb('analysis'),
		recommendedApp: text('recommended_app'),
		learningModules: jsonb('learning_modules'),

		tierPurchased: text('tier_purchased'), // null | 'base' | 'build'
		stripeSessionId: text('stripe_session_id'),
		paidAt: timestamp('paid_at', { withTimezone: true }),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('idx_discovery_user_id').on(table.userId)],
)

// The FK from current_build_id → builds.id is circular (builds also FKs
// projects.id). Drizzle can't emit DEFERRABLE constraints, so the FK is
// added in hand-edited migration SQL with `DEFERRABLE INITIALLY DEFERRED`.

export const projects = pgTable(
	'projects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		templateId: text('template_id').notNull(), // e.g. 'next-landing-v1'
		tier: text('tier').notNull().default('builder'), // 'builder' | 'pro' | 'vip'
		currentBuildId: uuid('current_build_id'), // FK added manually, DEFERRABLE
		lastBuildAt: timestamp('last_build_at', { withTimezone: true }),
		previewUrl: text('preview_url'),
		previewUrlUpdatedAt: timestamp('preview_url_updated_at', { withTimezone: true }),
		wishes: jsonb('wishes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(table) => [
		index('idx_projects_user_lastbuild')
			.on(table.userId, table.lastBuildAt.desc().nullsLast())
			.where(sql`${table.deletedAt} IS NULL`),
		index('idx_projects_current_build')
			.on(table.currentBuildId)
			.where(sql`${table.currentBuildId} IS NOT NULL`),
		check('projects_tier_valid', sql`${table.tier} IN ('builder', 'pro', 'vip')`),
	],
)

export const builds = pgTable(
	'builds',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		parentBuildId: uuid('parent_build_id'),
		status: text('status').notNull(), // 'streaming' | 'completed' | 'failed' | 'rolled_back'
		triggeredBy: text('triggered_by').notNull(), // 'template' | 'user_prompt' | 'kanban_card' | 'rollback' | 'upload' (phase 2)
		kanbanCardId: uuid('kanban_card_id'),
		modelVersion: text('model_version'), // e.g. 'claude-sonnet-4-6'
		promptHash: text('prompt_hash'), // sha256 of the prompt for reproducibility / cache
		tokenCost: integer('token_cost'), // cumulative tokens for this Build
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
	},
	(table) => [
		index('idx_builds_project_created').on(table.projectId, table.createdAt.desc()),
		index('idx_builds_project_status')
			.on(table.projectId, table.status)
			.where(sql`${table.status} IN ('streaming', 'failed')`),
		index('idx_builds_project_streaming_created')
			.on(table.projectId, table.createdAt.desc())
			.where(sql`${table.status} = 'streaming'`),
		// Enforces at most one streaming build per project — prevents the race
		// where two concurrent POSTs both pass the non-atomic guard.
		uniqueIndex('ux_builds_project_streaming')
			.on(table.projectId)
			.where(sql`${table.status} = 'streaming'`),
		// Self-referential FK added in hand-edited migration SQL (Drizzle limitation).
		check(
			'builds_status_valid',
			sql`${table.status} IN ('streaming', 'completed', 'failed', 'rolled_back')`,
		),
		check(
			'builds_triggered_by_valid',
			sql`${table.triggeredBy} IN ('template', 'user_prompt', 'kanban_card', 'rollback', 'upload')`,
		),
		check('builds_token_cost_positive', sql`${table.tokenCost} IS NULL OR ${table.tokenCost} >= 0`),
	],
)

export const buildFiles = pgTable(
	'build_files',
	{
		buildId: uuid('build_id')
			.notNull()
			.references(() => builds.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		r2Key: text('r2_key').notNull(), // e.g. 'projects/{id}/content/{sha256}'
		contentHash: text('content_hash').notNull(), // sha256 of the bytes
		sizeBytes: integer('size_bytes').notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.buildId, table.path] }),
		index('idx_build_files_content_hash').on(table.contentHash),
		check('build_files_size_positive', sql`${table.sizeBytes} >= 0`),
	],
)

export const projectFiles = pgTable(
	'project_files',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		r2Key: text('r2_key').notNull(),
		contentHash: text('content_hash').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		version: integer('version').notNull().default(1),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(table) => [
		// Without this unique index, the upsert during build streaming falls back to
		// inserting duplicate rows, causing file-flicker corruption.
		uniqueIndex('ux_project_files_project_path')
			.on(table.projectId, table.path)
			.where(sql`${table.deletedAt} IS NULL`),
		index('idx_project_files_project_active')
			.on(table.projectId)
			.where(sql`${table.deletedAt} IS NULL`),
		index('idx_project_files_content_hash').on(table.contentHash),
		check('project_files_size_positive', sql`${table.sizeBytes} >= 0`),
		check('project_files_version_positive', sql`${table.version} >= 1`),
	],
)

export const kanbanCards = pgTable(
	'kanban_cards',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		parentId: uuid('parent_id'),
		position: integer('position').notNull(),
		state: text('state').notNull().default('draft'),
		required: boolean('required').notNull().default(false),

		title: text('title').notNull(),
		description: text('description'),
		taskType: text('task_type').notNull().default('feature'),

		acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>(),
		explainerText: text('explainer_text'),

		generatedBy: text('generated_by').notNull().default('user'),

		tokenCostEstimateMin: integer('token_cost_estimate_min'),
		tokenCostEstimateMax: integer('token_cost_estimate_max'),
		tokenCostActual: integer('token_cost_actual'),

		dependsOn: jsonb('depends_on').$type<string[]>().default([]),
		blockedReason: text('blocked_reason'),

		lastBuildId: uuid('last_build_id'),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		builtAt: timestamp('built_at', { withTimezone: true }),
	},
	(table) => [
		index('idx_kanban_cards_project_parent_position').on(
			table.projectId,
			table.parentId,
			table.position,
		),
		check(
			'kanban_cards_state_valid',
			sql`${table.state} IN ('draft', 'ready', 'queued', 'building', 'built', 'needs_rework', 'failed')`,
		),
		check(
			'kanban_cards_type_valid',
			sql`${table.taskType} IN ('feature', 'page', 'integration', 'data', 'fix', 'polish')`,
		),
		check(
			'kanban_cards_generated_by_valid',
			sql`${table.generatedBy} IN ('template', 'haiku', 'user')`,
		),
	],
)

export const tokenTransactions = pgTable(
	'token_transactions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		amount: integer('amount').notNull(),
		reason: text('reason').notNull().$type<TokenTransactionReason>(),
		referenceId: text('reference_id'),
		balanceAfter: integer('balance_after').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('idx_token_transactions_user_created').on(table.userId, table.createdAt.desc()),
		check(
			'token_txn_reason_valid',
			sql`${table.reason} IN ('build', 'improve_prompt', 'chat', 'daily_bonus', 'signup_bonus', 'referral_bonus', 'monthly_allowance', 'refund')`,
		),
	],
)

export type AiCallKind =
	| 'build'
	| 'chat'
	| 'improve_prompt'
	| 'ask_question'
	| 'generate_plan'
	| 'discovery_ocr'
	| 'discovery_extract_topics'
	| 'discovery_extract_text'
	| 'discovery_extract_screenshot'
	| 'discovery_analyze'
	| 'discovery_adaptive'
	| 'discovery_insights'
	| 'generate_proposal'
export type AiCallStatus = 'ok' | 'error' | 'truncated' | 'aborted' | 'refused'

export const aiCallLog = pgTable(
	'ai_call_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		projectId: uuid('project_id'),
		sessionId: text('session_id'),
		kind: text('kind').notNull().$type<AiCallKind>(),
		model: text('model').notNull(),
		inputTokens: integer('input_tokens').notNull().default(0),
		cachedReadTokens: integer('cached_read_tokens').notNull().default(0),
		cachedWriteTokens: integer('cached_write_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		centsCharged: integer('cents_charged').notNull().default(0),
		latencyMs: integer('latency_ms').notNull().default(0),
		stopReason: text('stop_reason'),
		status: text('status').notNull().$type<AiCallStatus>(),
		errorCode: text('error_code'),
		cacheHitRatePct: integer('cache_hit_rate_pct'),
	},
	(table) => [
		index('idx_ai_call_log_user_created').on(table.userId, table.createdAt.desc()),
		index('idx_ai_call_log_kind_created').on(table.kind, table.createdAt.desc()),
		index('idx_ai_call_log_status_created').on(table.status, table.createdAt.desc()),
		check(
			'ai_call_kind_valid',
			sql`${table.kind} IN ('build', 'chat', 'improve_prompt', 'ask_question', 'generate_plan', 'discovery_ocr', 'discovery_extract_topics', 'discovery_extract_text', 'discovery_extract_screenshot', 'discovery_analyze', 'discovery_adaptive', 'discovery_insights', 'generate_proposal')`,
		),
		check(
			'ai_call_status_valid',
			sql`${table.status} IN ('ok', 'error', 'truncated', 'aborted', 'refused')`,
		),
	],
)

export type AgentEventType =
	| 'proposal'
	| 'approval'
	| 'rejection'
	| 'execution'
	| 'verification'
	| 'escalation'
	| 'error'

export const agentEvents = pgTable(
	'agent_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
		eventType: text('event_type').notNull().$type<AgentEventType>(),
		payload: jsonb('payload').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('idx_agent_events_project_created').on(table.projectId, table.createdAt.desc()),
		index('idx_agent_events_user_created').on(table.userId, table.createdAt.desc()),
		check(
			'agent_event_type_valid',
			sql`${table.eventType} IN ('proposal', 'approval', 'rejection', 'execution', 'verification', 'escalation', 'error')`,
		),
	],
)

export type AgentTaskStatus =
	| 'proposed'
	| 'approved'
	| 'rejected'
	| 'executing'
	| 'verifying'
	| 'done'
	| 'failed'
	| 'escalated'

export type AgentType = 'booking_confirmation' | 'booking_reminder' | 'lead_research' | 'email_drip'

export const agentTasks = pgTable(
	'agent_tasks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		agentType: text('agent_type').notNull().$type<AgentType>(),
		status: text('status').notNull().default('proposed').$type<AgentTaskStatus>(),
		payload: jsonb('payload').notNull(),
		result: jsonb('result'),
		autoApproved: boolean('auto_approved').notNull().default(false),
		proposedAt: timestamp('proposed_at', { withTimezone: true }).notNull().defaultNow(),
		approvedAt: timestamp('approved_at', { withTimezone: true }),
		executedAt: timestamp('executed_at', { withTimezone: true }),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
	},
	(table) => [
		index('idx_agent_tasks_project_status').on(table.projectId, table.status),
		index('idx_agent_tasks_project_proposed').on(table.projectId, table.proposedAt.desc()),
		check(
			'agent_task_status_valid',
			sql`${table.status} IN ('proposed', 'approved', 'rejected', 'executing', 'verifying', 'done', 'failed', 'escalated')`,
		),
		check(
			'agent_task_type_valid',
			sql`${table.agentType} IN ('booking_confirmation', 'booking_reminder', 'lead_research', 'email_drip')`,
		),
	],
)

export type DomainType = 'subdomain' | 'custom'
export type DomainState =
	| 'searching'
	| 'available'
	| 'purchasing'
	| 'registered'
	| 'dns_configuring'
	| 'ssl_provisioning'
	| 'active'
	| 'expiring'
	| 'expired'
	| 'transferred_out'
	| 'failed'

export const projectDomains = pgTable(
	'project_domains',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		type: text('type').notNull().$type<DomainType>(),
		domain: text('domain').notNull().unique(),
		state: text('state').notNull().default('active').$type<DomainState>(),
		registrarId: text('registrar_id'),
		failureReason: text('failure_reason'),
		retryCount: integer('retry_count').notNull().default(0),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('idx_project_domains_project').on(table.projectId),
		index('idx_project_domains_state')
			.on(table.state)
			.where(sql`${table.state} NOT IN ('active', 'expired')`),
		check('project_domain_type_valid', sql`${table.type} IN ('subdomain', 'custom')`),
		check(
			'project_domain_state_valid',
			sql`${table.state} IN ('searching', 'available', 'purchasing', 'registered', 'dns_configuring', 'ssl_provisioning', 'active', 'expiring', 'expired', 'transferred_out', 'failed')`,
		),
	],
)

export type DeploymentStatus =
	| 'shadow'
	| 'queued'
	| 'building'
	| 'ready'
	| 'error'
	| 'timeout'
	| 'quota_exceeded'
	| 'canceled'

export const deploymentLog = pgTable(
	'deployment_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		projectId: uuid('project_id'),
		buildId: text('build_id'),
		vercelProjectId: text('vercel_project_id'),
		vercelDeploymentId: text('vercel_deployment_id'),
		slug: text('slug'),
		url: text('url'),
		status: text('status').notNull().$type<DeploymentStatus>(),
		errorCode: text('error_code'),
		errorMessage: text('error_message'),
		apiLatencyMs: integer('api_latency_ms').notNull().default(0),
		buildDurationMs: integer('build_duration_ms').notNull().default(0),
	},
	(table) => [
		index('idx_deployment_log_user_created').on(table.userId, table.createdAt.desc()),
		index('idx_deployment_log_project_created').on(table.projectId, table.createdAt.desc()),
		index('idx_deployment_log_status_created').on(table.status, table.createdAt.desc()),
		check(
			'deployment_status_valid',
			sql`${table.status} IN ('shadow', 'queued', 'building', 'ready', 'error', 'timeout', 'quota_exceeded', 'canceled')`,
		),
	],
)
