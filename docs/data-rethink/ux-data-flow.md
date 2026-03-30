# UX Data Flow: Multi-Step Screenshot Upload + Context Collection

**Author:** UX Researcher
**Date:** 2026-03-30
**Audience:** Gen Z (18-28), mobile-first, 80% iPhone
**Constraint:** The user is on Safari on their phone. They have never heard of "Screen Time sections." They will give this 60 seconds before leaving.

---

## The Core Problem

iOS Screen Time is not one screen. It is four scrollable sections, each with different data:

| Section | What it shows | Scroll position |
|---------|--------------|-----------------|
| **Daily Average** | Total hours, bar chart by day | Top of screen (visible immediately) |
| **Most Used Apps** | App list with hours, sorted by time | Below the fold (requires scrolling) |
| **Pickups** | How many times they unlocked + first app opened | Further down |
| **Notifications** | Notification count by app | Bottom |

One screenshot captures roughly one screenful. To get the full picture, we need 2-4 screenshots. But asking for 4 screenshots from a 20-year-old who has never navigated to Settings > Screen Time > See All App & Website Activity > Week view is a trust and patience problem, not a technical one.

---

## 1. Step-by-Step Upload Guide UX

### The Navigation Problem

The path to the right screen is: **Settings > Screen Time > See All App & Website Activity > tap "Week" tab**.

Most Gen Z users have never opened this screen. They know Screen Time exists (they get the weekly notification) but they have never navigated to it manually. The instruction "screenshot your Screen Time" is like telling someone to "export a CSV" -- technically accurate, meaningless in practice.

### Recommendation: Animated Tap-by-Tap Walkthrough

**Not** a video. Not a wall of text. An inline animated walkthrough that shows each tap as a phone screen mockup transitioning to the next screen.

**Why not video:**
- Videos feel like homework. Gen Z skips them.
- Videos can't be tapped through at the user's own pace.
- Videos add load time and feel heavy on mobile.
- A user who is partway through can't easily re-find their place.

**Why animated tap-by-tap:**
- Each step is one screen. User taps "Next" when they have completed that step on their own phone.
- The mockup shows a stylized iPhone with the exact UI they will see, with an animated "tap here" indicator (pulsing circle on the right button/link).
- They do not need to remember anything. Each step is: "See this? Tap it. Done? Tap Next."
- If they get lost, they can tap "Back" to re-see a step. No rewinding a video.

### The Walkthrough Screens

```
Step 1 of 4
┌──────────────────────────────────────┐
│                                      │
│   Open Settings on your iPhone       │
│                                      │
│   ┌────────────────────────────┐     │
│   │  [Stylized iPhone screen]  │     │
│   │                            │     │
│   │   Settings                 │     │
│   │   ─────────                │     │
│   │   (o) Screen Time  <─ TAP  │     │
│   │   ...                      │     │
│   └────────────────────────────┘     │
│                                      │
│   Tap "Screen Time"                  │
│                                      │
│         [ I'm there -- Next ]        │
│                                      │
└──────────────────────────────────────┘
```

```
Step 2 of 4
┌──────────────────────────────────────┐
│                                      │
│   Now tap "See All App &             │
│   Website Activity"                  │
│                                      │
│   ┌────────────────────────────┐     │
│   │  Screen Time               │     │
│   │  ─────────────             │     │
│   │  4h 23m  daily average     │     │
│   │                            │     │
│   │  See All App &             │     │
│   │  Website Activity  <─ TAP  │     │
│   │                            │     │
│   └────────────────────────────┘     │
│                                      │
│         [ I'm there -- Next ]        │
│                                      │
└──────────────────────────────────────┘
```

```
Step 3 of 4
┌──────────────────────────────────────┐
│                                      │
│   Make sure "Week" is selected       │
│   at the top                         │
│                                      │
│   ┌────────────────────────────┐     │
│   │  [Day]  [Week] <─ SELECT   │     │
│   │  ─────────────             │     │
│   │  ███ ██ ████ ██ █ ████ ██  │     │
│   │  M   T   W   T  F  S   S  │     │
│   │                            │     │
│   │  Most Used                 │     │
│   │  Instagram    3h 12m       │     │
│   │  YouTube      2h 45m       │     │
│   │  ...                       │     │
│   └────────────────────────────┘     │
│                                      │
│   Good. Now take a screenshot.       │
│                                      │
│         [ I'm there -- Next ]        │
│                                      │
└──────────────────────────────────────┘
```

