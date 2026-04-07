# AI/ML Pipeline — Final Plan

**Authors:** AI Engineer, AI Data Remediation Engineer, Autonomous Optimization Architect
**Date:** 2026-03-30
**Status:** Final (Iteration 3) — ready for synthesis

---

## 1. Claude Vision Integration

### 1.1 Data Model (source of truth)

Types live in `src/entities/xray-result/model/types.ts` per FSD convention. All clusters import from the entity barrel.

```typescript
import { z } from "zod";

// ── App categories ──────────────────────────────────────────────
export const appCategorySchema = z.enum([
  "social",
  "entertainment",
  "productivity",
  "communication",
  "browser",
  "health",
  "finance",
  "education",
  "gaming",
  "utility",
]);
export type AppCategory = z.infer<typeof appCategorySchema>;

// ── Single app usage ────────────────────────────────────────────
export const appUsageSchema = z.object({
  name: z.string().min(1).max(100),         // Exact app name as displayed: "Instagram"
  usageMinutes: z.number().nonnegative(),    // Raw minutes, e.g., 138
  category: appCategorySchema,
});
export type AppUsage = z.infer<typeof appUsageSchema>;

// ── Insight (rule-based for PoC, LLM-generated for MVP) ─────────
export const insightSchema = z.object({
  headline: z.string().max(60),              // "2.3 hours on Instagram"
  comparison: z.string().max(120),           // "That's 16 hours a week — almost a part-time job"
  suggestion: z.string().max(200),           // "Want us to build a social scheduler?"
  severity: z.enum(["low", "medium", "high"]),
});
export type Insight = z.infer<typeof insightSchema>;

// ── Upsell hook (rule-based, maps data → paid tier CTA) ────────
export const upsellHookSchema = z.object({
  trigger: z.string(),                       // What data triggered this
  tierTarget: z.enum(["audit", "starter", "app_build", "concierge"]),
  message: z.string().max(200),              // User-facing upsell text
  urgency: z.enum(["low", "medium", "high"]),
});
export type UpsellHook = z.infer<typeof upsellHookSchema>;

// ── Claude Vision extraction result (raw from Haiku) ────────────
export const screenTimeExtractionSchema = z.object({
  apps: z.array(appUsageSchema).min(1),
  totalScreenTimeMinutes: z.number().nonnegative(),
  pickups: z.number().int().nonnegative().nullable(),
  firstAppOpenTime: z.string().nullable(),
  date: z.string().nullable(),
  platform: z.enum(["ios", "android", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
});
export type ScreenTimeExtraction = z.infer<typeof screenTimeExtractionSchema>;

// ── Extraction error ────────────────────────────────────────────
export const extractionErrorSchema = z.object({
  error: z.enum(["not_screen_time", "unreadable"]),
});
export type ExtractionError = z.infer<typeof extractionErrorSchema>;

// ── Full API response to client ─────────────────────────────────
export const xrayResponseSchema = z.object({
  extraction: screenTimeExtractionSchema,
  insights: z.array(insightSchema),
  upsellHooks: z.array(upsellHookSchema),
  automationSuggestions: z.array(z.object({
    painPointId: z.string(),                 // Maps to painLibrary id
    title: z.string(),
    description: z.string(),
  })),
  processingMetadata: z.object({
    imageDiscarded: z.literal(true),
    processingTimeMs: z.number(),
    model: z.string(),                       // "claude-haiku-4-5-20251001"
    cost: z.number(),                        // Estimated cost in USD cents
  }),
});
export type XRayResponse = z.infer<typeof xrayResponseSchema>;
```

### 1.2 System Prompt

Stored in `src/server/discovery/prompts.ts`. Approximately 500 tokens — qualifies for Anthropic prompt caching.

```typescript
export const SCREEN_TIME_SYSTEM_PROMPT = `You are a Screen Time data extractor. You receive screenshots from iOS Screen Time or Android Digital Wellbeing. Extract structured usage data.

Rules:
- Extract EVERY visible app with its usage time.
- Return the app name EXACTLY as displayed on screen (e.g., "Instagram", not "instagram").
- Convert all times to minutes (e.g., "1h 23m" = 83 minutes).
- Categorize each app into one of: social, entertainment, productivity, communication, browser, health, finance, education, gaming, utility. If unsure, use "utility".
- Extract total screen time in minutes if visible.
- Extract pickup count if visible (iOS shows this as "Pickups" or similar). Set null if not visible.
- Extract first app open time if visible. Set null if not visible.
- Extract the date or period shown (e.g., "Today", "Last 7 Days", "Mar 28"). Set null if not visible.
- Detect platform: "ios" (rounded UI, Screen Time branding) or "android" (Digital Wellbeing, Material Design) or "unknown".
- Set confidence: "high" if all data is clearly readable, "medium" if some text is partially obscured, "low" if significant data is estimated or missing.
- If the image is NOT a Screen Time or Digital Wellbeing screenshot, return ONLY: { "error": "not_screen_time" }
- If the image is too blurry, cropped, or small to read reliably, return ONLY: { "error": "unreadable" }
- NEVER hallucinate app names or times. Only report what is visually present.`;
```

