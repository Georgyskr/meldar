# Rapid Prototyper: Phase 1 Feature Plans

Each feature targets a 4-hour MVP. The goal is the fastest shippable version that proves value, reusing existing components and patterns from the codebase wherever possible.

---

## A. ChatGPT Export Analyzer

### 4-Hour MVP

Parse a `conversations.json` file from ChatGPT data export. Extract conversation titles and timestamps. Show a DiscoveryCard with: total conversations, conversations per week, top topics (keyword clustering), peak usage times. No AI needed -- pure JSON parsing.

### Implementation Plan

**New files:**
- `src/app/api/upload/chatgpt/route.ts` -- API route, accepts JSON file
- `src/server/discovery/chatgpt-parser.ts` -- parsing + pattern extraction logic
- `src/app/chatgpt-xray/page.tsx` -- server component page with metadata
- `src/app/chatgpt-xray/chatgpt-client.tsx` -- client component with upload + results
- `src/features/chatgpt-upload/index.ts` -- barrel export
- `src/features/chatgpt-upload/ui/ChatGPTUploadZone.tsx` -- file upload (fork of UploadZone, accepts .json)

**Modified files:**
- `src/app/sitemap.ts` -- add `/chatgpt-xray`
- `src/server/db/schema.ts` -- add `chatgptResults` table (optional, can skip for MVP and keep results client-side only)

**Approach:**
1. User uploads `conversations.json` (from ChatGPT Settings > Data Controls > Export).
2. File is sent to API route. Server parses JSON, extracts: conversation count, date range, conversations per week, title word frequency (for topic detection), time-of-day distribution.
3. All parsing is rule-based (zero AI cost). Use simple keyword frequency on conversation titles to detect top topics.
4. Return structured result. Client renders using `DiscoveryCard`.

### API Route

```
POST /api/upload/chatgpt
Content-Type: multipart/form-data
Body: { export: File (.json) }

Response 200:
{
  totalConversations: number,
  dateRange: { first: string, last: string },
  conversationsPerWeek: number,
  peakHour: number,          // 0-23
  peakDay: string,           // "Monday"
  topTopics: { topic: string, count: number }[],  // top 10
  monthlyTrend: { month: string, count: number }[],
  avgConversationsPerDay: number,
  longestStreak: number,     // consecutive days with conversations
  insights: Insight[]        // reuse existing Insight type
}

Response 400: { error: { code: "VALIDATION_ERROR", message: string } }
Response 422: { error: { code: "UNPROCESSABLE", message: string } }
```

**Validation:** Max 50MB file size. Must be valid JSON. Must contain `conversations` or be an array of objects with `title` and `create_time` fields. Rate limited same as screentime.

### The Prompt

No AI prompt needed for MVP. This is pure JSON parsing:

```typescript
// conversations.json structure (ChatGPT export format):
// Array of objects, each with:
// - title: string
// - create_time: number (Unix timestamp)
// - update_time: number (Unix timestamp)
// - mapping: object (conversation tree -- ignore for MVP)

// Topic extraction: split titles into words, lowercase, remove stopwords,
// count frequency. Group by stems if needed (simple startsWith matching).
```

**Future enhancement (post-MVP):** Send the top 50 conversation titles to Claude for richer topic clustering and a personalized "AI usage personality" summary. Prompt would be:

```
You analyze someone's ChatGPT conversation history. Given these conversation titles and timestamps, identify:
1. Their top 3-5 usage patterns (e.g., "coding help", "writing assistance", "research")
2. A one-line personality summary of how they use AI
3. One surprising pattern they might not notice
4. What Meldar automation would help them most

Conversation titles (most recent first):
{titles with dates}

Respond using the analyze_chatgpt tool.
```

### What to Reuse

