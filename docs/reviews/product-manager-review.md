# Product Manager Review: Meldar PoC

**Reviewer:** Product Manager Agent
**Date:** 2026-03-30
**Scope:** Product-market fit readiness, funnel design, risks, and launch readiness

---

## 1. Does the PoC validate the core hypothesis?

**Hypothesis:** People will pay to understand their screen time.

**Partially.** The PoC validates that people will *engage* with a free screen time analysis. It does not yet validate willingness to pay. The critical gap is that Phase 1 (Weeks 1-2) explicitly targets EUR 0 in revenue -- all 50 founding members get the Time Audit for free. Actual payment validation is deferred to Phase 2 (Weeks 3-6), which means the earliest you learn whether anyone will pay EUR 29 is Week 6.

**Recommendation:** Shorten the feedback loop. Even within the Founding 50, consider asking 10 members to pay EUR 5-10 as a "commitment deposit" (refundable). The act of entering a credit card is the signal you need. Free users liking a free thing tells you nothing about willingness to pay.

---

## 2. Is the funnel (quiz -> upload -> xray -> pay) the shortest path to validation?

**Almost, but the quiz step may be unnecessary friction for the PoC.** The quiz adds 15 seconds and a page transition before the user reaches the real value (the X-Ray). For a PoC whose sole job is to test willingness to pay, you could let users go straight to `/xray` from the landing page.

**However**, the quiz serves a secondary purpose: priming users emotionally before the reveal. "You told us your pain, now see the data." This is a valid psychological framing device. Keep it, but also add a direct CTA on the landing page that goes straight to `/xray` -- let the data tell you which path converts better.

The funnel itself is well-designed:
- Low effort at each step (15s quiz, 30s screenshot upload)
- Clear value exchange before asking for money
- Upsell appears in context (after seeing the data), not before

The `xray-client.tsx` implementation is clean. Upload -> result -> upsell is inline, no page refreshes. Good.

---

## 3. What metrics should be tracked from day 1?

The plan lists GA4 conversion events (Section 14) but doesn't call out which are the *must-watch* metrics vs. nice-to-haves. Here is the priority stack:

### Tier 1 -- Watch daily
| Metric | Signal |
|--------|--------|
| **Screenshot upload count** | Demand exists |
| **X-Ray completion rate** (upload -> result rendered) | Pipeline works |
| **Share rate** (result -> share button clicked) | Viral potential |
| **Upsell CTA click rate** (result -> Stripe Checkout initiated) | Revenue potential |
| **Checkout completion rate** (Checkout initiated -> payment) | Willingness to pay |

### Tier 2 -- Watch weekly
| Metric | Signal |
|--------|--------|
| Quiz -> screenshot conversion | Funnel health |
| Founding 50 fill rate | Organic traction |
| Shareable link click-through rate (OG card -> site visit) | Viral coefficient |
| Time on X-Ray result page | Engagement quality |

### Tier 3 -- Defer until Phase 2
| Metric | Signal |
|--------|--------|
| NPS | Satisfaction (need enough users first) |
| Playbook email open rate | Retention mechanism |
| Repeat upload rate | Habit formation |

**Missing from the plan:** Funnel drop-off tracking. You need to know *where* people stop. Add `quiz_started` and `quiz_abandoned` events alongside `quiz_complete`. Add `upload_started` and `upload_failed` alongside `screenshot_upload`.

---

## 4. Is anything over-built for a PoC?

**Yes, several things:**

### Over-built
1. **App Build product (EUR 79 in `UpsellBlock.tsx`, EUR 49 in the plan).** The plan says EUR 49, the code says EUR 79. Price discrepancy aside, offering two one-time products at launch splits the user's attention. For PoC, just offer the Time Audit. One product, one price, one decision.

2. **Starter subscription (EUR 9.99/mo) in Stripe config.** The plan explicitly says subscriptions are Phase 3/MVP. Yet `stripe.ts` already has the Starter price ID configured and `UpsellBlock.tsx` has the `starter` tier wired up. If a user somehow gets upsold to Starter, what do they get? The "coming soon" page is the answer (`/coming-soon`), which is a bad experience. Remove the subscription upsell until the product exists.

3. **Concierge tier mapped to `starter` product slug.** In `UpsellBlock.tsx`, `concierge` maps to `{ product: 'starter' as const, label: 'Contact us', price: '' }`. This is a data integrity issue. It won't break Stripe (the "Contact us" label suggests no checkout), but it's confusing code that will cause bugs later.

