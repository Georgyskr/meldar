# Multi-Source Discovery Architecture

How to evolve Meldar's discovery engine from single-screenshot to multi-source, without over-engineering a PoC.

---

## 1. Data Model

### Current state

One table, `xray_results`, stores everything in a flat structure: app usage JSONB, a single `insight` text, `totalHours`, `topApp`. This worked for one screenshot but can't represent "quiz answers + 2 screenshots + a text paste."

### Proposed: signals table + discovery sessions

**Two new tables.** One source of truth for raw signals, one for the aggregated profile.

```sql
-- A user's discovery session. One per "Time X-Ray flow."
CREATE TABLE discovery_sessions (
  id          TEXT PRIMARY KEY,          -- nanoid(12)
  email       TEXT,
  quiz_pains  TEXT[],                    -- from Pick Your Pain, if completed
  status      TEXT NOT NULL DEFAULT 'active',  -- active | complete | expired
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each data source submission within a session.
CREATE TABLE discovery_sources (
  id          TEXT PRIMARY KEY,          -- nanoid(12)
  session_id  TEXT NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,             -- 'screen_time' | 'text_paste' | 'app_list' | 'browser_history' | ...
  raw_input   JSONB,                     -- original extracted data (type-specific shape)
  signals     JSONB NOT NULL DEFAULT '[]', -- normalized Signal[] array
  metadata    JSONB DEFAULT '{}',        -- source-specific metadata (platform, confidence, date, etc.)
  status      TEXT NOT NULL DEFAULT 'processed', -- pending | processed | failed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sources_session ON discovery_sources(session_id);
```

**Why this shape:**

- **One `discovery_sources` row per upload/paste/input.** The `source_type` discriminates shape; `raw_input` preserves the AI extraction verbatim; `signals` holds the normalized output.
- **No table-per-source.** Adding a new source is a new `source_type` string, not a migration. JSONB gives us schema flexibility during PoC; we can promote columns later if needed.
- **Signals are denormalized into the source row.** No separate signals table. At PoC scale (tens of sources per session, not millions), a join-free read from `discovery_sources WHERE session_id = ?` is simpler and fast enough.

### The Signal type

Every data source ultimately produces an array of normalized signals:

```typescript
// src/entities/discovery/model/types.ts

const signalSchema = z.object({
  type: z.enum([
    'app_usage',        // screen time, app list
    'category_usage',   // aggregated by category
    'behavior_pattern', // high pickups, late-night usage, etc.
    'pain_point',       // mapped from quiz or detected
    'time_block',       // "2 hours on social between 10pm-midnight"
  ]),
  source: z.string(),           // which source_type produced this
  label: z.string(),            // human-readable: "Instagram: 2.3 hrs/day"
  value: z.number(),            // numeric representation (minutes, count, score)
  unit: z.string(),             // 'minutes' | 'count' | 'score'
  category: z.string().optional(), // 'social', 'productivity', etc.
  confidence: z.enum(['high', 'medium', 'low']),
  metadata: z.record(z.unknown()).optional(),
})

type Signal = z.infer<typeof signalSchema>
```

This is the **lingua franca** between sources. Screen time produces `app_usage` signals. A text paste produces `pain_point` signals. Browser history produces `time_block` signals. The insight engine consumes signals without caring where they came from.

---

## 2. API Design

### One endpoint, discriminated by `type`

```
POST /api/upload/analyze
Content-Type: multipart/form-data

Fields:
  type: "screen_time" | "text_paste" | "app_list" | ...
  session_id?: string    (omit to create new session)
  file?: File            (for image/file sources)
  text?: string          (for text-based sources)
```

**Why one endpoint, not `/api/upload/screentime`, `/api/upload/text`, etc.:**

- The request lifecycle is identical: validate -> extract -> normalize -> persist -> respond. Only the middle steps differ.
- The route handler is a thin dispatcher. Source-specific logic lives in the processing pipeline (see section 4).
- Fewer routes = simpler client code. The upload component just sends `type` + payload.
- If a source needs truly different validation (e.g., file vs text), that's handled inside the pipeline, not at the routing level.

**Response shape (unified):**

```typescript
{
  sessionId: string,
  sourceId: string,
  signals: Signal[],
  insights: Insight[],      // regenerated from ALL session signals
  upsells: UpsellHook[],
  painPoints: string[],
}
```

After each source upload, the response includes the **full session profile** — not just what this source contributed. The client always has the latest aggregate.

**Session creation:** If `session_id` is omitted, the endpoint creates a new `discovery_session` and returns it. Subsequent uploads attach to the same session. The client stores `sessionId` in React state (or URL param for shareability).