| Component | From | How |
|---|---|---|
| `DiscoveryCard` | `src/entities/discovery-card/ui/DiscoveryCard.tsx` | Render results card with topic stats |
| `UploadZone` | `src/features/screenshot-upload/ui/UploadZone.tsx` | Fork for .json files, change copy/icons |
| `XRayCardReveal` / `RevealStagger` | `src/entities/xray-result/ui/XRayCardReveal.tsx` | Staggered reveal animation for results |
| `XRayCardActions` | `src/entities/xray-result/ui/XRayCardActions.tsx` | Share/copy link for results |
| `ResultEmailCapture` | `src/features/screenshot-upload/ui/ResultEmailCapture.tsx` | Email capture below results |
| `checkRateLimit` | `src/server/lib/rate-limit.ts` | Rate limit the API route |
| `Insight` type | `src/entities/xray-result/model/types.ts` | Reuse for generated insights |
| Page structure | `src/app/xray/page.tsx` + `xray-client.tsx` | Same RSC page + client component pattern |

### Questions for QA

1. Does the ChatGPT export format include `conversations` as a top-level key, or is the JSON file a flat array? Are there multiple export format versions we need to handle?
2. Should we validate file size client-side before upload to avoid sending 50MB+ files to the server?
3. What happens if a user uploads a partial export (e.g., only recent conversations)? Should we warn them or just analyze what we have?
4. Should results be persisted to DB for shareable URLs (like X-Ray), or is client-only sufficient for MVP?
5. Is the upload processed server-side (sending the full JSON to our API) or should we parse client-side and only send extracted stats? Client-side would mean zero server cost and better privacy, but larger bundle.

---

## B. Subscription Autopsy

### 4-Hour MVP

User uploads a screenshot of their App Store / Google Play subscriptions page. Claude Vision extracts subscription names, prices, and billing cycles. Show a DiscoveryCard with total monthly cost, subscription count, and a ranked list by price. Rule-based insights suggest which to cut.

### Implementation Plan

**New files:**
- `src/app/api/upload/subscriptions/route.ts` -- API route, accepts image
- `src/server/discovery/subscription-ocr.ts` -- Claude Vision extraction
- `src/server/discovery/subscription-prompts.ts` -- system prompt for Vision
- `src/server/discovery/subscription-insights.ts` -- rule-based insights
- `src/app/subscription-autopsy/page.tsx` -- server component page
- `src/app/subscription-autopsy/subscription-client.tsx` -- client component

**Modified files:**
- `src/app/sitemap.ts` -- add `/subscription-autopsy`
- `src/entities/xray-result/model/types.ts` -- add `SubscriptionExtraction` type + Zod schema

**Approach:**
1. Reuse the exact same upload flow as Screen Time X-Ray: `UploadZone` (with copy tweaked), client-side compression, send to API.
2. API route validates image, sends to Claude Vision with subscription-specific prompt.
3. Vision extracts structured data via tool use (same pattern as `ocr.ts`).
4. Rule-based insights calculate: total monthly cost, annual projection, "forgotten" subscriptions (ones users commonly forget), cost-per-hour comparisons.
5. Render using `DiscoveryCard` with subscription data.

### API Route

```
POST /api/upload/subscriptions
Content-Type: multipart/form-data
Body: { screenshot: File (JPEG/PNG/WebP) }

Response 200:
{
  id: string,
  extraction: {
    subscriptions: {
      name: string,
      price: number,           // normalized to monthly in EUR/USD
      currency: string,
      billingCycle: "monthly" | "yearly" | "weekly",
      rawPrice: string,        // as shown on screen, e.g., "EUR 9.99/mo"
      category: "streaming" | "music" | "cloud" | "productivity" | "fitness" | "news" | "gaming" | "social" | "other"
    }[],
    totalMonthly: number,
    currency: string,
    platform: "ios" | "android" | "unknown",
    confidence: "high" | "medium" | "low"
  },
  insights: Insight[],
  upsells: UpsellHook[]
}

Response 400/422/429/500: same error format as screentime
```

### The Prompt

```typescript
export const SUBSCRIPTION_SYSTEM_PROMPT = `You are a subscription data extractor. You analyze screenshots of App Store Subscriptions, Google Play subscriptions, or bank statement subscription lists.