### 1.3 Structured Output via Tool Use

The API call uses Claude's `tool_use` (function calling) to enforce JSON schema compliance. The model is forced to call a tool that matches our extraction schema — no regex parsing of free-text output.

```typescript
// src/server/discovery/ocr.ts
import Anthropic from "@anthropic-ai/sdk";
import { SCREEN_TIME_SYSTEM_PROMPT } from "./prompts";
import {
  screenTimeExtractionSchema,
  extractionErrorSchema,
  type ScreenTimeExtraction,
  type ExtractionError,
} from "@/entities/xray-result";

const anthropic = new Anthropic();  // reads ANTHROPIC_API_KEY from env

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "extract_screen_time",
  description: "Extract structured screen time data from a screenshot",
  input_schema: {
    type: "object",
    properties: {
      apps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            usageMinutes: { type: "number" },
            category: {
              type: "string",
              enum: ["social", "entertainment", "productivity", "communication",
                     "browser", "health", "finance", "education", "gaming", "utility"],
            },
          },
          required: ["name", "usageMinutes", "category"],
        },
      },
      totalScreenTimeMinutes: { type: "number" },
      pickups: { type: ["number", "null"] },
      firstAppOpenTime: { type: ["string", "null"] },
      date: { type: ["string", "null"] },
      platform: { type: "string", enum: ["ios", "android", "unknown"] },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      error: { type: "string", enum: ["not_screen_time", "unreadable"] },
    },
    required: ["apps", "totalScreenTimeMinutes", "pickups",
               "firstAppOpenTime", "date", "platform", "confidence"],
  },
};

export async function extractScreenTime(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ScreenTimeExtraction | ExtractionError> {
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SCREEN_TIME_SYSTEM_PROMPT,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "extract_screen_time" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Extract all app usage data from this Screen Time screenshot.",
          },
        ],
      },
    ],
  });

  // Extract the tool call result
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }

  const raw = toolBlock.input as Record<string, unknown>;

  // Check for error response
  if (raw.error) {
    return extractionErrorSchema.parse({ error: raw.error });
  }

  // Validate and return extraction
  return screenTimeExtractionSchema.parse(raw);
}
```

### 1.4 Image Preprocessing

**Locked decision: client-side compression. No sharp server-side.**

Image preprocessing happens in the browser before upload, using the Canvas API or `browser-image-compression`. This is a Frontend responsibility, but the AI cluster defines the constraints:

| Constraint | Value | Reason |
|-----------|-------|--------|
| Max file size (after compression) | 2 MB | Reduce upload time + API token cost |
| Max dimensions | 1568px on longest edge | Claude Vision's optimal resolution |
| Format | JPEG at 85% quality | Smallest size for text-heavy screenshots |
| Original file size limit | 10 MB (before compression) | Reject oversized originals |

**Frontend dependency:** The `ScreenTimeUpload.tsx` component must compress images before `POST`-ing to the API route. The API route validates the received file is under 2 MB and rejects anything larger.

### 1.5 API Route

File: `src/app/api/upload/screentime/route.ts` (renamed from `/api/analyze-screenshot`)