4. **The "12 IT Seniors" narrative.** For a PoC with 50 users, this is marketing overhead that doesn't validate the core hypothesis. It's a nice differentiator for Phase 2. For now, spend that time on conversion optimization.

### Appropriately built
- Rule-based insights (`insights.ts`) -- zero AI cost, good enough for PoC
- Rule-based upsells (`upsells.ts`) -- smart, deterministic, debuggable
- In-memory screenshot processing -- privacy by architecture, no storage cost
- Shareable X-Ray with OG images -- viral loop is critical for organic growth

---

## 5. Is anything under-built?

**Yes:**

1. **No email capture after X-Ray.** The `xray-client.tsx` shows the result, upsell, and "upload another" button. But there is no email capture on the result page. If a user doesn't buy, you lose them forever. Add an email field: "Get your X-Ray results emailed to you" -- this is your fallback conversion.

2. **No "Thank You" page.** The plan mentions `/thank-you` but it doesn't exist in the codebase yet. Post-purchase experience matters. Even a simple page with "Your audit is coming within 72 hours" + "Share your X-Ray while you wait" would do.

3. **No error recovery UX for Vision API failures.** The plan's error handling matrix is thorough (Section 5), but the `xray-client.tsx` has no visible error state. If the upload fails, what does the user see? The `UploadZone` component presumably handles this, but the parent page should show a fallback CTA: "Something went wrong. Email us your screenshot at [email] and we'll process it manually."

4. **No analytics integration in the X-Ray flow.** The GA4 events are defined in the plan but none of the reviewed code files fire analytics events. `xray-client.tsx` doesn't track `xray_created` or `xray_shared`. `UpsellBlock.tsx` doesn't track `checkout_initiated`. This needs to be wired before launch.

---

## 6. What's the #1 risk that could kill this product?

**Risk #1: The value proposition is free elsewhere.**

Apple Screen Time and Android Digital Wellbeing already show users their screen time data. The "Time X-Ray" is a prettier presentation of data users can already access for free. The plan acknowledges this ("Spotify Wrapped for productivity") but the competitive moat is thin.

The *real* value is in the audit and the app builds -- the human-in-the-loop services. But those are behind a paywall that requires trust you haven't earned yet. The free X-Ray needs to deliver an insight that Screen Time *doesn't* -- something like "You spend 16 hours/week on Instagram. That's 832 hours a year. If you used even 10% of that time to learn a skill, here's what you could achieve."

The current insight generation (`insights.ts`) is functional but generic. "That's 16 hours a week" is factual but not motivating. The comparison to a full work day is better. **The insight quality is the make-or-break differentiator.** If the free X-Ray doesn't create an emotional reaction, nobody shares it, and nobody pays.

**Mitigation:** Invest in the insight copy. Make the comparisons personal and shareable. "You picked up your phone 87 times today. That's once every 11 minutes. Every time you did, it took ~23 minutes to fully refocus." Frame the upsell as the solution to the problem you just revealed.

---

## 7. If you were launching this tomorrow, what would you cut?

1. **Cut the App Build product.** One product (Time Audit, EUR 29). One decision. Validate demand for the core offering before expanding.
2. **Cut the Starter subscription tier** from all PoC code. The product doesn't exist yet. Don't show it.
3. **Cut the "12 Seniors" narrative** from Phase 1. It's marketing polish, not validation.
4. **Cut the quiz as a required step.** Make it optional. Let users go directly to `/xray`. Measure which path converts better.
5. **Cut the "Save as image" feature** (already deferred to Phase 2 per the plan -- make sure it stays deferred).

---

## 8. If you were launching this tomorrow, what's missing?

1. **Post-result email capture.** Non-negotiable. If they don't buy, capture the email.
2. **Thank-you page** (`/thank-you`). Even a placeholder.
3. **GA4 event firing** in the actual components (`xray-client.tsx`, `UpsellBlock.tsx`, `PurchaseButton.tsx`).
4. **A founder notification** when someone uploads a screenshot or initiates checkout. You need to know in real-time when the funnel is active. A Resend email to the founder on each `xray_created` event would take 10 minutes to implement and provides invaluable signal.
5. **Consistent pricing.** The plan says App Build is EUR 49. `UpsellBlock.tsx` says EUR 79. Stripe has a price ID but the amount isn't visible in `stripe.ts`. Align these before launch.

---

## 9. Is the "Founding 50" program well-designed for learning?

