# Sprint Prioritizer — Phase 1 Discovery

**Date:** 2026-03-31
**Author:** Sprint Prioritizer Agent
**Focus:** X-Ray flow redesign (4 phases → 2 phases) — what's over-built vs under-built, critical path to first revenue

---

## Files Examined

| File | Key Observations |
|---|---|
| `src/app/xray/xray-client.tsx` | Clean 2-phase orchestrator (`scan` → `result`). Well-structured. The `lifeStage` state is threaded through correctly. `showDeletionBanner` timeout is a nice trust signal. |
| `src/features/screenshot-upload/ui/UploadZone.tsx` | Polished: drag/drop, compression, 4-step progress indicator, scan-line animation during processing, collapsible "Where do I find this?" guide. ~440 lines total. |
| `src/features/screenshot-upload/ui/ContextChip.tsx` | 64 lines, clean. 4 life stages. Deselection works. Scale + shadow on hover. Proportionate. |
| `src/entities/xray-result/ui/XRayCard.tsx` | 205 lines. Gradient header, animated data bars per app (top 5), pickups + top app stats row, insight quote. Visually the strongest component in the codebase. |
| `src/features/screenshot-upload/ui/ResultEmailCapture.tsx` | 160 lines. Email capture with success state. Submits to `/api/subscribe` with `xrayId`. Tracked with GA. Correct. |
| `src/shared/styles/globals.css` | 9 keyframe animations: `meldarFadeSlideUp`, `focusDrift1/2`, `scanPulse`, `scanLine`, `barFill`, `shimmer`, `gentleBreathe`, `phaseExit`, `counterUp`. `phaseExit` and `shimmer` are defined but not referenced in the components examined. |
| `src/features/billing/ui/UpsellBlock.tsx` | Picks highest-urgency upsell from the array. Maps tier → product config with prices. 50 lines, well-contained. |
| `src/features/billing/ui/PurchaseButton.tsx` | 89 lines. Calls `/api/billing/checkout`. Handles `comingSoon` redirect to `/coming-soon`. Tracks `checkout_initiated` GA event. **`starter` product redirects to `/coming-soon` — this is working as intended per checkout route.** |
| `src/app/api/billing/checkout/route.ts` | Real Stripe integration with live price IDs. Handles `timeAudit` (EUR 29) and `appBuild` (EUR 79) via Stripe Checkout. `starter` product is intentionally gated behind `/coming-soon`. |
| `src/app/api/billing/webhook/route.ts` | Signature-verified Stripe webhook. Inserts to `auditOrders`, sends purchase confirmation email via Resend, notifies founder email. Complete. |
| `src/app/api/upload/screentime/route.ts` | Live Claude Haiku 4.5 Vision call. Rate-limited. Validates file type/size. Saves result to DB. Generates insights + upsells rule-based (zero AI cost). Returns `id` for shareable URL. |
| `src/app/xray/[id]/page.tsx` | Server-rendered shareable page. Correct `generateMetadata` with dynamic OG images. Viral CTA at bottom ("Get your own Time X-Ray"). |
| `src/app/xray/[id]/og/route.tsx` | Dynamic OG image via `next/og`. Shows total hours, top 3 apps, pickups. Correct 1200×630. |
| `src/widgets/landing/HeroSection.tsx` | Updated: two-track hero ("Show me my data" → `/xray`, "I know what bugs me" → `/quiz`). No email capture in hero. CTAs are correct. |
| `src/widgets/landing/TiersSection.tsx` | All three tiers CTA to `/quiz` — including paid tiers. This is a dead-end for revenue. |
| `src/app/api/auth/login/route.ts` | Full password auth: JWT in httpOnly cookie, rate-limited, bcrypt password verify. |
| `src/app/api/auth/register/route.ts` | Full register: bcrypt hash, email verification flow via Resend, JWT cookie on success. |
| `src/server/identity/` | JWT + bcrypt password utilities exist. Tested (vitest). |
| `src/app/dashboard/` | **Does not exist.** Auth backend is built but there is no dashboard UI or middleware. |
| `src/features/focus-mode/` | `FocusAmbient` (animated blobs), `FocusModeToggle` (popover with Yes/No), cookie-based state. Used on `/xray` and `/quiz`. Modifies Claude prompt via `focusMode` flag on the API. |
| `src/server/discovery/insights.ts` | 300 lines of rule-based insight + fix steps generation. Platform-aware (iOS/Android). Focus mode awareness for gaming apps. Very thorough. |
| `src/app/thank-you/page.tsx` | Static post-purchase page. Hardcoded "Time Audit" copy regardless of product purchased (minor bug). |
| `src/features/screenshot-upload/ui/ScreenshotGuide.tsx` | File exists but is **not imported anywhere** — the guide was inlined into `UploadZone.tsx`. Dead file. |

---

