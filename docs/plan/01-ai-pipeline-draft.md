# AI/ML Pipeline Plan — Iteration 1

**Authors:** AI Engineer, AI Data Remediation Engineer, Autonomous Optimization Architect
**Date:** 2026-03-30
**Status:** Draft for cross-cluster review

---

## 1. Claude Vision Integration — Screen Time Screenshot Analysis

### What we're extracting

From an iOS/Android Screen Time screenshot, we need structured data:

```typescript
type ScreenTimeAnalysis = {
  apps: Array<{
    name: string           // "Instagram", "Safari", "YouTube"
    usageMinutes: number   // Raw minutes for precision; display as hours
    category: AppCategory  // "social" | "entertainment" | "productivity" | "communication" | "browser" | "health" | "finance" | "education" | "gaming" | "utility"
  }>
  totalScreenTimeMinutes: number
  pickups: number | null   // iOS shows this; Android may not
  firstAppOpenTime: string | null  // "6:42 AM" if visible
  date: string | null      // The date/period shown in the screenshot
  platform: "ios" | "android" | "unknown"
  confidence: "high" | "medium" | "low"  // Model's self-assessed confidence
}
```

### Prompt engineering approach

**System prompt** (cached, ~500 tokens — qualifies for prompt caching discount):

```
You are a Screen Time data extractor. You receive screenshots from iOS Screen Time
or Android Digital Wellbeing. Extract structured usage data.

Rules:
- Extract EVERY visible app with its usage time.
- Convert all times to minutes (e.g., "1h 23m" = 83 minutes).
- Categorize each app. If unsure, use "utility".
- If the image is NOT a Screen Time screenshot, return { "error": "not_screen_time" }.
- If the image is too blurry or cropped to read, return { "error": "unreadable" }.
- Set confidence to "low" if significant data is obscured or estimated.
- Never hallucinate app names or times. Only report what is visible.
```

**User message**: The base64-encoded image with a short instruction:

```
Extract all app usage data from this Screen Time screenshot. Return JSON only.
```

**Structured output enforcement**: Use Claude's tool_use/function_calling to force JSON schema compliance. No regex parsing of free-text output — the model returns structured JSON or an error object.

### Implementation plan

Replace the mock in `src/app/api/analyze-screenshot/route.ts`:

```typescript
// Pseudocode — actual implementation
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const SYSTEM_PROMPT = "..."; // Cached system prompt

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("screenshot") as File;

  // 1. Validate: file exists, is image, < 5MB
  // 2. Convert to base64
  // 3. Call Claude Vision with tool_use for structured output
  // 4. Validate response with Zod
  // 5. Return structured data
  // 6. Do NOT store the image — discard after processing
}
```

### Which screenshots formats to support

| Platform | Screen | What's visible |
|----------|--------|---------------|
| **iOS 17+** | Settings > Screen Time > See All Activity | Apps, times, pickups, first use, category bars |
| **iOS 17+** | Daily view | Per-app time, bar chart |
| **Android 13+** | Digital Wellbeing | App timers, unlock count, notifications |
| **Android 13+** | Screen time widget | Simplified view, fewer details |

Claude Vision handles all of these without template matching — it reads the text/UI directly. No need for separate OCR pipelines per platform.

### Error handling

| Scenario | Detection | Response to user |
|----------|-----------|-----------------|
| Not a Screen Time screenshot | Model returns `{ error: "not_screen_time" }` | "That doesn't look like a Screen Time screenshot. Here's how to find it: ..." |
| Blurry/cropped image | Model returns `{ error: "unreadable" }` | "We couldn't read that image. Try a clearer screenshot." |
| Partial data (some apps cut off) | `confidence: "low"` | Show results with disclaimer: "We could only read part of your screen. Scroll down and take another screenshot for the full picture." |
| API failure | HTTP error / timeout | "Something went wrong on our end. Try again in a moment." |
| Rate limit hit | 429 from Anthropic | Queue with retry, show "We're processing a lot of requests..." |

---

## 2. Cost Model

