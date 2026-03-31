# UX Research Review: Phase 2 Features

**Reviewer:** UX Researcher
**Date:** 2026-03-31
**Scope:** ChatGPT Export Analyzer, Subscription Autopsy, Actionable Screen Time, ADHD Mode
**Target:** Gen Z / Gen Alpha (18-28), mobile-first, ChatGPT-fluent, failed at AI tools before

---

## 1. Friction Analysis by Feature

### A. ChatGPT Export Analyzer

| Step | Action | Time | Platform | Drop-off Risk |
|------|--------|------|----------|---------------|
| 1 | Open ChatGPT settings | 10s | Mobile/Desktop | Low |
| 2 | Navigate to Data controls | 10s | Mobile/Desktop | Medium - non-obvious menu location |
| 3 | Tap "Export data" | 5s | Mobile/Desktop | Low |
| 4 | Wait for email from OpenAI | 1-30 min | Email | **CRITICAL** - user leaves the flow entirely |
| 5 | Download zip from email | 15s | Mobile/Desktop | High on mobile - zip handling is clunky |
| 6 | Extract conversations.json | 10-30s | Desktop easy, mobile hard | **CRITICAL on mobile** - iOS Files app, no native unzip in some Android |
| 7 | Upload to Meldar | 10s | Mobile/Desktop | Low if they got this far |

**Total time:** 2-35 minutes (variable due to email wait)
**Total steps:** 7 deliberate actions across 3 different apps
**Predicted completion rate:** 15-25% of those who start

**Where users abandon:**
- **Step 4 (email wait):** This is the killer. The user leaves Meldar, opens email, waits. There is no guarantee they come back. Push notifications do not exist yet. The mental model breaks: "I was on a website, now I'm waiting for an email from a different company."
- **Step 6 (extract zip):** On mobile, extracting a specific JSON file from a zip is a multi-step sub-task. Many Gen Z users have never manually handled zip files on their phones.
- **Between steps 3 and 4:** The user has no confirmation from Meldar that anything is happening. They initiated an action on OpenAI's side. Meldar has no visibility into whether the export was requested.

### B. Subscription Autopsy

| Step | Action | Time | Platform | Drop-off Risk |
|------|--------|------|----------|---------------|
| 1 | Open Settings on phone | 5s | Mobile only | Low |
| 2 | Tap Apple ID / Google Play subscriptions | 10s | Mobile | Low-Medium (path varies by OS version) |
| 3 | Screenshot the list | 5s | Mobile | Low |
| 4 | Upload to Meldar | 10s | Mobile/Desktop | Low |

**Total time:** 30-45 seconds
**Total steps:** 4 simple actions, all on one device
**Predicted completion rate:** 60-75%

**Where users abandon:**
- **Step 2:** The navigation path to subscriptions changes between iOS versions. iOS 17 moved it. Some users have subscriptions split across Apple ID and individual apps. The guide needs to account for this.
- Very low friction overall. This is the easiest new feature to complete.

### C. Actionable Screen Time

| Step | Action | Time | Platform | Drop-off Risk |
|------|--------|------|----------|---------------|
| 1 | Same as current Screen Time flow | 30s | Mobile | Same as current |

**Total time:** Same as existing flow (~30 seconds)
**Total steps:** Same as existing (context chip > guide > upload)
**Predicted completion rate:** Same as current, possibly higher if output is better

**No additional friction.** This is a backend/output improvement, not a flow change. The UX win here is entirely in the quality of the result, not the input. Current result card (`XRayCard`) shows hours and app names. If "Actionable" means showing specific recommendations ("You open Instagram 47 times/day. Try: move it to page 3 of your home screen"), the result page gets more complex but the input stays the same.

**Risk:** If the actionable output is too long or too prescriptive, it could feel preachy. Gen Z responds to observation + agency, not lecturing. Frame suggestions as options, not instructions.

### D. ADHD Mode

| Step | Action | Time | Platform | Drop-off Risk |
|------|--------|------|----------|---------------|
| 1 | Toggle ADHD Mode | 2s | Mobile/Desktop | Low |

