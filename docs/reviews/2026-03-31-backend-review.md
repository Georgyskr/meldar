# Backend Architecture Review — Meldar Discovery Flow
**Date:** 2026-03-31  
**Reviewer:** Backend Architect  
**Scope:** All discovery + billing + cron + subscribe API routes, server-side discovery modules, parsers, and rate-limit infrastructure.

---

## Summary

The backend is solidly structured for an early-stage product. The FSD architecture is respected, Zod validation is consistently applied at API boundaries, raw PII is stripped before DB persistence, and the Anthropic tool_use pattern is used correctly throughout. The biggest risks are: (1) no zip bomb protection on 200 MB uploads, (2) the adaptive route reuses `screentimeLimit` instead of a cheaper dedicated limiter, (3) the `analyze` route does a full `SELECT *` on a row that can hold many MBs of JSONB, and (4) the Stripe webhook silently swallows Resend failures. None of these are show-stoppers at current scale, but #1 and #3 should be fixed before any growth push.

---

## What Is Working Well

- **Privacy-first data handling.** Raw messages, searches, and YouTube titles are extracted to structured topics by Haiku and then stripped via destructuring before any DB write. The `_rawMessages`, `_rawSearches`, `_rawYoutubeWatches` fields never reach the database. This is the right architecture.
- **Consistent error envelope.** Every API returns `{ error: { code, message } }` with appropriate HTTP status codes. The code strings (`RATE_LIMITED`, `VALIDATION_ERROR`, `NOT_FOUND`, `UNPROCESSABLE`, `INTERNAL_ERROR`) are coherent and actionable for the frontend.
- **Anthropic tool_use usage.** Forcing `tool_choice: { type: 'tool', name: '...' }` on every AI call is the correct pattern — it guarantees structured output and avoids free-form text parsing. Model selection (Haiku for extraction/topic/adaptive, Sonnet for final analysis) is well-reasoned.
- **Zod on all JSON inputs.** Every POST body and every formData field that is used for logic goes through `safeParse`. The session ID format check (`z.string().min(1).max(32)`) is applied before any DB query in the upload route.
- **Webhook signature verification.** The Stripe webhook uses `constructEvent` with the raw body text (not parsed JSON) before any processing. This is correct.
- **Cron authorization.** The purge cron checks `Authorization: Bearer ${CRON_SECRET}` before any DB mutation.
- **onConflictDoNothing.** Used in both `subscribers` and `auditOrders` inserts to prevent duplicate key errors on retries.

---

## Issues

### 🔴 Blockers

**B1 — No zip bomb protection in `parseChatGptExport` and `parseGoogleTakeout`**  
`src/server/discovery/parsers/chatgpt.ts:13`, `src/server/discovery/parsers/google-takeout.ts:19`

Both parsers call `JSZip.loadAsync(await file.arrayBuffer())` and then iterate every file in the archive without checking the uncompressed total size. A 10 MB zip can expand to 10 GB (zip bomb). At 200 MB allowed for Google Takeout, a malicious archive could exhaust server memory and take down the Vercel function for all concurrent users.

```ts
// Before loadAsync, add a decompression budget:
const MAX_UNCOMPRESSED = 500 * 1024 * 1024 // 500 MB
let totalUncompressed = 0
for (const [, entry] of Object.entries(archive.files)) {
  totalUncompressed += entry._data?.uncompressedSize ?? 0
  if (totalUncompressed > MAX_UNCOMPRESSED) {
    throw new Error('Archive uncompressed size exceeds limit.')
  }
}
```

JSZip exposes `_data.uncompressedSize` per entry before decompression. Check it before calling `.async('string')` on each file.

---

**B2 — `analyze/route.ts` does `SELECT *` on a session row that may hold MBs of JSONB**  
`src/app/api/discovery/analyze/route.ts:52-56`

```ts
const [session] = await db.select().from(discoverySessions)...
```

The `discoverySessions` row can contain `screenTimeData`, `chatgptData`, `claudeData`, `googleData`, `subscriptionsData`, `batteryData`, `storageData`, `calendarData`, `healthData`, `adaptiveData`, and `analysis` — all JSONB columns. Fetching the entire row for every analyze call (even the cached path at line 66 where `session.analysis` already exists) transfers potentially hundreds of KB of data from Postgres unnecessarily. The cached path returns at line 67 but only after fetching everything.

Fix: select only the columns needed.

```ts
const [session] = await db
  .select({
    analysis: discoverySessions.analysis,
    quizPicks: discoverySessions.quizPicks,
    aiComfort: discoverySessions.aiComfort,
    aiToolsUsed: discoverySessions.aiToolsUsed,
    screenTimeData: discoverySessions.screenTimeData,
    chatgptData: discoverySessions.chatgptData,
    claudeData: discoverySessions.claudeData,
    googleData: discoverySessions.googleData,
    subscriptionsData: discoverySessions.subscriptionsData,
    batteryData: discoverySessions.batteryData,
    storageData: discoverySessions.storageData,
    calendarData: discoverySessions.calendarData,
    healthData: discoverySessions.healthData,
    adaptiveData: discoverySessions.adaptiveData,
  })
  .from(discoverySessions)
  .where(eq(discoverySessions.id, sessionId))
  .limit(1)
```

