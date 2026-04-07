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
	| 'daily_bonus'
	| 'signup_bonus'
	| 'referral_bonus'
	| 'monthly_allowance'
	| 'refund'

// ── Table 1: X-Ray Results ──────────────────────────────────────────────────

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

// ── Table 2: Audit Orders ───────────────────────────────────────────────────

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

// ── Table 3: Users ─────────────────────────────────────────────────────────

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

// ── Table 4: Subscribers ────────────────────────────────────────────────────

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

// ── Table 5: Discovery Sessions ────────────────────────────────────────────

export const discoverySessions = pgTable(
	'discovery_sessions',
	{
		id: text('id').primaryKey(), // nanoid(16)
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		email: text('email'),

		// Phase 1
		occupation: text('occupation'),
		ageBracket: text('age_bracket'),
		quizPicks: text('quiz_picks').array(),
		aiComfort: integer('ai_comfort'), // 1-4
		aiToolsUsed: text('ai_tools_used').array(),

		// Phase 2 (processed extractions)
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

		// Phase 3 (AI output)
		analysis: jsonb('analysis'),
		recommendedApp: text('recommended_app'),
		learningModules: jsonb('learning_modules'),

		// Conversion
		tierPurchased: text('tier_purchased'), // null | 'base' | 'build'
		stripeSessionId: text('stripe_session_id'),
		paidAt: timestamp('paid_at', { withTimezone: true }),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('idx_discovery_user_id').on(table.userId)],
)

// ═══════════════════════════════════════════════════════════════════════════
// Meldar v3 — Project file storage (event-sourced builds + content-addressed R2)
//
// Decision record: docs/v3/engineering/{data-engineer,software-architect,database-optimizer}-review.md
// Architecture memory: ~/.claude/projects/-Users-georgyskr-projects-pet-agentgate/memory/v3_storage_architecture.md
//
// Unit of truth = the Build event, not the file. Files are payloads.
// R2 layout = projects/{projectId}/content/{sha256}, immutable, content-addressed.
// ═══════════════════════════════════════════════════════════════════════════

// ── Table 6: Projects (v3) ─────────────────────────────────────────────────
// One row per Meldar project. `currentBuildId` is HEAD — rollback is a single
// UPDATE to flip this pointer (zero R2 operations).
//
// The FK from current_build_id → builds.id is a CIRCULAR dependency (builds
// also FKs projects.id). Drizzle can't emit DEFERRABLE constraints natively,
// so the FK is added in the hand-edited migration SQL with
// `DEFERRABLE INITIALLY DEFERRED` to allow a single transaction to insert a
// project + its genesis build + flip HEAD atomically.

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
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(table) => [
		// Drives Hot Path 4 (dashboard: list user's projects by recency).
		// Partial excludes soft-deleted rows to keep the index lean.
		index('idx_projects_user_lastbuild')
			.on(table.userId, table.lastBuildAt.desc().nullsLast())
			.where(sql`${table.deletedAt} IS NULL`),
		// Rare lookup: "which projects have HEAD pointing at this build?" Used by
		// the rollback reconciliation job.
		index('idx_projects_current_build')
			.on(table.currentBuildId)
			.where(sql`${table.currentBuildId} IS NOT NULL`),
		check('projects_tier_valid', sql`${table.tier} IN ('builder', 'pro', 'vip')`),
	],
)

// ── Table 7: Builds (v3) ───────────────────────────────────────────────────
// Immutable, append-only event log. Each Build is a causally-traceable unit of
// work with a producer (Sonnet + prompt + model version), a parent pointer
// (DAG, not just a list), and a status. Phase-2 GitHub export maps each Build
// → one git commit.

export const builds = pgTable(
	'builds',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		// Self-referential FK for build DAG. `parentBuildId` is null only for the
		// genesis build (template instantiation).
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
		// Drives "show me all builds for this project, newest first" (build history).
		// Composite index-ordered avoids a sort step.
		index('idx_builds_project_created').on(table.projectId, table.createdAt.desc()),
		// Partial index on the tiny "in-flight" set — used by the resume-incomplete
		// and the orphaned-build reaper jobs.
		index('idx_builds_project_status')
			.on(table.projectId, table.status)
			.where(sql`${table.status} IN ('streaming', 'failed')`),
		// Scopes the workspace-load "is there an active streaming build?" query
		// down to the streaming set so the planner doesn't walk completed rows.
		index('idx_builds_project_streaming_created')
			.on(table.projectId, table.createdAt.desc())
			.where(sql`${table.status} = 'streaming'`),
		// Enforces "at most one streaming build per project" at the DB level.
		// Fixes the race where two concurrent POSTs to the build route both pass
		// the non-atomic getActiveStreamingBuild guard — the second INSERT now
		// fails with a unique constraint violation that the route catches and
		// converts to BUILD_IN_PROGRESS.
		uniqueIndex('ux_builds_project_streaming')
			.on(table.projectId)
			.where(sql`${table.status} = 'streaming'`),
		// Self-referential FK via the Drizzle foreignKey helper can't be used with
		// a forward ref to the same table's column inside the columns object, so
		// we add this FK in the hand-edited migration SQL alongside the circular FK.
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

// ── Table 8: Build Files (v3) ──────────────────────────────────────────────
// Per-build manifest. Immutable once written (each Build is append-only).
// Used for rollback, diff, and historical queries. The composite (build_id, path)
// IS the PK — no surrogate ID, because build_files is a join table.

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
		// Supports Hot Path 5 (diff between builds: SQL set difference on content_hash)
		// and reference-counted GC of orphaned R2 blobs.
		index('idx_build_files_content_hash').on(table.contentHash),
		check('build_files_size_positive', sql`${table.sizeBytes} >= 0`),
	],
)

// ── Table 9: Project Files (v3) ────────────────────────────────────────────
// The LIVE working set — what the sandbox reads on restore. Denormalized from
// build_files for fast lookup. One row per (project, path) where deleted_at
// IS NULL. Maintained via upsert during Build streaming.

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
		// THE critical index from the database-optimizer review. Without it, the
		// upsert in Build streaming (Hot Path 2) has nothing to conflict on, falls
		// back to inserting duplicate rows, and triggers file-flicker corruption
		// that's only noticeable after hundreds of duplicates accumulate. Partial
		// clause lets soft-deleted rows coexist with a live row at the same path.
		uniqueIndex('ux_project_files_project_path')
			.on(table.projectId, table.path)
			.where(sql`${table.deletedAt} IS NULL`),
		// Drives Hot Path 1 (workspace entry: load all live files for project).
		index('idx_project_files_project_active')
			.on(table.projectId)
			.where(sql`${table.deletedAt} IS NULL`),
		// Content hash index — supports Phase 2 content dedup across projects.
		// Cheap to add now.
		index('idx_project_files_content_hash').on(table.contentHash),
		check('project_files_size_positive', sql`${table.sizeBytes} >= 0`),
		check('project_files_version_positive', sql`${table.version} >= 1`),
	],
)

// ── Table 10: Kanban Cards (v3) ──────────────────────────────────────────

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

// ── Table 11: Token Transactions ──────────────────────────────────────────

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
			sql`${table.reason} IN ('build', 'improve_prompt', 'daily_bonus', 'signup_bonus', 'referral_bonus', 'monthly_allowance', 'refund')`,
		),
	],
)
