# Data Engineer Review: Meldar Data Layer

**Reviewer:** Data Engineer Agent
**Date:** 2026-03-30
**Scope:** Schema, connection pattern, data flows, GDPR compliance, retention enforcement

---

## Files Reviewed

- `src/server/db/schema.ts` — 3 tables (xray_results, audit_orders, subscribers)
- `src/server/db/client.ts` — Neon serverless connection
- `src/app/api/upload/screentime/route.ts` — Screenshot upload + X-Ray creation
- `src/app/api/billing/webhook/route.ts` — Stripe webhook + order/subscriber creation
- `src/app/api/billing/checkout/route.ts` — Checkout session creation
- `src/app/api/subscribe/route.ts` — Email signup
- `src/app/xray/[id]/page.tsx` — X-Ray result page (read path)
- `src/app/xray/[id]/og/route.tsx` — OG image generation (read path)
- `drizzle.config.ts` — Drizzle Kit config

---

## 1. Schema Design

### 1.1 Types and Constraints

**Generally sound.** Primary keys are appropriate: nanoid for shareable xray URLs, UUIDs for internal records. Timestamps use `withTimezone: true` consistently, which is correct.

**Issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| S1 | Medium | `product` column on `audit_orders` is free-text `text`. Should be a constrained enum or check constraint to prevent invalid values like typos. Current valid values: `'time_audit' \| 'app_build'`. | `schema.ts:45` |
| S2 | Medium | `status` column on `audit_orders` is free-text `text` with default `'paid'`. Same concern — use a Postgres enum or check constraint. Valid values: `'paid' \| 'in_progress' \| 'delivered'`. | `schema.ts:48` |
| S3 | Medium | `source` column on `subscribers` is free-text `text`. Valid values already span at least `'landing' \| 'xray' \| 'quiz' \| 'checkout' \| 'founding' \| 'starter_interest'`. An unconstrained column means any string can be inserted without detection. | `schema.ts:63` |
| S4 | Low | `amountCents` uses `integer` which is fine for now, but if amounts ever exceed ~21M EUR the column overflows. `bigint` is a safer choice for monetary values. Not urgent at current scale. | `schema.ts:45` |
| S5 | Low | `currency` defaults to `'eur'` but is not constrained. Consider a check constraint for ISO 4217 codes. | `schema.ts:46` |

**Recommendation:** Use `pgEnum` from `drizzle-orm/pg-core` for `product`, `status`, and `source`. This gives you database-level enforcement and better documentation:

```ts
export const productEnum = pgEnum('product_type', ['time_audit', 'app_build'])
export const orderStatusEnum = pgEnum('order_status', ['paid', 'in_progress', 'delivered'])
```

### 1.2 Indexes

| Table | Index | Assessment |
|-------|-------|------------|
| `xray_results` | `idx_xray_expires` on `expiresAt` | Good — supports purge queries |
| `audit_orders` | `idx_audit_email` on `email` | Good — supports customer lookup |
| `subscribers` | (none beyond unique on email) | **Missing:** No index on `foundingMember`. The `FoundingCounter` component runs `WHERE founding_member = true` on every page load. At small scale this is fine; consider a partial index if the table grows. |

### 1.3 Missing Index

| # | Severity | Issue |
|---|----------|-------|
| S6 | Low | `audit_orders.xray_id` has a FK but no index. If you ever query "which orders are linked to this X-Ray," it will be a sequential scan. Add an index if this query pattern is expected. |

---

## 2. Data Integrity

### 2.1 Foreign Key Relationships

Both `audit_orders.xray_id` and `subscribers.xray_id` reference `xray_results.id` with `onDelete: 'set null'`. This is **the correct choice** given the 30-day TTL on xray_results: when an X-Ray is purged, the order/subscriber records survive with `xray_id = NULL`.

### 2.2 Cascade Concerns

No cascading deletes anywhere — good. Data won't be accidentally removed when related rows are deleted.

### 2.3 Nullability Issues

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| D1 | Medium | `xray_results.email` is nullable and is **never populated**. The screentime upload route (`route.ts:95-103`) does not set the `email` field. If this column is meant to link X-Rays to subscribers, it's dead. If it's for future use, document it; otherwise remove it. | `schema.ts:19`, `upload/screentime/route.ts:95` |
| D2 | Low | `xray_results.quizPains` is a `text[]` array that is never written to by the screentime upload flow. May be intended for the quiz flow but currently orphaned. | `schema.ts:20` |
| D3 | Low | `xray_results.suggestions` is nullable JSONB, while `apps` is `.notNull()` JSONB. The asymmetry is intentional (suggestions are optional), but there's no schema validation on either JSONB column at the database level. | `schema.ts:25-26` |