---

## 3. Discovery Profile

The discovery profile is **computed, not stored.** It's a function of all signals in a session.

```typescript
// src/server/discovery/profile.ts

type DiscoveryProfile = {
  sessionId: string
  totalScreenTimeMinutes: number
  topApps: AppUsage[]            // merged + deduplicated across sources
  categoryBreakdown: Record<string, number>  // category -> total minutes
  painPoints: string[]           // union of all detected pains
  behaviorPatterns: string[]     // "night owl", "high pickups", etc.
  signalCount: number
  sources: { type: string; addedAt: string }[]
}

function buildProfile(sources: DiscoverySource[]): DiscoveryProfile {
  const allSignals = sources.flatMap(s => s.signals)
  // merge, deduplicate, aggregate...
}
```

**Why computed, not a materialized table:**

- At PoC scale, rebuilding the profile from < 10 source rows is trivial (sub-millisecond).
- No cache invalidation problem. Add a source -> rebuild profile -> return.
- If we later need to cache it (performance, background jobs), we add a `profile_snapshot` JSONB column to `discovery_sessions`. But not now.

**Deduplication strategy:** When two screen time screenshots contain the same app, take the higher usage value (assumption: different days, user wants to see their worst). This is a simple `Map<appName, maxMinutes>` merge.

---

## 4. Processing Pipeline

Every source goes through the same pipeline. The steps are fixed; the implementations are pluggable.

```
validate(input) -> extract(input) -> normalize(extraction) -> persist(signals) -> aggregate(session)
    |                  |                    |                      |                   |
    v                  v                    v                      v                   v
  Zod schema     AI / parser         Signal mapper            DB insert         buildProfile()
  (per source)   (per source)        (per source)             (shared)           (shared)
```

### Implementation

```typescript
// src/server/discovery/pipeline/types.ts

interface SourceProcessor<TInput, TExtraction> {
  sourceType: string
  validateInput: (raw: unknown) => TInput                    // Zod parse
  extract: (input: TInput) => Promise<TExtraction>           // AI call or parser
  toSignals: (extraction: TExtraction) => Signal[]           // normalize
}
```

```typescript
// src/server/discovery/pipeline/run.ts

async function processSource<TInput, TExtraction>(
  processor: SourceProcessor<TInput, TExtraction>,
  rawInput: unknown,
  sessionId: string,
): Promise<{ sourceId: string; signals: Signal[] }> {
  // 1. Validate
  const input = processor.validateInput(rawInput)

  // 2. Extract (AI or parser)
  const extraction = await processor.extract(input)

  // 3. Normalize to signals
  const signals = processor.toSignals(extraction)

  // 4. Persist
  const sourceId = nanoid(12)
  await db.insert(discoverySources).values({
    id: sourceId,
    sessionId,
    sourceType: processor.sourceType,
    rawInput: extraction,
    signals,
  })

  return { sourceId, signals }
}
```

```typescript
// src/server/discovery/pipeline/registry.ts

const processors: Record<string, SourceProcessor<any, any>> = {}

function register(processor: SourceProcessor<any, any>) {
  processors[processor.sourceType] = processor
}

function getProcessor(type: string) {
  const p = processors[type]
  if (!p) throw new Error(`Unknown source type: ${type}`)
  return p
}
```

### The route handler becomes trivial:

```typescript
// src/app/api/upload/analyze/route.ts

export async function POST(request: NextRequest) {
  const { type, sessionId, ...payload } = await parseRequest(request)
  const processor = getProcessor(type)
  const session = sessionId
    ? await getSession(sessionId)
    : await createSession()

  const { sourceId, signals } = await processSource(processor, payload, session.id)

  // Rebuild full profile from all session sources
  const allSources = await getSessionSources(session.id)
  const profile = buildProfile(allSources)
  const insights = generateInsights(profile)
  const upsells = generateUpsells(profile)

  return NextResponse.json({
    sessionId: session.id,
    sourceId,
    signals,
    insights,
    upsells,
    painPoints: profile.painPoints,
  })
}
```

---

## 5. Adding a New Data Source (DX)

To add a new source (e.g., "browser history CSV"), a developer creates **one file**:

```typescript
// src/server/discovery/sources/browser-history.ts

import { register } from '../pipeline/registry'

const browserHistoryProcessor: SourceProcessor<BrowserHistoryInput, BrowserHistoryExtraction> = {
  sourceType: 'browser_history',

  validateInput: (raw) => browserHistoryInputSchema.parse(raw),

  extract: async (input) => {
    // Parse CSV client-side; this just validates the parsed data
    return input.entries
  },

  toSignals: (entries) => {
    // Group by domain, calculate time spent, detect patterns
    return entries.map(e => ({
      type: 'time_block',
      source: 'browser_history',
      label: `${e.domain}: ${e.minutes} min`,
      value: e.minutes,
      unit: 'minutes',
      category: categorize(e.domain),
      confidence: 'high',
    }))
  },
}

register(browserHistoryProcessor)
```

