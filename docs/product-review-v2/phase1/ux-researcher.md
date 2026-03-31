# UX Research Review: Discovery Form Redesign (4-phase → 2-phase)

**Reviewer:** UX Researcher
**Date:** 2026-03-31
**Scope:** The X-Ray upload flow redesign — from 4 phases (intro > guide > context > upload) to 2 phases (scan > result). ScreenshotGuide promoted to a collapsible inline toggle. Context chips made optional and inline.
**Target:** Gen Z / Gen Alpha (18-28), 78% mobile, ChatGPT-fluent, failed at AI tools before

---

## 1. Flow Comparison: What Changed

### Before (4-phase)
The original flow had a dedicated `ScreenshotGuide` phase — a step-by-step modal/card with platform toggle (iPhone / Android), pagination through 4 steps, progress dots, and a final "Got it — upload my screenshot" CTA that dismissed it and revealed the upload zone.

### After (2-phase: scan → result)
The guide is now a collapsible toggle ("Where do I find this?") that sits below the upload zone. Context chips are inline above the upload zone with the label "I'm currently…". The upload zone is the first thing users see when they land on `/xray`.

**Net change in user-visible complexity:** Simpler on first glance, but the hand-holding is now optional rather than mandatory.

---

## 2. Is the 2-Phase Flow Actually Simpler?

**Short answer: Yes, for users who already know what to do. No, for first-timers.**

The 4-phase flow forced every user through the screenshot guide, which was friction for the 30-40% who already know where Screen Time lives. Removing the mandatory guide pass is the right call for returning users, tech-comfortable users, and anyone coming from organic search ("how do I see my screen time").

However, the 4-phase flow also guaranteed that first-timers received instructions before they hit a blank upload zone. The collapsible toggle now relies on two things the original flow did not: (1) the user noticing the toggle exists, and (2) the user clicking it before giving up.

**The critical assumption being made:** "If a user doesn't know how to find Screen Time, they will click 'Where do I find this?' before abandoning."

This assumption is questionable. Mobile users on the target demographic do not typically read secondary UI. They tap the primary CTA, get stuck, and leave. The toggle is helpful for users who get stuck and think to look for help — but many users will simply not upload anything and leave without realizing a guide exists.

---

## 3. Will Users Know How to Take a Screen Time Screenshot?

**No. The majority of first-time users will not.**

The hero copy ("Upload a Screen Time screenshot") and the upload zone label ("Drop your Screen Time screenshot") both assume the user already has a screenshot ready. There is no indication that the user needs to leave the page, navigate into device settings, and take a photo before returning.

The prior `ScreenshotGuide` explicitly walked users through this prerequisite. The new design treats it as a secondary concern hidden behind a toggle.

**Specific failure mode:** A user reads "Drop your Screen Time screenshot," taps "Choose image," opens their camera roll, and finds no such screenshot. They are now stuck with the file picker open, no guidance visible, and no indication that they need to take a new screenshot first. The "Where do I find this?" toggle is not visible while the native file picker is open. The user closes the picker without uploading and may not return.

**On Android, the situation is worse.** "Screen Time" is Apple-specific terminology. Android's equivalent is "Digital Wellbeing" (Google Pixel) or varies by OEM (Samsung uses "Digital Wellbeing" inside One UI, some older devices have it in a different location). A user reading "Screen Time screenshot" on Android may not know this applies to them at all.

---

## 4. Is the "Where Do I Find This?" Toggle Discoverable?

**Marginally, not reliably.**

The toggle is positioned below the upload zone with `marginBlockStart={3}` — so roughly 12px below the upload area border. On a 390px-wide iPhone screen, the upload zone itself is `minHeight="220px"`, and the header + context chips add ~160px above it. The toggle sits at approximately 550px from the top of the page (plus the fixed header at ~72px). On most mobile viewports the toggle is visible without scrolling, but barely.

**The discoverability problem is not position — it is salience.** The toggle text is `fontSize="xs"`, `color="onSurfaceVariant/60"`, and styled as a secondary text button with no border, background, or iconographic anchor beyond a small ChevronDown. It reads as a footnote, not as a help resource.

Compare to the `ScreenshotGuide` it replaced: that component had a header bar with a platform toggle (visually distinct), step indicator dots, a visual mockup area, step text, and a prominent "Next" / "Got it" CTA. Users were guided, not left to self-serve.