---

## 3. GDPR Compliance — CRITICAL

### 3.1 30-Day TTL: Not Enforced

**This is the most significant finding.** The privacy policy at `/privacy-policy` states:

> "Anonymous X-Ray results: 30 days, then automatically purged"

The schema has an `expires_at` column with a 30-day default and an index to support purge queries. However:

| # | Severity | Issue |
|---|----------|-------|
| G1 | **Critical** | **No purge mechanism exists.** There is no cron job, no Vercel cron, no `vercel.json` with cron config, no scheduled function, no `pg_cron` extension, and no API route that deletes expired rows. Expired X-Ray results persist indefinitely. |
| G2 | **High** | **Expired rows are still served.** The read paths (`xray/[id]/page.tsx:18` and `xray/[id]/og/route.tsx:16`) query by ID without checking `expires_at`. A user visiting an X-Ray URL after 30 days will still see their data. |
| G3 | **High** | **The privacy policy promise is legally binding.** Under GDPR, stating a retention period and not enforcing it is a compliance violation. The Finnish DPA (Tietosuojavaltuutetun toimisto) can enforce this. |

**Recommended fix (two parts):**

**Part A — Filter expired rows at read time (immediate):**
```ts
// In getXRay():
const rows = await db.select().from(xrayResults)
  .where(and(eq(xrayResults.id, id), gt(xrayResults.expiresAt, new Date())))
  .limit(1)
```

**Part B — Purge expired rows on schedule:**

Option 1: Vercel Cron (simplest for Vercel deployment):
```json
// vercel.json
{ "crons": [{ "path": "/api/cron/purge-xrays", "schedule": "0 3 * * *" }] }
```
```ts
// src/app/api/cron/purge-xrays/route.ts
import { lt } from 'drizzle-orm'
export async function GET(request: Request) {
  // Verify CRON_SECRET header
  const db = getDb()
  await db.delete(xrayResults).where(lt(xrayResults.expiresAt, new Date()))
  return Response.json({ ok: true })
}
```

Option 2: Neon `pg_cron` extension (if available on your Neon plan):
```sql
SELECT cron.schedule('purge-expired-xrays', '0 3 * * *',
  $$DELETE FROM xray_results WHERE expires_at < NOW()$$);
```

### 3.2 PII Inventory

| Table | PII Fields | Retention | Concern |
|-------|-----------|-----------|---------|
| `xray_results` | `email` (nullable, currently unused), app usage data (behavioral PII) | 30 days (stated, not enforced) | App usage patterns are personal data under GDPR. The email column is unused but could accumulate PII if populated later without consent flow. |
| `audit_orders` | `email`, `stripe_customer_id` | No defined retention | Financial records may need to be retained for Finnish accounting law (6 years for bookkeeping). Document the legal basis. |
| `subscribers` | `email` | No defined retention | Needs consent withdrawal mechanism (unsubscribe). Currently no unsubscribe flow or deletion endpoint. |

### 3.3 Right to Erasure (Article 17)

| # | Severity | Issue |
|---|----------|-------|
| G4 | Medium | There is no "delete my data" endpoint or admin tool. A user requesting erasure would require manual database intervention. For the current scale this may be acceptable, but should be on the roadmap. |

### 3.4 Data Minimization

| # | Severity | Issue |
|---|----------|-------|
| G5 | Low | The screentime upload route sends the full base64 screenshot to Claude Vision (`extractScreenTime`). Verify that the image is not logged or stored by the AI provider beyond the API call. Anthropic's API does not store inputs by default, but this should be documented. |

---

## 4. Data Flows

### 4.1 Screentime Upload (`POST /api/upload/screentime`)

**Flow:** Image -> base64 -> Claude Vision -> structured data -> DB insert -> return JSON with ID

**Findings:**

| # | Severity | Issue |
|---|----------|-------|
| F1 | Low | The base64 image exists in server memory during the request but is not persisted to disk or object storage — good. Confirm this is also true within `extractScreenTime()`. |
| F2 | Low | Rate limiting uses IP from `x-forwarded-for`. On Vercel this is reliable, but the fallback to `'unknown'` means all requests without the header share one rate limit bucket. Consider using Vercel's `request.ip` or `x-real-ip`. |

