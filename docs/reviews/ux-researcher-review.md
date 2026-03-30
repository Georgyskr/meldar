# UX Researcher Review: Meldar PoC User Experience

**Date:** 2026-03-30
**Scope:** Full user journey from quiz through X-Ray to payment
**Target audience:** Gen Z / Gen Alpha (18-28), mobile-first

---

## Executive Summary

The PoC has a clear funnel structure (quiz -> upload -> X-Ray -> upsell) and strong privacy messaging. The X-Ray card nails the "Spotify Wrapped moment" goal. However, several friction points risk drop-off at key conversion stages, particularly around the upload step, error recovery, and the upsell-to-payment bridge. Accessibility gaps and missing mobile-specific polish need attention before launch with a Gen Z audience that lives on their phones.

---

## 1. User Journey: Funnel Clarity

### What works
- **Quiz -> X-Ray handoff is clean.** The quiz results page links directly to `/xray` with a strong CTA ("Get your real Time X-Ray"). The progression from estimated hours to real data is motivating.
- **Progressive disclosure.** The upload zone shows only when no result exists; once results arrive, the card + upsell appear. No confusing dual-state UI.
- **Deletion banner reinforces trust.** The green "Screenshot deleted" confirmation immediately after processing is a smart trust signal.

### Issues

**F1. Quiz -> X-Ray transition has no bridge.**
The quiz results page (`PainQuiz.tsx:184-198`) links to `/xray` but provides no context about what happens next. Users go from "here's what Meldar would build for you" to a blank upload page with no memory of their quiz answers.

*Recommendation:* Pass quiz selections as URL params or state. On the X-Ray page, show a brief line like "You said meal planning and email triage eat your time. Let's see the real numbers." This creates continuity and makes the upload feel purposeful rather than a cold restart.

**F2. No clear entry path from the landing page to `/xray`.**
The main funnel paths visible are quiz and email capture. The X-Ray upload page exists but is not prominently linked from the landing page "How It Works" section or hero. Users may not discover it unless they complete the quiz first.

*Recommendation:* Add a secondary CTA in the "How It Works" section that links directly to `/xray` for users who want to skip the quiz.

**F3. Post-payment dead end.**
The thank-you page (`thank-you/page.tsx`) says "Your Time Audit is on its way" and offers only a "Back to Meldar" link. There is no:
- Sharing prompt (viral loop missed)
- Founding program mention
- Follow-up action

*Recommendation:* Add "While you wait, share your X-Ray with a friend" with the share widget, and/or prompt them to join the founding program if they haven't already.

---

## 2. Friction Points & Drop-Off Risks

**F4. Upload zone lacks drag-and-drop feedback.**
`UploadZone.tsx` uses a `<label>` with a hidden file input. While this works for tap-to-select on mobile, there is no `onDragOver`/`onDrop` handler. Desktop users who try to drag a file will see no visual response. The label says "Drop your Screen Time screenshot" but dropping does nothing.

*Recommendation:* Add drag-and-drop event handlers with visual feedback (border color change, text change to "Release to upload"). This is especially important because the copy explicitly says "Drop."

**F5. Progress steps during upload are misleading.**
The STEPS array (`UploadZone.tsx:10-15`) shows 4 steps, but the state transitions don't map cleanly to them. "Compressing image" and "Uploading screenshot" happen almost instantly (setState before the actual async work). "Detecting apps" and "Generating your X-Ray" both fire during the single `fetch` call. The user sees step 3 ("Detecting apps") for the entire API call duration, then step 4 flashes briefly before results appear.

*Recommendation:* Either use a streaming/SSE approach to report real server-side progress, or simplify to a single spinner with an estimated time ("Analyzing... usually takes ~3 seconds"). Misleading progress indicators erode trust more than an honest spinner.

**F6. Error state is too generic.**
The catch block in `handleUpload` (`UploadZone.tsx:60-63`) shows "Something went wrong. Please try again." for network failures. The API returns specific error messages (rate limit, validation, unprocessable) but these are only shown when `!res.ok`. Network-level failures (offline, timeout) get the generic message.