**Specific discoverability risk on mobile:** On Android Chrome and iOS Safari, the label "Where do I find this?" sits immediately below the upload zone border. Users who tap the upload zone and get a file picker will not see the toggle while the picker is open. Users who scroll past the upload zone (common on mobile — users scroll to see if there's more) may skip over the toggle entirely.

---

## 5. What Happens When a User Lands Directly on /xray (No Quiz Context)?

`xray-client.tsx` initializes with `lifeStage = null`. The page renders the scan phase with:
- The "Your Time X-Ray" headline
- The "One screenshot. Under a minute." subheadline
- The context chip row labeled "I'm currently…"
- The upload zone

There is no quiz-derived context. The context chips are entirely optional — skipping them is the default path unless the user takes deliberate action to select one.

**UX problems with the cold entry:**

1. **No onboarding context.** Users arriving from a share link (e.g., `/xray` linked in a tweet) get no explanation of what Meldar is, why they should trust it with a screenshot, or what the result will look like. The only copy visible is "One screenshot. Under a minute. See where your time actually goes." This is a value proposition compressed to a tagline — it may not be enough to motivate upload from a cold, skeptical user.

2. **The context chips are confusing without framing.** The label "I'm currently…" is an incomplete sentence above four chips. Without the quiz flow's framing ("We'll tailor your results to your situation"), the chips feel arbitrary. A cold user may not understand what selecting "Student" or "Freelance" changes, and therefore skip the chips entirely — reducing the personalization quality of their result.

3. **No social proof.** The landing page has a "2,847 people surveyed" data point and the quiz has its own framing. The `/xray` cold entry has neither. For a first-time visitor, there is nothing that says "other people have done this and found it valuable."

4. **No preview of the result.** The landing page's DataReceiptSection shows what the output looks like (Spotify Wrapped-style card). `/xray` shows nothing until the user uploads. For a cold visitor, this is a leap of faith.

---

## 6. Mobile Experience (78% of Target Is Mobile)

### Upload Zone
The upload zone's primary interaction on desktop is drag-and-drop, but on mobile this is irrelevant. The actual mobile interaction is tapping the styled label to trigger the file picker. The upload zone does degrade gracefully — the `<input type="file">` inside the `<label>` works on mobile. However:

- The `minHeight="220px"` on the styled label creates a large tap target, which is good.
- The "Choose image" button is rendered as a `<styled.span>` visually styled as a button inside the label. This is accessible because the entire label is the tap target, but the button-like element has no interactive affordance beyond visual styling.
- There is no indication that "Choose image" will open the camera roll vs. camera vs. files. On iOS, tapping an `<input type="file" accept="image/*">` offers a choice between "Photo Library," "Take Photo or Video," and "Browse." This is a good native affordance, but users expecting a camera roll picker may be confused by the camera option appearing.

### Context Chips
The chip row uses `flexWrap="wrap"` and `gap={2}`. On a 390px screen, four chips with `paddingInline={4}` and `paddingBlock="10px"` will likely fit in two rows of two. Tap targets are adequate at ~44px height.

**Problem:** There is no visual affordance indicating that chips are toggleable beyond the border change on selection. Users unfamiliar with chip UI patterns may tap once, not see the border change as an affordance of "I selected this," and move on without a chip selected.

### The Guide Toggle on Mobile
As discussed in Section 4, the guide toggle is `fontSize="xs"` with low-contrast color. On mobile, small secondary text is frequently missed. Touch target for the toggle is `paddingBlock={2}` (8px) plus the text line height — likely ~28-32px total, which is below the WCAG 2.5.5 minimum of 44px.

### Processing State
During upload, the scan line animation (`scanLine 2s ease-in-out infinite`) and the `scanPulse` animation on the upload zone require GPU compositing. On low-end Android devices this may cause dropped frames. The `gentleBreathe` animation on the current step label adds another composited layer. Three simultaneous animations during a network request is potentially too many for a budget Android device.

### Result Phase
The result phase scrolls a sequence of staggered-reveal elements (`RevealStagger` with delays from 400ms to 1200ms). On mobile, users may tap or scroll before the animations complete, which could create jarring scroll-animation conflicts. The page has no "scroll to top after result reveal" behavior — on a mobile viewport, after upload, the result phase renders below the fold from where the scan phase was.

---

## 7. Most Likely Drop-Off Points

Ranked by estimated impact, highest risk first:

### 1. Before upload — "I don't have a screenshot" (Estimated drop: 35-50% of cold users)
The highest drop-off will be users who arrive, tap "Choose image," find no Screen Time screenshot in their camera roll, and leave without uploading. The guide toggle is invisible during the file picker interaction. There is no pre-upload messaging that says "You'll need to take a screenshot first — here's how."

### 2. Context chip confusion — "What does selecting these do?" (Estimated drop: ~10%)
Users may hesitate at the chip row, unsure if they must select one before uploading. If they interpret the chips as mandatory and none of the options fit their situation (e.g., a retiree, a parent, a part-time student — none of which are options), they may abandon. The "optional" nature of the chips is not communicated.

### 3. Post-upload result scroll depth (Estimated non-engagement: 40-60% of result viewers)
The result phase has 8 sequential staggered elements from `XRayCard` down to `ResultEmailCapture`. Mobile users who see the card but don't scroll past it will miss the email capture (the conversion event). There is no sticky CTA and no indication of what's below.

### 4. Error recovery (Low frequency, high abandonment rate)
The error state shows an error message and a "Try again" button inside the upload zone. However, if the error is "Analysis failed. Try again," users don't know whether to:
- Re-upload the same screenshot
- Take a different screenshot
- Try the guide toggle to see if they did something wrong

The error message gives no actionable guidance about what to do differently.

### 5. Cold /xray entry without context (Moderate drop)
As detailed in Section 5, cold visitors lack the social proof, result preview, and product context that quiz-flow visitors have. Conversion from cold `/xray` entry to actual upload is likely lower than from quiz flow.

---

## 8. Context Chip Labeling: Is "I'm Currently…" Clear Enough?

**No. It's grammatically clear but purpose-unclear.**

The label reads "I'm currently…" followed by chips: Student, Working, Freelance, Job hunting. A user who doesn't know what this changes will skip it. The quiz flow gave chips a purpose ("We'll tailor your results to your situation"). The scan phase gives chips no stated purpose.

Additionally, the chips have no "not applicable" or "skip" option visible. A user who doesn't fit any of the four options has no affordance for acknowledging this. They may select the closest option (potentially skewing the personalized insight), or skip chips entirely (losing personalization).

**The invisible selection deselect:** There is no deselect affordance. Once a chip is selected (border highlights), there is no indication that tapping it again deselects it. The `toggle` function doesn't exist here — `onSelect` only sets a value, never clears it. Users who tap a chip by accident cannot undo the selection.

Examining `ContextChip.tsx` line 19-21: `onSelect: (stage: LifeStage) => void` — the handler sets state but there is no `null` option. This is a functional gap: the component does not support deselection.

---

## 9. Error Recovery Flows

The error state in `UploadZone.tsx` (lines 256-296) shows:
- An orange "!" icon
- The error message string
- A "Try again" button that calls `reset()`

`reset()` sets state back to `idle`, clears the error message, and resets the file input. This is technically correct but communicatively insufficient.

**Problems:**

1. "Analysis failed. Try again." is the fallback error message when the server returns an error without a specific message. It gives the user no diagnostic information. Is the file format wrong? Is the screenshot too small? Is the service temporarily down? The user cannot know.

2. The "Try again" button resets to `idle` but does not re-trigger the guide. If the failure was caused by uploading the wrong screenshot (e.g., the user photographed their iPhone home screen instead of the Screen Time data), the guide toggle is available again — but the user has no reason to look at it.

3. There is no error differentiation between client-side errors (file compression failure), network errors (fetch failed), and server-side analysis errors (Vision AI couldn't parse the screenshot). All three surface the same UX.

4. The rate-limit error case is handled server-side (`rate-limit.ts` exists in the repo) but the error message that surfaces to users ("Analysis failed. Try again.") does not tell users they've hit a rate limit or when they can try again.

---

## 10. Summary: Did the Redesign Improve the Flow?

| Dimension | Before (4-phase) | After (2-phase) | Verdict |
|-----------|-----------------|-----------------|---------|
| First-time user hand-holding | Mandatory guide before upload | Optional guide toggle | Regression for new users |
| Returning user friction | Had to click through guide every time | Goes straight to upload | Improvement |
| Mobile discoverability of guide | Visible as a distinct phase | Hidden behind small toggle | Regression |
| Context collection | Separate phase with clear purpose | Inline chips with unclear purpose | Regression in clarity |
| Page simplicity | 4 visible phases | 2 phases | Improvement |
| Cold entry (/xray without quiz) | Same issue existed | Same issue exists | No change |
| Time to first interaction | Slower (must complete guide) | Faster | Improvement |
| Conversion for users without a screenshot | Guide taught them to get one | Guide is hidden | Regression |

**Net assessment:** The redesign is faster for users who already know the product. It is likely worse for first-time visitors. Given that the primary growth vector is sharing X-Ray cards (cold /xray entries), optimizing for returning users at the expense of first-time users may be the wrong trade-off at this stage.

---

## 11. Questions for QA

1. **File picker on mobile:** When a user taps "Choose image" on iOS Safari, does the native sheet offer "Take Photo or Video" as an option? If so, what happens when a user takes a live photo of their screen instead of uploading an existing screenshot — does the Vision AI analysis still work, or does it fail because the angle/glare is wrong?

2. **Chip deselection:** Is there a way to deselect a context chip once selected? The `ContextChip` component's `onSelect` handler only accepts a `LifeStage` value and never passes `null`. Can a user undo a chip selection, and does the result headline correctly return to "Here's your X-Ray" when no chip is selected?

3. **Guide toggle visibility during file picker:** On both iOS Safari and Android Chrome, is the "Where do I find this?" guide toggle visible after the file picker is dismissed without selecting a file? Does the user's scroll position reset, or does the viewport stay where it was when they tapped "Choose image"?

4. **Result phase scroll behavior on mobile:** After upload completes and `handleResult` is called, does the page scroll to the top to show the result phase headline, or does the viewport stay at the upload zone position? If the result renders below the fold from the user's current scroll position, will they see the staggered reveal animations?

5. **Error message specificity:** When the Vision AI cannot identify a Screen Time screenshot (e.g., the user uploads a photo of their cat), what error message does the server return — is it the generic "Analysis failed. Try again." or does the API return a specific message that helps the user understand they uploaded the wrong type of image?