### 4.2 Billing Webhook (`POST /api/billing/webhook`)

**Flow:** Stripe event -> verify signature -> insert audit_order + subscriber -> return 200

**Findings:**

| # | Severity | Issue |
|---|----------|-------|
| F3 | Low | The webhook silently returns `{ received: true }` if `email` is null (line 35). This is correct for idempotency (Stripe may send events without email), but consider logging a warning for observability. |
| F4 | Low | `.onConflictDoNothing()` on both inserts is correct — prevents duplicate processing of replayed webhooks. Good. |
| F5 | Medium | The subscriber inserted from checkout has `foundingMember: false` hardcoded (line 62). If a founding member purchases through checkout, they lose their founding status on re-insert. However, `onConflictDoNothing` prevents this since the email unique constraint stops the second insert. This is correct but fragile — if you ever switch to `onConflictDoUpdate`, this will silently demote founding members. Add a comment. |

### 4.3 Subscribe (`POST /api/subscribe`)

**Flow:** JSON body -> validate email -> DB insert -> send welcome email -> notify founder

**Findings:**

| # | Severity | Issue |
|---|----------|-------|
| F6 | Medium | Email validation is minimal: `!email.includes('@')`. This allows strings like `@` or `foo@` or `a@b`. Use Zod's `z.string().email()` for consistency with the checkout route. |
| F7 | Low | Dynamic imports (`await import(...)`) for `getDb` and `subscribers` are used here but not in other routes. This is likely a remnant from when this route predated the DB layer. Consider standardizing to static imports for consistency. |
| F8 | Info | The founder notification email is sent to a hardcoded address (`gosha.skryuchenkov@gmail.com`). Consider moving to an environment variable for flexibility. |

### 4.4 X-Ray Read Path (`GET /xray/[id]`)

**Flow:** ID from URL -> DB select by ID -> render page (or 404)

**Findings:**

| # | Severity | Issue |
|---|----------|-------|
| F9 | High | No expiry check (see G2 above). Expired X-Rays are served as if still valid. |
| F10 | Low | `generateMetadata` and the page component both call `getXRay(id)`, causing two identical DB queries per page load. Next.js Request Memoization should deduplicate these if they use `fetch`, but since this uses Drizzle directly (not `fetch`), both queries execute. Consider using `React.cache()` to wrap `getXRay`. |

---

## 5. JSONB Usage

### 5.1 `xray_results.apps` (JSONB, NOT NULL)

**Shape:** `[{name: string, usageMinutes: number, category?: string}]`

This is appropriate for JSONB because:
- The number of apps varies per screenshot
- The structure is simple and self-contained
- There's no need to query individual apps across X-Rays

**Concern:** No runtime validation on the JSONB shape at insert time. If `extractScreenTime` returns malformed data, it's stored as-is. Add Zod validation before insert.

### 5.2 `xray_results.suggestions` (JSONB, nullable)

Same concern — no schema validation. The shape comes from `mapToPainPoints()` which is a rule-based function, so the risk is lower.

**Verdict:** JSONB is the right choice for both columns. Normalizing apps into a separate table would add complexity without benefit at this scale. Add Zod validation at the application layer.

---

## 6. Connection Pattern

### 6.1 Neon Serverless Driver

```ts
export function getDb() {
  const sql = neon(process.env.DATABASE_URL)
  return drizzle(sql, { schema })
}
```

**Assessment:**