```typescript
import { NextResponse } from "next/server";
import { extractScreenTime } from "@/server/discovery/ocr";
import { generateInsights } from "@/server/discovery/insights";
import { generateUpsells } from "@/server/discovery/upsells";
import { mapToPainPoints } from "@/server/discovery/suggestions";
import { trackUsage } from "@/server/billing/usage";

export const runtime = "nodejs";  // Required for Buffer handling

const MAX_FILE_SIZE = 2 * 1024 * 1024;  // 2 MB (client already compressed)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("screenshot") as File | null;

    // ── Validate ──────────────────────────────────────────────
    if (!file) {
      return NextResponse.json(
        { error: { code: "NO_FILE", message: "No file uploaded" } },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: { code: "INVALID_TYPE", message: "File must be JPEG, PNG, or WebP" } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "File must be under 2 MB" } },
        { status: 400 }
      );
    }

    // ── Convert to base64 ─────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

    // ── Call Claude Vision ────────────────────────────────────
    const extraction = await extractScreenTime(imageBase64, mediaType);

    // ── Handle extraction errors ──────────────────────────────
    if ("error" in extraction) {
      const messages: Record<string, string> = {
        not_screen_time:
          "That doesn't look like a Screen Time screenshot. " +
          "iPhone: Settings > Screen Time > See All Activity. " +
          "Android: Settings > Digital Wellbeing.",
        unreadable:
          "We couldn't read that image. Try a clearer screenshot.",
      };
      return NextResponse.json(
        { error: { code: extraction.error, message: messages[extraction.error] } },
        { status: 422 }
      );
    }

    // ── Generate rule-based insights + upsells (zero AI cost) ─
    const insights = generateInsights(extraction);
    const upsellHooks = generateUpsells(extraction);
    const automationSuggestions = mapToPainPoints(extraction);

    const processingTimeMs = Date.now() - startTime;

    // ── Track usage for cost monitoring (Upstash Redis) ───────
    await trackUsage({
      eventType: "vision_analysis",
      model: "claude-haiku-4-5-20251001",
      estimatedCostCents: 0.3,  // $0.003
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    });

    // ── Buffer is now garbage — image never stored ────────────
    return NextResponse.json({
      extraction,
      insights,
      upsellHooks,
      automationSuggestions,
      processingMetadata: {
        imageDiscarded: true as const,
        processingTimeMs,
        model: "claude-haiku-4-5-20251001",
        cost: 0.003,
      },
    });
  } catch (error) {
    // Log to Sentry (DevOps dependency)
    console.error("Screenshot analysis failed:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Try again." } },
      { status: 500 }
    );
  }
}
```

### 1.6 Persisting Results to Database

After the client receives the response, it can POST the extracted data to a separate endpoint to persist in Neon Postgres. The `screentime_analyses` table (owned by Architecture) stores:

```sql
-- Architecture owns this table; AI cluster defines the JSONB shape
INSERT INTO screentime_analyses (
  session_id, apps, total_hours, top_app, insights, created_at
) VALUES (
  $1,              -- session_id from cookie
  $2::jsonb,       -- full apps array
  $3,              -- totalScreenTimeMinutes / 60
  $4,              -- extraction.apps[0].name
  $5::jsonb,       -- insights + upsellHooks + automationSuggestions
  NOW()
);
```

**Note:** user_id is NULL in PoC (no auth). The `insights` column is JSONB, not TEXT — stores structured insight objects.

---

## 2. Rule-Based Insight Generation

File: `src/server/discovery/insights.ts`

Zero AI cost. Maps extraction data to human-written insights using deterministic rules.

```typescript
import type { ScreenTimeExtraction, Insight } from "@/entities/xray-result";

export function generateInsights(data: ScreenTimeExtraction): Insight[] {
  const insights: Insight[] = [];
  const totalHours = data.totalScreenTimeMinutes / 60;
  const topApp = data.apps[0];

  // Rule 1: Top app insight (always generated)
  if (topApp) {
    const appHours = (topApp.usageMinutes / 60).toFixed(1);
    const weeklyHours = ((topApp.usageMinutes / 60) * 7).toFixed(0);
    insights.push({
      headline: `${appHours} hours on ${topApp.name}`,
      comparison: `That's ${weeklyHours} hours a week — ${
        Number(weeklyHours) > 15 ? "almost a part-time job" :
        Number(weeklyHours) > 7 ? "a full work day every week" :
        "time you could use differently"
      }`,
      suggestion: `Want help managing your ${topApp.name} time?`,
      severity: Number(appHours) > 3 ? "high" : Number(appHours) > 1.5 ? "medium" : "low",
    });
  }

  // Rule 2: Total screen time
  if (totalHours > 6) {
    insights.push({
      headline: `${totalHours.toFixed(1)} hours of screen time`,
      comparison: "That's more than a full work day on your phone",
      suggestion: "A personal Time Audit shows exactly where to cut",
      severity: "high",
    });
  } else if (totalHours > 4) {
    insights.push({
      headline: `${totalHours.toFixed(1)} hours of screen time`,
      comparison: `That's ${(totalHours * 7).toFixed(0)} hours a week`,
      suggestion: "See which apps are worth it and which aren't",
      severity: "medium",
    });
  }

  // Rule 3: Social media dominance
  const socialMinutes = data.apps
    .filter((a) => a.category === "social")
    .reduce((sum, a) => sum + a.usageMinutes, 0);
  if (socialMinutes > 120) {
    const socialHours = (socialMinutes / 60).toFixed(1);
    insights.push({
      headline: `${socialHours} hours on social media`,
      comparison: "Most people underestimate this by half",
      suggestion: "A social scheduler could reclaim most of this",
      severity: "high",
    });
  }

  // Rule 4: Pickups / compulsive checking
  if (data.pickups && data.pickups > 60) {
    const interval = Math.round((16 * 60) / data.pickups);  // Assume 16 waking hours
    insights.push({
      headline: `${data.pickups} pickups today`,
      comparison: `That's once every ${interval} minutes while you're awake`,
      suggestion: "We can figure out what's pulling you back",
      severity: data.pickups > 100 ? "high" : "medium",
    });
  }

  return insights;
}
```

---

## 3. Upsell Hook Generation

File: `src/server/discovery/upsells.ts`

Maps user's data to specific paid tier CTAs. Zero AI cost — pure business logic.

```typescript
import type { ScreenTimeExtraction, UpsellHook } from "@/entities/xray-result";