```
Step 4 of 4
┌──────────────────────────────────────┐
│                                      │
│   Take the screenshot!               │
│                                      │
│   Press Side button + Volume Up      │
│   at the same time.                  │
│                                      │
│   Then come back here and             │
│   upload it.                         │
│                                      │
│   ┌────────────────────────────┐     │
│   │                            │     │
│   │   [ Upload screenshot ]    │     │
│   │                            │     │
│   │   (opens photo picker)     │     │
│   └────────────────────────────┘     │
│                                      │
│   We see app names and time          │
│   totals. Never your messages,       │
│   photos, or passwords.              │
│                                      │
└──────────────────────────────────────┘
```

### Key Design Decisions

- **Step indicators** (1 of 4, 2 of 4) at the top, not a progress bar. Progress bars create time anxiety. Step counts feel finite and achievable.
- **"I'm there -- Next"** is the CTA, not "Continue." It confirms they have completed the physical action on their phone, creating a sense of agency.
- **The privacy line** ("We see app names and time totals. Never your messages, photos, or passwords.") appears on the final upload screen, exactly when anxiety peaks.
- **No "Skip" button** during walkthrough steps. If they want out, they can close the flow or tap the browser back button. A skip button signals that the steps are optional, which undermines the guide.
- **Android fallback:** If we detect Android (user agent), swap all mockups for Digital Wellbeing equivalents: Settings > Digital Wellbeing > Dashboard. Same structure, different screenshots.

---

## 2. Multi-Screenshot Upload UX

### The Options Evaluated

| Pattern | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Upload all at once** (file picker, select multiple) | Fastest for savvy users | User has no idea which 2-4 photos to pick from camera roll; no guidance on what each should contain | Bad for our audience |
| **Guided sequential steps** ("Step 1: screenshot overview... Step 2: scroll down...") | Clear, no ambiguity | Feels long; 4 separate upload steps is a lot of friction | Good with modification |
| **Placeholder outlines** (ghost images showing what each screenshot should look like) | Visual, intuitive | Hard to match a real screenshot to an outline; Screen Time UI varies by iOS version | Supplementary only |

### Recommendation: One Screenshot First, Then Guided Upsell

**Do not ask for 2-4 screenshots upfront.** One screenshot is the entry point. The progressive disclosure pattern from the existing research ("upload 1 screenshot > see partial X-Ray > 'want the full picture?' > upload more") is the correct architecture.

**The flow:**

