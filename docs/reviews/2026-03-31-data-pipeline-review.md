# Data Pipeline Review — 2026-03-31

Reviewer: Data Engineer (agent)
Scope: Discovery Engine data pipeline — parsers, extractors, analysis engine, upload orchestrator

---

## Summary

The pipeline is coherent for a v1 and the privacy-first design (raw messages never persisted) is solid. The main risks are: silent parse failures in the Google Takeout parser, unvalidated AI tool outputs being cast directly into the DB, duplicate upload idempotency, and the `adaptive` branch having a TOCTOU race on the session read-modify-write. Several smaller issues around schema resilience and data lineage round out the blockers. Nothing here is catastrophic — the fundamentals are right — but there are real failure modes that will surface at scale.

---

## Blockers

### 🔴 B1 — Google Takeout: JSON parse errors are uncaught and silently drop data

**File:** `src/server/discovery/parsers/google-takeout.ts:29`

```ts
const raw: unknown = JSON.parse(await entry.async('string'))
```

No `try/catch` around the `JSON.parse` call inside the ZIP file loop. If any one JSON file in the archive is malformed (encoding issue, truncated download, Google changing format), the entire `POST /upload` handler throws an unhandled exception and returns a 500. The user gets a generic "Upload processing failed" error and has no way to recover.

The same is true on line 44 for the YouTube history file.

**Fix:**

```ts
let raw: unknown
try {
  raw = JSON.parse(await entry.async('string'))
} catch {
  console.warn(`Skipping malformed JSON in Takeout archive: ${path}`)
  continue
}
```

Wrap each parse call and `continue` rather than crash — partial results are better than a hard failure.

---

### 🔴 B2 — AI tool outputs are cast to typed structs without runtime validation

**Files:** `src/server/discovery/extract-topics.ts:109`, `src/server/discovery/extract-screenshot.ts:251`, `src/server/discovery/analyze.ts:428`, `src/server/discovery/adaptive.ts:192`

```ts
// extract-topics.ts
const input = toolUse.input as TopicExtractionResult
return {
  topTopics: input.topTopics ?? [],
  repeatedQuestions: input.repeatedQuestions ?? [],
}
```

The pattern `as TopicExtractionResult` is used everywhere after a tool-use response. Haiku can and does return structurally valid but semantically wrong data (e.g. `count` as a string, `examples` as a non-array, missing required fields). This lands in the DB as malformed JSONB and silently breaks the analysis step.

`extractScreenTime` in `ocr.ts` is the only file that does this correctly — it calls `screenTimeExtractionSchema.safeParse(input)` and throws on failure. The same pattern must be applied everywhere else.

**Fix:** Define Zod schemas for `TopicExtractionResult`, `SearchTopicExtractionResult`, and the `DiscoveryAnalysis` tool output. Parse with `.safeParse()` and throw (or return a safe empty result) on failure. The `discoveryAnalysisSchema` already exists in `parsers/types.ts` — it just isn't used in `analyze.ts`.

```ts
// analyze.ts — after getting toolUse.input
const validated = discoveryAnalysisSchema.safeParse(rawResult)
if (!validated.success) {
  throw new Error(`Analysis output failed validation: ${validated.error.message}`)
}
```

---

### 🔴 B3 — Duplicate upload is not idempotent: same file uploaded twice overwrites with a second extraction

**File:** `src/app/api/discovery/upload/route.ts:357–373`

```ts
await db
  .update(discoverySessions)
  .set({
    ...updateData,
    sourcesProvided: [...sources],
    updatedAt: new Date(),
  })
  .where(eq(discoverySessions.id, sessionId))
```

If a user uploads the same ChatGPT ZIP twice (network retry, double-click), the second extraction runs and overwrites the first with a potentially different (randomly sampled) Haiku output. This wastes two Haiku API calls per retry and can produce inconsistent topic lists.

The `Set` deduplication of `sourcesProvided` prevents the array from growing, but the data itself is still re-extracted and re-stored.

**Fix:** Check `sourcesProvided` before processing. If the platform is already in the set, return `{ success: true, platform }` immediately without re-extracting:

```ts
const [current] = await db
  .select({ sourcesProvided: discoverySessions.sourcesProvided })
  .from(discoverySessions)
  .where(eq(discoverySessions.id, sessionId))
  .limit(1)

if (current?.sourcesProvided?.includes(platformParsed.data)) {
  return NextResponse.json({ success: true, platform: platformParsed.data, cached: true })
}
```

