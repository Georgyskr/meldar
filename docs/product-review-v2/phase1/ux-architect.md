# UX Architecture Review — Phase 1

## 1. Information Architecture

### Current State

The discovery tools currently live in a split hierarchy:

```
/discover              → Hub page (3 tool cards)
/discover/overthink    → Overthink Quiz
/discover/sleep        → Sleep Debt Quiz
/xray                  → Screen Time X-Ray (standalone, outside /discover)
```

The X-Ray lives at `/xray` rather than `/discover/xray`. This was likely intentional — it's the flagship tool and benefits from a short, memorable URL. But it creates an inconsistency: the `/discover` hub links to `/xray` (outside its own tree), while the quizzes live under `/discover/*`.

### Recommendation: Hybrid Routing

Keep `/xray` as the canonical short URL (SEO value, shareable links, existing OG routes at `/xray/[id]/og`). Add new tools under `/discover/*` for hub consistency. Use Next.js rewrites or parallel routes to avoid duplication.

**Proposed structure:**

```
/discover                    → Hub page (all tools listed)
/discover/overthink          → Overthink Quiz (existing)
/discover/sleep              → Sleep Debt Quiz (existing)
/discover/chatgpt            → ChatGPT Export Analyzer (new)
/discover/subscriptions      → Subscription Autopsy (new)
/xray                        → Screen Time X-Ray (existing, keep standalone)
/xray/[id]                   → Shareable X-Ray result (existing)
```

**Why not flatten everything to top-level?** The `/discover` hub serves as a decision funnel — users who aren't sure which tool to pick land here. Top-level routes (`/xray`) are for users who already know what they want, or who arrive via a shared link. Adding `/chatgpt` or `/subscriptions` at the top level would dilute the site's IA; these tools earn their own top-level route only after they prove traction.

**Hub page changes:** The current hub (`src/app/discover/page.tsx`) renders a static `tools` array with icon, title, description, time estimate, href, and gradient. Adding new tools is trivial — append to the array. Consider grouping tools by input type once there are 5+:

- **Zero data** — Overthink Report, Sleep Debt Score (quizzes)
- **Upload something** — Time X-Ray (screenshot), ChatGPT Export (JSON), Subscription Autopsy (screenshot)

This grouping reinforces the effort-escalation funnel from the product strategy.

### URL Param Considerations

Each discovery tool should accept an optional `?adhd=1` query param (see section 2) and an optional `?ref=<source>` for analytics attribution (e.g., `?ref=landing-skills` when linked from the landing page Skills section).

---

## 2. ADHD Mode as Global State

### Requirements

ADHD Mode changes every page: shorter copy, larger tap targets, fewer options per screen, animated GIFs for instructions, simplified language, and potentially different AI prompt engineering on the backend. This is a cross-cutting concern that must survive navigation and page reloads.

### Recommendation: Cookie + React Context + CSS Data Attribute

**Storage: Cookie (not localStorage)**

- Cookies are readable in Server Components via `cookies()` from `next/headers`. localStorage is not.
- ADHD Mode affects server-rendered content (copy, layout, number of items shown). If stored only in localStorage, the first render would always be "normal mode," causing a flash of wrong content.
- Use a simple cookie: `meldar-adhd=1` (SameSite=Lax, no expiry = session, or 30 days for persistence).
- Pair with a lightweight `toggleAdhdMode()` client action that sets the cookie and calls `router.refresh()` to re-render the RSC tree.

**Runtime: React Context for client components**

Create `src/features/adhd-mode/` with:

```
adhd-mode/
  index.ts                  → barrel
  lib/cookie.ts             → getAdhdCookie() server helper, ADHD_COOKIE_NAME constant
  ui/AdhdModeProvider.tsx   → "use client" context provider, reads initial value from prop
  ui/AdhdModeToggle.tsx     → "use client" toggle button (for header/footer)
```

The root layout reads the cookie server-side and passes it as an `initialAdhdMode` prop to `<AdhdModeProvider>`. Client components consume via `useAdhdMode()` hook. Server Components read the cookie directly.

**CSS: Data attribute on `<html>`**

The layout sets `data-adhd="true"` on the `<html>` element when ADHD mode is active. This allows Panda CSS conditions or raw CSS to target ADHD-specific styles without runtime checks:

```css
[data-adhd="true"] {
  --font-body-weight: 400;       /* bump from 300 */
  --spacing-scale: 1.25;         /* larger tap targets */
  --motion-preference: reduced;  /* calmer transitions */
}
```

Panda CSS can define a custom condition `_adhd` mapped to `[data-adhd="true"] &` for use in component styles.

**Why not a URL param alone?** URL params don't persist across navigation without manual forwarding on every `<Link>`. They also leak into shared URLs (a user might not want to broadcast that they're using ADHD mode). A cookie is private, persistent, and SSR-compatible.

