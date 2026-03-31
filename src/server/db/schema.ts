import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'

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
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('idx_users_email').on(table.email)],
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
		quizPicks: text('quiz_picks').array(),
		aiComfort: integer('ai_comfort'), // 1-4
		aiToolsUsed: text('ai_tools_used').array(),

		// Phase 2 (processed extractions)
		screenTimeData: jsonb('screen_time_data'),
		chatgptData: jsonb('chatgpt_data'),
		claudeData: jsonb('claude_data'),
		googleData: jsonb('google_data'),
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