**Total time:** No additional time
**Total steps:** 1 toggle, then the experience adapts around the user
**Predicted completion rate:** N/A (it's a mode, not a funnel)

**No friction if the toggle is discoverable.** The question is where the toggle lives, how the mode changes the experience, and whether it helps or patronizes (see Section 3).

---

## 2. The ChatGPT Export Problem

### Why 5+ steps and an email wait is (almost) too much

The current Screen Time flow works because it follows a pattern Gen Z already knows: screenshot something on your phone, upload it. The entire loop happens in under 60 seconds on one device.

The ChatGPT export breaks every rule of that pattern:

1. **Cross-app orchestration.** The user must coordinate between Meldar (browser), ChatGPT (browser/app), and email. Each app switch is a context switch. Each context switch is a chance to get distracted or forget.
2. **Asynchronous wait.** The email can take minutes or hours. OpenAI does not guarantee a timeframe. During this wait, the user has left Meldar entirely. There is no way to bring them back without push notifications (which Meldar does not have).
3. **File management on mobile.** Downloading a zip, finding the right JSON file, and uploading it requires file system literacy that many Gen Z users lack. iOS makes this particularly painful.
4. **No progress visibility.** Meldar cannot show a progress bar or status update because the export is happening on OpenAI's servers. The user is flying blind.

### How to make it feel worth it

**Strategy: Front-load the payoff, back-load the effort.**

1. **Show a preview before they start.** Before asking the user to export, show them a sample ChatGPT analysis: "Here's what Sarah learned about her ChatGPT usage." Make the result feel tangible and desirable before they commit to the effort. Use a real-looking (anonymized) example that shows surprising insights ("You asked ChatGPT to write 43 emails for you last month. That's 3 hours of your life you got back - but you also asked it to explain the same concept 11 times. Maybe a bookmark would help?").

2. **Break the wait with a "we'll text you" option.** When the user requests the export, offer to notify them when it's time to upload. This could be email (you already have Resend) or SMS. The message: "Your ChatGPT data is ready to analyze. Come back when you get the email from OpenAI." Include a deep link back to the upload step so they don't have to navigate from scratch.

3. **In-flow instruction with live screenshots.** The current `ScreenshotGuide` pattern (step-by-step with platform toggle) should be replicated for the ChatGPT export, but with actual screenshots of the ChatGPT UI at each step. Generic text instructions like "Go to Data controls" mean nothing if the user can't find the menu. Show them exactly what to tap.

4. **Desktop-first for this feature.** Unlike Screen Time (inherently mobile), ChatGPT export is much easier on desktop. The zip download and JSON extraction are trivial on a laptop. Acknowledge this in the UI: "This works best on a computer. We'll send you a link to continue on desktop." This is the one feature where steering users away from mobile actually reduces friction.

5. **Auto-detect the file.** When the user uploads the zip, don't ask them to extract `conversations.json` first. Accept the entire zip and extract it server-side (or client-side with JSZip). This eliminates the hardest mobile step.

6. **Position it as a "level up" in the effort escalation funnel.** The current funnel goes: quiz (15s) > screenshot (30s) > Takeout (3 min). ChatGPT export fits between screenshot and Takeout in effort. Frame it as: "You've already seen your screen time. Want to go deeper? See what your ChatGPT conversations reveal about how you actually work."

---

## 3. ADHD Mode UX

### What the GIFs should look like

**Visual language:** Slow, looping, low-saturation animations. Think: a cat slowly blinking, rain on a window, a candle flame, kinetic sand being sliced. NOT: flashy memes, fast cuts, or anything with text overlays.

**Format:** Subtle cinemagraphs or micro-animations, not full-motion GIFs. Keep file sizes under 500KB. Use `<video>` with autoplay/muted/loop for better performance than actual GIF format. Consider using Lottie animations for even lighter weight.

**Color palette:** Stay within the brand's warm cream (#faf9f6) and mauve (#623153) range. Desaturate any real-world GIFs to match. Avoid high-contrast or rapidly changing colors.

### Where they appear

1. **During upload processing.** Replace the current step-by-step text progress (`STEPS` array in `UploadZone.tsx`) with a calming animation and a single line of reassuring text. Current: "Compressing image / Uploading screenshot / Detecting apps / Generating your X-Ray" (4 steps ticking by). ADHD Mode: A slow, breathing animation with "Working on your X-Ray..." and no numbered steps. The numbered steps create anxiety about whether it's stuck.

2. **During the ChatGPT export wait.** A full-screen calming visual with a message like "We'll let you know when it's ready. You can close this page." This is the most natural place for a calming GIF - the user is literally waiting with nothing to do.

3. **On form inputs.** Small decorative animations next to input fields (email capture, quiz selections) to reduce the "I'm filling out a form" feeling. Keep them peripheral, not competing with the input itself.

4. **NOT on result screens.** The X-Ray result card is a moment of engagement, not anxiety. Adding calming GIFs there would dilute the impact of the data.

### How the toggle works

**Placement:** In the site header, as a small icon button (a brain icon or infinity loop). Not in a settings page - ADHD users won't dig for it. It should be visible on every page, always one tap away.

**Persistence:** Store the preference in localStorage (same pattern as cookie consent). Persist across sessions. Don't ask why they're enabling it.

**Behavior changes in ADHD Mode:**

| Element | Standard Mode | ADHD Mode |
|---------|--------------|-----------|
| Copy length | Full paragraphs | Bullet points, shorter sentences |
| Progress indicators | Multi-step numbered list | Single reassuring line + animation |
| Auto-advance | User must click "Next" | Auto-advance after brief pause (with cancel) |
| Form labels | Standard | More conversational ("What's your email?" vs "Email address") |
| Results | Full detail first | TL;DR first, "Show more" for detail |
| Animations | Standard transitions | Slower, smoother, more fluid |
| Color intensity | Full brand palette | Slightly reduced contrast, warmer |

### Is it patronizing or genuinely helpful?

**It is helpful IF:**
- The toggle is optional, unlabeled beyond "calm mode" or "focus mode" (not "ADHD Mode" in the UI - that's a clinical label that some users find stigmatizing and others find affirming, so let the marketing name it but let the UI stay neutral)
- It changes the experience meaningfully, not just cosmetically
- It doesn't assume the user is incapable - it just assumes they prefer less noise
- It's available to everyone, not gated behind a diagnostic question

**It risks being patronizing IF:**
- The GIFs are too childish (bouncing cartoons, baby animals)
- The copy becomes oversimplified to the point of condescension
- It adds a "You're in ADHD Mode!" banner or acknowledgment on every page
- Enabling it triggers a modal explaining what ADHD is

**Recommendation:** Call it "Focus Mode" in the UI. Market it as "ADHD-friendly" in blog posts and social media. Let the user discover and name the experience themselves. The toggle should feel like switching a reading app to "night mode" - a personal preference, not a medical accommodation.

---

## 4. Mobile Flow Analysis

### A. ChatGPT Export - Mobile: POOR

- **Zip download:** iOS downloads zips to Files app, requiring users to navigate there, tap the zip, find conversations.json, then share it to Safari/Meldar. Many Gen Z users have never opened the Files app.
- **Cross-app flow:** ChatGPT app > Settings (in-app) > email app > download > Files > Safari/Meldar. That's 5 app switches.
- **Recommendation:** This feature should explicitly recommend desktop. On mobile, show: "This is easier on a computer. Want us to email you a link?" Send a deep link to the upload page via Resend.

### B. Subscription Autopsy - Mobile: EXCELLENT

- **This is a mobile-native flow.** You're already on your phone, looking at subscriptions on your phone, screenshotting your phone. The upload zone's drag-and-drop (which doesn't apply on mobile) gracefully falls back to the file picker via the `<input type="file">` in `UploadZone.tsx`.
- **iOS-specific note:** The share sheet allows direct upload from the screenshot preview (tap screenshot thumbnail > Share > choose Meldar if it's a PWA, or open in Safari and paste). But most users will just open the upload page and tap "Choose image" from their camera roll.
- **Android-specific note:** Digital Wellbeing subscription view varies by OEM. Samsung, Pixel, and OnePlus all show subscriptions differently. The guide needs to handle this or keep instructions generic.

### C. Actionable Screen Time - Mobile: GOOD (Same as current)

- The current flow is already mobile-first. The `UploadZone.tsx` component handles file selection via native file picker. The `ScreenshotGuide.tsx` auto-detects platform via user agent and shows iOS or Android steps.
- No changes needed to the input flow. The output (actionable recommendations) should be formatted for mobile-width screens - the current `XRayCard` is already constrained to `maxWidth="440px"`, which works.

### D. ADHD Mode - Mobile: GOOD (if implemented correctly)

- Toggle placement matters more on mobile. A header icon button works if the header isn't already crowded. Current header (`src/widgets/header/`) likely has logo + CTA. Adding a focus mode toggle as a small icon is fine.
- GIF/animation performance: Mobile devices have less GPU headroom. Use `will-change: transform` sparingly. Prefer CSS animations over video where possible. Test on low-end Android devices (the target audience doesn't all have iPhone 15 Pros).
- Touch targets: The toggle button must be at least 44x44px per Apple HIG / WCAG 2.5.5.

---

## 5. The Screenshot Guide Problem

### What's wrong with the current ScreenshotGuide.tsx

The current guide (`src/features/screenshot-upload/ui/ScreenshotGuide.tsx`) shows 4 generic steps for iOS:

1. Open Settings
2. Tap Screen Time
3. See All App & Website Activity
4. Select "Week" and screenshot

**The problem:** The actual iOS Screen Time UI (as of iOS 17/18) has **4 scrollable sections** within "See All App & Website Activity":

1. **Most Used** - app list with time bars (this is what Meldar needs)
2. **Pickups** - how many times you picked up your phone
3. **Notifications** - which apps send the most notifications
4. **Most Used (by category)** - Entertainment, Social, Productivity, etc.

The current guide says "Take a screenshot of the app list" but doesn't tell users WHICH section to screenshot, or that they might need to scroll. If the user screenshots the Pickups section, the Vision AI gets different data than expected. If they screenshot only the top 3 apps (visible without scrolling), the analysis is incomplete.

### How to fix it

**1. Replace text steps with annotated screenshots.**

The current `visual` field in `IOS_STEPS` just shows a text label ("Settings", "Screen Time", etc.) inside a grey box. Replace these with actual annotated screenshots (or high-fidelity mockups) of each iOS screen. Store as optimized WebP images in `/public/guides/`. This is the single biggest improvement possible.

**2. Add a "what to capture" step specifically for the scrollable sections.**

After "See All App & Website Activity," add a step that says:
- "You'll see a scrollable page with multiple sections. We need the **Most Used** section at the top."
- "Scroll until you can see all your apps, then screenshot."
- "If your list is long, take 2 screenshots - we can handle both."
- Show an annotated mockup with the "Most Used" section highlighted and the other sections dimmed.

**3. Support multi-screenshot upload.**

The current `UploadZone.tsx` accepts only a single file (`const file = e.target.files?.[0]`). If the app list requires scrolling, users need to upload 2-3 screenshots. Change the input to `multiple` and adjust the API to accept an array. This is critical for users with 20+ apps showing in Screen Time.

**4. Add version-specific paths.**

iOS 17 changed the Screen Time navigation. iOS 18 changed it again. The guide should ask "Which iOS version?" (or better, detect it from the user agent where possible) and show the correct path. The current guide assumes a single path that may not match the user's device.

**5. Handle the "Week" vs "Day" toggle explicitly.**

Step 4 says "Toggle to Week view" but doesn't explain where the toggle is or what it looks like. Some users may not realize there's a Day/Week toggle at the top of the screen. Show it.

**6. Android parity.**

The Android guide is equally generic. Digital Wellbeing UI varies significantly across Samsung (with One UI overlay), Pixel (stock Android), and other OEMs. At minimum, offer Samsung and Pixel variants.

---

## 6. Trust & Privacy for ChatGPT Conversations

### Why this is different from Screen Time

Screen Time screenshots show **aggregated, anonymous data**: app names and hours. There's nothing personally identifying. A screenshot of "Instagram: 3h 22m" tells you nothing about what the person looked at.

ChatGPT conversations contain **the user's actual thoughts, questions, fears, and work.** People ask ChatGPT about:
- Medical symptoms they haven't told their doctor
- Relationship problems
- Job interview prep (including complaints about their current employer)
- Financial questions
- Creative writing that feels deeply personal
- Homework and academic work they may not want traced

Uploading `conversations.json` to Meldar is, psychologically, like handing someone your diary and your browser history simultaneously.

### How to earn that trust

**1. Show them what's in the file before they upload.**

Add a client-side preview step. After the user selects `conversations.json`, parse it in the browser (not on the server) and show:
- Number of conversations
- Date range
- Topics detected (client-side keyword matching, not AI)
- A sample of conversation titles (which are visible in the file)

Let the user see what they're about to share. This mirrors the "Meldar doesn't watch you. You show Meldar." positioning.

**2. Client-side processing where possible.**

If any analysis can happen in the browser without sending the file to a server, do it there. Show a clear indicator: "This data is being analyzed on your device. Nothing has been uploaded yet." Even if some processing must happen server-side (for Claude Vision or other AI analysis), minimize what gets sent.

**3. Explicit data lifecycle.**

Currently, the Screen Time flow shows "Processed in ~3 seconds. Deleted immediately. Never stored." For ChatGPT data, this needs to be more specific:
- "Your conversations are analyzed in [X] seconds."
- "The raw file is deleted immediately after analysis."
- "We keep only the summary statistics (number of conversations, topic categories, time patterns). We never store the text of your conversations."
- "You can delete everything at [link]."

**4. Opt-in granularity.**

Let users exclude specific conversations or date ranges before upload. A simple "Select which months to include" or "Exclude conversations containing [keyword]" gives the user control and reduces the feeling of handing over everything.

**5. Third-party audit language.**

Meldar is a Finnish company under GDPR. Lean into this. "We're a Finnish company. European privacy law isn't optional for us - it's how we're built." This is already partially present in `TrustSection.tsx` ("European law requires it, and we like it that way") but should be repeated specifically in the ChatGPT upload flow.

**6. Social proof for this specific action.**

"2,847 people have analyzed their ChatGPT history with Meldar. Average analysis time: 4 seconds. Zero data breaches." (Only show real numbers when you have them. Fabricated social proof destroys trust faster than no social proof.)

**7. Let them see the raw API call.**

For the most privacy-conscious users (and this audience skews that way), offer a "See exactly what we send to our servers" toggle that shows the network request payload. This is a power-user feature but it sends a strong signal about transparency.

---

## 7. Questions for QA

1. **Multi-screenshot upload:** If we support multiple screenshots for the Screen Time flow (to capture long app lists that require scrolling), does the current `/api/upload/screentime` endpoint handle multiple files? Does the Vision AI correctly stitch or merge data from overlapping screenshots? What happens if the user uploads a duplicate?

2. **Zip file handling:** If we accept raw zip uploads for the ChatGPT export (instead of requiring the user to extract conversations.json), what is the maximum file size the Vercel serverless function can handle? ChatGPT exports can be hundreds of megabytes for heavy users. Should extraction happen client-side instead?

3. **Focus Mode persistence:** If Focus Mode (ADHD Mode) state is stored in localStorage (same pattern as cookie consent in `useConsentState`), does clearing cookies/storage reset it? Should there be a server-side preference if the user is eventually authenticated? Does Focus Mode need to be covered in the cookie consent flow since it stores data in localStorage?

4. **iOS version detection:** The current `ScreenshotGuide.tsx` detects platform via `navigator.userAgent` (`/android/i.test`). Can we also detect iOS version reliably from the user agent string to show version-specific screenshot instructions? How many iOS version variants do we need to support (16, 17, 18)?

5. **Client-side JSON parsing:** For the ChatGPT export preview (showing conversation count, date range, topics before upload), what is the performance impact of parsing a large `conversations.json` (potentially 50MB+) in the browser? Should we use a Web Worker to avoid blocking the main thread? What's the fallback for low-memory mobile devices?