RULES:
- Extract EVERY visible subscription with its name, price, and billing cycle
- Subscription names must be EXACTLY as displayed on screen
- Normalize all prices to monthly amounts (yearly / 12, weekly * 4.33)
- Keep the original raw price string too (e.g., "EUR 9.99/yr")
- Detect currency from price symbols or text
- Categorize each: streaming, music, cloud, productivity, fitness, news, gaming, social, other
- Detect platform: "ios" if App Store UI, "android" if Google Play UI, "unknown" otherwise
- Set confidence: "high" if prices are clearly readable, "medium" if some are hard to read, "low" if mostly guessing
- If free trials are shown, include them with price 0 and note "(free trial)" in name
- If the image is NOT a subscriptions screenshot, return error "not_subscriptions"
- If the image is too blurry to read, return error "unreadable"
- NEVER hallucinate subscription names or prices -- only extract what you can actually read`
```

### Subscription Insights (rule-based)

```typescript
// Rule-based insights for subscription-insights.ts:
// 1. Total annual cost projection: monthly * 12, compare to average ($273/yr per C+R Research)
// 2. "Streaming stack" detector: if 3+ streaming services, note overlap
// 3. "Forgotten subscription" flag: subscriptions in categories user likely doesn't use daily
// 4. Price-per-hour estimate: "Netflix at EUR 15/mo = EUR 0.50/hr if you watch 30hrs/mo"
// 5. "Switch and save" suggestions: cheaper alternatives (rule-based mapping)
// 6. Duplicate category warning: e.g., 2 music services, 2 cloud storage services
```

### What to Reuse

| Component | From | How |
|---|---|---|
| `UploadZone` | `src/features/screenshot-upload/ui/UploadZone.tsx` | Same component, just change copy to "Drop your subscriptions screenshot" |
| `compressImage` | Inside `UploadZone.tsx` | Same client-side compression |
| `DiscoveryCard` | `src/entities/discovery-card/ui/DiscoveryCard.tsx` | Render results with monthly total as bigStat |
| `extractScreenTime` pattern | `src/server/discovery/ocr.ts` | Fork for subscriptions: same Anthropic SDK call, different prompt + tool schema |
| `generateInsights` pattern | `src/server/discovery/insights.ts` | Fork for subscription-specific rules |
| `generateUpsells` pattern | `src/server/discovery/upsells.ts` | Fork: high subscription cost -> Time Audit |
| `XRayCardReveal` / `RevealStagger` | `src/entities/xray-result/ui/XRayCardReveal.tsx` | Same animation wrappers |
| `checkRateLimit` | `src/server/lib/rate-limit.ts` | Same rate limiting |
| `ContextChip` pattern | `src/features/screenshot-upload/ui/ContextChip.tsx` | Could reuse for "What platform?" pre-selection |

### Questions for QA

1. App Store subscriptions page shows both active and expired subscriptions. Should we extract both, or only active? Does the Vision model reliably distinguish them?
2. Currency normalization: if a user has subscriptions in mixed currencies (e.g., USD and EUR), should we convert or just flag it?
3. Should we persist subscription results to DB for shareable URLs? Privacy concern: subscription data is more sensitive than screen time.
4. The App Store subscriptions page sometimes requires scrolling to see all subscriptions. Should we accept multiple screenshots and merge results?
5. How do we handle family plan pricing vs. individual pricing? Vision might extract the family price but the user only pays a portion.

---

## C. Actionable Screen Time (Enhancement to existing X-Ray)

### 4-Hour MVP

After the existing X-Ray card renders, add a new "Fix Steps" section below each insight. For each high-usage app, show 2-3 specific, immediately actionable steps the user can take right now (e.g., "Turn off TikTok notifications: Settings > TikTok > Notifications > Off"). Rule-based, zero AI cost.

### Implementation Plan

**New files:**
- `src/server/discovery/fix-steps.ts` -- rule-based fix step generator
- `src/entities/xray-result/ui/FixStepCard.tsx` -- UI component for a single fix step

**Modified files:**
- `src/entities/xray-result/model/types.ts` -- add `FixStep` type
- `src/app/api/upload/screentime/route.ts` -- add `fixSteps` to response
- `src/app/xray/xray-client.tsx` -- render fix steps in results phase
- `src/entities/xray-result/index.ts` -- export `FixStepCard`