The `adaptive` platform is intentionally multi-upload and should be excluded from this guard.

---

### 🔴 B4 — Adaptive upload has a TOCTOU race on the session array

**File:** `src/app/api/discovery/upload/route.ts:330–345`

```ts
const [currentSession] = await db
  .select({ adaptiveData: discoverySessions.adaptiveData })
  .from(discoverySessions)
  .where(eq(discoverySessions.id, sessionId))
  .limit(1)

const existingAdaptive = (currentSession?.adaptiveData as Record<string, unknown>[] | null) ?? []
updateData = {
  adaptiveData: [
    ...existingAdaptive,
    { appName: adaptiveAppName, sourceType, extraction: result.data },
  ],
}
```

Two concurrent adaptive uploads for the same session will both read the same `existingAdaptive`, then both write an array that only appends their own entry, losing the other upload. This is a classic read-modify-write race.

**Fix:** Use a Postgres array append or JSON concatenation at the DB level:

```ts
// With Drizzle raw SQL or a custom append expression:
await db.execute(sql`
  UPDATE discovery_sessions
  SET adaptive_data = COALESCE(adaptive_data, '[]'::jsonb) || ${JSON.stringify([newEntry])}::jsonb,
      updated_at = NOW()
  WHERE id = ${sessionId}
`)
```

Alternatively, use `pg_advisory_lock` on `sessionId` around the critical section, though the SQL approach is cleaner.

---

## Suggestions

### 🟡 S1 — ChatGPT parser: `parts[0]` may be a non-string object (file uploads, images)

**File:** `src/server/discovery/parsers/chatgpt.ts:41`

```ts
if (author?.role === 'user' && parts?.[0]) {
  userMessages.push({
    text: String(parts[0]).slice(0, 200),
    timestamp: (msg.create_time as number) || 0,
  })
}
```

`parts[0]` can be an image attachment object (`{ asset_pointer: "...", content_type: "image_asset_pointer" }`) rather than a plain string, as documented in `docs/research/export-formats.md`. `String({...})` returns `[object Object]` — this string gets sent to Haiku as a "message", polluting topic extraction.

**Fix:** Add a type check:

```ts
const text = parts?.[0]
if (author?.role === 'user' && typeof text === 'string' && text.trim()) {
  userMessages.push({ text: text.slice(0, 200), timestamp: ... })
}
```

---

### 🟡 S2 — Claude export parser: `String(msg.text ?? msg.content ?? '')` returns `[object Object]` when content is an array

**File:** `src/server/discovery/parsers/claude-export.ts:32`

```ts
const content = String(msg.text ?? msg.content ?? '').slice(0, 200)
```

Claude exports can have `content` as an array of content blocks (`[{ type: 'text', text: '...' }]`) rather than a plain string. `String([{...}])` produces `[object Object]` rather than the actual text.

**Fix:**

```ts
const rawContent = msg.text ?? msg.content
const content = (
  typeof rawContent === 'string'
    ? rawContent
    : Array.isArray(rawContent)
      ? rawContent
          .filter((b) => typeof b === 'object' && b !== null && (b as Record<string, unknown>).type === 'text')
          .map((b) => (b as Record<string, unknown>).text as string)
          .join(' ')
      : ''
).slice(0, 200)
```

---

### 🟡 S3 — `resolveAdaptiveSourceType` uses 'subscriptions' as a catch-all for banking/trading apps, losing meaningful context

**File:** `src/app/api/discovery/upload/route.ts:38–82`

Banking apps (`Chase`, `Revolut`, `Nordea`) and trading apps (`Robinhood`, `eToro`) are both mapped to the `subscriptions` extractor, which is designed for App Store subscription lists. The extractor will still succeed (Haiku is flexible), but the schema being used (`name`, `price`, `frequency`) doesn't match what a bank transaction screenshot or trading portfolio contains. The resulting `extraction` stored in `adaptiveData` will be structurally wrong.

**Fix:** Add a `banking` source type with a dedicated schema in `extract-screenshot.ts` that requests `transactions` array with `description`, `amount`, `date`. Map financial apps there in `resolveAdaptiveSourceType`. Similarly, map trading apps to a `trading` source type.