| # | Severity | Issue |
|---|----------|-------|
| C1 | Medium | `getDb()` creates a new `neon()` HTTP client on every call. The `neon()` function from `@neondatabase/serverless` is designed for this (it's HTTP-based, not a persistent connection), so this is functionally correct. However, the `drizzle()` wrapper does some setup work. Consider caching the drizzle instance at module level for the lifetime of the serverless function. |

**Recommended pattern:**
```ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set')
    }
    const sql = neon(process.env.DATABASE_URL)
    _db = drizzle(sql, { schema })
  }
  return _db
}
```

This is safe because `neon()` in HTTP mode is stateless — caching the drizzle instance just avoids redundant setup.

### 6.2 Connection Pooling

The Neon HTTP driver (`@neondatabase/serverless` with `neon()`) does not use traditional connection pooling — each query is an independent HTTP request to Neon's proxy. This is correct for Vercel serverless functions. No connection pool exhaustion risk.

If you later need transactions or WebSocket connections, switch to `neonConfig` with the WebSocket driver, and use Neon's connection pooler endpoint.

---

## 7. Migration Strategy

### 7.1 `drizzle-kit push` (via `pnpm db:push`)

**Assessment:**

| # | Severity | Issue |
|---|----------|-------|
| M1 | **High** | `drizzle-kit push` applies schema changes directly to the database without generating migration files. This is fine for early development but **dangerous for production** because: (a) changes are not versioned or reviewable, (b) destructive changes (column drops, type changes) execute without confirmation in CI, (c) there's no rollback path. |

**Current state:** The `migrations/` directory is empty — no migration files have ever been generated despite `drizzle.config.ts` pointing `out` to `./src/server/db/migrations`.

**Recommendation:** Switch to `drizzle-kit generate` + `drizzle-kit migrate` for production:
1. Run `pnpm db:generate` to create the initial migration from the current schema
2. Apply with `drizzle-kit migrate` (or a custom migration runner)
3. Add a CI check that verifies the migration files are up-to-date with the schema
4. Keep `db:push` as a convenience for local development only

---

## 8. Data Retention

### 8.1 Policy vs. Reality

| Data Type | Stated Policy | Actual Enforcement | Gap |
|-----------|--------------|-------------------|-----|
| X-Ray results | 30 days, auto-purge | `expires_at` column set but never checked or purged | **Critical gap** |
| Screenshots | "deleted immediately" | Not stored (processed in memory) | Compliant |
| Subscriber emails | Not specified | Stored indefinitely | Should document retention period |
| Audit orders | Not specified | Stored indefinitely | Finnish bookkeeping law may require 6-year retention — document legal basis |
| Cookies (_ga*) | Cleared on consent rejection | Implemented in cookie-consent hook | Compliant |

### 8.2 Retention Recommendations

1. **Immediate:** Implement the X-Ray purge mechanism (see G1)
2. **Short-term:** Add `expires_at` filtering to all read paths (see G2)
3. **Medium-term:** Document retention periods for `subscribers` and `audit_orders` in the privacy policy
4. **Medium-term:** Add an unsubscribe/data-deletion endpoint for `subscribers`

---

## 9. Backup and Recovery

| # | Severity | Issue |
|---|----------|-------|
| B1 | Medium | No backup strategy is documented. Neon provides point-in-time recovery (PITR) on paid plans and branch-based snapshots. Verify your Neon plan includes PITR and document the recovery procedure. |
| B2 | Low | Since `drizzle-kit push` is used without migration files, a schema-only restore is not possible from the codebase alone. The schema definition in `schema.ts` is the single source of truth — if it diverges from production, there's no migration history to reconcile. |

---

## Summary of Findings by Severity

### Critical (must fix)
- **G1:** No purge mechanism for expired X-Ray results — privacy policy violation

### High (should fix soon)
- **G2:** Expired X-Ray rows still served to users — no `expires_at` check in read paths
- **G3:** Legally binding retention promise not enforced
- **M1:** `drizzle-kit push` is unsafe for production schema changes

### Medium (should fix)
- **S1-S3:** Free-text columns where enums should be used (`product`, `status`, `source`)
- **D1:** `email` column on `xray_results` is never populated — dead column
- **F5:** Fragile founding member status preservation relies on `onConflictDoNothing`
- **F6:** Weak email validation in subscribe route
- **C1:** `getDb()` recreates drizzle instance on every call (minor perf)
- **B1:** No documented backup/recovery strategy
- **G4:** No right-to-erasure endpoint

### Low / Info
- **S4-S6:** Minor type and index improvements
- **D2-D3:** Unused/inconsistent nullable columns
- **F2, F3, F7, F8, F10:** Minor flow improvements
- **B2:** No migration history for schema-only restore
- **G5:** Verify AI provider does not log screenshot data

---

## Recommended Priority Actions

1. **Today:** Add `expires_at` filtering to `getXRay()` and the OG route — 5-minute fix that closes G2
2. **This week:** Create a Vercel Cron purge endpoint — closes G1 and G3
3. **This week:** Generate initial migration files with `drizzle-kit generate` — closes M1
4. **Next sprint:** Add `pgEnum` for `product`, `status`, `source` columns — closes S1-S3
5. **Next sprint:** Add Zod validation for JSONB payloads before DB insert
6. **Backlog:** Unsubscribe/erasure endpoint, subscriber retention policy, backup documentation