**Why not a CSS class on `<body>`?** A data attribute on `<html>` is semantically cleaner and avoids specificity conflicts. It also doesn't interfere with Panda CSS's class-based system.

### FSD Placement

`adhd-mode` is a **feature** — it encapsulates a user capability (toggling a mode) with its own UI, state, and logic. It sits at `src/features/adhd-mode/`. Components in `shared`, `entities`, and other features can consume the CSS data attribute without importing from the feature layer (they just use the Panda condition `_adhd`). Only components that need the toggle UI or the React context hook import from `features/adhd-mode`.

---

## 3. Component Reuse: UploadZone

### Current State

`UploadZone` (`src/features/screenshot-upload/ui/UploadZone.tsx`) is tightly coupled to the Screen Time X-Ray flow:

1. **File input accepts only images**: `accept="image/jpeg,image/png,image/webp"`
2. **Contains image compression logic** (`compressImage()`) specific to Claude Vision's 1568px limit
3. **Hardcoded upload endpoint**: `/api/upload/screentime`
4. **Hardcoded progress steps**: Compressing image / Uploading screenshot / Detecting apps / Generating your X-Ray
5. **Icon and copy** reference "Screen Time screenshot" specifically
6. **Result type** is `XRayResponse & { id: string }` — the xray-result entity type
7. **Imports directly from** `@/entities/xray-result/model/types` (FSD violation if reused outside xray context)

### Recommendation: Extract a Generic FileUploadZone to Shared, Keep UploadZone as Feature Wrapper

**Do not try to make one component handle both.** The compression logic, progress steps, copy, icons, and result types are fundamentally different between "screenshot for Vision API" and "JSON file for text parsing." Forcing both into one component with conditional props creates a boolean-prop hydra.

Instead:

**Step 1: Extract `FileUploadZone` to `src/shared/ui/file-upload-zone/`**

A generic, headless-ish upload zone that handles:
- Drag and drop
- File input with configurable `accept` types
- State machine: `idle | processing | done | error`
- Configurable progress steps (array of strings)
- Configurable icon, title, subtitle, and privacy copy
- Generic `onFile(file: File)` callback — the caller handles what happens with the file
- No knowledge of endpoints, compression, or result types

Props interface:

```typescript
type FileUploadZoneProps = {
  accept: string                          // e.g., "image/*" or "application/json"
  icon: ReactNode                         // Smartphone, FileJson, etc.
  title: string                           // "Drop your Screen Time screenshot"
  subtitle?: string                       // Platform-specific instructions
  ctaLabel: string                        // "Choose image" / "Choose file"
  privacyNote: string                     // "Processed in ~3 seconds..."
  steps: string[]                         // Progress step labels
  state: UploadState                      // Controlled state from parent
  currentStep: number                     // Controlled step from parent
  errorMessage?: string                   // Error to display
  onFile: (file: File) => void            // File selected callback
  onReset: () => void                     // Reset callback
}
```

This is a **controlled component** — the parent owns the state machine and calls `onFile` to trigger its own upload/processing logic.

**Step 2: Keep `UploadZone` in `src/features/screenshot-upload/` as a thin wrapper**

It uses `FileUploadZone` internally but owns:
- Image compression logic
- The `/api/upload/screentime` fetch call
- The `XRayResponse` result type
- Screen Time-specific copy and icons

**Step 3: Create feature-specific wrappers for new tools**

- `src/features/chatgpt-export/ui/ChatGptUploadZone.tsx` — wraps `FileUploadZone` with `accept="application/json"`, JSON parsing logic, ChatGPT-specific copy
- `src/features/subscription-autopsy/ui/SubscriptionUploadZone.tsx` — wraps `FileUploadZone` with image accept, its own Vision API endpoint, subscription-specific copy

### Why Controlled?

Making `FileUploadZone` controlled (parent owns state) rather than uncontrolled (component manages its own fetch) follows composition patterns. Each feature has wildly different processing logic (client-side JSON parsing vs. server-side Vision API), so the generic component should not try to abstract over network calls. It should only abstract over the drag-and-drop UX.

---

## 4. DiscoveryCard for ChatGPT Patterns

### Current State

`DiscoveryCard` (`src/entities/discovery-card/ui/DiscoveryCard.tsx`) is designed for numeric data:

```typescript
type DiscoveryCardProps = {
  label: string                  // "The Overthink Report", "Sleep Debt Score"
  bigStat: string                // "7.4 hrs/day", "EUR 47/mo", "23 hrs/year"
  bigStatLabel: string           // "Time lost to indecision"
  severity: 'low' | 'medium' | 'high'
  rows: { label: string; value: string; highlight?: boolean }[]
  insight?: string
  children?: ReactNode
}
```

