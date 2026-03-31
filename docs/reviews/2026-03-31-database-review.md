# Database Review — 2026-03-31

Reviewer: Database Optimizer
Files reviewed: schema.ts, client.ts, all discovery/billing/cron routes, xray and start page queries.

---

## Connection Management

### 🔴 `getDb()` creates a new Neon HTTP client on every call

**File:** `src/server/db/client.ts`

`getDb()` calls `neon(process.env.DATABASE_URL)` and `drizzle(...)` on every invocation. In Neon's serverless HTTP driver this means a new fetch-based SQL client is instantiated per request (and sometimes per query within a single request, since routes call `getDb()` multiple times in the upload route). While Neon HTTP is stateless by design and does not hold a persistent connection, this still wastes object allocation and re-parses the URL on every call.

The bigger risk: the upload route calls `getDb()` once at the top, but if future contributors add a second `getDb()` call for a different query they will get a separate client instance with no shared transaction context. This is already a latent footgun.

**Fix:** Memoize at module level so the driver is created once per cold start.

```ts
// src/server/db/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    _db = drizzle(neon(process.env.DATABASE_URL), { schema })
  }
  return _db
}
```

---

## Schema Design

### 🟡 `xrayResults` has no index on `userId` or `email`

**File:** `src/server/db/schema.ts:15–31`

`xrayResults.userId` is a foreign key referencing `users.id` but has no index. If you ever query xray results by user (e.g., "show all X-Rays for this account"), Postgres will do a sequential scan. The `email` column is also unindexed despite being a natural lookup key. The table currently has `() => []` — an empty index array.

Similarly, `subscribers` has `() => []` but its `xrayId` FK is unindexed.

**Fix:**

```ts
// xrayResults
(table) => [
  index('idx_xray_user_id').on(table.userId),
  index('idx_xray_email').on(table.email),
  index('idx_xray_created_at').on(table.createdAt), // for purge cron range scans
]

// subscribers
(table) => [
  index('idx_subscribers_xray_id').on(table.xrayId),
]
```

### 🟡 `discoverySessions.updatedAt` is not auto-updated by Postgres

**File:** `src/server/db/schema.ts:130`

`updatedAt` defaults to `defaultNow()` (set on insert), but updates rely on application code manually passing `updatedAt: new Date()`. If any update path omits this field, `updatedAt` silently goes stale. This has already happened — the analyze route sets it explicitly, but if a new developer adds an update query they may forget.

**Fix:** Use a Postgres trigger or switch to Drizzle's `.$onUpdate(() => new Date())` (available since drizzle-orm 0.29):

```ts
updatedAt: timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date()),
```

### 💭 `auditOrders.status` is an unconstrained `text` column

**File:** `src/server/db/schema.ts:46`

The comment documents `'paid' | 'in_progress' | 'delivered'` but there is no `check` constraint or `pgEnum` enforcing this. A typo in application code silently creates invalid rows.

**Fix:** Use a Drizzle `pgEnum`:

```ts
export const auditOrderStatus = pgEnum('audit_order_status', ['paid', 'in_progress', 'delivered'])
// then in the table:
status: auditOrderStatus('status').notNull().default('paid'),
```

### 💭 `discoverySessions` carries nine JSONB columns for phase-2 data sources

**File:** `src/server/db/schema.ts:107–116`

Nine separate JSONB columns (`screenTimeData`, `chatgptData`, `claudeData`, `googleData`, `subscriptionsData`, `batteryData`, `storageData`, `calendarData`, `healthData`) each hold the parsed output for one data source. This is wide but not wrong at current scale. The main risk is that Postgres stores each JSONB column independently in the tuple; very wide rows with large JSONB blobs can exceed the 8KB inline storage threshold and trigger TOAST, adding read overhead for any query that touches the row.

For now this is acceptable. If session data grows, consider a separate `discovery_uploads` child table (one row per source per session). Not urgent at current volume.

---

## Query Patterns

### 🔴 Upload route: JSONB append under concurrency is a lost-update race

**File:** `src/app/api/discovery/upload/route.ts:331–346`

For the `adaptive` platform, the code:
1. Reads `currentSession.adaptiveData` (one SELECT)
2. Appends a new entry in application memory
3. Writes the merged array back (one UPDATE)

Between steps 1 and 3, a concurrent request for the same session can read the same stale array, append its own entry, and overwrite the first write. The result is that only the last concurrent write survives — previously appended adaptive entries are silently dropped.

This is a classic read-modify-write race on JSONB. It is safe only when requests for a given session are strictly serialized (which they are not at the HTTP layer).

**Fix:** Use a Postgres `jsonb_array_append` equivalent via a single atomic UPDATE statement:

```sql
UPDATE discovery_sessions
SET adaptive_data = COALESCE(adaptive_data, '[]'::jsonb) || $1::jsonb
WHERE id = $2
```