**Approach:**
1. Create a lookup table mapping app names + categories to specific fix steps.
2. Each fix step has: `title` (what to do), `instruction` (exact steps), `timeToComplete` (e.g., "30 sec"), `impact` ("high"/"medium"/"low"), `platform` ("ios"/"android"/"both").
3. After extraction, run `generateFixSteps(extraction)` alongside existing `generateInsights`.
4. Render fix steps as expandable cards below insights on the X-Ray results page.

### API Route

No new endpoint. Modify existing `POST /api/upload/screentime` response:

```
Response 200 (modified):
{
  id: string,
  extraction: ScreenTimeExtraction,
  insights: Insight[],
  fixSteps: FixStep[],        // NEW
  upsells: UpsellHook[],
  painPoints: string[]
}
```

```typescript
type FixStep = {
  appName: string,           // which app this targets
  title: string,             // "Kill TikTok notifications"
  instruction: string,       // "Settings > Notifications > TikTok > toggle off"
  timeToComplete: string,    // "30 sec"
  impact: "high" | "medium" | "low",
  platform: "ios" | "android" | "both",
  category: "notification" | "time-limit" | "replacement" | "habit"
}
```

### The Prompt

No AI prompt needed. This is a rule-based lookup:

```typescript
// fix-steps.ts: mapping of app/category to fix steps
const FIX_STEPS_DB: Record<string, FixStep[]> = {
  // Social apps
  'instagram': [
    {
      appName: 'Instagram',
      title: 'Set a daily time limit',
      instruction: 'Open Instagram > Your Profile > Menu (three lines) > Your Activity > Time > Set Daily Reminder > 30 minutes',
      timeToComplete: '30 sec',
      impact: 'high',
      platform: 'both',
      category: 'time-limit'
    },
    {
      appName: 'Instagram',
      title: 'Turn off all non-essential notifications',
      instruction: 'Phone Settings > Instagram > Notifications > turn off everything except Direct Messages',
      timeToComplete: '30 sec',
      impact: 'medium',
      platform: 'both',
      category: 'notification'
    },
    {
      appName: 'Instagram',
      title: 'Move Instagram off your home screen',
      instruction: 'Long-press the Instagram icon > move it to a folder on your second screen or App Library',
      timeToComplete: '10 sec',
      impact: 'high',
      platform: 'both',
      category: 'habit'
    },
  ],
  'tiktok': [/* similar */],
  'youtube': [/* similar */],
  // ... etc for top 20 apps
}

// Category-level fallback for apps not in the DB
const CATEGORY_FIX_STEPS: Record<AppCategory, FixStep[]> = {
  'social': [
    { title: 'Set a Screen Time limit', instruction: 'Settings > Screen Time > App Limits > Social > 1 hour', ... },
  ],
  'entertainment': [/* ... */],
  // ...
}
```

**Future enhancement (post-MVP):** Use Claude to generate personalized fix steps based on the user's specific usage pattern, life stage, and goals.

### What to Reuse

| Component | From | How |
|---|---|---|
| `RevealStagger` | `src/entities/xray-result/ui/XRayCardReveal.tsx` | Staggered reveal for fix step cards |
| `generateInsights` pattern | `src/server/discovery/insights.ts` | Same pattern: takes extraction, returns typed array |
| `Insight` type pattern | `src/entities/xray-result/model/types.ts` | Model the new `FixStep` type similarly |
| `mapToPainPoints` pattern | `src/server/discovery/suggestions.ts` | Same app-name-to-suggestion mapping approach |
| Existing X-Ray client | `src/app/xray/xray-client.tsx` | Add new RevealStagger block for fix steps |

### Questions for QA

1. Should fix steps be platform-aware (iOS vs Android instructions differ)? The extraction already includes `platform` -- should we filter fix steps by detected platform?
2. How many fix steps per app is ideal? Too many feels overwhelming, too few feels useless. Is 2-3 per app right?
3. Should fix steps be collapsible/expandable, or always visible? If a user has 5+ high-usage apps, the results page could get very long.
4. Should we track which fix steps users interact with (click/expand) to learn what resonates?
5. The existing `UploadZone` posts to `/api/upload/screentime`. If we add `fixSteps` to the response, does the client TypeScript type (`XRayResponse`) need updating, and will that break the existing X-Ray share page (`/xray/[id]`)?