The `bigStat` + `rows` structure works perfectly for numeric summaries. But ChatGPT Export analysis produces qualitative data: topic clusters ("You asked about career changes 47 times"), repetition patterns ("You re-asked the same question 12 different ways"), and behavioral observations ("Your conversations peak at 11 PM-2 AM").

### Assessment: DiscoveryCard Can Work, But Needs a Variant

The existing card structure is more flexible than it looks:

- `bigStat` can be `"47 topics"` or `"312 conversations"` — it doesn't need to be time-based
- `rows` can show `{ label: "Most asked topic", value: "Career anxiety" }` — works fine for text data
- `severity` maps well to ChatGPT patterns: low = casual user, medium = moderate reliance, high = heavy dependency
- `insight` is a free-text quote — perfect for behavioral observations

**What doesn't work:**

1. **Topic clusters need visual hierarchy.** A flat `rows` list doesn't communicate that "Career (47 questions)" is a category containing sub-topics. The card needs an optional section for grouped/nested data.
2. **Repetition patterns deserve emphasis.** "You asked the same question 12 ways" is a powerful insight that gets lost in a row. Consider an optional `callout` prop — a highlighted box within the card for the single most striking finding.
3. **No chart/visual slot.** A simple bar chart showing topic distribution or time-of-day patterns would make the ChatGPT card much more compelling. The current card has no slot for visual data.

### Recommendation: Extend DiscoveryCard with Optional Slots

Rather than creating a separate `ChatGptCard`, add optional props to `DiscoveryCard`:

```typescript
type DiscoveryCardProps = {
  // ... existing props unchanged ...
  
  /** Optional grouped data sections (for topic clusters, etc.) */
  sections?: {
    title: string
    rows: { label: string; value: string; highlight?: boolean }[]
  }[]
  
  /** Optional callout block between big stat and rows */
  callout?: {
    text: string
    emphasis?: string  // bold/colored portion
  }
  
  /** Optional visual content slot (charts, etc.) */
  visual?: ReactNode
}
```

When `sections` is provided, it renders grouped row blocks with section titles instead of the flat `rows` array. The `callout` renders a highlighted observation box. The `visual` slot accepts any ReactNode (a bar chart component, a time-of-day heatmap, etc.).

Existing consumers are unaffected — all new props are optional. This follows the Open-Closed Principle: the card is open for extension without modifying existing behavior.

### FSD Implications

The `DiscoveryCard` entity remains in `src/entities/discovery-card/`. Chart components used in the `visual` slot would live in `src/shared/ui/` (generic) or in the feature that creates them (e.g., `src/features/chatgpt-export/ui/TopicChart.tsx`). The feature passes the chart as a `visual` ReactNode — no upward import violation.

---

## 5. FSD Compliance — Where New Features Fit

### Layer Map

```
src/
  shared/                                    # Layer 1
    ui/
      file-upload-zone/                      # NEW — generic drag-and-drop upload
        FileUploadZone.tsx
        index.ts
  
  entities/                                  # Layer 2
    discovery-card/                           # EXISTING — extend with sections/callout/visual
    xray-result/                             # EXISTING — unchanged
    chatgpt-analysis/                        # NEW — types + result card for ChatGPT export
      model/
        types.ts                             #   TopicCluster, RepetitionPattern, ChatGptAnalysis
      index.ts
    subscription-audit/                      # NEW — types for subscription analysis
      model/
        types.ts                             #   Subscription, SubscriptionAudit
      index.ts
  
  features/                                  # Layer 3
    screenshot-upload/                       # EXISTING — refactor to use shared FileUploadZone
    discovery-quizzes/                       # EXISTING — unchanged
    billing/                                 # EXISTING — unchanged
    analytics/                              # EXISTING — unchanged
    cookie-consent/                         # EXISTING — unchanged
    adhd-mode/                              # NEW — cookie, context, toggle, CSS condition
      lib/
        cookie.ts                            #   Server-side cookie read/write helpers
      ui/
        AdhdModeProvider.tsx                 #   "use client" context provider
        AdhdModeToggle.tsx                   #   "use client" toggle (header/settings)
      index.ts
    chatgpt-export/                         # NEW — ChatGPT JSON upload + analysis flow
      ui/
        ChatGptUploadZone.tsx                #   Wraps FileUploadZone for JSON
        ChatGptResultView.tsx                #   Orchestrates result display
      lib/
        parser.ts                            #   Client-side JSON parsing (no server upload)
      index.ts
    subscription-autopsy/                   # NEW — Subscription screenshot analysis
      ui/
        SubscriptionUploadZone.tsx            #   Wraps FileUploadZone for images
        SubscriptionResultView.tsx           #   Displays cost breakdown
      index.ts
    actionable-screentime/                  # NEW — Enhanced X-Ray output with fix steps
      ui/
        ActionableSteps.tsx                  #   Step-by-step fix suggestions
        FixCard.tsx                          #   Individual fix card
      index.ts
  
  widgets/                                   # Layer 4
    header/                                  # EXISTING — add ADHD toggle
    footer/                                  # EXISTING — unchanged
    landing/                                 # EXISTING — unchanged
  
  app/                                       # Layer 5 (routing)
    discover/
      page.tsx                               # EXISTING — update tools array
      overthink/                             # EXISTING
      sleep/                                 # EXISTING
      chatgpt/                              # NEW
        page.tsx                             #   Metadata + ChatGptClient
        chatgpt-client.tsx                   #   "use client" orchestrator
      subscriptions/                        # NEW
        page.tsx                             #   Metadata + SubscriptionClient
        subscription-client.tsx              #   "use client" orchestrator
    xray/                                    # EXISTING — integrate actionable-screentime
    api/
      upload/
        screentime/route.ts                  # EXISTING
      analyze/
        subscriptions/route.ts               # NEW — Vision API for subscription screenshots
```

