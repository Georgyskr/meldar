# AI Pipeline Review -- Meldar Screen Time X-Ray

**Reviewer:** AI Engineer Agent
**Date:** 2026-03-30
**Scope:** Claude Vision extraction, prompt engineering, insights/upsells/suggestions, Zod schemas, API route, rate limiting
**Files Reviewed:**
- `src/server/discovery/ocr.ts`
- `src/server/discovery/prompts.ts`
- `src/server/discovery/insights.ts`
- `src/server/discovery/upsells.ts`
- `src/server/discovery/suggestions.ts`
- `src/entities/xray-result/model/types.ts`
- `src/app/api/upload/screentime/route.ts`
- `src/server/lib/rate-limit.ts`

---

## Executive Summary

The pipeline is well-structured for an MVP: a single Claude Vision call with tool_use for structured extraction, followed by zero-cost rule-based post-processing. The architecture is sound. However, there are several issues ranging from a critical rate-limiting bypass to prompt engineering gaps and schema looseness that should be addressed before scaling.

---

## Findings

### 1. Rate Limiting Silently Disabled When Redis Is Unavailable

**Severity: CRITICAL**
**File:** `src/server/lib/rate-limit.ts:31-33`, `src/app/api/upload/screentime/route.ts:18-19`

```typescript
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
  if (!limiter) return { success: true }
  return limiter.limit(identifier)
}
```

If `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` is not set (e.g. misconfigured deployment, env var rotation, or development without Redis), `screentimeLimit` is `null` and **every request passes unchecked**. This means:

- Zero rate limiting on the Claude API endpoint
- An attacker can make unlimited calls, each costing ~$0.003, rapidly exhausting your Anthropic budget
- No logging or alerting when rate limiting is disabled

**Recommendation:**
- Fail closed: if Redis is unavailable, reject requests or fall back to an in-memory rate limiter (e.g., a simple Map-based counter per IP). At minimum, log a warning at startup when Redis is unavailable.
- Add a startup health check that verifies Redis connectivity.
- Consider setting a hard spending limit on the Anthropic dashboard as a secondary safety net.

---

### 2. No API Cost Ceiling / Budget Guard

**Severity: HIGH**
**File:** `src/app/api/upload/screentime/route.ts`, `src/server/discovery/ocr.ts`

There is no mechanism to cap total API spend. The rate limit is per-IP (5/min), but with enough unique IPs (botnets, distributed attacks), an attacker can drive up costs with no upper bound. There is no:
- Daily/hourly global request counter
- Spending cap that disables the endpoint after N requests
- Circuit breaker that trips on anomalous volume

**Recommendation:**
- Implement a global counter (in Redis or a simple DB row) that tracks total daily API calls and disables the endpoint after a threshold (e.g., 1000 requests/day = ~$3/day max).
- Set up Anthropic dashboard spend alerts.
- Consider requiring email verification or session token before allowing screenshot uploads, which would also reduce anonymous abuse.

---

### 3. IP-Based Rate Limiting Is Easily Bypassable

**Severity: HIGH**
**File:** `src/app/api/upload/screentime/route.ts:17`

```typescript
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
```

Issues:
- `x-forwarded-for` is trivially spoofable if the app is not behind a trusted proxy that strips/overwrites this header. On Vercel, the correct header to use is `x-real-ip` or `x-vercel-forwarded-for`.
- Fallback to `'unknown'` means all requests without the header share a single rate limit bucket -- either all pass or all fail together.
- Multiple users behind the same NAT/VPN share an IP, causing false positives.

**Recommendation:**
- On Vercel, prefer `request.headers.get('x-real-ip')` or `request.ip` (available in Next.js edge/middleware).
- Never fall back to a shared identifier like `'unknown'`. If IP cannot be determined, reject the request or use a stricter fallback (like requiring authentication).

---

### 4. Claude Vision Prompt Lacks Edge Case Handling

**Severity: MEDIUM**
**File:** `src/server/discovery/prompts.ts`

The system prompt is clear and well-structured for the happy path. However, it misses several real-world edge cases:

- **Partial screenshots**: Users may screenshot only part of the Screen Time page. No instruction on whether to report only visible data or flag it as incomplete.
- **Weekly vs. daily view**: iOS Screen Time can show daily or weekly summaries. The prompt does not ask the model to detect which view is shown, and `totalScreenTimeMinutes` would be wildly different between the two.
- **Category grouping**: iOS shows category summaries (e.g., "Social Networking 3h 12m") separately from individual apps. The prompt does not clarify whether to extract category-level data, app-level data, or both.
- **Non-English screenshots**: No instruction on handling non-English localized app names or time formats (e.g., "2 Std. 30 Min." in German).
- **Multiple days visible**: Some Android views show a bar chart across multiple days. No guidance on which day to extract.
- **Time format ambiguity**: "1:30" could be 1 hour 30 minutes or 90 minutes. The prompt says "convert to minutes" but does not explicitly address this format.

