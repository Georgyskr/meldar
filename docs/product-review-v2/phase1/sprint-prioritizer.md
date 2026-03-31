# Sprint Prioritizer — Meldar Phase 2 Features

**Date:** 2026-03-31
**Author:** Sprint Prioritizer Agent
**Context:** Solo founder, Next.js 16, Claude Haiku Vision ($0.007/call), Claude text API, Panda CSS, Vercel, Neon Postgres

---

## 1. RICE Scoring

### Scoring Criteria

- **Reach:** Users/month who could use it in the next quarter (1-10 scale)
- **Impact:** How much it moves conversion/retention (1-3: minimal/notable/massive)
- **Confidence:** How well-defined is the scope? (0.5/0.8/1.0)
- **Effort:** Developer-hours for a solo founder

| Feature | Reach | Impact | Confidence | Effort (hrs) | RICE Score |
|---|---|---|---|---|---|
| **C. Actionable Screen Time** | 8 | 3 | 1.0 | 6 | **4.0** |
| **B. Subscription Autopsy** | 7 | 3 | 0.8 | 10 | **1.68** |
| **A. ChatGPT Export Analyzer** | 5 | 2 | 0.8 | 12 | **0.67** |
| **D. ADHD Mode** | 4 | 2 | 0.5 | 16 | **0.25** |

### Scoring Rationale

**C. Actionable Screen Time (RICE: 4.0)** — Highest score by a wide margin. Every single X-Ray user already sees the result page. The existing pipeline (`src/server/discovery/insights.ts`, `src/server/discovery/upsells.ts`) produces generic insights like "That's 42 hours a week" and "A Time Audit can show you where to cut." These are observations, not actions. Rewriting these to say "Block TikTok during 9-5 using iOS Focus Mode — here's how" costs zero additional AI calls because the extraction data already exists. This is a pure copy + logic rewrite on existing infrastructure. Reach is 8 because it applies to every X-Ray user (your highest-intent audience).

**B. Subscription Autopsy (RICE: 1.68)** — Strong second. The Vision pipeline already exists in `src/server/discovery/ocr.ts` — same pattern (upload image, Claude Haiku extracts structured data, show results). The new part is: different prompt, different Zod schema, different result card, and a "total monthly burn" calculation. Money pain is visceral and shareable. Confidence is 0.8 because App Store subscription screenshots vary more than Screen Time screenshots (different layouts per OS version, some users have 3 subscriptions, some have 30).

**A. ChatGPT Export Analyzer (RICE: 0.67)** — Moderate reach because only ChatGPT power users know about `conversations.json` export. The export file can be enormous (100MB+), so you need client-side parsing + chunking before sending to Claude text API. This is meaningfully more engineering than the Vision features. Impact is 2 (notable but not massive) because the insight ("you ask ChatGPT about recipes 40% of the time") is interesting but less emotionally urgent than money or screen time.

**D. ADHD Mode (RICE: 0.25)** — Lowest score. Not because it's a bad idea — it's a great positioning differentiator — but because it touches every surface of the app (copy, prompts, UI animations, potentially different result framing). Confidence is 0.5 because "neurodivergent-aware" is poorly defined without user research. The risk is building something that feels patronizing rather than helpful. This needs user interviews before engineering.

---

## 2. Build Order

### Sprint 1: Actionable Screen Time (ship in ~6 hours)

**Why first:** Zero new infrastructure. Zero new AI cost. Highest RICE. Improves the experience for every existing X-Ray user immediately.

**What changes:**
- Rewrite `src/server/discovery/insights.ts` — replace vague comparisons with specific, actionable steps tied to each app category
- Rewrite `src/server/discovery/upsells.ts` — make upsell messages reference the specific fix, not just "a time audit can help"
- Add an `actionSteps` field to the `Insight` type in `src/entities/xray-result/model/types.ts`
- Update `XRayCard` and the result phase in `src/app/xray/xray-client.tsx` to render action steps
- Add life-stage-aware actions (student vs. working vs. freelance — the `lifeStage` context already exists in the X-Ray flow)

**Time estimate:** 4-6 hours

### Sprint 2: Subscription Autopsy (ship in ~10 hours)