---

## D. ADHD Mode

### 4-Hour MVP

A toggle in the header that activates "ADHD Mode" across the site. When active: paragraphs become shorter/bolder, focus-encouraging GIFs appear between sections, the AI prompts get additional ADHD-aware context (shorter responses, more structure, encouragement), and CTA copy changes to be more immediate/dopamine-friendly.

### Implementation Plan

**New files:**
- `src/features/adhd-mode/index.ts` -- barrel export
- `src/features/adhd-mode/ui/ADHDToggle.tsx` -- toggle button component
- `src/features/adhd-mode/lib/useADHDMode.ts` -- hook: reads/writes localStorage, provides context
- `src/features/adhd-mode/lib/adhd-copy.ts` -- alternative copy variants for ADHD mode
- `src/features/adhd-mode/lib/adhd-gifs.ts` -- GIF configuration (URLs + placement)

**Modified files:**
- `src/widgets/header/ui/Header.tsx` -- add ADHDToggle to header nav
- `src/app/xray/xray-client.tsx` -- wrap insights/results with ADHD-aware copy variants
- `src/server/discovery/prompts.ts` -- add ADHD mode prompt modifier (passed via request header/body flag)
- `src/app/api/upload/screentime/route.ts` -- accept `adhdMode` flag, modify prompt
- `src/app/layout.tsx` -- add ADHDModeProvider context

### Where Do GIFs Come From?

**MVP approach: Giphy API (free tier).**

```typescript
// src/features/adhd-mode/lib/adhd-gifs.ts

// Option 1 (MVP): Curated static GIF URLs from Giphy
// Hand-picked focus/celebration GIFs. No API call needed.
// Benefits: Zero latency, no API key, no cost, predictable content
const FOCUS_GIFS = [
  'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/giphy.gif',  // "you got this"
  'https://media.giphy.com/media/3oKIPf3C7HqqYBVcCk/giphy.gif',  // celebration
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',  // focus
  // ... 10-15 curated GIFs per category
]

// Categories of GIFs:
// - focus: shown during upload/analysis wait states
// - celebration: shown when results are good or user completes a fix step
// - motivation: shown between insight cards
// - progress: shown during step-by-step guides

// Option 2 (post-MVP): Giphy API search
// const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY
// Fetch on-demand with search terms like "focus", "you can do it", "celebration"
// Free tier: 42M requests/month, more than enough

// Option 3 (not recommended for MVP): CSS animations
// Custom Lottie or CSS-only animations. Higher quality but much more dev time.
// Consider for v2 if brand consistency matters.
```

**Recommendation:** Use curated static Giphy URLs for MVP. Zero API calls, zero cost, zero latency. Swap to Giphy API or custom Lottie animations later if the feature proves valuable.

### How Does the Toggle Persist?

```typescript
// src/features/adhd-mode/lib/useADHDMode.ts
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'meldar-adhd-mode'

type ADHDModeContextValue = {
  enabled: boolean
  toggle: () => void
}

export const ADHDModeContext = createContext<ADHDModeContextValue>({
  enabled: false,
  toggle: () => {},
})

export function useADHDMode() {
  return useContext(ADHDModeContext)
}

// Provider reads from localStorage on mount, writes on change.
// Same pattern as existing cookie consent (useConsentState).
// localStorage key: 'meldar-adhd-mode' -> 'true' | 'false'
// Default: off (false)
// Persists across sessions. No cookies, no server state.
```

### What Changes in the AI Prompt?

When `adhdMode: true` is sent with the screen time upload request, the system prompt gets an additional modifier:

```typescript
export const ADHD_PROMPT_MODIFIER = `
IMPORTANT: The user has ADHD mode enabled. Adjust your analysis accordingly:
- Keep all text VERY short. Max 1 sentence per point.
- Use bullet points, not paragraphs.
- Lead with the MOST important number first.
- Add encouraging micro-affirmations ("Nice.", "That's fixable.", "Quick win:").
- Frame everything as immediate, doable actions, not long-term goals.
- Avoid overwhelming lists. Max 3 items at a time.
- Use concrete time estimates ("This takes 30 seconds").
`

// Applied in ocr.ts when adhdMode flag is true:
// system: adhdMode
//   ? `${SCREEN_TIME_SYSTEM_PROMPT}\n\n${ADHD_PROMPT_MODIFIER}`
//   : SCREEN_TIME_SYSTEM_PROMPT
```