*Recommendation:* Distinguish between network errors ("Check your connection and try again") and server errors. Consider adding `navigator.onLine` check before upload. For rate limiting (429), show "You've uploaded too many screenshots. Wait a few minutes."

**F7. No file size/type feedback before upload.**
Validation happens server-side (`route.ts:41-53`), but the client accepts any image file (`accept="image/jpeg,image/png,image/webp"`). If a user selects a HEIC file (common on iPhone), they get a server error after waiting. The `compressImage` function also silently fails if `createImageBitmap` or `OffscreenCanvas` isn't supported.

*Recommendation:* Add client-side validation for file type and size before upload begins. Show clear feedback: "iPhone photos in HEIC format aren't supported yet. Take a screenshot instead (it saves as PNG)."

**F8. "Upload another screenshot" button resets all state.**
`xray-client.tsx:103-118` sets `result` to null, which removes the entire result including insights and upsell. If a user accidentally taps this on mobile, they lose everything with no way to get it back.

*Recommendation:* Either add a confirmation ("Are you sure? Your current X-Ray will be replaced.") or keep the previous result visible alongside the new upload zone.

---

## 3. Trust Signals & Privacy Messaging

### What works
- **TrustSection is strong.** The "What we see / What we never see" grid with check/X icons is immediately scannable. The "Delete everything in one click" block with European law reference adds credibility.
- **Upload zone privacy line** ("Your screenshot is processed in ~3 seconds and deleted immediately") is well-placed -- right at the moment of the trust decision.
- **Deletion banner** after processing confirms the promise was kept.

### Issues

**F9. "12 senior engineers" claim in TrustSection needs evidence.**
`TrustSection.tsx:76-94` shows 12 colored avatar circles with "Built in a single day by 12 senior engineers. 150+ years combined experience." For a Gen Z audience that is skeptical of corporate claims, anonymous colored circles feel unverifiable and potentially fabricated. This could undermine the trust section it sits in.

*Recommendation:* Either link to real team profiles, remove the claim, or reframe it. "Built by engineers who've shipped at [recognizable companies]" with even 2-3 real names/photos would be more credible than 12 anonymous circles. If the team is actually one founder, say that -- authenticity resonates more with this audience than inflated team size.

**F10. No privacy mention on the shared X-Ray page.**
`/xray/[id]/page.tsx` shows the X-Ray card and a CTA to "Get your own." But it doesn't mention that the original user's screenshot was deleted, or how the data was handled. Viewers seeing screen time data might wonder about the privacy implications.

*Recommendation:* Add a subtle footer note: "All screenshots are deleted immediately after analysis. We only store the summary you see here."

---

## 4. Mobile UX

**F11. Quiz grid is 2-column on mobile, but tiles may be too small.**
`PainQuiz.tsx:52` uses `columns={{ base: 2, md: 3, lg: 4 }}`. With `padding={5}` per tile and emoji + title + description, these tiles could be cramped on a 375px-wide screen. The tap target might be adequate but the text could be hard to read.

*Recommendation:* Test on a 375px viewport. Consider switching to `columns={{ base: 1, sm: 2 }}` if tiles feel cramped, or reduce the description text on small screens.

**F12. X-Ray card is 440px max-width, which works well for mobile.**
Good: the card will fill most phone screens naturally. The gradient header, stats layout, and insight quote all fit within a single-scroll view on most phones.

**F13. Upload instructions assume platform knowledge.**
`UploadZone.tsx:115-119` gives both iPhone and Android paths. On mobile, the user is on one platform -- showing both adds noise. Also, Gen Z users may not know where "Settings" is.

*Recommendation:* Detect the platform via `navigator.userAgent` and show only the relevant instructions. Consider adding a short video/GIF showing the 3-tap path to the screenshot.

**F14. Share button uses `navigator.share` -- good.**
`XRayCardActions.tsx:12-17` correctly checks for the Web Share API and falls back to clipboard copy. This is the right approach for mobile.

**F15. Form inputs on mobile.**
`FoundingEmailCapture.tsx:42` uses `flexDir={{ base: 'column', sm: 'row' }}` which stacks the email input and button vertically on small screens. This is correct. The input has appropriate padding for thumb-tapping.