### Import Direction Compliance

All new code follows `app -> widgets -> features -> entities -> shared`:

- `chatgpt-export` feature imports from `chatgpt-analysis` entity (types) and `shared/ui/file-upload-zone` (upload UX)
- `subscription-autopsy` feature imports from `subscription-audit` entity (types) and `shared/ui/file-upload-zone`
- `adhd-mode` feature imports nothing from other features — it's consumed via CSS data attribute (no import needed) or via its barrel export in higher layers
- `actionable-screentime` feature imports from `xray-result` entity (types) — this is valid (feature -> entity)
- The `discover/chatgpt/page.tsx` app route imports from `chatgpt-export` feature — valid (app -> feature)

### ChatGPT Export: Client-Side Processing

The ChatGPT export analyzer is unique: the JSON file should be parsed **entirely on the client**. ChatGPT exports can contain deeply personal conversations. The privacy promise ("your data never leaves your device") is even more critical here than with screenshots. The `parser.ts` in the feature handles:

1. File read via `FileReader` API
2. JSON parsing and validation (Zod schema)
3. Topic extraction and clustering (client-side algorithm, no AI needed for v1)
4. Result construction matching the `ChatGptAnalysis` entity type

No API route needed for v1. The AI-powered analysis (if desired later) can be opt-in: "Want deeper insights? This sends your data to our server."

### Subscription Autopsy: Server-Side Vision API

This follows the same pattern as Screen Time X-Ray: image upload -> Vision API -> structured result. The only difference is the API route (`/api/analyze/subscriptions`) and the prompt/schema sent to Claude Vision.

---

## 6. Questions for QA

1. **DiscoveryCard extension backward compatibility** — The proposed `sections`, `callout`, and `visual` props are optional, so existing consumers (OverthinkQuiz, SleepDebtQuiz) should be unaffected. But does adding ReactNode children via the `visual` slot introduce any hydration issues with the existing reveal animation (`XRayCardReveal` wraps `DiscoveryCard`)? Need to verify that SSR + client animation still works when the card contains a client-rendered chart.

2. **ADHD Mode cookie and GDPR** — The `meldar-adhd` cookie is a functional/preference cookie, not an analytics cookie. Under GDPR, functional cookies that are strictly necessary for a user-requested feature do not require consent. But the current CookieConsent banner groups all cookies together. Does the banner need updating to distinguish functional cookies from analytics cookies? Or is the current blanket consent flow acceptable?

3. **ChatGPT JSON parsing performance** — ChatGPT export files can be very large (50MB+ for heavy users with years of history). Client-side parsing of a 50MB JSON file will block the main thread. Should the `parser.ts` use a Web Worker? If so, does the current Next.js + Turbopack build pipeline support Web Worker imports without additional configuration?

4. **FileUploadZone and mobile file pickers** — The `accept` prop on `<input type="file">` behaves differently across mobile browsers. On iOS Safari, `accept="application/json"` may not show JSON files in the file picker (iOS categorizes them oddly). Does the ChatGPT upload zone need a fallback `accept` that includes `*/*` on iOS, with client-side validation after selection? How should we test this across devices?

5. **Actionable Screen Time and the existing upsell flow** — The current X-Ray result flow ends with `UpsellBlock` (suggesting paid tiers). The new Actionable Screen Time feature adds free step-by-step fixes between the X-Ray card and the upsell. Does inserting free value before the paywall improve or hurt conversion? This needs A/B testing infrastructure. Is there an existing analytics event structure that supports variant tracking, or does this need to be built?