export function generateUpsells(data: ScreenTimeExtraction): UpsellHook[] {
  const hooks: UpsellHook[] = [];
  const totalHours = data.totalScreenTimeMinutes / 60;

  // High screen time → Time Audit (EUR 29)
  if (totalHours > 5) {
    hooks.push({
      trigger: `${totalHours.toFixed(1)}h total screen time`,
      tierTarget: "audit",
      message: "Get a personalized plan to cut your screen time in half. Personal Time Audit — EUR 29.",
      urgency: "high",
    });
  }

  // Dominant social app → App Build (EUR 49)
  const topSocial = data.apps.find((a) => a.category === "social" && a.usageMinutes > 120);
  if (topSocial) {
    hooks.push({
      trigger: `${(topSocial.usageMinutes / 60).toFixed(1)}h on ${topSocial.name}`,
      tierTarget: "app_build",
      message: `We can build a ${topSocial.name} time manager that works for you. App Build — EUR 49.`,
      urgency: "high",
    });
  }

  // Email app detected → App Build (EUR 49)
  const emailApp = data.apps.find(
    (a) => a.category === "communication" && /mail|gmail|outlook/i.test(a.name)
  );
  if (emailApp && emailApp.usageMinutes > 30) {
    hooks.push({
      trigger: `${(emailApp.usageMinutes / 60).toFixed(1)}h on ${emailApp.name}`,
      tierTarget: "app_build",
      message: "Email eating your day? Our email triage bot sorts your inbox automatically. App Build — EUR 49.",
      urgency: "medium",
    });
  }

  // Many apps → Starter subscription (EUR 9/mo)
  if (data.apps.length >= 5) {
    hooks.push({
      trigger: `${data.apps.length} apps detected`,
      tierTarget: "starter",
      message: "Track your patterns weekly and get personalized automation suggestions. Starter — EUR 9/mo.",
      urgency: "low",
    });
  }

  // High pickups → Time Audit (EUR 29)
  if (data.pickups && data.pickups > 80) {
    hooks.push({
      trigger: `${data.pickups} daily pickups`,
      tierTarget: "audit",
      message: `${data.pickups} pickups a day — once every ${Math.round((16 * 60) / data.pickups)} minutes. A Time Audit finds out why. EUR 29.`,
      urgency: "high",
    });
  }

  return hooks;
}
```

---

## 4. Pain Point Mapping

File: `src/server/discovery/suggestions.ts`

Maps detected apps to the existing `painLibrary` from `src/entities/pain-points/model/data.ts`.

```typescript
import { painLibrary } from "@/entities/pain-points";
import type { ScreenTimeExtraction } from "@/entities/xray-result";

const APP_TO_PAIN: Record<string, string[]> = {
  // Social
  instagram: ["social-posting"],
  tiktok: ["social-posting"],
  twitter: ["social-posting"],
  facebook: ["social-posting"],
  // Communication
  mail: ["email-chaos"],
  gmail: ["email-chaos"],
  outlook: ["email-chaos"],
  messages: [],
  // Shopping
  amazon: ["price-watching"],
  ebay: ["price-watching"],
  zillow: ["apartment-hunting"],
  // Productivity
  calendar: ["meeting-overload"],
  // Food
  ubereats: ["meal-planning"],
  doordash: ["meal-planning"],
  grubhub: ["meal-planning"],
};

