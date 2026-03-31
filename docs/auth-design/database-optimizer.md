# Database Design for Auth + Usage Tracking

## 1. Schema Design

### Recommendation: JWT sessions + Auth.js adapter tables

Auth.js (NextAuth v5) with JWT strategy is the right call for Meldar:
- Neon's HTTP driver (`@neondatabase/serverless`) is stateless per-request. No persistent connection pool. DB sessions would mean a query on every single request.
- JWT strategy: session data lives in a signed cookie. Zero DB queries for session validation.
- Auth.js still needs `users` and `accounts` tables for OAuth linking, but no `sessions` table.

### Drizzle Schema

```typescript
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

// ── Users ──────────────────────────────────────────────────────────────────────
// Core user record. One per human. Created on first OAuth sign-in.

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').unique().notNull(),
    emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
    image: text('image'),

    // Meldar-specific
    marketingConsent: boolean('marketing_consent').notNull().default(false),
    marketingConsentAt: timestamp('marketing_consent_at', { withTimezone: true }),
    xrayUsageCount: integer('xray_usage_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
  ],
)

// ── Accounts (Auth.js adapter) ─────────────────────────────────────────────────
// One row per OAuth provider link. A user who signs in with Google AND GitHub
// has two rows here. Auth.js requires this exact shape.

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index('idx_accounts_user_id').on(table.userId),
  ],
)

// ── Verification Tokens (Auth.js adapter) ──────────────────────────────────────
// Used for email-based magic link flows. Not needed for pure OAuth, but Auth.js
// adapter expects it to exist. Cheap to keep, avoids adapter errors.

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ],
)

// ── X-Ray Results (updated) ────────────────────────────────────────────────────

export const xrayResults = pgTable(
  'xray_results',
  {
    id: text('id').primaryKey(), // nanoid (12 chars, URL-safe)
    email: text('email'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    quizPains: text('quiz_pains').array(),
    apps: jsonb('apps').notNull(),
    totalHours: real('total_hours').notNull(),
    topApp: text('top_app').notNull(),
    pickups: integer('pickups'),
    insight: text('insight').notNull(),
    suggestions: jsonb('suggestions'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_xray_user_id').on(table.userId),
  ],
)

// ── Audit Orders (unchanged) ───────────────────────────────────────────────────

export const auditOrders = pgTable(
  'audit_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    stripeCheckoutSessionId: text('stripe_checkout_session_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id'),
    product: text('product').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('eur'),
    xrayId: text('xray_id').references(() => xrayResults.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('paid'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_audit_email').on(table.email)],
)

// ── Subscribers (kept as-is for now) ───────────────────────────────────────────

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    source: text('source').notNull().default('landing'),
    xrayId: text('xray_id').references(() => xrayResults.id, { onDelete: 'set null' }),
    foundingMember: boolean('founding_member').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => [],
)
```

---

## 2. Migration from Current Schema

### Recommendation: Additive (keep `subscribers`, add `users`)

**Do NOT replace `subscribers` with `users`.** They serve different purposes:

| | `subscribers` | `users` |
|---|---|---|
| **Created when** | User enters email in any capture form | User completes OAuth sign-in |
| **Has password/OAuth** | No | Yes |
| **Purpose** | Marketing list, founding member tracking | Authentication, usage tracking |
| **Can exist without the other** | Yes (someone subscribes but never signs in) | Yes (someone signs in but skips marketing opt-in) |

**Migration strategy:**
1. Add `users`, `accounts`, `verification_tokens` tables (new).
2. Add `user_id` column to `xray_results` (nullable FK).
3. Keep `subscribers` untouched.
4. When a user signs in via OAuth and their email matches a `subscribers` row, the application layer can set `marketingConsent = true` on the `users` record and note the `foundingMember` status. This is app logic, not a DB migration.

### Migration SQL

```sql
-- Migration: add auth tables and link xray_results

-- 1. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent_at TIMESTAMPTZ,
  xray_usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- 2. Accounts table (Auth.js adapter)
CREATE TABLE accounts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX idx_accounts_user_id ON accounts (user_id);

-- 3. Verification tokens (Auth.js adapter)
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- 4. Add user_id to xray_results
ALTER TABLE xray_results
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_xray_user_id ON xray_results (user_id);
```

---

## 3. Indexes

### Hot queries and their indexes