## Over-Built (Cut or Defer)

### 1. Focus Mode — defer until user-validated

**What it is:** A cookie-based "focus mode" that (a) renders animated ambient blobs on the page background and (b) adds a prompt addendum to Claude that reframes gaming apps as focus tools.

**Why it's over-built right now:**
- The feature requires users to discover and click a `FocusModeToggle` in the header, understand the popover, then answer Yes/No. This is 3 interactions before value.
- The prompt addendum only affects gaming apps (specifically a hardcoded set of 10 games). The vast majority of users won't see any difference in their result.
- The ambient blobs (`FocusAmbient`) are a visual-only effect that adds DOM weight and continuous CSS animation on both `/xray` and `/quiz` — even for users who never enabled focus mode (the component checks `if (!focusMode) return null`, so the render is cheap, but the component is imported regardless).
- No analytics instrumentation to measure whether focus mode users convert better.
- `FocusModeToggle` is shown in the header globally but focus mode only meaningfully affects one API call.

**Recommendation:** Defer the toggle UI and the ambient blobs. Keep the `focusMode` cookie + prompt addendum as a backend flag — it's 3 lines and costs nothing. Reintroduce the toggle UI when there's data showing gaming-heavy users drop off without it.

### 2. Auth system — 3 phases too early

**What it is:** Full password auth (`register`, `login`, `verify-email`, `forgot-password`, `reset-password`) with JWT cookies, bcrypt, Resend verification emails, and tests.

**Why it's over-built right now:**
- The plan's Phase 3 says auth is weeks 7-10. The codebase is in Phase 1 (week 1-2).
- There is no `/login` or `/register` page, no middleware protecting any route, and no dashboard. The backend auth code is complete but has no UI consumer.
- Auth creates a signup friction that directly conflicts with the core "zero friction" positioning. Every X-Ray user currently completes the flow without any account.
- The `users` table exists in the schema with `passwordHash`, `verifyToken`, `xrayUsageCount` etc. but nothing writes to `users` during the normal X-Ray flow.
- The 4 auth API routes + test files represent ~500 lines of code that are completely inert in production.