In Drizzle with `sql` tagged template:

```ts
import { sql } from 'drizzle-orm'

await db
  .update(discoverySessions)
  .set({
    adaptiveData: sql`COALESCE(${discoverySessions.adaptiveData}, '[]'::jsonb) || ${JSON.stringify([newEntry])}::jsonb`,
    updatedAt: new Date(),
  })
  .where(eq(discoverySessions.id, sessionId))
```

This also eliminates the extra SELECT entirely — saving one round-trip on every adaptive upload.

### 🟡 Upload route: 2–3 DB round-trips per request, reducible to 1–2

**File:** `src/app/api/discovery/upload/route.ts:160–374`

For all non-adaptive platforms the flow is:
1. `SELECT { id }` to verify session exists (line 160–165)
2. Parse/extract data (AI call — long)
3. `SELECT { sourcesProvided }` to read existing sources (line 358–362)
4. `UPDATE` with new data + merged sources (line 364–374)

Steps 1 and 3 are separate round-trips that could be collapsed into one. Session existence is already guaranteed by step 3's SELECT; the first SELECT is only needed to fail fast before the expensive AI extraction.

The fail-fast check is worth keeping for UX. But steps 3–4 could be made atomic using a single UPDATE with a Postgres array append:

```sql
UPDATE discovery_sessions
SET
  <data_column> = $data,
  sources_provided = array_append(sources_provided, $platform::text),
  updated_at = NOW()
WHERE id = $session_id
  AND NOT ($platform = ANY(sources_provided))  -- optional: idempotency guard
```

In Drizzle:

```ts
import { sql } from 'drizzle-orm'

await db
  .update(discoverySessions)
  .set({
    ...updateData,
    sourcesProvided: sql`array_append(${discoverySessions.sourcesProvided}, ${platformParsed.data})`,
    updatedAt: new Date(),
  })
  .where(eq(discoverySessions.id, sessionId))
```

This eliminates the mid-request SELECT on `sourcesProvided` and also makes the "deduplicate sources" logic atomic — no race between two concurrent uploads of different platforms for the same session.

### 🟡 `analyze/route.ts` fetches all columns with `SELECT *`

**File:** `src/app/api/discovery/analyze/route.ts:52–56`

```ts
const [session] = await db
  .select()   // <-- SELECT *
  .from(discoverySessions)
  ...
```

`discoverySessions` rows can be very large — each JSONB source column can be tens of KB. Fetching every column when you need all of them for analysis is fine functionally, but worth noting that this is the heaviest query in the system. No change needed now, but if you add more JSONB columns in future, consider projecting only the columns `runCrossAnalysis` actually needs.

### 🟡 `xray/[id]/page.tsx` and `start/[id]/page.tsx` both call `generateMetadata` and the page function with separate DB fetches

**Files:** `src/app/xray/[id]/page.tsx:16–49`, `src/app/start/[id]/page.tsx:15–57`

`generateMetadata` calls `getXRay(id)` / `getSession(id)` and the page's default export calls it again. In Next.js App Router with React cache, this doubles the DB queries unless the fetch function is wrapped in `React.cache()`.

**Fix:**

```ts
import { cache } from 'react'

const getXRay = cache(async (id: string) => {
  const db = getDb()
  const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
  return rows[0] || null
})
```

Same pattern for `getSession` in `start/[id]/page.tsx`. This de-duplicates the DB call within a single render pass at zero cost.

### 💭 `xray/[id]/page.tsx` still uses `SELECT *`

**File:** `src/app/xray/[id]/page.tsx:18`

```ts
const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
```

The `suggestions` JSONB column is fetched but unused on this page (only `apps`, `totalHours`, `topApp`, `pickups`, `insight` are used). Minor bandwidth waste. Can project specific columns to reduce payload:

```ts
db.select({
  apps: xrayResults.apps,
  totalHours: xrayResults.totalHours,
  topApp: xrayResults.topApp,
  pickups: xrayResults.pickups,
  insight: xrayResults.insight,
}).from(xrayResults)...
```

---

## Purge Cron

### 🔴 Bulk delete with `.returning()` loads all deleted IDs into memory

**File:** `src/app/api/cron/purge/route.ts:14–25`

```ts
const deletedSessions = await db
  .delete(discoverySessions)
  .where(and(lt(...), isNull(...)))
  .returning({ id: discoverySessions.id })
```

`.returning()` causes Postgres to send back every deleted row's ID. If 50,000 sessions accumulate before the cron runs, this materializes 50,000 IDs in the Neon HTTP response body and in Node.js memory. On Neon serverless, large response bodies also hit the HTTP response size limit.

More critically, a single bulk DELETE without batching holds a table-level intent lock for the entire duration, which can block concurrent inserts on `discovery_sessions` for several seconds if the delete set is large.