### ADHD Mode Copy Changes

```typescript
// src/features/adhd-mode/lib/adhd-copy.ts
// Alternative copy for key UI strings when ADHD mode is active

export const ADHD_COPY = {
  // Upload zone
  uploadTitle: 'Screenshot. Drop. Done.',
  uploadSubtitle: 'Takes literally 10 seconds.',

  // Results
  resultsTitle: 'Here\'s what we found. No judgment.',
  insightPrefix: 'Quick insight:',

  // Fix steps
  fixStepCta: 'Do this right now (30 sec)',

  // CTAs
  primaryCta: 'Let\'s go',
  secondaryCta: 'Maybe later (no pressure)',

  // Encouragement (shown randomly)
  encouragements: [
    'You\'re already ahead by looking at this.',
    'Small steps. This is a small step.',
    'No one\'s grading you on this.',
    'The fact that you\'re here? That\'s the hard part done.',
  ],
} as const
```

### ADHD Mode UI Changes Summary

| Where | Default | ADHD Mode |
|---|---|---|
| Header | Normal nav | + brain icon toggle, pulsing when active |
| Upload zone copy | "Drop your Screen Time screenshot" | "Screenshot. Drop. Done." |
| Wait states | Step progress list | Step progress + focus GIF |
| Results headline | "Your Time X-Ray" | "Here's what we found. No judgment." |
| Insights | Full paragraph insights | Bullet-point insights, max 3 |
| Fix steps | Normal fix step cards | Fix steps with "Do this NOW" emphasis + celebration GIF on expand |
| CTA buttons | "Get your real Time X-Ray" | "Let's go" |
| Between sections | Nothing | Motivational GIF + one-liner |
| AI prompt | Standard prompt | + ADHD modifier (shorter, more structured, encouraging) |

### API Route

No new endpoint. Modify existing `POST /api/upload/screentime`:

```
POST /api/upload/screentime
Content-Type: multipart/form-data
Body: { screenshot: File, adhdMode?: "true" }   // add optional flag

// Server reads: formData.get('adhdMode') === 'true'
// Modifies system prompt sent to Claude Vision
```

### What to Reuse

| Component | From | How |
|---|---|---|
| `useConsentState` pattern | `src/features/cookie-consent/` | Same localStorage persistence pattern for toggle |
| `Header` | `src/widgets/header/ui/Header.tsx` | Add toggle button to nav |
| Context provider pattern | `src/app/layout.tsx` | Wrap app in `ADHDModeProvider` (same level as CookieConsent) |
| `UploadZone` | `src/features/screenshot-upload/ui/UploadZone.tsx` | Conditionally swap copy strings based on `useADHDMode()` |
| `XRayCard` | `src/entities/xray-result/ui/XRayCard.tsx` | Could add ADHD-variant styling (bolder, shorter text) |
| `RevealStagger` | `src/entities/xray-result/ui/XRayCardReveal.tsx` | Use for GIF reveal animations |
| All page client components | Various | Read `useADHDMode()` hook and conditionally apply copy/GIF changes |

### Questions for QA

1. Should ADHD mode be visible to all users in the header, or hidden behind a "More options" menu? Making it prominent could be seen as inclusive, or it could feel patronizing. What does research say?
2. Giphy's free tier embeds include a "Powered by Giphy" watermark. Is that acceptable for the brand, or should we use the API to get clean URLs (still free but needs an API key)?
3. When ADHD mode is on and the user navigates to the shareable X-Ray page (`/xray/[id]`), should the shared view also show ADHD styling? Or should shared views always be "default"?
4. The ADHD prompt modifier makes Claude's extraction output shorter, but the extraction itself is structured data via tool use. Should the modifier only affect the insight generation, not the OCR extraction?
5. localStorage won't sync across devices. Should we consider a cookie instead so server components can also read the preference (for SSR-aware styling)? Or is client-only fine for MVP?

