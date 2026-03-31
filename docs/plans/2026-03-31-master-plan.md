# Meldar Master Implementation Plan

**Date:** 2026-03-31
**Scope:** Full product redesign — adaptive funnel, pricing tiers, content strategy

---

## What's Built (with file paths)

| Component | Status | File Path |
|-----------|--------|-----------|
| `/start` entry point | Done | `src/app/start/page.tsx`, `src/app/start/start-client.tsx` |
| Quick Profile (3 steps) | Done | `src/features/discovery-flow/ui/QuickProfile.tsx` |
| Data Upload Hub (4 instant + 3 deep) | Done | `src/features/discovery-flow/ui/DataUploadHub.tsx` |
| Upload Card (with "waiting" state) | Done | `src/features/discovery-flow/ui/UploadCard.tsx` |
| Analysis Results (recs, learning, paywall) | Done | `src/features/discovery-flow/ui/AnalysisResults.tsx` |
| Jotai atoms (localStorage persistence) | Done | `src/features/discovery-flow/model/atoms.ts` |
| Session creation API | Done | `src/app/api/discovery/session/route.ts` |
| Upload processing API | Done | `src/app/api/discovery/upload/route.ts` |
| Cross-analysis API (Sonnet) | Done | `src/app/api/discovery/analyze/route.ts` |
| All 3 parsers (ChatGPT, Claude, Google) | Done | `src/server/discovery/parsers/` |
| Screen Time OCR (Haiku vision) | Done | `src/server/discovery/ocr.ts` |
| discovery_sessions DB table | Done | `src/server/db/schema.ts` |
| Rate limiting (dedicated analyzeLimit) | Done | `src/server/lib/rate-limit.ts` |
| Stripe checkout + webhook | Done | `src/app/api/billing/` |
| PurchaseButton | Done | `src/features/billing/ui/PurchaseButton.tsx` |

---

## What's Missing (prioritized)

### P0 — Blocks revenue or core loop

1. **C1: Analysis engine is blind.** Raw messages stripped from DB (correct for privacy) but analyze.ts still tries to read them. ChatGPT/Claude/Google cross-referencing is broken. Every delayed export produces generic results.

2. **Stripe subscription (EUR 9.99/mo) not wired.** Checkout route returns `{ comingSoon: true }` for starter product. "Start free trial" button is dead.

3. **No occupation or age in Quick Profile.** Adaptive form needs these. DB schema missing the columns.

4. **Multi-screenshot Screen Time not supported.** Accepts 1 screenshot, should accept 4 sections.

5. **Adaptive Haiku follow-up system doesn't exist.** Core differentiator from brainstorm — nobody gets the same form.

6. **No signal-to-recommendation mapping.** Analysis prompt is generic. Doesn't know "food delivery high usage = meal planner."

### P1 — Important for launch

7. **Instant sources have no backend.** UI shows Subscriptions/Battery/Storage cards. Upload route rejects them as "unknown platform."

8. **Calendar and Health screenshots missing.** Not in UI or backend.

9. **Thank-you page broken.** Old product names, no product param in success URL.

10. **Share route doesn't exist.** No `/start/[id]` page.

11. **No real content.** All modules show "Coming soon." Video thumbnails are empty boxes.

12. **No GDPR 30-day auto-purge.** Privacy copy promises it. No cron job implements it.

---

## Architecture Decisions

### AD1: Fix C1 — Two-stage upload with Haiku topic extraction

After parsing raw messages from exports, immediately call Haiku to extract structured topics/patterns. Store ONLY the structured extraction in DB. Raw messages exist only in server memory during the request.

Upload flow becomes: parse ZIP → extract raw messages → call Haiku for topics → store topics in DB → discard raw messages.

Analysis engine uses topics ("User asked about meal planning 12 times") instead of raw message dump.

### AD2: Multi-Screenshot Screen Time

`screenTimeData` stores as array. Each upload appends. OCR processes one image at a time. Analysis merges all.

### AD3: Adaptive Haiku Follow-Up

New endpoint `/api/discovery/adaptive`. Takes sessionId, reads screen time + profile, calls Haiku with app-to-screenshot mapping, returns 2-3 personalized requests. New UI sub-phase between uploads and results.