### Claude API pricing (as of March 2026)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Vision (per image) |
|-------|----------------------|----------------------|-------------------|
| **Claude Haiku 4.5** | $0.80 | $4.00 | ~$0.001-0.003 (image tokens vary by resolution) |
| **Claude Sonnet 4.6** | $3.00 | $15.00 | ~$0.003-0.010 |
| **Claude Opus 4.6** | $15.00 | $75.00 | ~$0.015-0.050 |

### Per-screenshot cost breakdown (using Haiku 4.5)

| Component | Tokens | Cost |
|-----------|--------|------|
| System prompt (cached) | ~500 input | $0.0004 (cached: $0.00004) |
| Image tokens (typical Screen Time screenshot, ~1200x800) | ~1,600 image tokens | ~$0.0013 |
| User instruction | ~30 input | negligible |
| Structured output (JSON, ~15 apps) | ~300 output | $0.0012 |
| **Total per screenshot** | | **~$0.002-0.003** |

With prompt caching (system prompt cached across requests):
- **First request**: ~$0.003
- **Subsequent requests**: ~$0.002

### Per-user cost projections

| User behavior | Screenshots/month | AI cost/month | Notes |
|--------------|-------------------|---------------|-------|
| **One-time user** | 1 | $0.003 | Takes one screenshot, sees Time X-Ray |
| **Weekly checker** | 4 | $0.012 | Compares week-over-week |
| **Daily tracker** | 30 | $0.090 | Power user (unlikely for screenshots) |
| **Realistic average** | 2-3 | ~$0.006 | Most users upload once, maybe re-upload once more |

### Break-even analysis

**Assumption**: Free tier allows 1 screenshot/month. Paid tiers include more.

| Scenario | Users | Avg screenshots/user/month | Monthly AI cost | Revenue needed |
|----------|-------|---------------------------|----------------|---------------|
| **PoC (100 early adopters)** | 100 | 3 | $0.90 | Covered by early adopter pricing |
| **MVP launch (1,000 users)** | 1,000 | 2 | $4.00 | Trivial |
| **Growth (10,000 users)** | 10,000 | 2 | $40.00 | Still trivial |
| **Scale (100,000 users)** | 100,000 | 2 | $400.00 | One paid user covers ~3,000 free users |

**Opinion**: Screenshot analysis is so cheap with Haiku that it's effectively free at our scale. Cost only becomes a concern if we're doing heavyweight Sonnet/Opus calls for Time X-Ray insight generation (see Section 5). The screenshot OCR itself is not the cost center — the insight layer is.

---

## 3. Caching & Optimization

### What to cache

| Data | Cache? | Strategy | TTL |
|------|--------|----------|-----|
| **System prompt** | Yes | Anthropic prompt caching (beta) — automatically cached for identical prefixes | Managed by Anthropic |
| **Screenshot extraction result** | No | Each screenshot is unique. No cache hit possible. | N/A |
| **Time X-Ray generation** | Yes | Cache generated insights per user+data combination | 24 hours |
| **App category mappings** | Yes | Local lookup table: "Instagram" -> "social" | Infinite (static) |
| **Insight templates** | Yes | Pre-computed insight patterns to reduce LLM calls | Infinite (static) |

### Optimization strategies

1. **Image preprocessing before API call**
   - Resize to max 1568px on longest edge (Claude Vision limit anyway; larger images waste tokens)
   - Convert to JPEG at 80% quality (smaller payload, same readability for text)
   - Estimated 40-60% reduction in image tokens = direct cost savings
   - Do this server-side in the API route before calling Anthropic

2. **Hybrid extraction: LLM + heuristics**
   - After the LLM extracts raw app names and times, use a local dictionary to:
     - Normalize app names ("IG" -> "Instagram", "YT" -> "YouTube")
     - Assign categories (no need for LLM to categorize known apps)
     - Validate time values (no app usage > 24h/day)
   - This reduces output token count and improves consistency

3. **Batching: Not applicable for PoC**
   - Users upload one screenshot at a time
   - No batch API needed until Chrome extension sends bulk data (MVP+)

4. **Prompt caching (critical for cost)**
   - Claude supports automatic prompt caching for identical system prompt prefixes
   - Our system prompt is static — every request gets the cache discount after the first
   - At 90% cache hit rate: effectively halves input cost