**Recommendation:** Leave the auth code in place (it's correct and will be needed), but don't wire it to any UI until Phase 3. Do not add login/register buttons or pages in Phase 1 or Phase 2. The current "identity = email captured post-X-Ray" model is correct for now.

### 3. `ScreenshotGuide.tsx` — dead file

`src/features/screenshot-upload/ui/ScreenshotGuide.tsx` exists but is never imported. The guide was inlined into `UploadZone.tsx`. This is pure dead code.

**Recommendation:** Delete it.

### 4. `phaseExit` and `shimmer` keyframes — unused

Both are defined in `globals.css` but not referenced in any component examined. Minor cleanup candidate.

### 5. Staggered delay totals ~1.2 seconds before last element appears

The result phase uses `RevealStagger` with delays: 400ms → 500ms → 700ms → 900ms → 1100ms → 1200ms. The UpsellBlock (the primary revenue CTA) appears at 900ms delay. Email capture at 1100ms. The final action buttons at 1200ms.

On a fast connection this is fine. On a slow mobile connection where the API call took 4-5 seconds already, adding another 1.2 seconds of animation delay before the purchase CTA appears is measurable conversion friction.

**Recommendation:** Keep the `XRayCard` reveal (600ms, dramatic). Cut or halve the delays on everything after it. UpsellBlock should appear no later than 400ms after the card.

---

## Under-Built (Blocking Revenue)

### 1. Tier CTAs don't reach Stripe

The `TiersSection.tsx` has all three tier cards — "Time X-Ray" (free), "Starter" (pay as you go), "Concierge" (we handle it). All three CTA buttons link to `/quiz`. For the Starter tier, the CTA text is "Join the waitlist" but it navigates to `/quiz`, not to a purchase or email capture flow.

**This is the single highest-priority fix.** A user who scrolls to the Tiers section and clicks "Join the waitlist" on the Starter card should either:
- Hit a Stripe Checkout session (`timeAudit` at EUR 29 is the closest live product)
- OR land on an email capture with Founding 50 messaging

Instead they get the quiz, which has no purchase path at the end.

**Fix:** Change the Starter tier CTA href to `/xray` (which leads to the full funnel including UpsellBlock → Stripe). Change the Concierge tier CTA to an email capture or `mailto:` link.

### 2. `/thank-you` page is hardcoded to "Time Audit"

`src/app/thank-you/page.tsx` says "Your Time Audit is on its way" regardless of which product was purchased. If someone buys `appBuild` (EUR 79), they see the wrong confirmation copy.

**Fix:** Read `session_id` from the URL query param (already in the `success_url` pattern), or just genericize the copy to "Your order is confirmed."

### 3. No `/audit/[token]` delivery page

The plan lists `/audit/[token]` as a Phase 2 page — the post-purchase delivery surface where the founder delivers the actual Time Audit. The `auditOrders` table has a `status` column (`paid` | `in_progress` | `delivered`) and `deliveredAt` timestamp, but there is no page to deliver to.

Currently, when someone pays EUR 29, they get:
1. A Stripe Checkout page
2. A confirmation email from Resend saying "within 72 hours"
3. The `/thank-you` page

There is no delivery mechanism. The founder has to manually email the audit. This is acceptable as a manual process for the first 10 orders, but it's a gap.

**Recommendation:** Not blocking for first revenue. Manual delivery via email is fine at PoC scale. Build `/audit/[token]` in Phase 2.

### 4. `quiz → xray` handoff exists but is not prominent on the quiz results page

`PainQuiz` results show pain point cards. The CTA to go deeper ("Get your real numbers — 30 seconds") presumably links to `/xray`, but the quiz results are the second most-trafficked surface after the landing page. Reading the plan and comparing to code, this CTA exists, but it's worth verifying it's visible and compelling enough to drive upload intent.

### 5. No OG image for `/quiz` or `/`

The plan calls out `/xray/[id]/og` as the viral surface — and that's built and correct. But the landing page and quiz page don't have custom OG images. This is minor but affects social sharing of the root URL.

---

## Critical Path to Revenue

Ordered by unblocking the EUR 29 `timeAudit` purchase:

1. **Fix `TiersSection.tsx` CTAs** — Starter "Join the waitlist" → `/xray`. Concierge → email or `mailto:`. This unblocks the purchase path for users who scroll to the pricing section. ~30 minutes.

2. **Fix `/thank-you` copy** — Genericize or make product-aware. ~15 minutes.

3. **Verify Stripe price IDs are live in production** — `price_1TGgkpE6hO9BfX87JM1IzXi0` (timeAudit) and `price_1TGgljE6hO9BfX87akbRkjWB` (appBuild) in `src/shared/config/stripe.ts`. If these are test-mode IDs, no real payment can happen. QA must verify.

4. **Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel env** — Without it, every Stripe webhook returns 401. `auditOrders` never gets written. Founder notification email never fires. The purchase appears to succeed from the user's perspective (Stripe charges them) but the backend has no record.

5. **Verify Claude Vision integration is live** — `src/server/discovery/ocr.ts` calls `claude-haiku-4-5-20251001`. If `ANTHROPIC_API_KEY` is missing in Vercel env, every upload returns 500. No X-Ray = no funnel.

6. **Verify Neon DB connection string is set** — Without `DATABASE_URL`, every DB write (`xrayResults`, `auditOrders`, `subscribers`) fails silently or throws. Shareable X-Ray URLs won't work.

7. **Cut staggered delay on UpsellBlock** — Move from 900ms to 300ms. Minor code change, measurable impact on purchase CTA visibility.

8. **Delete dead files** — `ScreenshotGuide.tsx`, unused keyframes. Not revenue-blocking but reduces confusion.

---

## Questions for QA Agent

1. **Are the Stripe price IDs live-mode IDs?** Check `src/shared/config/stripe.ts` — the three price IDs (`price_1TGgkp...`, `price_1TGglj...`, `price_1TGh4O...`). Test by clicking "Get your X-Ray" on `/xray`, uploading a real screenshot, and attempting the EUR 29 checkout. Does it reach a real Stripe Checkout page? Does the URL say `checkout.stripe.com` or is there an error?

2. **Does the upload flow complete successfully on the live site?** Go to `meldar.ai/xray`, upload an actual iPhone Screen Time screenshot, and confirm: (a) the analysis completes without a 500 error, (b) a result card appears with real app names, (c) the shareable URL (`/xray/[id]`) works after page reload. This verifies `ANTHROPIC_API_KEY`, `DATABASE_URL`, and the Claude Haiku integration are all wired correctly in Vercel.

3. **What do the Tiers CTAs actually do on the live site?** On `meldar.ai`, scroll to the pricing section. Click "Get your free X-Ray" (Time X-Ray tier), "Join the waitlist" (Starter tier), and the Concierge CTA. Document where each one navigates. The current code sends all three to `/quiz` — confirm whether this is what the live site does, or if an older version was deployed.

4. **Does the deletion banner appear after upload?** After uploading a screenshot, the `showDeletionBanner` is set to `true` for 5 seconds. Confirm it appears on mobile (the primary device for Screen Time screenshots). The banner is `position: relative` inside the result flow — verify it's visible and not clipped.

5. **Is the Focus Mode toggle visible in the header on mobile?** `FocusModeToggle` renders `<span display={{ base: 'none', md: 'inline' }}>Focus</span>` — the text hides on mobile but the button with the Sparkles icon remains. Confirm the icon-only button is tappable and the popover doesn't clip offscreen on a 375px-wide phone.