export function mapToPainPoints(data: ScreenTimeExtraction) {
  const matchedIds = new Set<string>();

  for (const app of data.apps) {
    const key = app.name.toLowerCase().replace(/\s+/g, "");
    const painIds = APP_TO_PAIN[key];
    if (painIds) {
      for (const id of painIds) matchedIds.add(id);
    }
  }

  return painLibrary
    .filter((p) => matchedIds.has(p.id))
    .map((p) => ({
      painPointId: p.id,
      title: p.title,
      description: p.automationHint,
    }));
}
```

---

## 5. Cost Model (Final Numbers)

### Per-screenshot cost (Haiku 4.5)

| Component | Tokens | Cost |
|-----------|--------|------|
| System prompt (cached after first call) | ~500 input | $0.00004 |
| Image tokens (compressed, ~800x1200 JPEG) | ~1,200 image tokens | $0.00096 |
| User instruction | ~30 input | negligible |
| Tool use output (JSON, ~15 apps) | ~300 output | $0.00120 |
| **Total per screenshot** | | **~$0.003** |

### Monthly cost projections

| Phase | Users | Screenshots/mo | Monthly AI cost |
|-------|-------|----------------|-----------------|
| **PoC** (weeks 1-2) | 10-50 | 50-150 | $0.15 - $0.45 |
| **Commercial Validation** (weeks 3-6) | 50-200 | 100-600 | $0.30 - $1.80 |
| **MVP** (weeks 7-10) | 200-1,000 | 400-3,000 | $1.20 - $9.00 |
| **Growth** (month 3-6) | 1,000-10,000 | 2,000-20,000 | $6.00 - $60.00 |

### Revenue vs. AI cost

| Scenario | AI cost/mo | Revenue (5% convert, EUR 15 avg) | Margin |
|----------|-----------|----------------------------------|--------|
| 100 users | $0.60 | EUR 75/mo | 99.2% |
| 1,000 users | $6.00 | EUR 750/mo | 99.2% |
| 10,000 users | $60.00 | EUR 7,500/mo | 99.2% |

AI cost is structurally irrelevant to unit economics. The screenshot pipeline will never be a cost center.

---

## 6. Rate Limiting & Cost Controls

### Rate limiting (Upstash Redis — shared with DevOps)

```typescript
// src/server/middleware/rate-limit.ts
// Uses @upstash/ratelimit + @upstash/redis

const screenshotLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),  // 5 per 15 min per IP
  prefix: "ratelimit:screenshot",
});
```

### Cost tracking (Upstash Redis — PoC; migrates to usage_records table in MVP)

```typescript
// src/server/billing/usage.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

type UsageEvent = {
  eventType: "vision_analysis";
  model: string;
  estimatedCostCents: number;
  ip: string;
};

export async function trackUsage(event: UsageEvent): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);  // "2026-03-30"
  const key = `usage:daily:${dateKey}`;

  // Increment daily cost counter (in cents)
  const newTotal = await redis.incrbyfloat(key, event.estimatedCostCents);

  // Set TTL on first write (auto-cleanup after 7 days)
  if (newTotal === event.estimatedCostCents) {
    await redis.expire(key, 7 * 24 * 60 * 60);
  }

  // Soft cap: $50/day (5000 cents)
  if (newTotal > 5000) {
    // TODO: Send Slack/email alert to founder
    console.warn(`[COST ALERT] Daily AI spend exceeded $50: $${(newTotal / 100).toFixed(2)}`);
  }

  // Hard cap: $500/day (50000 cents)
  if (newTotal > 50000) {
    // Subsequent requests will be queued (handled in rate-limit middleware)
    console.error(`[COST HARD CAP] Daily AI spend exceeded $500. Enabling queue mode.`);
  }
}