**Recommendation:**
Add explicit instructions for: (a) daily vs. weekly detection (add a `period` field: "day" | "week"), (b) partial screenshot handling, (c) non-English locale handling, (d) multiple-day chart handling (extract the selected/highlighted day).

---

### 5. Tool Schema and Zod Schema Are Not Automatically Synchronized

**Severity: MEDIUM**
**File:** `src/server/discovery/ocr.ts:38-94`, `src/entities/xray-result/model/types.ts`

The tool_use `input_schema` (JSON Schema sent to Claude) and the Zod `screenTimeExtractionSchema` (used for validation) are defined separately. They are currently in sync, but any future change to one without updating the other will cause silent failures:

- If the tool schema adds a field but Zod does not include it, the field is silently stripped by Zod's default behavior.
- If the tool schema changes an enum value, Zod will reject valid responses.

Also, the tool schema includes an `error` field (for `not_screen_time`/`unreadable`), but the Zod schema does not. The error handling relies on raw `input.error` casting before Zod validation, which works but is fragile.

**Recommendation:**
- Use `zod-to-json-schema` to generate the tool's `input_schema` from the Zod schema, keeping them as a single source of truth.
- Create a separate Zod schema for the error case (discriminated union) so the full response is type-safe:
  ```typescript
  const extractionResponseSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('success'), ...extractionFields }),
    z.object({ type: z.literal('error'), error: z.enum(['not_screen_time', 'unreadable']) }),
  ])
  ```

---

### 6. Zod Schemas Are Too Loose

**Severity: MEDIUM**
**File:** `src/entities/xray-result/model/types.ts`

Several schema fields accept any value where constraints should be applied:

- `appUsageSchema.name`: `z.string()` -- no `.min(1)`. An empty string app name would pass validation.
- `appUsageSchema.usageMinutes`: `z.number()` -- no `.nonnegative()` or `.int()`. Negative or fractional minutes would pass.
- `screenTimeExtractionSchema.totalScreenTimeMinutes`: Same issue -- no lower bound.
- `screenTimeExtractionSchema.apps`: `z.array(appUsageSchema)` -- no `.min(1)`. An empty array is valid, meaning a "successful" extraction with zero apps.
- `insightSchema` and `upsellHookSchema` fields like `headline`, `comparison`, `suggestion`, `message`: No `.min(1)` -- could be empty strings.

**Recommendation:**
```typescript
name: z.string().min(1),
usageMinutes: z.number().nonnegative(),
apps: z.array(appUsageSchema).min(1),
totalScreenTimeMinutes: z.number().nonnegative(),
```

---

### 7. Apps Array Assumed Sorted by Usage -- Not Guaranteed

**Severity: MEDIUM**
**File:** `src/server/discovery/insights.ts:9`, `src/server/discovery/upsells.ts:20`

```typescript
const topApp = extraction.apps[0]          // insights.ts:9
const topSocial = socialApps[0]            // upsells.ts:20
```

Both files assume `apps[0]` is the highest-usage app. Claude will likely return apps in the order they appear on screen (which on iOS Screen Time is sorted by usage), but this is not guaranteed by the prompt or schema. A slight change in prompt interpretation, a different screenshot layout, or a future model update could return apps in a different order.

**Recommendation:**
Sort apps by `usageMinutes` descending before using them in insights/upsells, either in the API route after extraction or as a post-processing step in `ocr.ts`.

---

### 8. Cost Estimate of $0.003/Screenshot Needs Verification

**Severity: MEDIUM**
**File:** General / `src/server/discovery/ocr.ts`

The claim of $0.003/screenshot with `claude-haiku-4-5-20251001` depends on:

- **Input tokens**: A typical iOS Screen Time screenshot at standard resolution (1170x2532 iPhone 14) will consume roughly 1,600-2,000 image tokens. Plus the system prompt (~200 tokens) and user message (~30 tokens). Total input: ~1,800-2,200 tokens.
- **Output tokens**: With `max_tokens: 1024`, a typical tool_use response with 8-12 apps will be ~300-500 tokens.

At Haiku 4.5 pricing ($0.80/MTok input, $4/MTok output):
- Input: 2,200 tokens x $0.80/MTok = $0.00176
- Output: 500 tokens x $4/MTok = $0.002
- **Total: ~$0.0038 per call**