---

### 🟡 Suggestions

**S1 — `adaptive/route.ts` reuses `screentimeLimit` — wrong bucket and wrong semantics**  
`src/app/api/discovery/adaptive/route.ts:8,16`

The adaptive route calls Haiku (cheap, ~$0.00025/call) and the upload route calls Haiku + Vision. Both share `screentimeLimit` (5 requests/minute/IP). A user who uploads 3 screenshots has already consumed 3 tokens from the limit before calling adaptive. This will cause spurious 429s in the normal happy path if a user uploads screentime, then 4 other screenshots, then requests adaptive follow-ups — they'll be rate-limited.

Create a dedicated `adaptiveLimit` (e.g., 10/minute) separate from upload.

---

**S2 — `upload/route.ts`: sessionId format validated AFTER the DB lookup**  
`src/app/api/discovery/upload/route.ts:160-165, 205-211`

The session DB query happens at line 160. The sessionId format validation with Zod happens at line 205. The DB query executes unconditionally on whatever string was passed in `formData.get('sessionId')`. Move the format check before the DB call (or, ideally, replace it with a single Zod parse of all formData fields upfront).

---

**S3 — `upload/route.ts` adaptive case: two DB reads in sequence, race condition possible**  
`src/app/api/discovery/upload/route.ts:331-343`

The adaptive case reads `adaptiveData` in a separate second query after the first session-existence check. Between the two reads, another concurrent request for the same session could write to `adaptiveData`. The result is a lost update: both requests read the old state, both append their entry, last writer wins.

Fix: use a single atomic JSON append via a SQL expression rather than read-modify-write:
```sql
UPDATE discovery_sessions
SET adaptive_data = COALESCE(adaptive_data, '[]'::jsonb) || $newEntry::jsonb
WHERE id = $sessionId
```
With Drizzle you can use `sql` template tag for this.

---

**S4 — Stripe webhook: Resend failures are unhandled, payment confirmation may be silently lost**  
`src/app/api/billing/webhook/route.ts:66-104`

The two `resend.emails.send()` calls are awaited but not wrapped in try/catch. If Resend is down or rate-limits, the webhook handler throws, Stripe will retry the webhook (up to 3 days), and the DB insert at line 49 will hit `onConflictDoNothing` — meaning the second attempt silently does nothing but also does not resend the email. The buyer gets no confirmation.

Fix: wrap each `resend.emails.send()` in `try/catch` and log failures independently. Return `{ received: true }` regardless of email success so Stripe does not retry.

---

**S5 — `checkout/route.ts`: no rate limiting**  
`src/app/api/billing/checkout/route.ts:13`

Every other mutating endpoint has IP-based rate limiting. The checkout endpoint does not. An attacker can enumerate valid `xrayId` values (nanoid(16), URL-safe) and spam checkout session creation. Each call hits Stripe's API. This will not affect billing (no charge is created until the customer completes checkout) but it will consume Stripe API quota and could be used to probe for valid session IDs.

Add a `checkoutLimit` (e.g., 10 requests/minute/IP) consistent with the other endpoints.

---

**S6 — `analyze.ts`: no Zod validation on tool output before casting**  
`src/server/discovery/analyze.ts:428`

```ts
const result = toolUse.input as { ... }
```

The AI response is cast directly. If Claude returns a malformed structure (e.g., `complexity` is not `"beginner"` or `"intermediate"`, or `recommendedApp` is missing a required field), `runCrossAnalysis` returns a partially-undefined object that gets saved to the DB and served to the frontend. The `discoveryAnalysisSchema` Zod schema exists in `parsers/types.ts` and matches this shape — use it here.

```ts
const validated = discoveryAnalysisSchema.omit({ learningModules: true }).safeParse({
  recommendedApp: result.recommendedApp,
  additionalApps: result.additionalApps,
  keyInsights: result.keyInsights,
  dataProfile: result.dataProfile,
})
if (!validated.success) throw new Error('Invalid analysis structure from Claude')
```

---

**S7 — `google-takeout.ts`: JSON.parse without try/catch inside the archive loop**  
`src/server/discovery/parsers/google-takeout.ts:29, 43`

```ts
const raw: unknown = JSON.parse(await entry.async('string'))
```

Both JSON.parse calls inside the archive iteration are not wrapped in try/catch. A single malformed JSON file in the Takeout archive will throw, propagate up through `parseGoogleTakeout`, and be caught by the upload route's outer catch, which returns a generic `INTERNAL_ERROR`. The user sees "Upload processing failed" with no hint about what went wrong.