export async function isDailyCapExceeded(): Promise<boolean> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const total = (await redis.get<number>(`usage:daily:${dateKey}`)) ?? 0;
  return total > 50000;  // $500/day hard cap
}
```

### Cost cap behavior

| Threshold | Daily spend | Action |
|-----------|-----------|--------|
| Normal | < $50 | Serve normally |
| Soft cap | $50 - $500 | Alert founder. Keep serving. |
| Hard cap | > $500 (~167K screenshots) | Show queue UI: "High demand. Enter email, we'll send your X-Ray in 10 min." This captures the lead even when we can't serve instantly. |

---

## 7. Error Handling Matrix

| Error | Detection | HTTP Status | User Message | Retry? |
|-------|-----------|-------------|-------------|--------|
| No file uploaded | `formData.get()` returns null | 400 | "No file uploaded" | No |
| Invalid file type | MIME type check | 400 | "File must be JPEG, PNG, or WebP" | No |
| File too large | Size > 2MB | 400 | "File must be under 2 MB" | No (compress first) |
| Not a Screen Time screenshot | Claude returns `{ error: "not_screen_time" }` | 422 | "That doesn't look like a Screen Time screenshot..." | No |
| Image unreadable | Claude returns `{ error: "unreadable" }` | 422 | "We couldn't read that image. Try a clearer screenshot." | Yes (different image) |
| Claude API 429 (rate limited) | HTTP 429 from Anthropic | 503 | "We're processing a lot of requests. Try again in a moment." | Yes (automatic backoff) |
| Claude API 5xx | HTTP 500+ from Anthropic | 503 | "Something went wrong. Try again." | Yes (automatic backoff) |
| Zod validation failure | Extraction doesn't match schema | 500 | "Something went wrong. Try again." | No (log to Sentry) |
| Daily cost cap exceeded | `isDailyCapExceeded()` returns true | 503 | "High demand right now. Enter your email and we'll send your X-Ray." | Deferred |
| IP rate limited | Upstash Ratelimit blocks | 429 | "Too many requests. Try again in a few minutes." | Yes (after cooldown) |

---

## 8. Data Flow Diagram

```
[User's Device]                          [Vercel Serverless]                    [External]
     |                                          |                                   |
     |  1. User takes Screen Time screenshot    |                                   |
     |  2. Selects file in ScreenTimeUpload     |                                   |
     |  3. Browser compresses (Canvas API)      |                                   |
     |     Max 1568px, JPEG 85%, < 2MB          |                                   |
     |                                          |                                   |
     |  ── POST /api/upload/screentime ────────>|                                   |
     |     (FormData with compressed image)      |                                   |
     |                                          |  4. Validate (type, size)          |
     |                                          |  5. Check rate limit (Upstash) ───>| Upstash Redis
     |                                          |  6. Check cost cap (Upstash) ────>| Upstash Redis
     |                                          |  7. Buffer → base64               |
     |                                          |  8. Call Claude Vision ───────────>| Anthropic API
     |                                          |                     <─────────────| (Haiku 4.5)
     |                                          |  9. Validate with Zod              |
     |                                          | 10. Generate insights (rules)      |
     |                                          | 11. Generate upsells (rules)       |
     |                                          | 12. Map to pain points (rules)     |
     |                                          | 13. Track usage (Upstash) ────────>| Upstash Redis
     |                                          | 14. DISCARD image (GC)             |
     |                                          |                                   |
     |  <── JSON response ─────────────────────|                                   |
     |                                          |                                   |
     | 15. Render Time X-Ray card               |                                   |
     | 16. Show upsell hooks                    |                                   |
     | 17. (Optional) Persist to DB ───────────>| INSERT screentime_analyses ───────>| Neon Postgres
     | 18. (Optional) Share → /xray/[id]        |                                   |
```

### Privacy guarantees (enforced by architecture)

1. **Image never stored.** The serverless function processes in-memory. No filesystem write, no S3, no database BLOB. Function memory is released after response.
2. **No image logging.** Base64 payload is not logged. Vercel function logs capture only the route path, status code, and duration.
3. **Anthropic doesn't store inputs.** Anthropic's API terms: zero-day retention for API customers. They do not train on API inputs.
4. **Stateless processing.** Each request is independent. No server-side session links screenshots to identities.
5. **Client-side control.** The X-Ray card is rendered in the browser from JSON. The user decides whether to save, share, or discard.

---

## 9. File Structure (FSD Placement)

```
src/
  entities/
    xray-result/                        # NEW — X-Ray data model
      index.ts                          #   Barrel: exports all types + schemas
      model/
        types.ts                        #   Zod schemas + TypeScript types (Section 1.1)

  server/                               # Backend logic (never imported by client)
    discovery/
      ocr.ts                            #   Claude Vision extraction (Section 1.3)
      prompts.ts                        #   System prompt constant (Section 1.2)
      insights.ts                       #   Rule-based insight generation (Section 2)
      upsells.ts                        #   Upsell hook generation (Section 3)
      suggestions.ts                    #   Pain point mapping (Section 4)
    billing/
      usage.ts                          #   Upstash Redis usage tracking (Section 6)

  app/
    api/
      upload/
        screentime/
          route.ts                      #   API route handler (Section 1.5)
```

**Migration note:** The existing `src/app/api/analyze-screenshot/route.ts` is deleted and replaced by `src/app/api/upload/screentime/route.ts`. Frontend's `ScreenTimeUpload.tsx` must update its fetch URL from `/api/analyze-screenshot` to `/api/upload/screentime`.

---

## 10. Dependencies on Other Clusters

### From Architecture

| Need | What | Status |
|------|------|--------|
| `screentime_analyses` table with JSONB `insights` column | Schema definition in Drizzle | Architecture owns |
| `session_id` cookie for anonymous tracking | Cookie middleware | Architecture owns |
| Zod-based request validation pattern | Shared convention | Aligned |

### From Frontend

| Need | What | Status |
|------|------|--------|
| Client-side image compression before upload | Canvas API / browser-image-compression | Frontend implements |
| Update fetch URL to `/api/upload/screentime` | `ScreenTimeUpload.tsx` change | Frontend implements |
| Render `upsellHooks[]` in X-Ray result page | Zone 2 of `/xray/[id]` | Frontend implements |
| Handle all error codes (400, 422, 429, 503) | Error UI per code | Frontend implements |
| Pass compressed image as FormData | File size < 2MB guaranteed | Frontend implements |

### From DevOps

| Need | What | Status |
|------|------|--------|
| `ANTHROPIC_API_KEY` in Vercel env vars | Environment variable | DevOps sets up |
| Upstash Redis instance (shared with rate limiter) | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | DevOps sets up |
| Sentry integration for error capture | `@sentry/nextjs` configured | DevOps sets up |

### From Business

| Need | What | Status |
|------|------|--------|
| Exact pricing for each tier | EUR amounts for upsell messages | Locked: Audit EUR 29, App Build EUR 49, Starter EUR 9/mo |
| Founding 50 audit ground truth data | Manual audit inputs/outputs | Business delivers during weeks 3-6 |

---

## 11. Week-by-Week Deliverables

### Phase 1: PoC (Weeks 1-2) — "Does it work?"

| Week | AI Cluster Deliverable | Depends on |
|------|----------------------|------------|
| **Week 1** | Create `entities/xray-result/model/types.ts` with all Zod schemas | Nothing |
| **Week 1** | Implement `src/server/discovery/ocr.ts` — Claude Vision extraction | ANTHROPIC_API_KEY (DevOps) |
| **Week 1** | Implement `src/server/discovery/prompts.ts` | Nothing |
| **Week 1** | Implement `src/app/api/upload/screentime/route.ts` — replace mock | ocr.ts |
| **Week 1** | Delete old `src/app/api/analyze-screenshot/route.ts` | Frontend URL update |
| **Week 2** | Implement `src/server/discovery/insights.ts` — rule-based insights | types.ts |
| **Week 2** | Implement `src/server/discovery/upsells.ts` — revenue hooks | Pricing (Business, locked) |
| **Week 2** | Implement `src/server/discovery/suggestions.ts` — pain point mapping | painLibrary (exists) |
| **Week 2** | Implement `src/server/billing/usage.ts` — Upstash cost tracking | Upstash Redis (DevOps) |
| **Week 2** | Validate with 20+ real screenshots (iOS + Android, light + dark mode) | Real screenshots |

**Week 2 exit criteria:** Upload a real Screen Time screenshot → get accurate structured extraction + insights + upsell hooks in < 5 seconds.

### Phase 2: Commercial Validation (Weeks 3-6) — "Will they pay?"

| Week | AI Cluster Deliverable | Depends on |
|------|----------------------|------------|
| **Week 3** | Integrate rate limiting (Upstash Ratelimit wrapper) | Upstash Redis |
| **Week 3** | Add cost cap logic (soft $50/day, hard $500/day) | usage.ts |
| **Week 3** | Collect Founding 50 screenshots as accuracy benchmark dataset | Founding 50 signups (Business) |
| **Week 4** | Accuracy validation: run 50 real screenshots, measure extraction accuracy | Benchmark dataset |
| **Week 4** | If accuracy < 90%: switch to Sonnet (simple model swap, no architecture change) | Accuracy results |
| **Week 5-6** | Collect manual audit ground truth from founder's Founding 50 deliveries | Founder's manual work |
| **Week 5-6** | Begin designing Sonnet prompt for automated narrative generation (MVP prep) | Ground truth data |

**Week 6 exit criteria:** 50+ real screenshots processed with >90% extraction accuracy. Manual audit ground truth collected for 20+ users.

### Phase 3: MVP (Weeks 7-10) — "Scale the revenue"

| Week | AI Cluster Deliverable | Depends on |
|------|----------------------|------------|
| **Week 7** | Implement LLM-generated narrative (Sonnet 4.6) for paid Time Audit | Ground truth data, auth (Architecture) |
| **Week 7** | Migrate usage tracking from Upstash Redis to `usage_records` table | Database (Architecture) |
| **Week 8** | Implement Google Takeout client-side aggregation spec | Takeout parser (Frontend) |
| **Week 8** | Implement Sonnet-based Takeout insight generation | QStash async jobs (DevOps) |
| **Week 9** | "Compared to average" benchmarks using hardcoded public research data | None |
| **Week 9** | Multi-source Time X-Ray: combine screenshot + Takeout data | Both sources working |
| **Week 10** | Accuracy evaluation: compare AI narrative vs. founder manual audits | Ground truth |
| **Week 10** | Cost optimization: prompt caching audit, token count analysis | Usage data from weeks 7-9 |

**Week 10 exit criteria:** Automated Time X-Ray report (Sonnet-generated) that matches >70% of founder's manual recommendations. Takeout insights working. Per-user cost < $0.05.

---

## 12. Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Haiku extraction accuracy < 90%** | Low (Screen Time UIs are high-contrast) | Medium (bad data = bad insights = no conversions) | Week 4 accuracy benchmark. Switch to Sonnet if needed ($0.010 vs $0.003 — still trivial). |
| **Claude API outage during viral moment** | Low | High (lost leads during peak traffic) | Circuit breaker with 5-min cooldown. Show "email us your screenshot" fallback with manual processing promise. |
| **Non-English screenshots fail** | Medium (if we expand markets) | Low (PoC targets English) | PoC: documented limitation. MVP: add `language` hint parameter, test with 10 non-English screenshots. |
| **Prompt injection via image** | Very low (images, not text prompts) | Low (tool_use constrains output to schema) | Tool_use structured output prevents arbitrary responses. System prompt explicitly handles non-screenshot images. |
| **Cost spike from bot traffic** | Low | Medium (budget burn) | IP rate limiting (5/15min) + daily cost cap ($500). Bot traffic would hit rate limit long before cost cap. |
| **Anthropic pricing increase** | Medium (API pricing is competitive) | Low at current volumes | At $0.003/call, even a 3x price increase makes it $0.009 — still irrelevant vs. revenue. |
| **Image compression loses readability** | Low | Medium (extraction fails) | JPEG 85% preserves text well. If client sends unreadable image, Claude returns `"unreadable"` error with retry prompt. |
| **Founding 50 ground truth is insufficient** | Medium | Medium (weak Sonnet prompt) | 20 examples is minimum for few-shot. If fewer sign up for audits, supplement with synthetic examples (founder generates mock audits for real screenshots). |

---

## 13. Model Selection Summary

| Task | Model | Cost/call | Phase | Rationale |
|------|-------|-----------|-------|-----------|
| Screenshot extraction (OCR) | **Haiku 4.5** | $0.003 | PoC | Structured extraction from high-contrast UI. Haiku is sufficient. |
| Rule-based insights | **None** (code) | $0 | PoC | Deterministic rules. No LLM needed. |
| Upsell hooks | **None** (code) | $0 | PoC | Business logic mapping. No LLM needed. |
| Pain point mapping | **None** (code) | $0 | PoC | Dictionary lookup. No LLM needed. |
| Automated Time Audit narrative | **Sonnet 4.6** | ~$0.02 | MVP | Personalized narrative requires reasoning. Uses Founding 50 as few-shot examples. |
| Takeout insight generation | **Sonnet 4.6** | ~$0.01 | MVP | Multi-source data synthesis. Aggregated input keeps cost low. |
| **Opus 4.6** | **Never used** | N/A | Never | No task justifies 5x Sonnet / 19x Haiku cost. |

---

## 14. Future AI Pipeline (Post-MVP)

Not in scope, but designed for. The architecture is extensible because:

1. **`ScreenTimeExtraction` type is source-agnostic.** The same `apps[]` structure works whether data comes from a screenshot, Takeout parsing, or Chrome extension. Future sources produce the same type.

2. **Insight generation is pluggable.** `generateInsights()` currently uses rules. Replacing it with a Sonnet call requires changing one function, not the pipeline.

3. **Usage tracking is model-agnostic.** `trackUsage()` logs the model name and cost. Adding Sonnet calls for new features auto-tracks without changes.

4. **Rate limiting is per-endpoint.** New AI endpoints (Takeout, extension) get their own rate limits without affecting screenshot throughput.

### What plugs in later

| Feature | Data source | Model | When |
|---------|------------|-------|------|
| Chrome extension analysis | Aggregated browsing data | Haiku (batch) | Post-MVP |
| Skill automations (meal planner, etc.) | User preferences + discovery data | Haiku (text) | Post-MVP |
| Skill automations (email triage) | Email metadata | Sonnet (reasoning) | Post-MVP |
| Skill automations (grade watcher, price watcher) | Scraping | None (pure automation) | Post-MVP |
| Apple Health / Meta data imports | Parsed XML/JSON | Haiku | Post-MVP |