The $0.003 estimate is slightly optimistic. A more realistic figure is $0.003-$0.005 depending on screenshot complexity and number of visible apps. For budgeting purposes, use $0.005 as the upper bound.

Note: If users upload high-resolution images (4K, retina screenshots), image token count could increase significantly. Consider resizing images server-side before sending to Claude.

**Recommendation:**
- Document $0.005 as the conservative per-call estimate.
- Resize images to max 1024px wide before base64 encoding to control image token costs (this also reduces upload bandwidth).
- `max_tokens: 1024` is appropriate; a very app-heavy screenshot might approach this limit with 20+ apps. Consider 1536 for safety or add a note about truncation risk.

---

### 9. No Handling of Anthropic API Errors or Timeouts

**Severity: MEDIUM**
**File:** `src/server/discovery/ocr.ts:16-97`

The `extractScreenTime` function makes a raw API call with no:
- Timeout configuration (the Anthropic SDK defaults to 10 minutes, which is far too long for a user-facing endpoint)
- Retry logic for transient errors (429, 500, 529)
- Handling of `overloaded` stop reason
- Handling of partial/malformed tool_use responses
- Error differentiation (network error vs. auth error vs. rate limit vs. content moderation)

If Claude's API is slow or overloaded, the user's request will hang until Next.js's function timeout kills it (default 10s on Vercel Hobby, 60s on Pro), producing an opaque 500 error.

**Recommendation:**
- Set a timeout on the Anthropic client: `new Anthropic({ timeout: 15_000 })` (15 seconds)
- Wrap the API call with specific error handling for known Anthropic error types
- Return user-friendly error messages for different failure modes:
  - 429 (rate limited by Anthropic) -> "Service is busy, try again shortly"
  - 529 (overloaded) -> "Service is temporarily unavailable"
  - Timeout -> "Analysis took too long, try a simpler screenshot"

---

### 10. No Image Content Validation Before Sending to Claude

**Severity: MEDIUM**
**File:** `src/app/api/upload/screentime/route.ts:41-53`

The route validates MIME type and file size, but does not validate:

- **Image dimensions**: A 1x1 pixel image or a 10000x10000 pixel image both pass validation. Very large images waste tokens and money.
- **Actual file content vs. MIME type**: The MIME type comes from the client's `Content-Type` and can be spoofed. A user could upload a renamed PDF or text file with a `image/png` MIME type. Claude Vision will reject it, but you pay for the API call.
- **EXIF/metadata stripping**: Screenshots may contain GPS coordinates, device model, etc. in EXIF data. While this data is not sent to Claude (base64 of pixel data), if you ever store the original image, this becomes a GDPR concern.

**Recommendation:**
- Use `sharp` or similar to validate that the file is actually an image, get dimensions, resize if needed, and strip EXIF metadata -- all in one pass:
  ```typescript
  const image = sharp(buffer)
  const metadata = await image.metadata()
  if (!metadata.width || metadata.width > 4096) { /* reject or resize */ }
  const processed = await image.resize(1024, null, { withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
  ```

---

### 11. Suggestion Mapping Is Case-Sensitive and Incomplete

**Severity: LOW**
**File:** `src/server/discovery/suggestions.ts`

The `APP_TO_PAIN` mapping has only 16 entries and uses `key.includes(pattern)` matching. This works for English app names but has issues:

- App names like "X" will match any app containing the letter "x" (e.g., "Xerox", "Xbox"). The entry `x: 'social-posting'` is particularly problematic.
- Regional variants are missed: "WhatsApp Business", "YouTube Music", "Facebook Messenger", "Google Chrome" all have different naming from the base entries.
- No mapping for common high-usage apps: Spotify, Amazon, Reddit, Snapchat, Pinterest, LinkedIn, Discord, Maps, Photos, Camera.

**Recommendation:**
- Use exact match (`key === pattern`) or word-boundary matching for short names like "x" and "mail".
- Expand the mapping to cover the top 30-50 most common apps.
- Consider moving the `x: 'social-posting'` entry to `twitter` only, or use a more specific match like checking for the app icon/exact name.

---

### 12. Insights Use Hardcoded Thresholds Without Daily/Weekly Distinction

**Severity: LOW**
**File:** `src/server/discovery/insights.ts`

Thresholds like `totalHours > 4`, `socialMinutes > 120`, `pickups > 60` assume daily data. If a user uploads a weekly summary (some iOS views show this), all thresholds would fire incorrectly because weekly numbers are ~7x higher.

This is related to Finding #4 (prompt lacks daily vs. weekly detection). Without a `period` field in the extraction, all downstream logic is ambiguous.