```
Phase 1: One screenshot (30 seconds)
────────────────────────────────────
User follows the 4-step walkthrough above.
They screenshot the "Most Used" view (the default view when they reach the right screen).
They upload it.
They see a partial Time X-Ray immediately.

Phase 2: "Want the full picture?" (optional, 60 more seconds)
────────────────────────────────────────────────────────────
After seeing their partial results, a card appears:

┌──────────────────────────────────────┐
│                                      │
│  We found 6 apps eating your time.   │
│  But there's more.                   │
│                                      │
│  Scroll down on that same screen     │
│  and screenshot "Pickups" too.       │
│  It shows how many times you         │
│  unlocked your phone -- and which    │
│  app pulled you in first.            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [Ghost outline of pickups     │  │
│  │   section with blurred         │  │
│  │   placeholder data]            │  │
│  └────────────────────────────────┘  │
│                                      │
│  [ Add Pickups screenshot ]          │
│  [ Skip -- this is enough ]          │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:**
1. **Sunk cost is activated.** They already uploaded one, they have already seen value. Adding a second feels like completing something, not starting something new.
2. **The request is specific.** "Scroll down on that same screen and screenshot Pickups" is one physical action, not a new navigation journey.
3. **The ghost outline** shows what the section looks like (approximate), so they know they are screenshotting the right thing.
4. **Skip is always visible.** They can stop at any point. This is the single most important trust signal -- every step past the first is optional and labeled as such.

### What Each Screenshot Unlocks

Map the data to the insight, so the user understands why each screenshot matters:

| Screenshot | Data extracted | Insight unlocked | User-facing framing |
|-----------|---------------|-----------------|---------------------|
| **Most Used** (screenshot 1, required) | App names, hours per app, categories | "Your top time drains" + automation suggestions | "See which apps eat your week" |
| **Pickups** (screenshot 2, optional) | Unlock count, first app opened after unlock | Compulsive checking patterns, trigger apps | "See what pulls you back" |
| **Notifications** (screenshot 3, optional) | Notification count per app | Notification overload, distraction sources | "See what interrupts you" |
| **Daily Average chart** (screenshot 4, rare) | Day-by-day breakdown, trends | Weekend vs. weekday patterns, trend direction | "See your pattern over time" |

### Upload UI for Multiple Screenshots

After the first upload, show a visual progress card:

```
┌──────────────────────────────────────┐
│                                      │
│  Your Time X-Ray                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                      │
│  [v] App usage      ← uploaded       │
│  [ ] Pickups        ← adds depth     │
│  [ ] Notifications  ← adds depth     │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Resolution: 40%    ████░░░░░░       │
│                                      │
│  "More screenshots = sharper X-Ray"  │
│                                      │
└──────────────────────────────────────┘
```

**The "resolution" metaphor** is deliberate. It reframes additional uploads not as "giving us more data" (which feels extractive) but as "making YOUR picture clearer" (which feels empowering). Like adjusting focus on a camera -- the image is yours, you are just sharpening it.

---

## 3. Context Collection Without Forms

### The Problem

Screen Time data shows WHAT apps they use but not WHO they are. A student checking Instagram 3 hours/day is a different story from a social media manager doing the same. Without context, the automation suggestions are generic.

But a form ("Select your occupation: Student / Employee / Freelancer / Other") feels like a government website. It breaks the warm, conversational brand.

### Recommendation: Single Tap Chips Before Upload

Place the context collection BEFORE the screenshot upload, integrated into the walkthrough flow. After the user taps "Let's do it" but before Step 1 of the walkthrough, show one screen:

```
┌──────────────────────────────────────┐
│                                      │
│  First, a quick one.                 │
│  What's your week mostly about?      │
│                                      │
│  ┌───────────┐  ┌───────────────┐   │
│  │ Student   │  │ Working       │   │
│  └───────────┘  └───────────────┘   │
│  ┌───────────┐  ┌───────────────┐   │
│  │ Freelance │  │ Job hunting   │   │
│  └───────────┘  └───────────────┘   │
│  ┌───────────────────────────────┐   │
│  │ A bit of everything           │   │
│  └───────────────────────────────┘   │
│                                      │
│  (just one tap -- no wrong answer)   │
│                                      │
└──────────────────────────────────────┘
```

**Why chips, not a form:**
- One tap, zero typing. Matches the physical effort of tapping in a messaging app.
- Chip selection feels like a personality quiz (fun) not a form (work).
- The parenthetical "(just one tap -- no wrong answer)" kills the anxiety of committing to a label.

**Why before the screenshot, not after:**
- After the screenshot, the user is in "show me my results" mode. Any friction between upload and results feels like a toll gate.
- Before the walkthrough, they are in "setup" mode. A single tap feels like getting started, not being interrogated.
- It lets us immediately personalize the walkthrough language: "As a student, your Screen Time probably shows..." vs. generic instructions.

### Optional Second Context Layer: After Results

After showing the partial Time X-Ray, add one open-ended prompt:

```
┌──────────────────────────────────────┐
│                                      │
│  One more thing (optional):          │
│                                      │
│  What's the one task you wish        │
│  someone would just handle for you?  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Type anything...               │  │
│  └────────────────────────────────┘  │
│                                      │
│  Examples people have typed:         │
│  "figuring out what to eat"          │
│  "sorting my email"                  │
│  "tracking job applications"         │
│                                      │
│  [ Submit ]       [ Skip ]           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:**
- It appears AFTER they have seen value (their Time X-Ray), so the exchange feels fair.
- The examples reduce blank-field paralysis. Seeing what others typed makes it feel social and safe.
- The answer directly maps to an automation suggestion, making the next screen feel magically relevant.
- "Optional" + "Skip" + placement after value = zero perceived pressure.