**Why second:** Reuses the Vision pipeline pattern. Adds a new discovery entry point with strong viral potential ("I'm paying $847/year in subscriptions I forgot about").

**What changes:**
- New prompt in `src/server/discovery/prompts.ts` for subscription screenshot extraction
- New Zod schema in `src/entities/` for subscription data (app name, price, billing cycle, category)
- New API route `src/app/api/upload/subscriptions/route.ts` (clone screentime route, swap prompt + schema)
- New page `src/app/subscriptions/page.tsx` with upload flow (clone X-Ray page pattern)
- New result card component showing: total monthly burn, biggest offenders, "zombie subscriptions" (apps with <5 min/week usage if cross-referenced with Screen Time data)
- New shareable OG image route

**Time estimate:** 8-10 hours

### Sprint 3: ChatGPT Export Analyzer (ship in ~12 hours)

**Why third:** Different input mechanism (JSON file, not image). Requires client-side parsing because the file can be huge. More engineering, lower emotional hook.

**What changes:**
- Client-side JSON parser that extracts conversation titles + timestamps (no messages sent to server)
- Categorization logic (either rule-based on title keywords, or send batched titles to Claude text API)
- New API route for title-batch analysis
- New page `src/app/chatgpt-audit/page.tsx`
- Result card: "You asked ChatGPT about X 40% of the time" + pattern insights + "Meldar can build an app that does X automatically"
- Privacy-first messaging: "Your conversations never leave your device. We only see the titles."

**Time estimate:** 10-14 hours

### Sprint 4: ADHD Mode (ship in ~16 hours, only after user research)

**Why last:** Needs research. Touches everything. Risk of getting it wrong is high.

**Defer until:** At least 5 user interviews with neurodivergent users who have used the existing quizzes/X-Ray.

**Time estimate:** 14-18 hours (after research is done)

---

## 3. What to Cut from the Current Codebase

### KEEP

| Component | Location | Reason |
|---|---|---|
| **PainQuiz** | `src/features/quiz/ui/PainQuiz.tsx` | Core discovery entry point. 15-second engagement, zero data required. Feeds users into X-Ray. Keep. |
| **ScreenTimeUpload** | `src/features/quiz/ui/ScreenTimeUpload.tsx` | Older upload component, but referenced from the quiz flow. Keep until Subscription Autopsy ships and you unify upload components. |
| **X-Ray full flow** | `src/app/xray/`, `src/features/screenshot-upload/`, `src/server/discovery/` | The core product. Keep and improve (Sprint 1). |
| **Pain library** | `src/entities/pain-points/model/data.ts` | 12 researched pain points. Used by PainQuiz and suggestion mapping. Keep. |

### CUT (or sunset after replacement ships)

| Component | Location | Reason |
|---|---|---|
| **OverthinkQuiz** | `src/features/discovery-quizzes/ui/OverthinkQuiz.tsx`, `src/app/discover/overthink/` | Fun but low conversion. 8 questions is too long for a discovery quiz. The data it produces (yearly hours lost to indecision) doesn't connect to any Meldar product action. It funnels to X-Ray anyway — skip the middleman. **Cut after Sprint 1 ships.** |
| **SleepDebtQuiz** | `src/features/discovery-quizzes/ui/SleepDebtQuiz.tsx`, `src/app/discover/sleep/` | Same problem. 5 questions, produces a "sleep debt score" that Meldar can't act on. Neither quiz captures email or drives purchase. They're content marketing without a conversion mechanism. **Cut after Sprint 1 ships.** |
| **discovery-quizzes feature barrel** | `src/features/discovery-quizzes/index.ts` | Remove when both quizzes are cut. |
| **DiscoveryCard entity** | `src/entities/discovery-card/` | Only used by OverthinkQuiz and SleepDebtQuiz. Remove with them. |

### WHY CUT THE DISCOVERY QUIZZES

The overthink and sleep quizzes share a pattern: ask questions, show a scary number, link to X-Ray. But they have three problems:

1. **No data capture.** Neither quiz collects email or creates a DB record. The user's result vanishes on page close.
2. **No product connection.** "You lose 280 hours/year to indecision" is interesting but Meldar doesn't sell a decision-making tool. The X-Ray and Subscription Autopsy connect directly to automations Meldar can build.
3. **Maintenance cost.** Each quiz is ~260 lines of client-side code with hardcoded copy. Two quizzes = two things to maintain that don't convert.

