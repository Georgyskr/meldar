# Sales Pipeline Analyst Review

**Date:** 2026-03-30
**Reviewer:** Sales Pipeline Analyst (Revenue Operations)
**Scope:** Full revenue pipeline from free X-Ray through paid conversion

---

## Executive Summary

The revenue pipeline has a solid technical foundation: Stripe Checkout works end-to-end for two products (Time Audit EUR 29, App Build EUR 79), the webhook correctly records orders, and the upsell engine generates contextual recommendations from X-Ray data. However, there are significant funnel leaks and missed revenue opportunities that, if addressed, could meaningfully increase conversion rates and average revenue per user.

**Pipeline health grade: B-**
The plumbing works. The strategy has gaps.

---

## 1. Funnel Integrity

### What works
- **Checkout flow is clean.** One POST to `/api/billing/checkout`, Stripe handles PCI/3DS, redirect to `/thank-you`. Minimal friction.
- **Webhook is idempotent.** `onConflictDoNothing()` on both `auditOrders` and `subscribers` prevents duplicate records.
- **Starter product gracefully deferred.** Selecting Starter routes to `/coming-soon` with email capture instead of a dead end.
- **Promotion codes enabled.** `allow_promotion_codes: true` is set, so Founding 50 coupons will work.

### Funnel leaks identified

**CRITICAL: No email capture before or after X-Ray delivery.**
The entire upload-to-result flow (`/xray` page) delivers the full Time X-Ray without collecting an email address. The user gets the complete value (card, insights, share link) and can leave without the business capturing any contact information. The `xrayResults` table has an `email` field, but it is never populated by the upload route (`/api/upload/screentime/route.ts`). This means:
- No way to follow up with users who saw their X-Ray but did not convert.
- No way to send the X-Ray result via email (a natural re-engagement touchpoint).
- The viral share link (`/xray/[id]`) also has no email gate for viewers.

**Impact:** This is the single biggest funnel leak. Every X-Ray user who does not click an upsell button is lost forever.

**MODERATE: Thank-you page is product-agnostic.**
The `/thank-you` page always says "Your Time Audit is on its way" regardless of whether the user purchased a Time Audit or an App Build. An App Build buyer will see incorrect copy. The page also does not use the `session_id` query parameter to verify the purchase or show order details.

**MODERATE: No confirmation email on purchase.**
The webhook (`/api/billing/webhook`) records the order but does not send a confirmation email. The `/thank-you` page says "Check your email for confirmation" but no email is sent. This breaks trust and creates support burden. Compare with the subscribe route which does send a welcome email.

**LOW: Concierge upsell maps to Starter product.**
In `UpsellBlock.tsx`, `concierge` tier maps to `product: 'starter'`, which routes to the coming-soon page. This means a user whose data triggers a concierge upsell (the highest-value tier at EUR 199/mo) gets sent to a generic "toolkit is getting ready" page. This should at minimum route to a contact form or Calendly link.

---

## 2. Pricing Visibility

### Current state
- **Landing page TiersSection:** Shows "Free," "Pay as you go," and "We handle it" but **no EUR amounts are displayed anywhere.** No EUR 29, no EUR 79, no EUR 9.99/mo, no EUR 199/mo. All three CTAs link to `/quiz`.
- **Upsell block (post-X-Ray):** Shows explicit EUR amounts: "Personal Time Audit -- EUR 29," "App Build -- EUR 79," "AI Automation Toolkit -- EUR 9.99/mo."
- **Stripe Checkout:** Shows final price.

### Issues

**The landing page pricing section has zero prices.** The tiers are labeled "Free," "Pay as you go," and "We handle it" without any price anchoring. While this can work for top-of-funnel curiosity, it means users have no mental price anchor before they reach the upsell block. The plan document specifies EUR 29/79 should be shown -- they are not.

**App Build price discrepancy.** The plan says EUR 49 for App Build; the UpsellBlock shows EUR 79. This needs reconciliation. If EUR 79 is the intended price, the plan should be updated. If EUR 49 is correct, the code is overcharging.

**Starter price discrepancy.** The plan says EUR 9/month; the UpsellBlock shows EUR 9.99/mo. Minor, but creates inconsistency if a user reads both the landing page and the upsell.

---

## 3. Conversion Friction (Clicks from X-Ray to Payment)

### Current path
1. Upload screenshot on `/xray` (1 click: choose file)
2. View X-Ray result (automatic, 0 clicks)
3. See upsell block below result (0 clicks, auto-rendered)
4. Click upsell CTA button (1 click)
5. Stripe Checkout page (1 click: pay)

