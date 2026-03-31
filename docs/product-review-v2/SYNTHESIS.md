# Product Review v2 — Final Synthesis

**Date:** 2026-03-31
**Focus:** Discovery form update (4-phase → 2-phase redesign)
**Agents:** 10 specialists + 1 QA evidence collector
**Phases:** Discovery → Evidence Collection → Grilling

---

## Critical Context

Phase 1 agents reviewed the **codebase** (2-phase scan → result flow). The QA agent tested the **live site** (3-step wizard: context → guide → upload). The new code has not been deployed yet. Findings below are split accordingly.

---

## Issues by Severity

### CRITICAL

| # | Issue | Evidence | Agents | Fix Est. |
|---|-------|----------|--------|----------|
| C1 | **Thank-you page broken promise** — hardcodes "Time Audit" copy regardless of product + says "check your email" but no confirmation email is sent | QA confirmed on live site | PM, Sprint-Pri, Feedback-Syn, Proto | 30 min |
| C2 | **OG image not viral-ready** — system-ui font (not Bricolage), no bar chart, 64px hero number on 1200px canvas, cream background reads blank at thumbnail size | QA confirmed route exists but quality is poor; 6 agents flagged independently | Social, Visual, Trend-Res, Feedback-Syn, Proto, UX-Arch | 60 min |

### HIGH

| # | Issue | Evidence | Agents | Fix Est. |
|---|-------|----------|--------|----------|
| H1 | **No focus styles on /xray interactive elements** — ContextChip buttons, upload zone, share buttons, result actions all lack `_focusVisible`. WCAG 2.4.7 violation | QA confirmed via live keyboard testing | UX-Arch, UX-Res, Feedback-Syn, Nudge-Eng, Proto | 30 min |
| H2 | **No `prefers-reduced-motion` handling** — 11 animation sites (barFill, scanPulse, scanLine, gentleBreathe, etc.) with zero reduced-motion fallback | Code-confirmed across globals.css + all animated components | UX-Arch, Visual | 10 min |
| H3 | **Quiz → /xray context handoff is a cold restart** — pain point selections from quiz are lost on navigation. No sessionStorage, no URL params | QA confirmed: page refresh resets wizard progress | Nudge-Eng, Trend-Res, PM | 15 min |
| H4 | **/discover hub is a content island** — 3 working discovery tools not linked from header, landing page, or footer | QA confirmed: unreachable except by direct URL | Sprint-Pri, Proto, Social, PM | 15 min |
| H5 | **Share mechanic sends URL, not image** — no html2canvas/image blob export. Gen Z sharing (Stories, iMessage) requires inline images | Code-confirmed: XRayCardActions only has link copy + Web Share API | Social, Visual | 45 min |
| H6 | **`#874a72` gradient midpoint hardcoded in 3 files** — not in design tokens, creates drift | Code-confirmed in XRayCard, UploadZone, ResultEmailCapture | UX-Arch | 20 min |

### MEDIUM

| # | Issue | Evidence | Agents | Fix Est. |
|---|-------|----------|--------|----------|
| M1 | **"Job hunting" chip orphans on mobile 375px** — wraps to second row alone | QA flagged as layout concern | Nudge-Eng, Visual | 10 min |
| M2 | **Share text is generic** — "Check out my screen time breakdown" has no personalized data point | Code-confirmed in XRayCardActions | Social | 5 min |
| M3 | **No time period on X-Ray card** — no "7-day average" or date range weakens shareability | Code-confirmed: XRayCard has no date prop | Visual, Social | 15 min |
| M4 | **ScreenshotGuide.tsx is dead code** — 220 lines, removed from barrel export, never imported | Code-confirmed | Proto | 2 min |
| M5 | **`accent` field in ContextChip OPTIONS is dead code** — defined but never rendered | Code-confirmed | Visual, UX-Arch | 2 min |
| M6 | **No `aria-live` on upload progress steps** — screen readers silent during processing | Code-confirmed | UX-Arch, Feedback-Syn | 10 min |
| M7 | **Deletion banner competes with result animation** — both fire simultaneously on phase transition | Code-confirmed: 5s timer starts at same time as staggered reveals | Nudge-Eng | 5 min |
| M8 | **No branded 404 for /xray/[id]** — GDPR purge will turn shared URLs into generic Next.js 404 | Code/architecture gap | Visual | 30 min |

### LOW