---

## 5. Accessibility

**F16. Upload zone has no ARIA role or accessible label.**
`UploadZone.tsx:82-182` uses a `<styled.label>` wrapping a hidden `<input type="file">`. While the label-input association works for click behavior, screen readers won't announce the interactive nature or current state of the upload zone. There is no `aria-label`, `role="button"`, or `aria-describedby` for the privacy text.

*Recommendation:* Add `role="region"` and `aria-label="Upload Screen Time screenshot"` to the label. Add `aria-live="polite"` to the progress/error area so screen readers announce state changes. Add `aria-describedby` pointing to the privacy notice.

**F17. PainTile has good focus-visible styles but no aria-pressed.**
`PainQuiz.tsx:121` has `_focusVisible` styling, which is excellent. However, the toggle buttons lack `aria-pressed={isSelected}` to communicate selection state to screen readers.

*Recommendation:* Add `aria-pressed={isSelected}` and `role="button"` (though `<styled.button>` already has implicit button role, the pressed state is missing).

**F18. XRayCard has no semantic structure for screen readers.**
`XRayCard.tsx` renders all content as `<span>` and `<p>` elements inside `Box` and `Flex` containers. The "Total screen time," app list, and pickups section have no heading hierarchy or landmark roles. A screen reader would experience this as a flat list of text.

*Recommendation:* Use `aria-label` on the card container ("Your Time X-Ray results"), add `<h3>` or `aria-label` to each section (stats, app list, insights). Consider adding a visually-hidden summary for screen readers: "Your screen time is X hours per day. Top app is Y."

**F19. Color contrast in progress indicators.**
`UploadZone.tsx:148` uses `color="onSurfaceVariant/40"` for future steps. Depending on the actual resolved color values, a 40% opacity variant may fall below WCAG AA 4.5:1 contrast ratio.

*Recommendation:* Verify contrast ratios for all opacity-modified colors. Use a minimum of 60% opacity for text that needs to be readable.

**F20. Deletion banner auto-dismisses without screen reader announcement.**
`xray-client.tsx:19-20` shows the deletion banner for 5 seconds then hides it via `setTimeout`. No `aria-live` region is used, so screen readers may never announce this important trust signal.

*Recommendation:* Wrap the banner in an `aria-live="polite"` region, or use a `role="status"` container.

---

## 6. Error States

**F21. PurchaseButton silently fails.**
`PurchaseButton.tsx:42-44` catches errors and only calls `setLoading(false)`. The user sees "Redirecting..." flash back to the button label with no error feedback. If the checkout API fails, the user has no idea what happened.

*Recommendation:* Add an error state: "Payment setup failed. Please try again." Also consider what happens if the user has a popup blocker and `window.location.href` assignment fails (unlikely but possible for edge cases).

**F22. FoundingEmailCapture error message is generic.**
`FoundingEmailCapture.tsx:99-101` shows "Something went wrong. Try again." for all errors. If the email is already subscribed, or if the format is invalid server-side, the user gets the same message.

*Recommendation:* Return specific error messages from the API (duplicate email, invalid format, server error) and display them.

**F23. No timeout handling for the upload.**
`UploadZone.tsx:46` makes a `fetch` call with no `AbortController` or timeout. If Claude Vision takes longer than expected (cold start, high traffic), the user sees "Detecting apps" indefinitely.

*Recommendation:* Add a timeout (15-20 seconds) with a message: "This is taking longer than usual. You can wait or try again." Use `AbortController` to cancel the request.

---

## 7. CTA Clarity

**F24. "Show me what to fix" (quiz CTA) is clear and action-oriented.** Good.

**F25. "Get your real Time X-Ray" (quiz results -> upload) is clear.** The word "real" creates urgency versus the estimated quiz numbers. Good.

**F26. Upsell CTA labels vary by tier but some are unclear.**
`UpsellBlock.tsx:7-13` maps tiers to labels:
- "Personal Time Audit -- EUR 29" -- clear value proposition
- "App Build -- EUR 79" -- vague. What app? What does the user get?
- "AI Automation Toolkit -- EUR 9.99/mo" -- what's included?
- "Contact us" -- lowest conversion CTA possible for Gen Z