**Total: 3 clicks from result to payment.** This is good. The upsell appears inline below the X-Ray card, which is the right placement.

### Friction points
- **No email pre-fill on purchase.** The `PurchaseButton` accepts an optional `email` prop but the `XRayPageClient` never passes one (because email is never collected). This means users must type their email on Stripe Checkout, adding friction. If email were captured earlier, it could pre-fill.
- **Only the top upsell is shown.** `UpsellBlock` picks the single highest-urgency upsell. A user with both high screen time (audit trigger) and dominant social app (app build trigger) only sees one offer. The second-best offer is discarded.
- **No upsell on the shared X-Ray page.** When someone views another user's X-Ray at `/xray/[id]`, they see a "Get your own Time X-Ray" CTA but no upsell. This is a missed opportunity since the viewer is already primed by seeing someone else's data.

---

## 4. Lead Capture

### Email capture points
| Touchpoint | Email captured? | Notes |
|---|---|---|
| Landing page hero | Yes | `EmailCapture` component, saves to `subscribers` |
| Founding 50 section | Yes | `FoundingEmailCapture`, saves with `founding: true` |
| Quiz completion | ? | Not reviewed but quiz exists |
| X-Ray upload | **NO** | Full value delivered without email |
| X-Ray result page | **NO** | Upsell shown but no email gate |
| Shared X-Ray viewer | **NO** | CTA to upload, no email capture |
| Post-purchase | Yes | Webhook saves email from Stripe session |
| Coming Soon page | Yes | `EmailCapture` component |

### Critical gap
Email is captured at the top of funnel (landing page) and bottom (payment), but **not at the moment of highest engagement** -- when the user sees their X-Ray results. This is the peak value moment and the best time to ask for an email with low friction ("Email me my results" or "Save my X-Ray").

---

## 5. Upsell Logic

### Trigger quality assessment

| Trigger | Target | Threshold | Assessment |
|---|---|---|---|
| `high_screen_time` (>5h) | Audit (EUR 29) | Reasonable | Good. 5h is above average, creates urgency. |
| `social_dominance` (>120min) | App Build (EUR 79) | Reasonable | Good. Specific app name in message adds personalization. |
| `email_detected` (>30min) | App Build (EUR 79) | Low bar | 30 min on email is normal for many workers. May trigger too often and feel irrelevant. |
| `many_apps` (>=5) | Starter (EUR 9.99) | Very low bar | Almost everyone uses 5+ apps. This will fire for nearly every user, diluting the signal. |
| `high_pickups` (>80) | Audit (EUR 29) | Good | 80 pickups/day is a genuine habit loop signal. |

### Feel assessment
- **The messages are good.** They reference specific data from the user's screenshot, which makes them feel earned rather than generic. "We can build a Instagram scheduler that posts for you" is specific and compelling.
- **Risk of feeling pushy:** The upsell block appears immediately after the X-Ray result. There is no buffer (e.g., "Want to go deeper?" section with a softer lead-in). The refund guarantee ("Full refund if we can't deliver") helps, but placement matters.
- **Missing: no time-delayed or follow-up upsell.** Since email is not captured, there is no mechanism for a softer follow-up upsell via email 24-48 hours later.

---

## 6. Founding 50 Scarcity Mechanism

### What works
- **Real counter backed by DB.** `FoundingCounter` queries actual founding member count and shows "X of 50 spots remaining." This is honest scarcity, not fake.
- **Benefits are clearly listed:** Free Time Audit (EUR 29 value), Weekly automation playbook, Founding pricing locked forever.
- **Graceful degradation:** When spots hit 0, text changes to "Founding spots are full. Join the waitlist."

### Issues
- **No urgency beyond the counter.** There is no time-based urgency ("Closes March 31" or "This week only"). The counter alone may not create enough FOMO for a pre-product offering.
- **Counter is a server component.** It renders on the server and may show stale counts if the page is cached. For a scarcity mechanism, near-real-time accuracy matters.
- **No social proof.** "12 of 50 spots remaining" is stronger with "Join Sarah, Marcus, and 36 others" but this would require storing/displaying member info.
- **Founding member benefits are not connected to Stripe.** The founding coupons (`FOUNDING50_AUDIT`, etc.) are defined in the plan but not integrated into the code. There is no automatic coupon application for founding members. They must manually enter the code (if they receive it).

---

## 7. Revenue Tracking

### Current state
- **Orders are in the database.** `audit_orders` table stores email, product, amount, currency, Stripe session ID, and status.
- **Subscriber signups are tracked.** `subscribers` table with source tracking.
- **Founder notification on signups.** The subscribe route emails the founder on each new signup.