**Fix:** Batch deletes using a subquery with LIMIT, or drop `.returning()` and use `COUNT(*)` if you only need the count:

```ts
// Option A: remove .returning(), use a COUNT query instead
const result = await db.execute(
  sql`DELETE FROM discovery_sessions
      WHERE created_at < ${thirtyDaysAgo}
        AND tier_purchased IS NULL`
)
// result.rowCount gives the count without materializing IDs

// Option B: batch deletes (run in a loop until rowCount = 0)
let total = 0
let batch: number
do {
  const r = await db.execute(
    sql`DELETE FROM discovery_sessions
        WHERE id IN (
          SELECT id FROM discovery_sessions
          WHERE created_at < ${thirtyDaysAgo}
            AND tier_purchased IS NULL
          LIMIT 500
        )`
  )
  batch = r.rowCount ?? 0
  total += batch
} while (batch === 500)
```

### 🟡 Purge cron deletes `xrayResults` unconditionally — includes results linked to active subscribers

**File:** `src/app/api/cron/purge/route.ts:21–24`

```ts
const deletedXrays = await db
  .delete(xrayResults)
  .where(lt(xrayResults.createdAt, thirtyDaysAgo))
```

There is no check for whether the xray is referenced by a `subscriber.xrayId` or `auditOrders.xrayId`. Both FKs use `onDelete: 'set null'` so the DELETE will succeed — but it will null out `xrayId` on active subscriber and order records without the operator knowing. A founding member's xray link is silently lost after 30 days.

**Fix:** Exclude xrays that are referenced:

```ts
import { notInArray } from 'drizzle-orm'

// Collect referenced xray IDs first (or use NOT EXISTS subquery)
await db
  .delete(xrayResults)
  .where(
    and(
      lt(xrayResults.createdAt, thirtyDaysAgo),
      isNull(xrayResults.userId), // only anonymous results
    )
  )
```

Or gate on whether there is a corresponding `auditOrders` row referencing it.

### 💭 Purge cron has no index support for its WHERE clause on `xrayResults`

**File:** `src/app/api/cron/purge/route.ts:21`

The DELETE on `xrayResults` filters on `created_at`. There is no index on `xrayResults.createdAt`. At low volume this is fine (table scan is fast), but once the table grows this becomes a full sequential scan before each delete. The index suggested under schema design (`idx_xray_created_at`) covers this.

---

## Migration Safety

### 🟡 No migration files visible — schema drift risk

No `drizzle/migrations` or equivalent directory was found in the reviewed files. If schema changes are applied by running `drizzle-kit push` directly against production (as is common in early-stage projects), there is no migration history and rollbacks require manual SQL. This is acceptable now but becomes dangerous once the `users` table has real accounts.

Recommendation: start generating migration files with `drizzle-kit generate` and commit them to the repository before any schema change that affects `users`, `auditOrders`, or `discoverySessions.tierPurchased`.

### 💭 `discoverySessions.sourcesProvided` default is `[]` — safe to add

**File:** `src/server/db/schema.ts:117`

```ts
sourcesProvided: text('sources_provided').array().notNull().default([]),
```

This has a server-side default, so adding it to an existing table via `ALTER TABLE ... ADD COLUMN` with `DEFAULT '{}'::text[]` is safe and instant (metadata-only change in Postgres 11+). Good pattern.

---

## Summary of Priorities

| Severity | Finding | File |
|---|---|---|
| 🔴 | JSONB adaptive append is a lost-update race | upload/route.ts:331–346 |
| 🔴 | Purge `.returning()` materializes all deleted IDs — memory + lock risk | cron/purge/route.ts |
| 🔴 | `getDb()` creates a new client on every call | db/client.ts |
| 🟡 | Missing indexes: `xrayResults.userId`, `.email`, `.createdAt`; `subscribers.xrayId` | schema.ts |
| 🟡 | `updatedAt` relies on application code — use `.$onUpdate()` | schema.ts |
| 🟡 | Upload: 3 round-trips can be reduced to 2 via atomic `array_append` | upload/route.ts |
| 🟡 | Purge deletes xrays without checking active subscriber/order references | cron/purge/route.ts |
| 🟡 | `xray` and `start` pages double-fetch — wrap loaders in `React.cache()` | xray/[id]/page.tsx, start/[id]/page.tsx |
| 🟡 | `status` on `auditOrders` is unconstrained text — use pgEnum | schema.ts |
| 💭 | `analyze/route.ts` SELECT * on wide JSONB row — acceptable now, watch future | analyze/route.ts |
| 💭 | `xray/[id]/page.tsx` SELECT * fetches unused `suggestions` column | xray/[id]/page.tsx |
| 💭 | No migration history — use `drizzle-kit generate` before prod schema changes | — |