*Recommendation:* Make labels outcome-oriented: "Get a personal report on your time -- EUR 29", "We'll build your first fix -- EUR 79", "Automations that save you X hrs/week -- EUR 9.99/mo". For concierge, try "Book a free call" (lower commitment than "Contact us").

**F27. "Upload another screenshot" is positioned below the upsell.**
`xray-client.tsx:103-118` places this CTA after the upsell block. This means users scroll past the revenue-generating action to find the re-upload option. While this is good for conversion ordering, it might frustrate users who want to correct a bad screenshot.

*Recommendation:* The current placement is correct from a conversion standpoint. No change needed, but consider adding a small "Wrong screenshot? Upload another" link above the upsell for error recovery without detracting from the upsell.

---

## 8. Viral Loop

**F28. Shared X-Ray page is well-structured for virality.**
`/xray/[id]/page.tsx` has strong OG metadata (title with hours/day, description with top app name, OG image). The CTA for viewers ("Get your own Time X-Ray -- Free. Takes 30 seconds.") is compelling. Twitter card uses `summary_large_image` for maximum real estate.

**F29. Share button placement is correct** -- immediately below the X-Ray card, before the upsell. Users share first, then see the upsell.

**F30. Missing: no incentive to share.**
The share actions (`XRayCardActions.tsx`) offer Share and Copy Link, but there's no emotional nudge. Spotify Wrapped works because people want to show off their taste. The X-Ray needs a similar hook.

*Recommendation:* Add a line above the share buttons: "Think your friends do better? Challenge them." or "Share and see how your screen time compares." Make sharing feel competitive, not informational.

**F31. No share-to-specific-platforms.**
Gen Z shares via Instagram Stories, TikTok, and Twitter/X. The generic `navigator.share` on mobile is fine, but on desktop there's only "Copy link." No one-tap share to Twitter or Instagram.