**Alternative:** If you want the "fun quiz" traffic, replace both with a single 3-question "What's eating your time?" quiz that captures email at the end and maps directly to the pain library. That's a 30-minute rebuild, not a keep.

---

## 4. Dependencies

```
Sprint 1: Actionable Screen Time
  └── No dependencies. Uses existing extraction pipeline, existing types, existing UI.

Sprint 2: Subscription Autopsy
  ├── Depends on: nothing technically (parallel to Sprint 1)
  ├── BUT: ship Sprint 1 first because it improves the experience
  │   for users who arrive via Subscription Autopsy → X-Ray upsell
  └── Nice-to-have: cross-reference subscription apps with Screen Time data
      (requires user to have done both — defer to v2)

Sprint 3: ChatGPT Export Analyzer
  ├── Depends on: nothing technically
  └── Nice-to-have: pattern matching against pain library to suggest automations
      (uses existing src/entities/pain-points/model/data.ts)

Sprint 4: ADHD Mode
  ├── Hard dependency: user research (5+ interviews)
  ├── Hard dependency: Sprint 1 (actionable insights are the baseline ADHD Mode modifies)
  └── Touches: prompts.ts, insights.ts, all result card components, possibly header/footer
```

### Cross-Feature Dependencies

- **Subscription Autopsy + X-Ray cross-reference:** If a user has done both, you can flag "You pay $9.99/month for Headspace but use it 0 minutes/day." This requires matching subscription app names to Screen Time app names. Defer to v2 — ship each standalone first.
- **ChatGPT Analyzer + Pain Library:** ChatGPT conversation titles can map to pain points ("meal planning," "email drafts," "resume help"). The existing `APP_TO_PAIN` map in `src/server/discovery/suggestions.ts` can be extended with keyword patterns. Low effort, high value — do this during Sprint 3.

---

## 5. The ADHD Mode Implementation Question

### Recommendation: URL parameter (`?mode=adhd`) with cookie persistence

**Not a toggle** — toggles add UI complexity to every page and imply the user switches back and forth. ADHD mode is a lens, not a setting.

**Not a separate page** — duplicating pages is a maintenance nightmare. You'd need `/xray` and `/xray-adhd`, `/subscriptions` and `/subscriptions-adhd`, etc.

**Not a cookie alone** — cookies aren't shareable. The viral hook of ADHD mode is "send this link to your ADHD friend."

### How it works:

1. User arrives via `meldar.ai/xray?mode=adhd` (from a social post, friend's link, or landing page toggle)
2. App reads `mode=adhd` from URL params
3. Sets a cookie `meldar-mode=adhd` so subsequent pages maintain the mode
4. A React context provider (`ADHDModeProvider`) wraps the app and exposes `useADHDMode()` hook
5. Components conditionally render:
   - **Copy changes:** shorter sentences, more direct, emoji-friendly, no walls of text
   - **UI changes:** higher contrast on key actions, larger tap targets, progress indicators on everything, celebration animations on completion
   - **AI prompt changes:** system prompts in `src/server/discovery/prompts.ts` get an ADHD-aware suffix ("keep output under 3 bullet points, use encouraging tone, highlight the single most important action")
   - **Optional GIF layer:** small celebration GIFs on result reveal (use CSS animations, not actual GIF files — lighter, more accessible)

### Where it lives in FSD:

```
src/features/adhd-mode/
  index.ts
  model/context.tsx          # ADHDModeProvider + useADHDMode hook
  lib/get-initial-mode.ts    # reads URL param + cookie
```

### Risk mitigation:

- Ship a "lite" version first: only change copy and AI prompt suffix. No GIFs, no UI changes.
- A/B test engagement (do ADHD mode users complete X-Ray at higher rates?)
- Get feedback from actual neurodivergent users before expanding

---

## 6. What Can Be Built in 4 Hours? (Absolute MVP for Each)

### A. ChatGPT Export Analyzer — 4-Hour MVP

- Single page with a file drop zone (reuse `UploadZone` pattern from `src/features/screenshot-upload/`)
- Client-side: `JSON.parse()` the file, extract `mapping[].title` from conversations.json
- Client-side: group titles by simple keyword matching (food, code, writing, health, work, school)
- Display: pie chart or bar list showing category breakdown + "Your top ChatGPT topic: X"
- No AI call needed for MVP — pure client-side keyword matching on titles
- No DB storage, no shareable link, no email capture

**What's missing from full version:** Claude text API for smarter categorization, shareable result card, email capture, pain library mapping, OG image

### B. Subscription Autopsy — 4-Hour MVP

- Clone `src/app/api/upload/screentime/route.ts` and swap the prompt
- New prompt in `prompts.ts`: "Extract subscription app names and monthly costs from this App Store/Google Play screenshot"
- New Zod schema: `{ subscriptions: { name: string, monthlyCost: number }[], totalMonthly: number }`
- Single page with upload zone + result showing total monthly/yearly cost and list of subscriptions
- Reuse `UploadZone` component with different copy
- No cross-reference with Screen Time, no shareable link, no OG image

**What's missing from full version:** zombie subscription detection, shareable card, category breakdown, cancel links, email capture

### C. Actionable Screen Time — 4-Hour MVP (this is the full version)

- Rewrite `generateInsights()` in `src/server/discovery/insights.ts` to return actionable steps instead of vague comparisons
- Rewrite `generateUpsells()` in `src/server/discovery/upsells.ts` to reference specific fixes
- Add `actionSteps: string[]` to the `Insight` type
- Update `XRayCard` to render action steps under each insight
- Done. The existing pipeline, upload flow, DB storage, and shareable links all still work.

**What's missing:** Nothing critical. Life-stage-specific actions and richer formatting are nice-to-haves.

### D. ADHD Mode — 4-Hour MVP

- Create `ADHDModeProvider` context that reads `?mode=adhd` URL param
- Add cookie persistence for mode
- Change copy in X-Ray result page only (shorter, punchier, 1 action per insight instead of 3)
- Add a single system prompt suffix in `prompts.ts` for ADHD-aware extraction
- No GIFs, no UI changes, no landing page changes

**What's missing:** All the UI/UX differentiation that makes it actually feel different. Without visual changes, it's just slightly different copy — not worth shipping as a "mode."

---

## 7. Questions for QA Agent

1. **Screen Time prompt accuracy:** The existing `SCREEN_TIME_SYSTEM_PROMPT` in `src/server/discovery/prompts.ts` was built for Screen Time screenshots. If we clone this pattern for Subscription Autopsy, we need to test: does Claude Haiku reliably extract subscription names + prices from App Store screenshots across iOS 16, 17, and 18? The subscription settings UI changed significantly between versions. What's the error rate we should expect?

2. **ChatGPT export file size limits:** The `conversations.json` export from ChatGPT can be 50-200MB for power users. The 4-hour MVP parses this client-side in the browser. At what file size does `JSON.parse()` in a browser tab start failing or freezing? Should we recommend users export only recent conversations, or do we need a streaming JSON parser (`oboe.js` or similar)?

3. **Actionable insights liability:** Sprint 1 changes insights from observations ("5.2 hours on TikTok") to instructions ("Block TikTok during work hours using iOS Focus Mode"). If we give platform-specific instructions (iOS Focus Mode, Android Digital Wellbeing), do we need to verify these instructions are correct for the user's detected platform version? The X-Ray already detects `platform: 'ios' | 'android'` — is that sufficient, or do we need OS version detection?

4. **ADHD Mode naming and sensitivity:** Is "ADHD Mode" the right user-facing name? Alternatives: "Focus Mode" (conflicts with iOS Focus Mode), "Quick Mode," "Short Mode." Should we do a quick poll with the existing subscriber list before naming it? The risk of getting the name wrong is alienating the exact audience we're trying to serve.

5. **Discovery quiz removal and SEO:** The overthink quiz at `/discover/overthink` and sleep quiz at `/discover/sleep` may have been indexed by search engines or shared on social media. Before removing them, should we check Google Search Console for impressions/clicks on these URLs? If they drive any organic traffic, we should 301 redirect them to `/xray` rather than returning 404s. Can QA verify whether these pages are in the sitemap (`src/app/sitemap.ts`) and whether they have any backlinks?