### Anti-patterns to avoid

- **Do NOT cache images**: Privacy violation. Screenshots may contain sensitive app names, usage of health/dating/finance apps. Process and discard immediately.
- **Do NOT retry on partial extraction**: If the model returns `confidence: "low"`, show the partial result and ask the user for a better screenshot. Retrying the same image will produce the same result and double the cost.
- **Do NOT fan out to multiple models**: One Haiku call is enough for extraction. Don't send to Haiku AND Sonnet "for comparison" — that's pure waste.

---

## 4. Data Flow Architecture

### Screenshot analysis flow

```
[User's Device]                    [Vercel Edge/Serverless]              [Anthropic API]
     |                                      |                                  |
     |  1. User takes screenshot            |                                  |
     |  2. Uploads via <input type="file">  |                                  |
     |  ──── POST /api/analyze-screenshot ─>|                                  |
     |                                      |  3. Validate file (type, size)   |
     |                                      |  4. Resize/compress (sharp)      |
     |                                      |  5. Convert to base64            |
     |                                      |  ── API call (vision + tool_use)──>
     |                                      |                                  |
     |                                      |  6. Receive structured JSON     <──
     |                                      |  7. Validate with Zod            |
     |                                      |  8. DISCARD image from memory    |
     |                                      |  9. Return analysis to client    |
     |  <── JSON response ─────────────────|                                  |
     |                                      |                                  |
     |  10. Render Time X-Ray              |                                  |
     |  11. Image NEVER stored server-side  |                                  |
```

### What stays where

| Data | Location | Stored? | Duration |
|------|----------|---------|----------|
| Screenshot image | Server memory only (Vercel function) | No (in-flight only) | ~2-5 seconds during processing |
| Extracted app usage JSON | Client (browser state) | Session only | Until tab closes |
| Time X-Ray card | Client (rendered) | Optional: user can save/share | User-controlled |
| Google Takeout ZIP (future) | Client (browser) | Never leaves device | Session only |
| User email (if subscribed) | Resend + our DB (future) | Yes | Until deletion request |

### Privacy guarantees (enforceable by architecture)

1. **No image storage**: The API route processes in a serverless function. The function dies after response. No filesystem, no S3, no database write for images.
2. **No logging of image content**: Ensure Vercel/Anthropic request logs don't include base64 payloads. Anthropic's API does not log inputs by default for API customers (verify in their data policy).
3. **Stateless processing**: Each request is independent. No user session on the server correlates screenshots to identities unless they're logged in (and they're not for PoC).
4. **Client-side aggregation**: The Time X-Ray is assembled in the browser from the JSON response. We don't even know what the user sees unless they share it.

### FSD placement

```
src/
  app/
    api/
      analyze-screenshot/
        route.ts              # API route — calls Claude Vision, returns JSON
  shared/
    lib/
      anthropic.ts            # Anthropic client singleton (lazy init, env var check)
      image-processing.ts     # Resize/compress utilities
    types/
      screen-time.ts          # Zod schemas + TS types for ScreenTimeAnalysis
  features/
    quiz/
      ui/
        ScreenTimeUpload.tsx  # Existing upload UI (already built)
    time-x-ray/
      ui/
        TimeXRayCard.tsx      # Shareable card renderer (new feature)
      lib/
        generate-insights.ts  # Turn raw data into insights (rule-based for PoC)
```

---

## 5. Time X-Ray Generation

### PoC approach: Rule-based insights (NO additional LLM call)

For PoC, we do NOT need a second Claude call to generate insights. The extraction gives us structured data; we apply rules:

```typescript
type Insight = {
  headline: string      // "2.3 hours on Instagram"
  comparison: string    // "That's 16 hours a week — almost a part-time job"
  suggestion: string    // "Want us to build an Instagram time limiter?"
  severity: "low" | "medium" | "high"  // Based on hours
}

function generateInsights(data: ScreenTimeAnalysis): Insight[] {
  // Rule 1: Top app by usage → always generate an insight
  // Rule 2: Total screen time > 5hrs/day → "heavy user" insight
  // Rule 3: Social media > 2hrs/day → social-specific insight
  // Rule 4: App checked > 30 times → "compulsive checking" insight
  // Rule 5: Late-night usage visible → sleep impact insight

  // Map insights to Meldar pain points from painLibrary
  // "You use Gmail 47 min/day" → link to "email-chaos" pain point
}
```