Wrap each `JSON.parse` in try/catch and `continue` on malformed files — the parser should be resilient to partial takeout archives.

---

**S8 — `extract-topics.ts`: raw user message content sent to Haiku without truncation per-message**  
`src/server/discovery/extract-topics.ts:27-28`

Messages are individually truncated at 200 chars in the parsers (`chatgpt.ts:43`, `claude-export.ts:31`), which is correct. However, `messageDump` concatenates up to 300 messages with `\n---\n` separators, which at 200 chars each could reach ~60,000 chars (~15,000 tokens). This is within Haiku's limit but approaches the budget for `max_tokens: 2048` output leaving no room for large topic lists. More importantly: the separator `---` is not a special value, so a user whose message literally contains `---` could inject fake message boundaries. Consider a more robust separator.

---

**S9 — `cron/purge/route.ts`: deletes xrayResults unconditionally (no tierPurchased guard)**  
`src/app/api/cron/purge/route.ts:22-24`

```ts
const deletedXrays = await db
  .delete(xrayResults)
  .where(lt(xrayResults.createdAt, thirtyDaysAgo))
```

`discoverySessions` has a `tierPurchased` guard: only sessions with `tierPurchased IS NULL` are purged. `xrayResults` has no such guard — all rows older than 30 days are deleted, including those belonging to paid users whose `auditOrders` rows reference them (via `xray_id FK`). This could silently break paid order history. Add a paid-order guard:

```ts
.where(
  and(
    lt(xrayResults.createdAt, thirtyDaysAgo),
    notExists(
      db.select({ id: auditOrders.id })
        .from(auditOrders)
        .where(eq(auditOrders.xrayId, xrayResults.id))
    )
  )
)
```

---

**S10 — `rate-limit.ts`: silent pass-through when Redis is unconfigured**  
`src/server/lib/rate-limit.ts:47`

```ts
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
  if (!limiter) return { success: true }
  ...
}
```

In local dev this is fine. But if `UPSTASH_REDIS_REST_URL` is accidentally unset in production (misconfigured Vercel env), rate limiting silently disappears for all endpoints. The code should at minimum log a warning when `redis` is null so this doesn't go unnoticed in production. A startup assertion (throwing during module init if Redis is missing in a `NODE_ENV=production` context) would be stronger.

---

### 💭 Nits

**N1 — `analyze.ts:415`: model string `claude-sonnet-4-5-20250514` is hardcoded**  
The other files use `claude-haiku-4-5-20251001`. Consider centralizing model constants in `src/shared/config/models.ts` so a model update is a one-line change.

**N2 — `upload/route.ts:304`: `dataKey` cast with `as const` is overly broad**  
`const dataKey = \`${platformParsed.data}Data\` as const` — the `as const` assertion on a runtime string does nothing useful here; Drizzle's `set()` accepts `Record<string, unknown>` anyway.

**N3 — `webhook/route.ts:38-114`: event type handled with sequential `if` blocks instead of `switch`**  
Using `if (event.type === ...)` for each event type works but `switch (event.type)` with `default: break` is more idiomatic for Stripe webhook handlers and makes it easier to add new events without missing a `return`.

**N4 — `subscribe/route.ts:17-23`: `escapeHtml` is used only for the founder notification email**  
The buyer confirmation email at line 64 uses `email` directly (not `safeEmail`). Since `email` comes from Zod's `.email()` validator, the risk is low — but the inconsistency is confusing. Either use `safeEmail` everywhere or remove the escape function and rely on Zod.

**N5 — `parsers/types.ts:26`: `platform` enum includes `deepseek` but no DeepSeek parser exists**  
Either add the parser or remove `deepseek` from the enum to avoid a confusing dead branch.

---

## Scalability Notes

At 1,000 concurrent users, the first thing to break is the `analyze` route: each call to `runCrossAnalysis` holds a Vercel function open for 3–8 seconds (Sonnet response time) while doing a 4,000-token completion. With Vercel's default 10 concurrent function limit per deployment, 10 simultaneous analyze calls will queue everyone else. The `analyzeLimit` (3 per 10 minutes per IP) partially mitigates this, but a burst of 10 unique IPs can still saturate capacity.

Longer-term fix: decouple analysis into a background job (e.g., Inngest or Vercel Cron + polling) rather than synchronous HTTP. For now, the rate limit is the right call.

The zip parsers (ChatGPT, Google) run inside the Vercel function and load the entire archive into memory (`file.arrayBuffer()`). Google Takeout archives at 200 MB = 200 MB RSS spike per concurrent upload. At 5 simultaneous uploads (screentimeLimit allows 5/minute per IP, but multiple IPs can upload simultaneously), that's 1 GB of memory pressure. Vercel Pro functions max at 3 GB. This is fine at current scale but worth monitoring once upload volume grows.