### What NOT to do

- **Do not use a chat conversation for context collection at this stage.** The existing frontend-ux.md research already designed a full chat-based onboarding (Flow A). The screenshot upload flow is a different path -- it is faster and more data-driven. Mixing in a conversation here would create a hybrid that is slower than both paths.
- **Do not ask more than one question before the upload.** Every question before value delivery is a withdrawal from the trust account. One chip-tap is acceptable. Two questions and they are mentally categorizing this as a survey.
- **Do not ask for age, gender, or location.** We can infer timezone from the device. We can infer age range from app usage patterns in the screenshot. Asking feels like profiling.

---

## 4. The Trust Problem

### The Math

Current flow: 1 screenshot = moderate trust ask.
New flow: 1 chip tap + 1-4 screenshots + 1 optional text input = significantly larger trust ask.

Every additional step compounds suspicion: "Why do they need all this? What are they building on me?"

### Trust Architecture for Multi-Step Collection

**Principle: Show the receipt before asking for the next item.**

After each upload, immediately show what was extracted. Not a loading spinner for 10 seconds, then results. Show a live extraction feed:

```
Reading your screenshot...

Found: Instagram — 3h 12m
Found: YouTube — 2h 45m
Found: TikTok — 1h 38m
Found: WhatsApp — 52m
Found: Safari — 48m

✓ Done. 5 apps detected.
We did NOT read: messages, photos, passwords,
or the names of people you talk to.
```

**Why the live feed works:**
1. **Transparency theater.** By showing exactly what was extracted line by line, it demonstrates that the system read what it said it would and nothing more.
2. **The negative declaration** ("We did NOT read...") is not legal fine print -- it is a trust signal that appears at the exact moment of maximum anxiety.
3. **It gives agency.** If the user sees something they do not want shared (a sensitive app), they can mentally note that Meldar only sees the name and time, not what they did in the app.

### Additional Trust Signals for Multi-Step

| Signal | Where it appears | Why |
|--------|-----------------|-----|
| "Your screenshot stays on your phone. We read it, then it's gone from our servers." | Below the upload button | Addresses data retention fear |
| "X people uploaded their Screen Time this week" | Near the upload button | Social proof normalizes the action |
| Lock icon + "Processed in Finland under EU data protection law" | Footer of every upload screen | GDPR as competitive advantage |
| "Delete everything" link | Visible on the results screen | Exit visibility = entry willingness |
| Each extracted app shown as it is detected (live feed) | During processing | Real-time transparency |
| Explicit negative: "We never see your [messages/photos/passwords]" | After extraction completes | Proactive boundary-setting |

### The Creepy Mirror Problem

The UX research identified the "creepy mirror" effect: showing users data about themselves that feels too intimate. With Screen Time data, this is a real risk.

**Rules for the results screen:**
1. **Never comment on sensitive app categories.** If Screen Time shows a mental health app, a dating app, or a medical app, the system must either group it under "Other" or show it without commentary. No "You spend 45 minutes on BetterHelp" callouts.
2. **Never use judgmental framing.** "3 hours on Instagram" is a fact. "You wasted 3 hours on Instagram" is a judgment. The first builds trust; the second destroys it.
3. **Frame everything as opportunity, not diagnosis.** "Instagram: 3h 12m -- want to set a daily reminder when you hit your limit?" vs. "Instagram: 3h 12m -- this is above average."
4. **Let users remove apps from the analysis.** A small "x" on any app in the results lets them exclude it. This gives control over what goes into their X-Ray. If a user removes a dating app, that is their prerogative and the system should not acknowledge it.

---

## 5. Mobile-First Flow: The Exact Step-by-Step