**Why rule-based for PoC:**
- Zero additional cost per user
- Predictable output (no hallucinated suggestions)
- Instant (no API latency)
- Easy to A/B test specific insight formats
- The "Spotify Wrapped" card format works best with templated text anyway

### MVP approach: LLM-generated personalized narrative (1 call per Time X-Ray)

When we have more data sources (Takeout + extension), a single Claude Sonnet call generates a personalized narrative:

```
Given this user's data:
- Screen Time: [structured JSON]
- Chrome history patterns: [aggregated categories]
- Calendar density: [meetings/week]

Generate a personalized Time X-Ray report with:
1. One surprising stat they didn't expect
2. Their #1 time sink and what they're missing because of it
3. Three specific automations Meldar could build for them
```

**Cost per Time X-Ray (Sonnet)**: ~$0.01-0.02 per generation
**When to call**: Only once per data upload, cached for 24h. User can regenerate if they upload new data.

### The shareable card

The Time X-Ray card is the viral mechanism. It must be:

- **Visually striking** — Meldar brand colors, the gradient, big numbers
- **Screenshot-friendly** — Fixed aspect ratio (1080x1920 or 1080x1080), no interactive elements
- **Shareable** — "Share your Time X-Ray" button generates a static image or links to a public page
- **Privacy-safe** — Only shows aggregated categories by default, not specific app names (user can toggle)

Implementation options:
1. **Client-side canvas rendering** — Use HTML Canvas or a library like `html2canvas` to render the card. Zero server cost.
2. **Server-side OG image** — Use the existing `src/app/og/` directory pattern with `@vercel/og` for link previews.
3. **Both** — Canvas for instant sharing, OG for link previews.

---

## 6. AI Safety & Guardrails

### Rate limiting

| Layer | Limit | Mechanism |
|-------|-------|-----------|
| **Per IP** | 5 screenshots / 15 minutes | Vercel Edge middleware or `next-rate-limit` |
| **Per user (authenticated, future)** | 10 screenshots / day | Server-side check against user record |
| **Global** | 1,000 screenshots / hour | Circuit breaker at API route level |
| **Cost ceiling** | $50/day total API spend | Anthropic usage alerts + hard stop in code |

### Cost caps

```typescript
// Environment variable
const DAILY_COST_CEILING_CENTS = 5000; // $50/day

// Track in a simple KV store (Vercel KV or in-memory for PoC)
async function checkCostBudget(): Promise<boolean> {
  const todaySpend = await getCostTracker().getTodaySpend();
  return todaySpend < DAILY_COST_CEILING_CENTS;
}
```

At $0.003/screenshot and a $50/day ceiling, we can handle ~16,600 screenshots/day before the breaker trips. At 100 early adopters doing 3 screenshots each, we're at $0.90/day — 55x under budget.

### Circuit breakers

| Trigger | Action | Recovery |
|---------|--------|----------|
| Anthropic API returns 5xx 3 times in 60s | Stop sending requests for 5 minutes | Auto-retry after cooldown |
| Anthropic API returns 429 (rate limit) | Exponential backoff (1s, 2s, 4s, max 30s) | Auto-retry |
| Response doesn't match Zod schema | Return graceful error to user, log for investigation | Manual review |
| Daily cost ceiling hit | Return "We're experiencing high demand" | Auto-resets at midnight UTC |

### Content safety

- **Input validation**: Only accept `image/*` MIME types. Max 5MB. Reject everything else before it reaches Claude.
- **Output validation**: Zod schema enforces structure. If the model returns unexpected fields, they're stripped.
- **No PII storage**: The route never writes to disk, database, or logs. The Vercel function's memory is ephemeral.
- **Anthropic's built-in safety**: Claude will refuse to process harmful content. If a user uploads a non-screenshot image (e.g., something explicit), Claude's content policy handles it, and we return a generic error.

