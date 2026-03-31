# Sprint Prioritizer — Phase 3 Grilling

## Hallucinations from Phase 1

### Mine (Sprint Prioritizer)

**1. The 2-phase flow (scan → result) was described as live. It is not.**
My entire Phase 1 analysis was built on reading `xray-client.tsx` and concluding the product runs a clean "scan → result" 2-phase flow. The QA evidence proves the live site runs a 3-step wizard: context chips → guide wizard → upload zone. The collapsible "Where do I find this?" toggle I read in `UploadZone.tsx` does not exist on the live site. The guide is a mandatory step wizard with an "I know how" skip. These are structurally different UX paradigms — my analysis of friction, drop-off risk, and behavioral mechanics was based on a flow that isn't deployed.

**2. TiersSection exists and CTAs need fixing. It does not exist.**
My single highest-priority fix was: "Change the Starter tier CTA href to `/xray`." The QA agent confirmed TiersSection is entirely absent from the live landing page. The revenue-blocking issue I diagnosed isn't a wrong link — it's a missing section. There is no pricing surface for users to evaluate paid products at all. The fix I prescribed is moot.

**3. `/xray/[id]/og` route claimed as correct and deployed.**
I reviewed `src/app/xray/[id]/og/route.tsx` and stated it was a correct 1200×630 OG image implementation. This was accurate for the code. What I missed: the Rapid Prototyper also claimed the route **did not exist**. QA resolution: the route IS deployed and returns 200 with `image/png`. Both Phase 1 reads were partially wrong — I assumed correctness without flagging the deployment question; Rapid Prototyper assumed absence without verifying. QA found the truth.

**4. Email capture was treated as a fixed item. The Feedback Synthesizer's evidence proves it wasn't.**
I referenced `ResultEmailCapture` as implemented and correct. The Feedback Synthesizer's cross-review of all prior docs shows email capture was the most-flagged issue (7+ times) across the full review corpus. My framing that it was addressed in "this update" repeated the same mistake: the component exists in code, but whether it actually fires and captures to the `subscribers` table with `source: 'xray'` was never verified. I should have flagged this as unverified rather than treating code presence as functional confirmation.

### From Other Agents

**Rapid Prototyper: "/xray/[id]/og route does not exist."**
WRONG. QA confirmed the route exists and returns valid PNG. The Rapid Prototyper read an older state of the codebase or made a false inference. This was the highest-confidence wrong claim across all Phase 1 reports.

**Rapid Prototyper: "Exit CTAs from /discover/overthink dead-end."**
WRONG. QA confirmed the Overthink results page has a clear CTA to `/xray`: "Want to see where ALL your time goes?" + gradient button. The Rapid Prototyper's dead-end claim was false — this CTA exists and works.

**Trend Researcher + UX Researcher + All other agents: "The collapsible guide toggle exists."**
All Phase 1 agents, including myself, accepted the codebase description of a collapsible "Where do I find this?" toggle as the live UX. QA confirmed this does not exist on the live site. The live guide is a mandatory step wizard. Every analysis built on "users might not notice the toggle" or "the toggle is below the fold" was analyzing a ghost.

**UX Researcher: "Context chip label is 'I'm currently…'"**
QA confirmed the live label is "What's your week about?" — a meaningfully better label that the UX Researcher's analysis (correctly) identified as problematic. The live site already fixed the problem that was being diagnosed.

---

## Top 3 REAL Issues (Evidence-Backed)

### 1. No visible focus styles on interactive elements — CRITICAL (WCAG 2.4.7 violation)

**Evidence:** QA explicitly tested keyboard navigation on `/xray`. Zero visible focus indicator on context chip buttons. Confirmed by zoomed inspection. UX Architect flagged this in Phase 1 as "High — fix before launch" (phase1/ux-architect.md lines 239-241). The specific component is `src/features/screenshot-upload/ui/ContextChip.tsx` — no `_focusVisible` prop defined, confirmed missing by UX Architect at line 162-163 of their report.

This is not theoretical. A keyboard-only user cannot navigate the primary conversion surface of the product. The fix is three lines per component: `_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}`. It applies to ContextChip buttons, XRayCardActions buttons, and the result phase reset/back buttons.

**Fix:** Add `_focusVisible` props to all interactive elements in `src/features/screenshot-upload/ui/ContextChip.tsx`, `src/entities/xray-result/ui/XRayCardActions.tsx`, and the reset/back buttons in `src/app/xray/xray-client.tsx`. Reference: `src/widgets/landing/HeroSection.tsx` already implements the correct pattern.

---

### 2. Thank-you page delivers a broken promise on first customer interaction — HIGH

**Evidence:** QA confirmed two failures on `meldar.ai/thank-you`:
- Hardcoded "Your Time Audit is on its way" copy regardless of product purchased. An `appBuild` buyer (EUR 79) sees wrong confirmation.
- Page says "Check your email for confirmation" — Feedback Synthesizer (phase1/feedback-synthesizer.md lines 136-140) confirmed the webhook sends zero purchase confirmation emails. This is a legally and commercially broken promise on the first paying customer touchpoint.

This compounds: if the Stripe webhook fails silently (no `STRIPE_WEBHOOK_SECRET` in Vercel env — flagged in my Phase 1 critical path, item 4), the founder also never gets notified of the purchase. The customer paid, gets wrong copy, gets no email, and founder doesn't know.