80% of Gen Z will do this on their iPhone in Safari. Here is the exact physical journey.

### Full User Journey (annotated with physical actions)

```
STARTING POINT: User is on meldar.ai in Safari on iPhone.
They just finished the "Pick Your Pain" quiz or tapped
"Get your Time X-Ray" on the landing page.

TIME: 0:00
────────────────────────────────
ACTION: User taps "Get your Time X-Ray"
SCREEN: Context chip selection
PHYSICAL: One thumb tap on a chip (e.g., "Student")
DURATION: 3 seconds
ANXIETY LEVEL: Low (it's just a label)

TIME: 0:03
────────────────────────────────
ACTION: Chip selected, walkthrough begins
SCREEN: Step 1 — "Open Settings on your iPhone"
PHYSICAL: User presses iPhone home / swipes to home screen
NOTE: This is the critical moment. The user LEAVES Safari.
       They must know how to get back.
COPY ON SCREEN: "We'll be right here when you come back."
DURATION: 5 seconds to read + switch to home screen

TIME: 0:08
────────────────────────────────
PHYSICAL: User opens Settings app on iPhone
PHYSICAL: User taps "Screen Time"
NOTE: If Screen Time is not enabled, they see an
      "Enable Screen Time" prompt from iOS. This is
      a dead end for our flow. We need a fallback:
      "Screen Time not set up? No worries. Try the
       quiz instead -- it takes 15 seconds."

TIME: 0:15
────────────────────────────────
PHYSICAL: User taps "See All App & Website Activity"
PHYSICAL: User taps "Week" tab at the top
NOTE: This is the screen they need to screenshot.
      The "Most Used" list is visible.

TIME: 0:25
────────────────────────────────
PHYSICAL: User presses Side Button + Volume Up
RESULT: Screenshot saved to Camera Roll
NOTE: The screenshot thumbnail appears bottom-left
      for 5 seconds. They do NOT need to tap it.

TIME: 0:30
────────────────────────────────
PHYSICAL: User switches back to Safari
HOW: Swipe up from bottom (gesture nav) or double-tap
     home button (older iPhones), tap Safari in app switcher
NOTE: Safari should still show the Meldar walkthrough page.
      If the page reloaded, we lose them.
      IMPORTANT: The walkthrough state must survive
      a Safari tab backgrounding. Use sessionStorage
      or React state that persists through tab switches.

TIME: 0:35
────────────────────────────────
SCREEN: Step 4 — "Upload your screenshot"
ACTION: User taps "Upload screenshot" button
PHYSICAL: iOS photo picker opens (native <input type="file" accept="image/*">)
          User taps "Recents" (default), screenshot is the first image
          User taps the screenshot, taps "Choose"
DURATION: 5-8 seconds

TIME: 0:43
────────────────────────────────
SCREEN: Processing — live extraction feed
"Reading your screenshot..."
"Found: Instagram — 3h 12m"
...
DURATION: 3-5 seconds (Vision AI processing)

TIME: 0:48
────────────────────────────────
SCREEN: Partial Time X-Ray results
User sees their data for the first time.
This is the aha moment.
```

**Total time: under 50 seconds for one screenshot.**

### The Tab-Switching Problem

The biggest drop-off risk is the Safari-to-Settings-back-to-Safari transition. Three design mitigations:

1. **"We'll be right here."** Copy on the walkthrough screen before they leave Safari. Sets the expectation that Meldar will still be there when they come back.

2. **State persistence.** The walkthrough step and the chip selection must persist through a Safari tab being backgrounded. `sessionStorage` is sufficient. If the page force-reloads (iOS memory pressure), the state must survive. Store the minimum in `sessionStorage`: `{ step: 3, context: "student" }`.

3. **Smart re-entry.** If the user returns to the page and the walkthrough detects they already completed steps 1-3, skip directly to Step 4 (upload). Do not make them re-tap through the guide.

### Android Adaptation

Android users go to: **Settings > Digital Wellbeing & Parental Controls > Dashboard**.

The UI is different but the structure is similar. The walkthrough should detect the user agent and show Android-specific mockups. The upload mechanism is identical (native file input).