---

### 🟡 S4 — `extractTopicsFromMessages` examples field may contain verbatim PII-adjacent messages

**File:** `src/server/discovery/extract-topics.ts:53`

The tool schema asks for "2-3 representative short summaries of what they asked (not verbatim messages)" — but this is a prompt instruction, not a structural constraint. Haiku may return near-verbatim message excerpts as "examples". These examples land in the DB via `chatgptData.topTopics[].examples[]`.

The `_rawMessages` array is correctly stripped before persistence. But if Haiku echoes raw message content into `examples`, PII (names, emails, financial figures) could be persisted.

**Fix:** Add a post-extraction transform that truncates examples and strips any content that looks like an email or phone number:

```ts
const sanitizedTopics = input.topTopics.map((t) => ({
  ...t,
  examples: t.examples.map((e) => e.slice(0, 80)), // hard cap on example length
}))
```

Additionally, the system prompt instruction should be strengthened: "Return ONLY abstract topic summaries — never quote or paraphrase actual message text."

---

### 🟡 S5 — Analysis route casts all session JSONB columns to typed interfaces without validation

**File:** `src/app/api/discovery/analyze/route.ts:79–88`

```ts
screenTime: session.screenTimeData as ScreenTimeExtraction | undefined,
chatgptData: session.chatgptData as AiChatPattern | undefined,
...
```

JSONB columns return `unknown` at runtime. Casting them to typed interfaces with `as` skips any runtime validation. If a column was stored with malformed data (from a previous broken extraction), `runCrossAnalysis` receives a structurally wrong object, and `buildDataContext` may produce nonsense or throw at property access.

**Fix:** Run `safeParse` on each JSONB column before building the `AnalysisInput`:

```ts
const screenTime = session.screenTimeData
  ? screenTimeExtractionSchema.safeParse(session.screenTimeData).data
  : undefined
const chatgptData = session.chatgptData
  ? aiChatPatternSchema.safeParse(session.chatgptData).data
  : undefined
```

This is the only place where bad stored data could silently poison the final analysis.

---

### 🟡 S6 — Rate limiter silently no-ops when Redis is not configured

**File:** `src/server/lib/rate-limit.ts:46–49`

```ts
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
  if (!limiter) return { success: true }
  return limiter.limit(identifier)
}
```

In local dev this is fine, but if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are not set in production (mis-configured deployment), the rate limiter silently becomes a no-op and the expensive Sonnet analysis endpoint is unprotected. There is no warning logged.

**Fix:** Log a startup warning when Redis is unavailable in non-test environments:

```ts
if (!redis && process.env.NODE_ENV === 'production') {
  console.warn('[rate-limit] UPSTASH_REDIS not configured — rate limiting is DISABLED')
}
```

---

### 🟡 S7 — `totalMinutes` for YouTube categories is Haiku-hallucinated with no grounding

**File:** `src/server/discovery/extract-topics.ts:204`

```ts
totalMinutes: {
  type: 'number',
  description: 'Estimated total watch time in minutes (estimate 10 min per video if unknown)',
},
```

The YouTube watch history JSON from Google Takeout contains only video titles — no duration data (confirmed in `docs/research/export-formats.md`). Haiku is instructed to estimate "10 min per video", making `totalMinutes` a fabricated number. This value flows into the analysis prompt and into the final `keyInsights` ("You've watched 2,400 minutes of cooking videos").

**Fix:** Either remove `totalMinutes` from the schema or mark it clearly as an estimate in the field description. In `buildDataContext` in `analyze.ts`, label it with `(estimated)` to prevent Sonnet from citing it as a measured fact.

---

## Nits

### 💭 N1 — `mostActiveHour` uses local server time, not user's timezone

**File:** `src/server/discovery/parsers/time-patterns.ts:9`

```ts
const h = new Date(m.timestamp * 1000).getHours()
```

`new Date(...).getHours()` returns the hour in the server's local timezone (UTC on Vercel). ChatGPT timestamps are Unix epoch UTC. If a user is in UTC+3, their "9pm usage" shows as "6pm" in the pattern. The resulting `mostActiveHour` and `weekdayVsWeekend` are slightly off but not catastrophically wrong.

A proper fix requires knowing the user's timezone. Until then, at minimum document that `mostActiveHour` is in UTC, and don't display it as a local-time claim to the user.