---

## Cross-Feature Notes

### Shared Patterns

All four features follow the same architecture:
1. **Upload/input** -- reuse or fork `UploadZone`
2. **API route** -- same validation/rate-limit/error patterns as `POST /api/upload/screentime`
3. **Server processing** -- Claude Vision (B) or JSON parsing (A) or rule-based (C, D)
4. **Results rendering** -- `DiscoveryCard` + `RevealStagger` + `XRayCardActions`
5. **Upsell** -- `UpsellBlock` with contextual hooks

### Priority Order (if time-constrained)

1. **C (Actionable Screen Time)** -- lowest effort, highest value. Enhances existing proven feature. No new pages, no new API routes. ~2 hours.
2. **D (ADHD Mode)** -- differentiator, emotionally resonant with target audience. ~3-4 hours for MVP.
3. **B (Subscription Autopsy)** -- proven concept (similar to Screen Time), reuses most code. ~3-4 hours.
4. **A (ChatGPT Export Analyzer)** -- novel, but depends on ChatGPT export format stability. ~3-4 hours.

### Environment Variables Needed

- **A:** None (pure parsing)
- **B:** None (reuses existing `ANTHROPIC_API_KEY` via SDK)
- **C:** None (rule-based)
- **D:** Optional `NEXT_PUBLIC_GIPHY_API_KEY` if switching from curated to API-based GIFs

---

## Codebase Audit — "Ship in 4 Hours" Lens

*Added 2026-03-31 after direct codebase read. This section audits the current state of the funnel, identifies dead code, and prioritizes the minimum work to get 10 real users through to payment.*

### Current State

The 4-phases → 2-phases redesign (`scan` → `result`) in `xray-client.tsx` was the right call. The flow is structurally complete:

```
/ (landing) → /quiz → /xray (upload + inline result) → /xray/[id] (shareable)
```

Billing is wired: Stripe Checkout (`/api/billing/checkout`) + webhook (`/api/billing/webhook`) + thank-you page exist and work. The upsell block is connected in the result phase. The funnel is closer to launchable than the backlog implies.

---

### What to Ship First (Prioritized by Impact per Hour)

#### 1. Create `/xray/[id]/og` route — 60 min, HIGHEST IMPACT

The shareable card at `/xray/[id]` references `/xray/[id]/og` in its OpenGraph metadata (both `page.tsx` and `generateMetadata`). **That route does not exist.** Every share produces a broken preview image.

The viral loop — upload → share → friend clicks → "Get your own" — only activates when the shared link has a compelling card. Without this, every share is dead traffic.

**Implementation:** `src/app/xray/[id]/og/route.tsx` using Next.js `ImageResponse`. Pull `totalHours`, `topApp`, `pickups` from DB (same query already in `page.tsx`). Brand card: deep mauve gradient, Bricolage Grotesque headline, "Time X-Ray by Meldar" footer.

#### 2. Fix CTA links in TiersSection and mid-page — 15 min, REVENUE-BLOCKING

The plan doc (`03-frontend-ux-final.md §3`) already identified this: landing page CTAs still point to `#early-access` instead of `/xray`. Users who scroll to the Tiers section with purchase intent hit a broken CTA that scrolls them back to the hero email form. This is revenue-blocking.

**Files to change:** `src/widgets/landing/TiersSection.tsx`, any `href="#early-access"` in widget files.

#### 3. Pass quiz selections into the /xray URL — 45 min

`PainQuiz` results send users to `/xray` with no context. The `LifeStage` chip on `/xray` is generic; it doesn't know what the user named in the quiz. The result feels like a cold restart rather than a continuation.

**Fix:** When navigating from quiz results, append selected pain IDs to the URL: `/xray?pains=meal_planning,email`. In `XRayPageClient`, read `useSearchParams()` and pre-select the closest matching `LifeStage` or surface a quiz-aware contextual headline. Entirely client-side, no DB needed.

#### 4. Add a Twitter/X share intent to `XRayCardActions` — 30 min