### Missing
- **No founder notification on purchases.** The webhook records the order but does not notify the founder. A new EUR 29 or EUR 79 sale generates zero alerts. For an early-stage product where every sale matters, this is a significant gap.
- **No revenue dashboard.** There is no admin page or API endpoint to see total revenue, daily/weekly trends, conversion rates, or order status. The founder must check Stripe Dashboard directly.
- **No conversion funnel tracking.** There is no way to measure: X-Ray uploads -> upsell impressions -> checkout starts -> completed payments. GA4 is present but no custom events are fired for these pipeline steps.
- **Order status tracking is manual.** The `status` field on `audit_orders` defaults to `'paid'` but there is no UI or API to update it to `'in_progress'` or `'delivered'`. The `deliveredAt` timestamp is never set.

---

## 8. Missing Revenue Opportunities

### Immediate (implement in Phase 1)

1. **Email gate after X-Ray result.** Show the top insight and first app bar for free, but require email to see the full breakdown. "Enter your email to see your complete Time X-Ray." This single change could 3-5x lead capture rate.

2. **Purchase confirmation email with upsell.** After a Time Audit purchase, send a confirmation email that also mentions the App Build: "Your Time Audit is being prepared. While you wait, did you know we can also build a custom automation for you?"

3. **Founder notification on every purchase.** A simple Resend email to the founder on `checkout.session.completed`: "New sale! {product} for EUR {amount} from {email}."

4. **Fix the thank-you page.** Make it product-aware using the `session_id` parameter. Show different copy for Time Audit vs App Build. Add a "While you wait" upsell for the other product.

### Near-term (Phase 2)

5. **Second upsell option.** Show both the primary and secondary upsell (audit + app build) instead of just the top one. "Most popular" + "Also recommended" pattern.

6. **Re-engagement email sequence.** For users who uploaded a screenshot but did not purchase: Day 1 (X-Ray summary), Day 3 (one specific insight + CTA), Day 7 (founding member pitch).

7. **Referral program.** The X-Ray share mechanic is already built. Add a referral code: "If your friend uploads a screenshot using your link, you both get 20% off your next purchase."

8. **Concierge intake flow.** Replace the generic "coming soon" destination for concierge upsells with a Calendly/Tally intake form. Even if the product is not ready, capture high-intent leads separately.

### Strategic (Phase 3)

9. **Google Takeout analysis as premium gate.** Free = screenshot. Paid = Takeout deep dive. This creates a natural upsell beyond the current audit.

10. **Annual pricing for Starter.** EUR 9.99/mo or EUR 79/year (34% savings). Reduces churn and increases LTV.

---

## 9. Risk Assessment

| Risk | Severity | Likelihood | Current Mitigation |
|---|---|---|---|
| Users get full X-Ray value without leaving email | Critical | Certain | None -- this is happening now |
| Purchase confirmation email not sent | High | Certain | None -- webhook does not send email |
| App Build priced at EUR 79 vs plan's EUR 49 | Medium | Certain | None -- needs decision |
| Founding coupons not integrated into checkout | Medium | Certain | `allow_promotion_codes: true` is passive |
| Concierge leads routed to generic coming-soon | Medium | Likely | None |
| No founder alert on sales | Medium | Certain | None -- must check Stripe Dashboard |
| Webhook failure loses payment record | High | Low | Stripe retries for 3 days + idempotent handler |

---

## 10. Priority Recommendations

### Must-fix before accepting payments (P0)

1. **Send purchase confirmation email in webhook handler.** The thank-you page promises it; the code does not deliver it. This is a broken promise on the very first customer interaction.

2. **Add founder notification on purchase.** Same pattern as the subscribe route. Two lines of code.

3. **Fix thank-you page to be product-aware.** Use the `session_id` parameter to fetch session details and show correct copy.

### Should-fix for revenue optimization (P1)

4. **Add email capture to X-Ray result flow.** Either gate part of the result behind email, or add "Email me my results" as an optional capture after showing the full result.

5. **Resolve the App Build price discrepancy** (EUR 49 in plan vs EUR 79 in code).

6. **Show EUR prices on the landing page TiersSection.** Users should know what "Pay as you go" costs before they invest time in the quiz and upload flow.

### Nice-to-have for growth (P2)

7. Show secondary upsell option alongside primary.
8. Build a re-engagement email sequence.
9. Create a proper concierge intake form.
10. Add GA4 custom events for funnel step tracking.

---

*Review complete. The pipeline's technical execution is solid but it is leaking leads at the highest-engagement moment (X-Ray delivery) and missing basic post-purchase communication. Fixing the P0 items is essential before any marketing spend.*