*Recommendation:* Add Twitter/X share with pre-filled text: "My screen time is [X]h/day and [topApp] is the culprit. What's yours? [link]". For Instagram, suggest screenshotting the X-Ray card (it's already designed like a shareable card).

---

## 9. Conversion: Will the Upsell Convert?

**F32. The upsell presentation is too subtle.**
`UpsellBlock.tsx:28-49` renders a box with a text message, a purchase button, and a refund guarantee. It looks like any other content block. There is no visual differentiation (same border, same background) to signal "this is a special offer."

*Recommendation:* Add a gradient border or subtle background that connects to the X-Ray card's gradient header. Add urgency: "Based on your X-Ray, here's what I'd do first" (founder voice). Consider a brief before/after: "You spend Xh on [topApp]. Here's how we'd fix that."

**F33. The upsell message comes from AI, which is great.**
`UpsellBlock.tsx:19-20` sorts by urgency and picks the highest. The message is personalized based on the user's actual data. This is the right approach.

**F34. Refund guarantee is good but could be stronger.**
"Full refund if we can't deliver. No questions asked." is standard. For a Gen Z audience spending EUR 29 for the first time with an unknown product:

*Recommendation:* Add a timeframe: "Full refund within 14 days. No questions asked." Add founder credibility: "I personally review every audit. -- Georgy, founder"

**F35. No email capture before purchase.**
`PurchaseButton.tsx` accepts an optional `email` prop but `UpsellBlock.tsx` doesn't collect or pass one. If the user doesn't complete checkout, there's no way to follow up.

*Recommendation:* Add a soft email capture before the purchase button: "Where should we send your audit?" This also pre-fills the Stripe checkout email, reducing friction.

---

## 10. Emotional Design: The "Wrapped Moment"

**F36. The X-Ray card design hits the mark.**
The gradient header, the "Your Time X-Ray" branding, the structured stats with the bold hours number, the app ranking list, the insight quote -- this feels like a reveal moment. The card is designed to be screenshot-worthy.

**F37. Missing: animation or reveal effect.**
The card appears instantly when results load. There's no build-up. Spotify Wrapped uses count-up animations and sequential reveals to create anticipation.

*Recommendation:* Add a brief animation sequence:
1. Card fades in with the gradient header first
2. Total hours counts up from 0
3. Apps appear one by one with a slight stagger
4. Insight slides in last

This doesn't need to be complex -- CSS transitions with staggered delays would suffice. Even 1.5 seconds of reveal animation transforms the experience from "here are your results" to "let me show you something about yourself."

**F38. Missing: emotional reaction cues.**
Spotify Wrapped tells you "You were in the top 1% of Drake listeners." The X-Ray shows data but doesn't tell you how to feel about it.

*Recommendation:* Add contextual reactions in the insights:
- "7.2 hrs/day? That's more than a full workday on your phone."
- "You pick up your phone 96 times a day. That's every 10 minutes while awake."
- "Instagram alone takes 2.3 hours -- that's 35 days a year."

These comparisons already exist in the insight model but could be more emotionally charged. Frame them as surprising facts, not clinical observations.

---

## Priority Matrix

| # | Issue | Severity | Effort | Impact on Conversion |
|---|-------|----------|--------|---------------------|
| F4 | Drag-and-drop doesn't work despite copy saying "Drop" | High | Low | Medium |
| F16 | Upload zone lacks ARIA labels | High | Low | Low (but legal/ethical) |
| F21 | PurchaseButton silently fails | High | Low | High |
| F37 | No card reveal animation | Medium | Medium | High |
| F1 | Quiz -> X-Ray has no context bridge | Medium | Low | Medium |
| F26 | Upsell CTA labels are vague | Medium | Low | High |
| F35 | No email capture before purchase | Medium | Medium | High |
| F9 | "12 engineers" claim lacks credibility | Medium | Low | Medium |
| F30 | No incentive/nudge to share | Medium | Low | High (viral) |
| F38 | Missing emotional reaction cues | Medium | Medium | High (engagement) |
| F5 | Progress steps are misleading | Low | Medium | Medium |
| F17 | PainTile missing aria-pressed | Low | Low | Low |
| F8 | "Upload another" resets all state | Low | Low | Low |
| F23 | No upload timeout handling | Low | Medium | Low |
| F3 | Post-payment dead end (no share prompt) | Low | Low | Medium (viral) |

---

## Top 5 Recommendations (Ordered by Impact)

1. **Fix the PurchaseButton silent failure** -- this directly loses revenue. Add error state and retry. (F21)
2. **Add card reveal animation** -- this is the emotional peak of the funnel. A 1.5s staggered animation transforms data delivery into a moment. (F37)
3. **Strengthen upsell presentation** -- outcome-oriented labels, visual differentiation, email capture before purchase, founder voice. (F26, F32, F34, F35)
4. **Add share incentive** -- "Challenge your friends" framing, platform-specific share buttons, competitive language. (F30, F31)
5. **Fix drag-and-drop** -- the copy says "Drop" but dropping doesn't work. This is a trust-breaking inconsistency. (F4)

---

## Coming Soon & Thank You Pages

**Coming Soon** (`coming-soon/page.tsx`): Functional but could benefit from showing estimated launch timing and what the user will get when it launches. The social links (Twitter/X, Discord) are good for community building.

**Thank You** (`thank-you/page.tsx`): Clean and reassuring. "72 hours" delivery timeframe is specific. "Reply to the confirmation email" is a nice founder touch. Missing: share prompt and community links.

---

## Overall Assessment

The PoC has strong bones. The funnel logic is sound, the X-Ray card is genuinely shareable, and the privacy messaging is above average for the category. The biggest gaps are in emotional design (the reveal moment needs animation) and conversion optimization (the upsell needs more differentiation and the purchase flow needs error handling). Accessibility needs a pass across all interactive components.

For a Gen Z audience, the mobile experience is solid but could be more platform-aware (detecting iOS vs Android, offering platform-specific share targets). The viral loop has the right infrastructure (OG images, shareable URLs, Web Share API) but needs emotional fuel -- a reason to share beyond "look at my data."