| # | Issue | Evidence | Agents | Fix Est. |
|---|-------|----------|--------|----------|
| L1 | **Email capture sequenced after upsell** — users not ready to buy may close before seeing the lower-friction email option | Code-confirmed: delay 1100ms vs upsell 900ms | Nudge-Eng | 5 min |
| L2 | **Rule-based insights feel generic** — deterministic if/else, not AI-personalized. "Your AI" positioning vs wellness-blog prescriptions | Code-confirmed in insights.ts | PM, Trend-Res | Backlog |
| L3 | **Auth system built but unused** — 6 API routes + tests, zero UI consumers. Plan says Phase 3 | Code-confirmed | Sprint-Pri, Proto | Freeze |

---

## Top 5 Actions (Ranked by Impact)

| Priority | Action | Issues Fixed | Time | Impact |
|----------|--------|-------------|------|--------|
| **1** | **Fix OG image** — use Bricolage font, add bar chart, increase hero number to 128px+, add dark/rich background | C2, M3 | 60 min | Unblocks viral loop. Every share currently produces a weak preview. |
| **2** | **Add focus styles + reduced-motion + aria-live** | H1, H2, M6 | 45 min | WCAG compliance. Legal exposure for Finnish company. |
| **3** | **Fix thank-you page** — dynamic copy per product, verify confirmation email sends | C1 | 30 min | Every paying customer hits this page. Broken first impression. |
| **4** | **Link /discover from header navigation** | H4 | 15 min | 3 finished discovery tools become reachable. Free funnel entries. |
| **5** | **Add image export to share flow** | H5, M2 | 45 min | Enables Gen Z's primary sharing format (Stories, group chats). |

**Total for top 5:** ~3.25 hours

---

## What's Working (Consensus Positives)

- **3-step wizard (live)** is better UX than both the old 4-phase and the new 2-phase designs for first-time users. The mandatory guide step prevents the #1 drop-off risk (no screenshot in camera roll).
- **OG route infrastructure exists** — the route is deployed, returns valid PNG. Just needs visual quality upgrade.
- **Privacy-first positioning is correctly executed** — deletion banner, "never stored" copy, GDPR-compliant consent flow.
- **X-Ray card visual design is screenshot-worthy** — gradient header, big number, staggered bar reveal, noise texture detail.
- **Mock routes cleaned up** — `/api/analyze-screenshot` deleted, fake hour estimates removed.
- **Quiz exit CTAs work** — overthink quiz links to `/xray`, not a dead end.
- **Brand consistency** — Bricolage + Inter fonts, mauve/peach gradient, warm cream surfaces are cohesive.

---

## What to Kill

| Item | Reason |
|------|--------|
| `ScreenshotGuide.tsx` | Dead file — 220 lines, not imported anywhere after redesign |
| `accent` field in ContextChip OPTIONS | Dead code — defined but never used |
| Auth system UI work | Freeze — backend is built and tested, no UI consumers needed until Phase 3 dashboard |
| Focus Mode UI (ambient blobs) | Defer — backend flag is fine, but the UI has no conversion data justifying its existence |

---

## Verdict

**Is the product ready for testers?** Yes, with conditions.

The core loop works: quiz → screenshot upload → AI extraction → personalized X-Ray card → share. The infrastructure is sound. The visual design is above-average for PoC stage.

**3 blockers before inviting testers:**
1. Fix the thank-you page (C1) — paying customers see broken copy
2. Add focus styles (H1) — accessibility compliance
3. Deploy the new 2-phase redesign and verify end-to-end

**What's blocking revenue:**
The viral loop is architecturally complete but visually broken at the OG image layer (C2). Every share produces a weak preview. Fix this first — it's the highest-leverage hour of work in the entire backlog.

**Biggest strategic risk (from Trend Researcher):**
The privacy policy promises "30-day automatic purge" but no cron job implements it. Under Finnish DPA jurisdiction, this is a regulatory liability. Privacy-first positioning is Meldar's primary trust signal — a false privacy claim is the single point of failure that could collapse it.

---

## Phase 1 Hallucination Summary

The biggest meta-finding: **all 10 Phase 1 agents reviewed code that doesn't match the live site.** The 2-phase redesign was in the codebase but not deployed. Key false claims caught by QA:

- Rapid Prototyper: "/xray/[id]/og route doesn't exist" — **it does**
- Rapid Prototyper: "/discover quizzes dead-end" — **they have exit CTAs**
- 4+ agents: "collapsible guide toggle" analysis — **doesn't exist on live site**
- 3 agents: TiersSection CTA analysis — **section removed from live site**
- All agents: described "I'm currently..." chip label — **live site says "What's your week about?"**

This underscores the value of the QA evidence phase. Code review alone is insufficient for product assessment.