Key Android differences:
- Digital Wellbeing shows a usage chart and app list on one screen (less scrolling needed).
- Pickups are labeled "Phone unlocks."
- The screenshot shortcut is Power + Volume Down on most devices.

---

## 6. Progressive Disclosure: The Reveal Ladder

### The Principle

Every piece of data the user shares should unlock a visible, immediate insight. The user should never feel like they are feeding a black box. The reveal ladder is:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  LEVEL 0: Pain Quiz (no data)                   │
│  "Based on what you picked, people like you     │
│   lose ~8 hrs/week. Want YOUR real number?"      │
│                  │                               │
│                  v                               │
│  LEVEL 1: One screenshot (30 sec)               │
│  "You spend 6.2 hrs/day on your phone.          │
│   Instagram alone: 3h 12m. That's 22 hrs/week." │
│                  │                               │
│                  v                               │
│  LEVEL 2: Pickups screenshot (+30 sec)          │
│  "You unlock your phone 78 times/day.           │
│   Instagram is what pulls you back 40% of       │
│   the time. It's not just time -- it's           │
│   interruptions."                                │
│                  │                               │
│                  v                               │
│  LEVEL 3: Notifications screenshot (+30 sec)    │
│  "You got 247 notifications this week.          │
│   68% were from 3 apps. Muting them would       │
│   save you 12 interruptions/day."               │
│                  │                               │
│                  v                               │
│  LEVEL 4: Google Takeout (3 min + wait)         │
│  "Full Time X-Ray: your browser history,        │
│   search habits, watch history, calendar,       │
│   maps. The complete picture."                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### The Upsell Moment

After Level 1 results are shown, the upsell to Level 2 is not a popup, not a modal, not a banner. It is a card at the bottom of the results, below the fold, that the user scrolls into:

```
┌──────────────────────────────────────┐
│                                      │
│  Your X-Ray at 40% resolution        │
│                                      │
│  You uploaded your app usage.        │
│  That's the big picture.             │
│                                      │
│  But there's a hidden layer:         │
│  how many times your phone           │
│  actually pulled you in today.       │
│                                      │
│  Scroll down on the same Screen      │
│  Time page and screenshot            │
│  "Pickups."                          │
│                                      │
│  [ Add Pickups screenshot ]          │
│                                      │
│  or [ I'm good with this ]           │
│                                      │
└──────────────────────────────────────┘
```

**Design rules for the upsell:**
- **Never block the results.** The partial X-Ray is always fully visible and usable without adding more data. The upsell is below the results, never on top of them.
- **Never use urgency language.** No "Complete your X-Ray!" No countdown timers. No "You're missing out." Just a calm description of what more data would show.
- **Always offer a "done" exit.** "I'm good with this" is always visible. It is not gray or de-emphasized. It is a real, equal option.
- **The resolution metaphor persists.** "40% resolution" after one screenshot. "65%" after pickups. "85%" after notifications. "100%" after Takeout. The user understands they are sharpening their own picture, not feeding a machine.

### Why This Beats "Upload All 4 Now"