**Fix (in priority order):**
1. Genericize thank-you copy to "Your order is confirmed." in `src/app/thank-you/page.tsx` (~15 min)
2. Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel env
3. Confirm purchase confirmation email fires in `src/app/api/billing/webhook/route.ts`

---

### 3. /discover hub is a content island with no navigation path — MODERATE-HIGH

**Evidence:** QA confirmed `/discover` is NOT linked from the header, landing page, or footer. Only reachable via direct URL. The page contains three working discovery tools (Time X-Ray, Overthink Report, Sleep Debt Score) but zero users will find it organically.

This matters more than it sounds: the /discover hub is the product's multi-tool positioning made visible. If Meldar's competitive claim is "effort escalation funnel" and "multiple discovery paths," but the only user-accessible path is `/xray`, then the platform positioning doesn't exist from the user's perspective.

**Fix:** Add `/discover` to the header nav (or at minimum to the footer) in `src/widgets/header/Header.tsx` and `src/widgets/footer/Footer.tsx`. One link, 10 minutes. Also: `/discover/sleep` and `/discover/overthink` both exist and work — these are fully functional free tools being hidden from every user.

---

## What's ACTUALLY Good (Evidence-Backed)

**1. The 3-step wizard on /xray is better than the collapsible toggle.**
The live site replaced the "Where do I find this?" toggle (which UX Researcher correctly predicted users would miss) with a mandatory step wizard that has an "I know how" skip. QA confirmed this renders well on desktop and mobile. The UX regression the UX Researcher diagnosed was preemptively fixed before Phase 1 ran. The live design is better than the code we reviewed.

**2. Context chip label improved without being asked.**
Live label "What's your week about?" is sharper than the "I'm currently..." label all agents reviewed. This was a quiet improvement that no Phase 1 agent caught — QA surfaced it.

**3. Mock /api/analyze-screenshot route is gone.**
QA confirmed both GET and POST return 404. Feedback Synthesizer flagged this as a blocker cited by 4 reviewers. It was fixed. The real implementation at `/api/upload/screentime` is the only screenshot endpoint.

**4. Quiz results have exit CTAs to /xray (no dead-end).**
QA confirmed: "You named them. Now let's measure them." + "Get your real Time X-Ray" gradient button linking `/xray`. Rapid Prototyper's dead-end claim was wrong. The quiz-to-xray handoff works.

**5. No fake hour estimates on quiz results.**
QA confirmed `weeklyHours` values are NOT displayed on the quiz results page. This was the #1 trust destroyer identified across multiple prior review rounds. Fixed.

**6. OG image route is deployed.**
`/xray/[id]/og` returns 200 with `image/png`. The viral loop infrastructure exists. Whether the image is compelling is a separate question (Social Strategist's critique stands) but the route is live and functional.

---

## Cross-Review Notes

### Agreements

**With UX Architect:** Focus styles are the clearest confirmed failure. Their Phase 1 diagnosis (no `_focusVisible` on chips) was 100% validated by QA. This is the fix with the clearest evidence trail and lowest implementation cost.

**With Visual Storyteller:** The "Job hunting" chip orphan on mobile (375px) is confirmed by QA as a real visual defect. Not critical but visually unbalanced and the easiest cosmetic fix available.

**With Feedback Synthesizer:** The thank-you page broken promise is real and confirmed. Their cross-review of the full corpus correctly identified this as a persistent unfixed issue. QA validated it.

**With Product Manager:** The funnel conversion tracking gap ("black box between upload and revenue") is still not verified by QA — it requires completing a real upload, which was untestable. This remains the most important unresolved question for revenue measurement.

**With Nudge Engine:** Context chip persistence on page refresh was tested by QA and confirmed as a PARTIAL FAIL — no sessionStorage preservation, full page reload resets to start. The behavioral concern about broken micro-commitment is validated.

### Disagreements

**With Rapid Prototyper on OG route:** Their Phase 1 claim that "/xray/[id]/og route does not exist" was wrong. QA proved it exists. This was the most consequential false negative in Phase 1 — it implied a high-priority build task that was already done.

**With Rapid Prototyper on /discover dead-ends:** Their claim that Overthink/Sleep quizzes dead-end was wrong. Exit CTAs to /xray exist and work. The actual problem (which nobody named correctly in Phase 1) is that `/discover` itself is the unreachable surface — not the quiz exits within it.

**With myself (Sprint Prioritizer) on priority ordering:** I ranked "Fix TiersSection CTAs" as item 1 on the critical path to revenue. TiersSection doesn't exist. The real item 1 is the thank-you broken promise (confirmed critical, fixable in 15 minutes) and the focus styles WCAG violation (confirmed by QA, fixable in under an hour). My prioritization was based on a section that isn't deployed.

### What Phase 1 Missed Entirely (No Agent Caught)

- **og:url is `https://meldar.ai` on all sub-pages.** Both `/xray` and `/quiz` have wrong `og:url`. This is an SEO duplicate content signal and was not flagged by any Phase 1 agent including the Sprint Prioritizer.
- **Contact email is a personal Gmail.** `gosha.skryuchenkov@gmail.com` in the footer. Minor but undermines professional brand trust. Zero Phase 1 agents read the footer carefully enough to catch this.
- **The live /xray flow is a 3-phase wizard, not 2-phase.** All 10 Phase 1 agents analyzed a code version that doesn't match deployment. This is the meta-finding: Phase 1 reviewed the codebase; Phase 2 reviewed reality. They were reviewing different products.