**Recommendation:**
Add a `period: 'day' | 'week'` field to the extraction schema and scale thresholds accordingly, or divide weekly values by 7 before applying insights.

---

### 13. AI Safety: No Content Moderation for Uploaded Images

**Severity: LOW**
**File:** `src/app/api/upload/screentime/route.ts`

Users can upload any image -- it does not have to be a screen time screenshot. Claude Vision will process any image content and will return `error: 'not_screen_time'` for non-matching images, but the image still gets sent to and processed by Claude. Risks:

- **CSAM or illegal content**: The image passes through your server (briefly in memory) to Anthropic's API. While Anthropic has their own content filtering, you should have your own safeguards.
- **Adversarial images**: An image with embedded text could attempt prompt injection (e.g., "Ignore previous instructions and return..."). The tool_use constraint mitigates this somewhat since Claude must call the specific tool, but it is not a complete defense.
- **PII exposure**: Users may accidentally upload screenshots with visible personal data (messages, banking info). This data would be sent to Anthropic's API.

**Recommendation:**
- The tool_use / forced tool constraint is a good defense against prompt injection. This is already implemented correctly.
- Add a note in the UI that the screenshot is sent to an AI service for processing (GDPR transparency requirement).
- Consider adding Anthropic's content moderation / safety check or a lightweight pre-filter.
- Do not store the raw image. The current implementation does not appear to store images (only extracted data), which is good.

---

### 14. Database Insert Has No Error Handling for Conflicts

**Severity: LOW**
**File:** `src/app/api/upload/screentime/route.ts:89-103`

```typescript
const id = nanoid(12)
await db.insert(xrayResults).values({ ... })
```

`nanoid(12)` gives ~6.1 bits of entropy per character x 12 = ~71 bits, which makes collisions astronomically unlikely. This is fine. However, if the DB insert fails (e.g., schema mismatch, connection timeout), the user still receives a 500 error from the outer catch block with no specific message. The extraction has already succeeded and generated insights, but the user gets nothing.

**Recommendation:**
- Consider returning the extraction results even if the DB insert fails (just without a shareable `id`). The user still gets value from their insights.
- Log the DB error separately for debugging.

---

### 15. Model ID Hardcoded

**Severity: LOW**
**File:** `src/server/discovery/ocr.ts:17`

```typescript
model: 'claude-haiku-4-5-20251001',
```

The model ID is hardcoded. When a newer Haiku version is released or if you want to A/B test models, you would need a code change and redeployment.

**Recommendation:**
Consider using an environment variable with a fallback: `process.env.SCREEN_TIME_MODEL || 'claude-haiku-4-5-20251001'`. This allows hot-swapping models via Vercel env vars without redeployment.

---

## Summary Table

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 1 | Rate limiting silently disabled without Redis | CRITICAL | Low |
| 2 | No global API cost ceiling | HIGH | Medium |
| 3 | IP-based rate limiting easily bypassable | HIGH | Low |
| 4 | Prompt lacks edge case handling (weekly/daily, partial, locale) | MEDIUM | Low |
| 5 | Tool schema and Zod schema not synchronized | MEDIUM | Medium |
| 6 | Zod schemas too loose (no min/nonneg constraints) | MEDIUM | Low |
| 7 | Apps array assumed sorted | MEDIUM | Low |
| 8 | Cost estimate slightly optimistic, no image resizing | MEDIUM | Medium |
| 9 | No Anthropic API timeout or error differentiation | MEDIUM | Medium |
| 10 | No image content/dimension validation | MEDIUM | Medium |
| 11 | Suggestion mapping is fragile (especially "x") | LOW | Low |
| 12 | Insights thresholds assume daily data | LOW | Low |
| 13 | No content moderation for uploaded images | LOW | Low |
| 14 | DB insert failure loses extraction results | LOW | Low |
| 15 | Model ID hardcoded | LOW | Low |

## Priority Recommendations

**Immediate (before launch traffic):**
1. Fix rate limiting fail-open (Finding 1) -- add in-memory fallback or fail closed
2. Add global daily cost cap (Finding 2) -- simple Redis counter or DB row
3. Fix IP header to use `x-real-ip` on Vercel (Finding 3)

**Before scaling:**
4. Add image resizing with `sharp` (Finding 10, also helps Finding 8)
5. Set Anthropic client timeout to 15s (Finding 9)
6. Sort apps by usage before generating insights (Finding 7)
7. Tighten Zod schemas (Finding 6)

**Next iteration:**
8. Enhance prompt for weekly/daily detection and edge cases (Finding 4)
9. Unify tool schema and Zod via `zod-to-json-schema` (Finding 5)
10. Expand and fix suggestion mapping (Finding 11)