---

### 💭 N2 — `sessionId` is validated after the DB lookup, not before

**File:** `src/app/api/discovery/upload/route.ts:160–211`

The `sessionId` format check (`.min(1).max(32)`) happens on line 205, but the DB query happens on line 163. An invalid `sessionId` (e.g., a 64-char string) hits the database before being rejected. Reorder to validate the session ID format before any DB call.

---

### 💭 N3 — `keyInsights[].source` is a free-text field with no enum constraint in the DB

**File:** `src/server/discovery/parsers/types.ts:97–110`

The Zod schema for `discoveryAnalysisSchema` does not constrain `source` to an enum. Sonnet may return `"chatgpt_export"`, `"chat_gpt"`, `"ChatGPT"` or other variations. If the UI renders source badges by string match, this will cause display inconsistencies.

**Fix:** Add `z.enum(['quiz', 'screentime', 'chatgpt', 'claude', 'google', 'youtube', 'subscriptions', 'battery', 'storage', 'calendar', 'health', 'adaptive'])` to the `source` field and pass it as an enum constraint in the tool schema.

---

### 💭 N4 — No data lineage: recommendations cannot be traced back to source data

The `keyInsights[].source` field is the only lineage marker, and it's a single string per insight. There is no way to answer: "Which ChatGPT conversation triggered the 'meal planning' topic?" or "Which specific search queries drove the cooking recommendation?"

This is not a blocker today, but as the product matures (user disputes, support requests, GDPR data subject access requests), having no trace from recommendation → raw data signal will become a problem.

A lightweight fix: store the `_rawMessages.slice(0, 300)` indices or topic names that were the primary inputs to each `keyInsight`. This doesn't require storing raw messages — just the aggregated topic slugs.

---

### 💭 N5 — `parseChatGptExport` counts `raw.length` as `totalConversations` including empty/system conversations

**File:** `src/server/discovery/parsers/chatgpt.ts:51`

```ts
totalConversations: raw.length,
```

`raw` includes all conversation objects, including those where the `mapping` has no user messages (aborted conversations, pure system messages). `totalConversations` will be inflated relative to the actual number of meaningful conversations. If Sonnet cites "You have 2,847 ChatGPT conversations", it may be significantly overstated.

**Fix:** Count conversations that produced at least one user message:

```ts
totalConversations: userMessages.length > 0
  ? raw.filter((conv) => {
      if (!conv.mapping) return false
      return Object.values(conv.mapping).some(
        (node) => (node as Record<string, unknown>)?.message?.author?.role === 'user',
      )
    }).length
  : 0,
```

---

## Schema Resilience Summary

| Parser | Current resilience | Key break scenario |
|--------|-------------------|-------------------|
| `chatgpt.ts` | Medium — handles missing `mapping` but not non-string `parts[0]` | ChatGPT adds image/file upload entries to `parts[]` |
| `claude-export.ts` | Medium — handles both array and object root, both `chat_messages`/`messages` | Content-block format in `content` field |
| `google-takeout.ts` | Low — JSON.parse uncaught, no try/catch per file | Any malformed file in the ZIP crashes the whole upload |
| `extract-topics.ts` | Low — raw cast of AI output, no Zod validation | Haiku returns wrong types for `count`, `examples` |
| `extract-screenshot.ts` | Good — `ocr.ts` validates with Zod; `extract-screenshot.ts` does not |  |
| `analyze.ts` | Low — casts DB JSONB columns and AI tool output without validation | Bad stored data → corrupted analysis |

---

## Priority Order for Fixes

1. **B1** — wrap Google Takeout JSON.parse in try/catch (5 min, high impact)
2. **B2** — add Zod validation to all AI tool outputs (30 min, critical for data integrity)
3. **B4** — fix adaptive TOCTOU race with atomic DB append (30 min, correctness)
4. **B3** — add idempotency check before re-extraction (15 min, cost + consistency)
5. **S1/S2** — fix ChatGPT and Claude content-block parsing (20 min, data quality)
6. **S4** — strengthen example sanitization to prevent PII in stored topics (20 min, privacy)
7. **S5** — validate JSONB columns in analyze route before building AnalysisInput (20 min)
8. **S3** — add banking/trading source types for adaptive screenshots (1h, data quality)
9. Remaining suggestions and nits as time allows