### AD4: Generic Screenshot Extraction

Reuse Haiku Vision for subscriptions, battery, storage, calendar, health. Source-specific prompts. New DB columns per source.

### AD5: Stripe Subscription

Remove comingSoon bypass. Add free trial. Handle subscription lifecycle webhooks. Gate deep analysis behind subscription status.

---

## Implementation Phases

### Phase 1: Ship This Week (Days 1-4)

| # | Task | Size | Revenue Impact |
|---|------|------|----------------|
| 1 | **Fix C1: two-stage upload with Haiku topic extraction** — parse exports → Haiku extracts topics → store topics only → rewrite buildDataContext() | L | P0: Analysis is blind |
| 2 | **Add occupation + age to profile + DB** — 2 new steps in QuickProfile, update session API + schema | M | P0: Needed for adaptive form |
| 3 | **Make instant screenshot sources work** — expand platformSchema, create generic extraction function, add DB columns for subs/battery/storage | L | P0: UI promises, backend rejects |
| 4 | **Wire Stripe subscription EUR 9.99/mo** — remove comingSoon, add trial, handle webhooks, gate deep sources | M | P0: Blocks subscription revenue |
| 5 | **Multi-screenshot Screen Time (1-4)** — array storage, append on upload, merge in analysis | M | P0: 4x richer data |
| 6 | **Signal-to-recommendation mapping** — inject brainstorm mapping table into Sonnet prompt | S | P0: Generic recs kill conversion |

### Phase 2: Ship Next Week (Days 5-8)

| # | Task | Size | Deps |
|---|------|------|------|
| 7 | **Adaptive Haiku follow-up system** — new API endpoint, app-to-screenshot mapping, new UI sub-phase | L | 2, 5 |
| 8 | **Calendar + Health instant sources** — add to UI + backend + analysis | M | 3 |
| 9 | **Fix thank-you page + checkout flow** — pass product param, correct copy | S | 4 |
| 10 | **Honest content placeholders** — remove fake play buttons, add "notify me" email capture | M | - |

### Phase 3: Ship in 2 Weeks (Days 9-14)

| # | Task | Size | Deps |
|---|------|------|------|
| 11 | **Shareable results `/start/[id]`** — public results page + OG image | M | - |
| 12 | **GDPR 30-day auto-purge cron** | S | - |
| 13 | **OG image quality upgrade** | M | 11 |
| 14 | **First real SOP: "Coding in 2026"** | L | - |

### Phase 4: Backlog

| # | Task | Size |
|---|------|------|
| 15 | Gate deep uploads behind subscription check + 3/month limit | M |
| 16 | Email sequences (welcome, export reminder, nudge) | M |
| 17 | Reddit research threads | S |
| 18 | Image export for sharing (Stories-ready) | M |
| 19 | Accessibility audit | S |
| 20 | Bank transactions (optional source) | L |

---

## Content Strategy for Launch

### Must exist:
1. **"Coding in 2026 isn't scary"** — 2000-word SOP. The free hook.
2. **"5 rules to level up your prompts"** — prompting guide SOP.
3. **5 templated build guides** for top recommendations (meal planner, expense tracker, email triage, SaaS replacement, habit tracker). Unlocked at EUR 29.

### Honest placeholders OK:
4. "Claude Code: your co-pilot" — "Recording week of [date]"
5. "Your perfect app setup" — "Personalized after unlock"
6. All locked/paywalled modules

### Must NOT exist as deceptive:
7. Video play buttons on empty gray boxes — remove
8. "Watch the 30-second tutorial" — remove until videos exist

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| C1 analysis blindness is live NOW | Critical | Task 1 first. Delayed exports produce generic results until fixed. |
| "Start free trial" button does nothing | High | Task 4. Temporary: hide deep section until wired. |
| No content = broken promises | High | Task 10 (honest placeholders) + Task 14 (first real SOP) |
| No GDPR purge but copy promises it | High | Task 12. Or change the copy. |
| Haiku topic extraction adds 2-3s latency | Medium | Acceptable for async exports. Show "Analyzing your history..." |
| Adaptive Haiku could hallucinate | Medium | Constrain to structured mapping. Validate with Zod. |