| Query | Frequency | Index |
|---|---|---|
| User lookup by email (OAuth sign-in, subscriber merge) | Every sign-in | `idx_users_email` on `users(email)` -- also covered by `UNIQUE` constraint |
| Account lookup by provider+id (Auth.js adapter) | Every sign-in | Primary key `(provider, provider_account_id)` |
| Accounts by user_id (Auth.js adapter: list linked providers) | On profile page | `idx_accounts_user_id` on `accounts(user_id)` |
| X-Ray results by user_id (usage count, history) | Every X-Ray attempt | `idx_xray_user_id` on `xray_results(user_id)` |
| Audit orders by email | On order lookup | `idx_audit_email` already exists |

### What NOT to index

- `users.xray_usage_count` -- never queried in a WHERE clause, only read after user lookup by id/email.
- `users.marketing_consent` -- low cardinality boolean, full scan would be rare and for batch jobs only.
- `xray_results.email` -- after auth, lookups shift to `user_id`. The `email` column becomes legacy.

---

## 4. The `xray_results` Table -- Adding `user_id`

### Schema change

Add a nullable `user_id` column with a FK to `users(id)`:

```typescript
userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
```

**Why nullable?**
- Existing rows have no user. They were created anonymously.
- Future anonymous X-Ray results (before sign-in) will also have `user_id = NULL`.
- After sign-in, the app links results by matching email or by explicit claim.

### Backfill strategy

After auth launches and users start signing in:

```sql
-- Backfill: link anonymous xray_results to users by email match
UPDATE xray_results xr
SET user_id = u.id
FROM users u
WHERE xr.email = u.email
  AND xr.user_id IS NULL
  AND xr.email IS NOT NULL;
```

**When to run:** As a one-time migration after the `users` table is populated, or as an on-sign-in hook in the application layer (recommended -- link on first login per user, no batch job needed).

**Application-layer claim flow (preferred):**
```typescript
// In the Auth.js signIn callback or a post-login hook:
async function claimAnonymousResults(userId: string, email: string) {
  await db
    .update(xrayResults)
    .set({ userId })
    .where(
      and(
        eq(xrayResults.email, email),
        isNull(xrayResults.userId),
      )
    )
}
```

---

## 5. Usage Counting: Counter Column vs. Separate Table

### Recommendation: Counter column on `users` (`xray_usage_count`)

For the "3 free attempts" check, a counter column wins on every axis:

| | Counter column | Separate `usage_records` table |
|---|---|---|
| **Check usage** | `SELECT xray_usage_count FROM users WHERE id = $1` | `SELECT COUNT(*) FROM usage_records WHERE user_id = $1 AND action_type = 'xray'` |
| **Query cost** | Primary key lookup, one row | Count aggregation, potentially scanning rows |
| **Increment** | `UPDATE users SET xray_usage_count = xray_usage_count + 1 WHERE id = $1` | `INSERT INTO usage_records (...)` + count on next check |
| **Race conditions** | Atomic increment, no double-count | Two concurrent inserts can both pass the check before either commits |
| **Schema complexity** | One column on existing table | New table, FK, index |

**The counter column is the right choice because:**
1. The business rule is simple: "has this user used >= 3 attempts?" A single integer answers this.
2. No need for per-attempt metadata (timestamps, details). The X-Ray results themselves are already stored in `xray_results`.
3. Atomic `SET count = count + 1` with a `WHERE count < 3` clause can enforce the limit in a single query with no race condition (see query patterns below).

**When you WOULD want a separate table:** if you needed per-action audit trails, different action types with different limits, or time-windowed limits (e.g., "3 per month"). Meldar's current requirement is a simple lifetime cap.

---

## 6. Query Patterns

### The auth check: "is this user under 3 attempts?"

**Single query -- check and increment atomically:**

```typescript
import { eq, and, lt, sql } from 'drizzle-orm'

async function tryConsumeXrayAttempt(userId: string): Promise<boolean> {
  const result = await db
    .update(users)
    .set({
      xrayUsageCount: sql`${users.xrayUsageCount} + 1`,
    })
    .where(
      and(
        eq(users.id, userId),
        lt(users.xrayUsageCount, 3),
      )
    )
    .returning({ newCount: users.xrayUsageCount })

  // If no rows updated, user was already at 3
  return result.length > 0
}
```

This is a single UPDATE with a WHERE clause that acts as both the check and the increment. No race conditions. No separate SELECT. If two requests hit simultaneously, only one can win because PostgreSQL's row-level locking serializes concurrent UPDATEs on the same row.