**Mostly yes, with one structural flaw.**

### What works
- **Counter creates urgency.** "27 of 50 spots remaining" is a proven scarcity mechanism.
- **Intake form (5 questions via Tally)** gives you qualitative signal before you invest 2 hours in a manual audit.
- **Weekly playbook** creates a recurring touchpoint and prevents silent churn.
- **"Shape the Product" vote** makes members feel invested.
- **Founding pricing locked forever** -- strong retention hook.

### Structural flaw
**The program is designed for engagement, not for validating willingness to pay.** All 50 founding members get everything for free. You learn whether people *like* the product, not whether they'd *pay* for it.

**Recommendation:** Split the Founding 50 into two cohorts:
- **Cohort A (25 members):** Everything free, as planned.
- **Cohort B (25 members):** Free X-Ray + free audit, but asked to pay EUR 9/mo for the weekly playbook after Week 4.

This gives you a direct comparison: do the paying members engage more? Do they churn? What do they say when asked to pay? You need this data before building the MVP subscription infrastructure.

### Founder time concern
The plan estimates 55-70 hours/month at 50 paying users. During the Founding 50 phase, you're manually writing audits (2 hours each x 50 people = 100 hours). That's 2.5 full work weeks just on audits. The plan says "10-15/week" in Phase 2, but 50 free audits need to be delivered within the Phase 2 window (4 weeks). That's 12-13 audits per week, or about 25 hours/week *just on audits*. This is aggressive for a solo founder also doing marketing, development, and support.

**Recommendation:** Cap the free audit at a lighter deliverable. Instead of a full 1-page PDF (2 hours), deliver a structured email with 3-5 bullet points (30 minutes). Reserve the full PDF for paid audits.

---

## 10. Competitive risk: can someone clone the free X-Ray in a weekend?

**Yes.** The core technical implementation is:
1. Accept image upload
2. Send to Claude Vision with a structured extraction prompt
3. Display results in a card format
4. Add some rule-based insights

A competent developer could clone this in a day. The `insights.ts` and `upsells.ts` files are ~60 lines each of straightforward conditional logic. The Claude Vision prompt is the only real IP, and it's not defensible.

**However,** this is the wrong question. The X-Ray is not the product -- it's the demo. The moat is:

1. **The funnel** (quiz priming -> emotional reveal -> contextual upsell)
2. **The human expertise** (the founder's manual audit)
3. **The insight quality** (this needs to be *significantly* better than a clone)
4. **The brand** (Meldar's warm, non-technical positioning)
5. **The data flywheel** (each audit teaches you what insights resonate, improving the automated version)

**The risk is real if you stay at the free X-Ray level.** The risk diminishes as you move up the value chain to paid services and automated analysis. Speed matters: get to paid revenue before someone clones the free tier.

**One concrete defense:** Make the shareable X-Ray card beautiful and branded enough that it becomes the *canonical* way to share screen time data. If "I got my Meldar X-Ray" becomes a thing, the brand moat matters more than the tech moat.

---

## Summary Scorecard

| Criterion | Score | Notes |
|-----------|:-----:|-------|
| Core hypothesis validation | 6/10 | Tests engagement, not payment. Payment test deferred to Week 6. |
| Funnel design | 8/10 | Clean, low-friction, contextual upsells. Quiz step could be optional. |
| Metric readiness | 5/10 | Events defined but not wired in code. Drop-off tracking missing. |
| Build scope (right-sized?) | 6/10 | Some premature features (subscriptions, app build). Missing email capture on result. |
| Founding 50 design | 7/10 | Good engagement mechanics. Doesn't test willingness to pay. |
| Competitive defensibility | 5/10 | Free tier is trivially cloneable. Paid services are the moat. Speed is the defense. |
| Launch readiness | 6/10 | Code has pricing inconsistencies, missing analytics, missing error UX. |

**Overall: 6.1/10 -- Good foundation, needs tightening before launch.**

---

## Top 5 Actions Before Launch

1. **Wire GA4 events in all funnel components.** No data = flying blind.
2. **Add email capture on the X-Ray result page.** This is your fallback conversion.
3. **Remove Starter subscription upsell from PoC code.** Product doesn't exist. Don't sell it.
4. **Fix the pricing discrepancy** (App Build: EUR 49 vs EUR 79). Align plan, code, and Stripe.
5. **Add founder notification email** on screenshot upload and checkout initiation. You need to feel the funnel pulse in real-time.