The share button exists but likely only copies the link. A pre-filled tweet — "I spend X hrs/day on [app]. Got my Time X-Ray free in 30 seconds → [link]" — doubles organic share rate. One `window.open` call.

#### 5. Add exit CTAs to `/discover/overthink` and `/discover/sleep` — 20 min

Both quiz pages exist and work but dump the user into a dead end after completion. Add a "Now get your real numbers — 30 seconds" button pointing to `/xray` at the end of each quiz result.

---

### Dead Code — Delete Now

**`src/features/screenshot-upload/ui/ScreenshotGuide.tsx`** is completely orphaned.

Evidence:
- Not exported from `src/features/screenshot-upload/index.ts` (barrel only exports `ContextChip`, `ResultEmailCapture`, `UploadZone`)
- No file imports it anywhere in the codebase
- Its instructions were folded into `UploadZone.tsx` as an inline collapsible toggle (lines 299-413)

It is the old standalone guide component, superseded by the redesign. 220 lines of dead code. Delete it.

---

### Auth System — Defer, Do Not Touch

`src/app/api/auth/` contains 6 routes: register, login, forgot-password, reset-password, verify-email, me. `src/server/identity/` has JWT signing and password hashing. There are integration tests for all routes.

**Nothing in the current UI consumes any of this.** There is no `/login` page, no dashboard, no session check, no `useAuth` hook, no middleware. The auth system is pre-built for Phase 3, which the plan explicitly defers until after `/dashboard` is on the roadmap.

The plan is explicit: "Identity = Stripe customer email + signed delivery tokens" for Phase 2. The billing system already captures email correctly via Stripe's `customer_email`. No auth is needed until `/dashboard` is built.

**Verdict:** Correct, tested code — but frozen. No new UI should reference it until Phase 3. Do not delete; do not extend.

---

### Components Connected to Nothing

| Component / Route | Status |
|---|---|
| `ScreenshotGuide.tsx` | Orphaned — not exported, not imported anywhere. Delete. |
| `/discover` hub | Page exists at `src/app/discover/page.tsx`, not linked from landing page or header |
| `/discover/overthink`, `/discover/sleep` | Quizzes work, no exit CTA back to `/xray` funnel |
| `/coming-soon` | Reached when `product === 'starter'`; links to `twitter.com/meldar_ai` and `discord.gg/meldar` — verify these exist |
| Auth system (6 API routes + identity utilities) | Built, tested, no UI consumers |
| `/xray/[id]/og` | Referenced in metadata, does not exist |

---

### Fastest Path to 10 Real Users Through the Full Funnel

The funnel steps and their current status:

1. `/` → Hero email capture — works
2. → `/quiz` → pick pains → see results — works
3. → `/xray` → upload screenshot → see X-Ray — works (but cold restart, no quiz context)
4. → Upsell: "Personal Time Audit — EUR 29" → Stripe Checkout — works
5. → Purchase → `/thank-you` → "audit delivered in 72 hours via email" — works
6. → Share `/xray/[id]` → friend sees OG card — BROKEN (missing og route)

The three minimum fixes to make the funnel real: **OG image route** (activates viral), **CTA link fixes** (unblocks revenue), **quiz → xray context pass** (improves conversion of the warmest users).

---

### Questions for the QA Agent to Verify on Live Site

1. Do landing page CTAs in TiersSection and any mid-page "See what eats your time" links navigate to `#early-access`, `/xray`, or something else? Specifically test the "Get started free" button in the How It Works section and all three tier buttons.

2. When sharing a `/xray/[id]` URL on Twitter/X or iMessage, does it produce a rich link preview with an image? Or does it fall back to the default site OG (confirming the `/og` subroute is missing)?

3. After completing the Overthink quiz at `/discover/overthink` or the Sleep quiz at `/discover/sleep`, is there a CTA pointing to `/xray`? Or does the result state dead-end?

4. Does `/discover` appear anywhere in the header nav or landing page? Or is it only reachable by direct URL?

5. Does clicking "AI Automation Toolkit — EUR 9.99/mo" in the upsell block correctly redirect to `/coming-soon`? And does the `/coming-soon` page load without errors (the Twitter and Discord links on that page may be placeholder URLs)?