**Read-only check (for UI display, no mutation):**

```typescript
async function getRemainingAttempts(userId: string): Promise<number> {
  const [user] = await db
    .select({ count: users.xrayUsageCount })
    .from(users)
    .where(eq(users.id, userId))

  return Math.max(0, 3 - (user?.count ?? 0))
}
```

### Caching consideration

For the "can this user still use X-Ray?" check:
- **Don't cache in a separate store (Redis, etc.).** Overkill for this scale. The query hits a primary key index and returns one integer. On Neon, this is ~5-15ms including network.
- **Do cache in the JWT.** Add `xrayUsageCount` to the JWT token payload via Auth.js callbacks. This makes the check zero-cost (read from cookie). Refresh it when the count changes by updating the token.

```typescript
// In auth.ts callbacks:
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.xrayUsageCount = user.xrayUsageCount ?? 0
    }
    return token
  },
  async session({ session, token }) {
    session.user.xrayUsageCount = token.xrayUsageCount as number
    return session
  },
}
```

**Important:** The JWT-cached count is optimistic. Always re-check the DB when actually consuming an attempt (use the atomic `tryConsumeXrayAttempt` above). The JWT count is for UI purposes (show "2 of 3 used") -- the DB is the source of truth for enforcement.

---

## 7. Neon-Specific Considerations

### HTTP driver + Auth.js adapter compatibility

The current setup uses `@neondatabase/serverless` with the HTTP driver (`neon()` function). This is a stateless, per-request HTTP call -- there is no persistent connection or connection pool.

**Auth.js compatibility:** The Drizzle adapter for Auth.js (`@auth/drizzle-adapter`) works with any Drizzle instance. It calls standard Drizzle query methods. Since `drizzle(neon(...))` returns a standard Drizzle instance, the adapter works without issues.

```typescript
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { getDb } from '@/server/db/client'

export const authConfig = {
  adapter: DrizzleAdapter(getDb()),
  // ...
}
```

### Gotchas

1. **No connection pooling needed.** The HTTP driver makes one HTTP request per query. There's no TCP connection to pool. This is actually an advantage for serverless (Vercel Functions) -- no cold-start connection penalty, no connection limit issues.

2. **Transaction support.** The Neon HTTP driver (`neon()`) supports `db.transaction()` as of `@neondatabase/serverless` v1.0+. However, each statement in the transaction is a separate HTTP request, so transactions are slower than on a persistent connection. For auth flows, this is fine -- Auth.js adapter operations are small.

3. **If you ever need WebSocket connections** (for long-running operations, streaming, or real-time), use the `neonConfig` WebSocket driver instead. But for Meldar's current needs (auth + usage tracking), the HTTP driver is correct.

4. **Neon's free tier limits:** 0.25 vCPU, 0.5 GB RAM, 3 GB storage, 100 hours active compute. Auth operations are lightweight. The `users` and `accounts` tables will be tiny. No concern here.

5. **Cold starts on Neon branching:** If using Neon branching for preview environments, each branch has its own compute that cold-starts separately. Auth.js sessions won't carry across branches (different databases). This is expected and fine for development.

### Alternative: WebSocket driver for connection pooling

If Meldar scales and the HTTP driver's per-query latency becomes a concern, switch to the WebSocket driver with Neon's connection pooler:

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })
```

This gives you a real PostgreSQL connection with full transaction support and lower per-query latency. But it requires managing connection limits and is only worth it at higher traffic volumes.

---

## Summary: What to Implement

| Item | Decision |
|---|---|
| Session strategy | **JWT** (no `sessions` table) |
| New tables | `users`, `accounts`, `verification_tokens` |
| Modified tables | `xray_results` (add nullable `user_id` FK) |
| Kept tables | `subscribers` (unchanged), `audit_orders` (unchanged) |
| Usage tracking | Counter column `xray_usage_count` on `users` |
| Usage enforcement | Atomic `UPDATE ... WHERE count < 3` -- single query, no race conditions |
| Caching | Usage count in JWT for UI display; DB is source of truth for enforcement |
| Subscriber migration | App-layer merge on OAuth sign-in (match by email), not a DB migration |
| X-Ray backfill | App-layer claim on first sign-in per user |
| Neon compatibility | HTTP driver works with Auth.js adapter, no changes needed |