### Abuse scenarios

| Attack | Mitigation |
|--------|-----------|
| Uploading thousands of random images to burn our API budget | Rate limiting per IP + cost ceiling |
| Uploading extremely large images | 5MB file size limit + server-side resize before API call |
| Prompt injection via image (text in screenshot says "ignore instructions") | Claude Vision is robust against visual prompt injection; our system prompt uses tool_use for structured output which further constrains the output space |
| Scraping the API for free OCR | Rate limiting + no value in extracted data without Meldar's insight layer |

---

## 7. Future AI Pipeline (MVP+)

### Phase 2: Google Takeout Insights

```
[User's Browser]                                [Server]
     |                                              |
     |  1. User uploads Takeout ZIP                 |
     |  2. ZIP parsed CLIENT-SIDE (JSZip)           |
     |     - Chrome history → URL list              |
     |     - YouTube → watch history                |
     |     - Search → query list                    |
     |     - Calendar → event density               |
     |  3. Client computes aggregates:              |
     |     - Top 20 domains by visit count          |
     |     - Category distribution                  |
     |     - Time-of-day patterns                   |
     |     - Weekly trends                          |
     |  4. ONLY aggregates sent to server ─────────>|
     |     (no raw URLs, no search queries)          |  5. Single Sonnet call:
     |                                              |     "Generate Time X-Ray
     |                                              |      from aggregated data"
     |  <── Personalized Time X-Ray ────────────────|
```