That's it. No new routes, no new tables, no new migrations.

**Checklist for adding a source:**

1. Define a Zod input schema (`validateInput`)
2. Write the extraction logic (`extract`) -- AI prompt, parser, or passthrough
3. Write the signal mapper (`toSignals`)
4. Register with `register()`
5. Import the file in `src/server/discovery/sources/index.ts` (side-effect import to trigger registration)

The existing screen time source becomes:

```typescript
// src/server/discovery/sources/screen-time.ts

const screenTimeProcessor: SourceProcessor<ScreenTimeInput, ScreenTimeExtraction> = {
  sourceType: 'screen_time',
  validateInput: (raw) => screenTimeInputSchema.parse(raw),
  extract: (input) => extractScreenTime(input.base64, input.mediaType),  // existing ocr.ts
  toSignals: (extraction) => extractionToSignals(extraction),             // new mapper
}

register(screenTimeProcessor)
```

All existing logic in `ocr.ts`, `insights.ts`, `suggestions.ts`, and `upsells.ts` stays. The only change is wrapping them behind the `SourceProcessor` interface.

---

## 6. Schema Migration

### Strategy: keep `xray_results`, add new tables, backfill later

The existing `xray_results` table has live data and is referenced by `audit_orders.xray_id` and `subscribers.xray_id`. We don't touch it.

**Phase 1: Add new tables alongside**

```sql
-- Migration: 001_add_discovery_tables.sql

CREATE TABLE discovery_sessions (
  id          TEXT PRIMARY KEY,
  email       TEXT,
  quiz_pains  TEXT[],
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discovery_sources (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  raw_input   JSONB,
  signals     JSONB NOT NULL DEFAULT '[]',
  metadata    JSONB DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'processed',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sources_session ON discovery_sources(session_id);

-- Link old xray_results to new sessions (optional)
ALTER TABLE xray_results ADD COLUMN session_id TEXT REFERENCES discovery_sessions(id);
```

**Phase 2: New uploads use the new pipeline**

The new `/api/upload/analyze` endpoint writes to `discovery_sessions` + `discovery_sources`. The old `/api/upload/screentime` endpoint continues to work unchanged.

Both can coexist. The X-Ray results page checks `discovery_sessions` first, falls back to `xray_results`.

**Phase 3: Backfill (optional, low priority)**

```typescript
// scripts/backfill-sessions.ts
// For each xray_result, create a discovery_session + discovery_source
// with source_type='screen_time', raw_input=apps, and regenerated signals.
// Update xray_results.session_id.
```

**Phase 4: Deprecate `xray_results`**

Once all references use `discovery_sessions`, update `audit_orders` and `subscribers` to reference `discovery_sessions.id` instead. Drop `xray_results`. Not urgent -- the PoC can run with both tables indefinitely.

### FK references update

```sql
-- When ready (not in PoC):
ALTER TABLE audit_orders ADD COLUMN session_id TEXT REFERENCES discovery_sessions(id);
ALTER TABLE subscribers ADD COLUMN session_id TEXT REFERENCES discovery_sessions(id);
-- Backfill from xray_id -> session_id via xray_results.session_id
-- Then drop xray_id columns
```

---

## Summary

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Storage | JSONB signals in `discovery_sources`, no table-per-source | PoC speed; promote columns later if needed |
| API | One endpoint, `type` discriminator | Identical lifecycle, simpler client |
| Profile | Computed on read, not materialized | No cache invalidation at PoC scale |
| Pipeline | `SourceProcessor` interface + registry | Adding a source = one file |
| Migration | Additive, old table untouched | Zero risk to live data |
| Insights/upsells | Refactored to consume `Signal[]` instead of `ScreenTimeExtraction` | Source-agnostic, same rule engine |

The total surface area of changes:

1. **New:** `discovery_sessions` + `discovery_sources` tables (Drizzle schema)
2. **New:** `Signal` type + `SourceProcessor` interface + registry
3. **New:** `/api/upload/analyze` route (thin dispatcher)
4. **Refactor:** `insights.ts`, `upsells.ts`, `suggestions.ts` to consume `Signal[]`
5. **Wrap:** existing `ocr.ts` as a `SourceProcessor`
6. **Keep:** `/api/upload/screentime` works unchanged during transition