| Metric | Upload all at once | Progressive reveal |
|--------|-------------------|-------------------|
| Completion rate for 1st screenshot | Same | Same |
| Completion rate for 4th screenshot | ~15% (most won't do it) | ~35-45% (sunk cost + curiosity) |
| Trust perception | "They want a lot from me" | "I choose how deep to go" |
| Time to first value | 2-3 min (must upload all first) | 48 sec (value after 1st upload) |
| Drop-off recovery | Lost -- they never saw results | Recoverable -- they have partial results, can return later |

---

## 7. The "So What" Screen: Results Page Wireframe

This is the most important screen in the entire flow. Everything before it is friction. This is the payoff.

### Design Principles for the Results Screen

1. **Lead with the shocking number.** Not the app breakdown. The single number that makes them feel something.
2. **Reference their context.** A student sees "That's 22 hours you could have spent studying -- or sleeping." A job hunter sees "That's 22 hours of job applications you're losing to scrolling."
3. **Show the automation opportunity, not the problem.** The problem is their data. The opportunity is what Meldar can do about it.
4. **Make it shareable.** The Data Receipt format already exists (see DataReceiptSection.tsx). This is the personal version.

### Wireframe: Level 1 Results (One Screenshot)

```
┌──────────────────────────────────────┐
│  ← Back                        ···  │
│──────────────────────────────────────│
│                                      │
│  YOUR TIME X-RAY                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Resolution: 40%  ████░░░░░░         │
│                                      │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │        6.2 hrs/day             │  │
│  │                                │  │
│  │  That's 43 hours a week        │  │
│  │  on your phone.                │  │
│  │                                │  │
│  │  As a student, that's more     │  │
│  │  time than a full course load. │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  WHERE IT GOES                       │
│  ─────────────                       │
│                                      │
│  Instagram           3h 12m    ████  │
│  YouTube             2h 45m    ███   │
│  TikTok              1h 38m    ██    │
│  WhatsApp               52m   █     │
│  Safari                 48m   █     │
│                                      │
│  ─────────────────────────────────── │
│                                      │
│  WHAT I'D BUILD FOR YOU              │
│  ─────────────────────               │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  #1  SCROLL GUARD              │  │
│  │                                │  │
│  │  Instagram + TikTok = 4h 50m. │  │
│  │  I'll nudge you at your        │  │
│  │  daily limit and suggest what  │  │
│  │  to do instead.                │  │
│  │                                │  │
│  │  Would save ~15 hrs/week       │  │
│  │                                │  │
│  │  [ Build this for me ]         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  #2  YOUTUBE DIGEST            │  │
│  │                                │  │
│  │  2h 45m watching. I'll track   │  │
│  │  your subscriptions and send   │  │
│  │  you a daily "what's new"      │  │
│  │  summary. Watch what matters,  │  │
│  │  skip the rabbit holes.        │  │
│  │                                │  │
│  │  Would save ~8 hrs/week        │  │
│  │                                │  │
│  │  [ Build this for me ]         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  #3  WHATSAPP BATCHING         │  │
│  │                                │  │
│  │  52 min/day of messages. I'll  │  │
│  │  hold non-urgent threads and   │  │
│  │  send you a digest 3x/day     │  │
│  │  instead of constant pings.    │  │
│  │                                │  │
│  │  Would save ~3 hrs/week        │  │
│  │                                │  │
│  │  [ Build this for me ]         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────── │
│  Total recoverable: ~26 hrs/week     │
│  ─────────────────────────────────── │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [ Build all 3 ]               │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  [ Share my X-Ray ]            │  │
│  │  (generates a Data Receipt     │  │
│  │   card image for Stories)      │  │
│  └────────────────────────────────┘  │
│                                      │
│  ─────────────────────────────────── │
│                                      │
│  SHARPEN YOUR X-RAY                  │
│  ─────────────────                   │
│                                      │
│  Your X-Ray is at 40% resolution.    │
│  Add more data to see the full       │
│  picture:                            │
│                                      │
│  [ ] Pickups -- see what pulls       │
│      you back (30 sec)               │
│                                      │
│  [ ] Notifications -- see what       │
│      interrupts you (30 sec)         │
│                                      │
│  [ ] Google Takeout -- the full      │
│      picture (3 min + wait)          │
│                                      │
│  ─────────────────────────────────── │
│                                      │
│  🔒 Your data is processed under     │
│  EU law (Finland). We see app names  │
│  and time. Never messages, photos,   │
│  or passwords.                       │
│                                      │
│  [ Delete everything ]               │
│                                      │
└──────────────────────────────────────┘
```

### Wireframe: Level 2+ Results (Multiple Screenshots)

When pickups data is added, a new section appears ABOVE the automation cards:

```
│  THE HIDDEN PATTERN                  │
│  ──────────────────                  │
│                                      │
│  You unlocked your phone 78x today.  │
│                                      │
│  The app that pulled you back:       │
│                                      │
│  Instagram    40%  ████████          │
│  WhatsApp     25%  █████             │
│  Mail         18%  ████              │
│  Other        17%  ███               │
│                                      │
│  That means Instagram didn't just    │
│  take 3 hours. It interrupted you    │
│  31 times.                           │
│                                      │
│  Each interruption costs ~23 min     │
│  of refocus time.                    │
│  (source: UC Irvine research)        │
│                                      │
```

When notification data is added, another section appears:

```
│  YOUR INTERRUPTION LOAD              │
│  ───────────────────                 │
│                                      │
│  247 notifications this week.        │
│  That's one every 4 minutes          │
│  during waking hours.                │
│                                      │
│  The loudest apps:                   │
│  Instagram     89 notifications      │
│  WhatsApp      72 notifications      │
│  YouTube       41 notifications      │
│                                      │
│  Muting the top 3 would remove       │
│  82% of your interruptions.          │
│                                      │
```

### The Shareable Data Receipt

The "Share my X-Ray" button generates a card image (like the existing DataReceiptSection format) with their actual numbers. This is the viral hook:

```
┌────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  YOUR TIME X-RAY               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                │
│   43 hrs/week    78 pickups    │
│   on phone       per day       │
│                                │
│   Top drain:     Trigger app:  │
│   Instagram      Instagram     │
│   3h 12m/day     40% of        │
│                  unlocks       │
│                                │
│   Recoverable:   247           │
│   26 hrs/week    notifications │
│                  this week     │
│                                │
│  ─────────────────────────────│
│  Get yours: meldar.ai          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└────────────────────────────────┘
```

The card is designed for Instagram Stories (9:16 aspect ratio) and includes the meldar.ai URL. Users share their numbers like they share Spotify Wrapped cards -- because the data is surprising and personal.

### Key UX Principles for the Results Screen

1. **The number at the top must be shocking.** "6.2 hrs/day" is a fact. "That's more time than a full course load" is the emotional hook that makes them stay on the page.
2. **Automation cards reference THEIR data.** "Instagram + TikTok = 4h 50m" -- these are their numbers, not generic suggestions. This is what makes it feel personal.
3. **Time saved is always stated per week.** "~15 hrs/week" sounds large and motivating. Per-day numbers sound small ("~2 hrs/day"). Per-week is the sweet spot.
4. **"Share my X-Ray" appears before "Sharpen your X-Ray."** The sharing CTA comes first because it capitalizes on the emotional peak. The upsell to add more data comes after, when they are still engaged but past the initial excitement.
5. **Trust signals at the bottom, not the top.** The lock icon, GDPR badge, and "Delete everything" link are at the bottom because they are reassurance, not marketing. Users who need reassurance will scroll to find it. Users who do not need it are not slowed down by it.
6. **"Delete everything" is a real, working button.** Not buried in settings. Not behind a confirmation dialog that says "Are you sure?" Just: tap > data deleted > confirmation. This is the single strongest trust signal in the entire product.

---

## Summary: The Complete Flow

```
Landing page
     │
     v
"Get your Time X-Ray" CTA
     │
     v
Context chip: "What's your week about?" (one tap, 3 sec)
     │
     v
Walkthrough: 4 steps to navigate to Screen Time (20 sec)
     │
     v
Screenshot taken, user returns to Safari
     │
     v
Upload via native photo picker (5 sec)
     │
     v
Live extraction feed: "Found: Instagram — 3h 12m..." (3 sec)
     │
     v
PARTIAL TIME X-RAY (the aha moment)
     │
     ├── "Share my X-Ray" (viral card)
     ├── Automation suggestions (personalized by context + data)
     ├── "Sharpen your X-Ray" (add pickups, notifications)
     │        │
     │        v
     │   Additional screenshots → richer results
     │
     └── Optional: "What task do you wish someone would handle?"
              │
              v
         Even more personalized automation suggestion
```

**Total time to first value: under 50 seconds.**
**Total screens: 7 (chip + 4 walkthrough + upload + results).**
**Number of user decisions: 4 (chip tap + 3 "Next" taps + photo selection).**
**Trust deposits before data request: 2 (pain quiz results + walkthrough transparency).**