**Key privacy decision**: Raw Takeout data never leaves the browser. Only pre-computed aggregates (category counts, time distributions) are sent to the server for AI insight generation. This means:
- No raw URLs logged
- No search history on our servers
- GDPR-compliant by architecture (we're not a data controller for this data)

**AI cost per Takeout analysis**: ~$0.01-0.02 (one Sonnet call on aggregated data, ~2K tokens input, ~500 tokens output)

### Phase 3: Chrome Extension Pattern Recognition

```
[Chrome Extension]                    [Server]                    [AI Pipeline]
     |                                    |                            |
     |  1. Passive tracking:              |                            |
     |     - URLs visited (hashed)        |                            |
     |     - Time per site                |                            |
     |     - Tab switches                 |                            |
     |     - Active vs idle time          |                            |
     |  2. Weekly batch upload ──────────>|                            |
     |     (aggregated, not raw)          |  3. Detect patterns: ─────>|
     |                                    |     - "User checks email   |
     |                                    |       47x/day"             |
     |                                    |     - "3hrs/day on news"   |
     |                                    |     - "Context switches    |
     |                                    |       every 4 minutes"     |
     |                                    |  4. Generate suggestions: <|
     |                                    |     - "Email triage bot?"  |
     |                                    |     - "News digest?"       |
     |  <── Push notification ────────────|                            |
     |     "We noticed a pattern..."      |                            |
```

**Model choice for pattern recognition**: Haiku for weekly batch analysis (~$0.005/user/week). Only escalate to Sonnet for generating the narrative report.

### Phase 4: Skill Automation (6 skills)

Each skill (meal planner, grade watcher, etc.) is a separate AI pipeline:

| Skill | AI Involvement | Model | Cost/invocation |
|-------|---------------|-------|-----------------|
| **Meal planner** | Recipe generation from fridge contents (text in, text out) | Haiku | ~$0.001 |
| **Grade watcher** | No AI needed — pure scraping + notifications | None | $0 |
| **Price watcher** | No AI needed — price scraping + threshold alerts | None | $0 |
| **Email triage** | Email classification + draft generation | Sonnet | ~$0.01 |
| **Expense sorter** | Receipt OCR + categorization | Haiku Vision | ~$0.003 |
| **Social poster** | Content adaptation across platforms | Haiku | ~$0.002 |

**Key insight**: 3 of 6 skills need zero AI. They're pure automation (scraping + notifications). This keeps costs dramatically lower than a "everything goes through LLM" architecture.

---

## 8. Model Selection

### Recommendation: Haiku 4.5 for extraction, Sonnet 4.6 for generation

| Task | Recommended Model | Reasoning |
|------|------------------|-----------|
| **Screenshot OCR/extraction** | **Haiku 4.5** | Structured data extraction from clear UI screenshots. Haiku is more than capable. Sonnet is overkill. |
| **Time X-Ray narrative** | **Sonnet 4.6** (MVP only) | Personalized narrative requires better reasoning. Worth the 4x cost for the user-facing output. |
| **Takeout insight generation** | **Sonnet 4.6** | Complex multi-source data synthesis. Haiku would produce generic insights. |
| **Pattern recognition (extension)** | **Haiku 4.5** | Batch classification task. High volume, low complexity. |
| **Skill automations** | **Haiku 4.5** | Simple text generation/classification. |

### Why NOT Opus

Opus 4.6 costs 5x Sonnet and 19x Haiku. For our tasks:
- Screenshot extraction: Haiku handles it. Opus is 19x the cost for zero quality improvement on structured extraction.
- Insight generation: Sonnet is sufficient. Opus's extra reasoning capability is wasted on "generate a punchy insight from this data."
- We're not building a research assistant or code generator. We're doing OCR + templates. Use the smallest model that works.

### A/B testing strategy

**Phase 1 (PoC)**: Use Haiku only. No A/B testing. Validate that extraction accuracy is >95% on 50 real screenshots before investing in model comparison.

**Phase 2 (MVP)**: A/B test Haiku vs Sonnet for screenshot extraction:
- Metric: extraction accuracy (% of apps correctly identified with correct time)
- Test: 100 screenshots, human-labeled ground truth
- If Haiku accuracy > 90%: stay on Haiku
- If Haiku accuracy < 90% but Sonnet > 95%: use Sonnet only for low-confidence Haiku results (cascading strategy)

**Cascading model strategy** (cost-optimal):
```
1. Send screenshot to Haiku ($0.003)
2. If confidence == "high" → return result
3. If confidence == "medium" or "low" → re-send to Sonnet ($0.010)
4. Expected: 80% Haiku-only, 20% cascade
5. Blended cost: 0.8 * $0.003 + 0.2 * $0.013 = $0.005/screenshot
```

This keeps costs near Haiku levels while ensuring quality on difficult screenshots.

---

## 9. PoC vs MVP Boundary

### PoC scope (what we build NOW)

| Feature | AI? | Model | Status |
|---------|-----|-------|--------|
| **Pick Your Pain quiz** | No | N/A | Built (exists in `src/features/quiz/`) |
| **Screen Time screenshot upload** | No | N/A | Built (exists in `src/features/quiz/ui/ScreenTimeUpload.tsx`) |
| **Screenshot analysis API** | **Yes** | Haiku 4.5 | Mock exists (`src/app/api/analyze-screenshot/route.ts`), needs real integration |
| **Time X-Ray card (rule-based)** | No | N/A | New feature. Rules, not LLM. |
| **Rate limiting** | No | N/A | New. Simple IP-based. |
| **Cost ceiling** | No | N/A | New. Daily spend cap. |
| **Image preprocessing** | No | N/A | New. Resize/compress before API call. |

**PoC AI cost: ~$0.003/user. Total for 100 early adopters: < $1.00.**

### MVP scope (what comes next)

| Feature | AI? | Model | Depends on |
|---------|-----|-------|------------|
| **Time X-Ray narrative (LLM-generated)** | Yes | Sonnet 4.6 | User authentication, data persistence |
| **Google Takeout client-side parser** | No | N/A | JSZip integration, file format research |
| **Takeout insight generation** | Yes | Sonnet 4.6 | Takeout parser |
| **Shareable Time X-Ray card** | No | N/A | OG image generation (`@vercel/og`) |
| **Model cascading (Haiku -> Sonnet)** | Yes | Both | A/B test infrastructure |
| **User accounts + data history** | No | N/A | Auth system (likely Clerk) |

### NOT in MVP (future)

- Chrome extension
- Any of the 6 skill automations
- Real-time pattern recognition
- Multi-screenshot trend analysis
- Opus usage for anything

---

## 10. Implementation Checklist for PoC

### Dependencies to add

```bash
pnpm add @anthropic-ai/sdk   # Claude API client
pnpm add sharp                # Image resize/compress (server-side)
pnpm add zod                  # Already in project — validate API responses
```

### Environment variables to add

```
ANTHROPIC_API_KEY=sk-ant-xxx...   # Server-side only
```

### Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/analyze-screenshot/route.ts` | **Modify** | Replace mock with real Claude Vision call |
| `src/shared/lib/anthropic.ts` | **Create** | Anthropic client singleton |
| `src/shared/lib/image-processing.ts` | **Create** | Resize/compress utilities using sharp |
| `src/shared/types/screen-time.ts` | **Create** | Zod schemas for ScreenTimeAnalysis |
| `src/features/time-x-ray/lib/generate-insights.ts` | **Create** | Rule-based insight generation |
| `src/features/time-x-ray/ui/TimeXRayCard.tsx` | **Create** | Shareable card UI |
| `src/features/time-x-ray/index.ts` | **Create** | Barrel export |
| `.env.local` | **Modify** | Add ANTHROPIC_API_KEY |

### Estimated implementation time

| Task | Estimate |
|------|----------|
| Anthropic client setup + env vars | 30 min |
| Image preprocessing with sharp | 1 hour |
| Zod schemas + types | 30 min |
| Replace mock API route with real Claude Vision | 2 hours |
| Rule-based insight generation | 1 hour |
| Time X-Ray card UI | 2-3 hours |
| Rate limiting middleware | 1 hour |
| Testing with real screenshots | 2 hours |
| **Total** | **~1-2 days** |

---

## 11. Open Questions for Other Clusters

### For Architecture cluster
1. Should `sharp` run in Vercel Serverless or Edge? (Sharp requires Node.js runtime, not Edge.)
2. Rate limiting: Vercel KV vs in-memory vs Upstash Redis?
3. Do we need a separate `/api/time-x-ray` route or fold insight generation into the screenshot route?

### For Frontend cluster
1. Time X-Ray card: Canvas rendering vs HTML/CSS with `html2canvas`?
2. Should the card be a separate page (`/time-x-ray/[id]`) for sharing, or client-only?
3. How does the ScreenTimeUpload component handle the richer response (currently just shows basic list)?

### For DevOps cluster
1. Anthropic API key management: Vercel environment variables? Secrets manager?
2. Monitoring: How do we track API costs in real-time? Anthropic dashboard + our own logging?
3. Should we set up a staging environment with a separate (lower-limit) API key?

### For Business cluster
1. Free tier limit: 1 screenshot/month or 3? What's the conversion-optimized number?
2. Should the Time X-Ray card be gated behind signup, or fully free to maximize virality?
3. Privacy policy needs updating to mention Anthropic as a data sub-processor for screenshot analysis.

---

## Key Opinions (from the AI cluster)

1. **Haiku is the right starting model.** Screenshot OCR is a solved problem for modern vision models. Using Sonnet or Opus for this is burning money for no quality gain. We'll prove it with 50 real screenshots before anyone argues for a bigger model.

2. **Rule-based insights first, LLM insights later.** The PoC doesn't need Claude to write "You spend too much time on Instagram." A template does that. LLM-generated narratives are an MVP luxury after we have multi-source data.

3. **The cost is a non-issue.** At $0.003/screenshot, a user would need to upload 333 screenshots to cost us $1. The AI cost is rounding error compared to Vercel hosting, Resend emails, and our time. Don't let "AI cost anxiety" slow down the build.

4. **Privacy-by-architecture, not privacy-by-policy.** We don't store images because the code physically cannot store them (serverless function, no filesystem, no database write). This is stronger than a privacy policy that says "we promise not to look."

5. **Don't build a model router yet.** No Haiku->Sonnet cascading in PoC. Ship with Haiku. If accuracy is bad, switch entirely to Sonnet ($0.01/screenshot — still almost free). The cascading architecture is premature optimization at 100 users.

6. **The real AI challenge is the Chrome extension, not screenshots.** Screenshot analysis is one API call. The extension generates continuous behavioral data that needs pattern recognition, anomaly detection, and personalized recommendations. That's where we'll need real ML infrastructure. Don't build it yet, but design the screenshot pipeline so it's extensible.
