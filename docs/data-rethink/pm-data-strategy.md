# PM Data Strategy: What Data Do We Actually Need?

**Date:** 2026-03-30
**Author:** Product Manager
**Status:** Decision document for founder review
**Trigger:** Founder tested iOS Screen Time and found 4 scrollable sections. "What are we exactly gonna do with this? It gives no clarity really."

---

## Executive Summary

The founder's instinct is right: raw Screen Time data is shallow. "You spent 6h on Cup Heroes" is not a product. The question is what turns raw data into something worth paying for. The answer: **context + contrast + action**. Screen Time is one input, not the whole picture. We need 2-3 screenshots (not all 4 sections), plus a 60-second questionnaire that tells us what the user actually wants to change. The output is not a productivity audit -- it is a "here is the one thing eating your week, and here is the fix."

---

## 1. What Data Do We ACTUALLY Need?

To deliver a report that makes someone say "holy shit, fix this for me," we need three layers:

### Layer 1: Behavioral Data (what they DO)
This is the raw usage data. Screen Time screenshots, Google Takeout, browser history. It answers: **where does the time go?**

| Data point | Source | Signal |
|---|---|---|
| App usage durations | Screen Time screenshot (section 1) | Top time consumers, category breakdown |
| App rankings | Screen Time "Most Used" (section 2) | Which specific apps dominate |
| Pickup count + first app after pickup | Screen Time "Pickups" (section 3) | Compulsive behavior patterns, habit triggers |
| Notification volume by app | Screen Time "Notifications" (section 4) | Interrupt sources, attention fragmentation |
| Browsing patterns | Google Takeout / Chrome extension (future) | Polling, comparison shopping, context switching |

### Layer 2: Contextual Data (who they ARE)
Raw usage means nothing without context. 6 hours of Cup Heroes for a mobile game reviewer is work. For a college student during finals, it is a crisis. We need:

| Data point | How to collect | Why it matters |
|---|---|---|
| Role / life stage | Quick questionnaire (student / working / freelance / parent / other) | Frames what "wasted" means for THIS person |
| Top frustration | Text input or selection ("What wastes your time?") | Gives the report a target -- without this we are guessing what they want fixed |
| What they have tried | Optional question ("Have you tried any productivity tools?") | Avoids suggesting things they have already rejected |
| Goals (optional) | "What would you do with 2 extra hours/day?" | Emotional anchor for the report; makes the output feel personal |

### Layer 3: Contrast Data (the "so what")
The insight comes from comparing their data to something. Without a benchmark, "47 minutes in Gmail" is just a number. With a benchmark, it becomes "you check email 3x more than most people your age."

| Contrast type | Source | Example output |
|---|---|---|
| Population averages | Published research + our aggregate data over time | "Average 22-year-old spends 2h on social media. You spend 4.5h." |
| Their own stated goals | From the questionnaire | "You said you want to exercise more. You spend 0 minutes on fitness apps but 90 minutes on food delivery." |
| Category ratios | Computed from their data | "73% of your screen time is entertainment. 4% is learning." |
| Notification-to-usage ratio | Computed from sections 1 + 4 | "Telegram sends you 178 notifications/day but you use it 12 minutes. That is 1 notification every 4 seconds of actual use." |

**The formula:** Behavioral Data + Context + Contrast = an insight worth paying for.

Without context, we produce a mirror (boring). Without contrast, we produce a summary (useless). Without behavioral data, we produce a horoscope (our current quiz problem). All three together produce a diagnostic that creates the "holy shit" moment.

---

## 2. Screen Time Screenshots: How Many? Which Sections?

### The 4 iOS Screen Time sections

1. **Screen Time (main)** -- daily average, weekly chart, category breakdown (Games/Social/Productivity/etc.), app list with times
2. **Most Used** -- apps ranked by time (Cup Heroes 6h22m, Safari 36m, etc.)
3. **Pickups** -- daily average pickups (33), per-day chart, "First Used After Pickup" list
4. **Notifications** -- daily average (232), per-app counts (Telegram 178, Gmail 21, etc.)

### Recommendation: Ask for 2 screenshots, make 1 optional

**Required screenshot 1: "Screen Time" (section 1)**

This is the highest-signal section. It contains:
- Daily/weekly average hours
- Category breakdown (Games vs. Social vs. Productivity)
- Per-app time list

This alone is enough to build the core X-Ray. One screenshot, one upload.

**Required screenshot 2: "Notifications" (section 4)**

This is the second-highest signal section. Notification counts reveal:
- Which apps are interrupting the user (Telegram 178/day = constant interruption)
- The interrupt-to-value ratio (178 notifications for 12 minutes of use = pure noise)
- Low-hanging automations (mute/batch notifications is the easiest win to suggest)

Notifications are where the "so what" lives. "You spent 35 minutes on Hearthstone" is boring. "Telegram interrupted you 178 times and you only used it 12 minutes" is actionable.

**Optional screenshot 3: "Pickups" (section 3)**

Pickups data is valuable for habit-change framing ("You pick up your phone 33 times a day, and the first thing you open 7 of those times is Cup Heroes"). But it is not essential for the MVP X-Ray. Make it optional -- show a "want deeper insights?" prompt after the first two.

**Skip section 2 ("Most Used") entirely.**

The "Most Used" section is redundant with section 1. Section 1 already shows per-app usage times in the app list. Section 2 just ranks them differently. Asking for this screenshot adds friction with zero incremental signal.

### The upload UX

**Do NOT show users a 4-screenshot upload form.** That is a wall. Instead:

```
Step 1: "Take a screenshot of your Screen Time"
        [Show exact visual: Settings > Screen Time > see the daily/weekly view]
        [Upload zone]

Step 2: "One more -- your Notifications"
        [Show exact visual: scroll down to Notifications section]
        [Upload zone]

        [Optional: "Want the full picture? Add your Pickups screenshot too"]
```

Two steps. Two screenshots. Clear instructions with visual guides showing exactly which screen to capture. The optional third appears only after the first two are uploaded.

### Android Digital Wellbeing

Android's "Digital Wellbeing" is simpler -- one scrollable screen with a pie chart and app list. One screenshot captures most of the data. Platform detection should adjust instructions accordingly.

---

## 3. What Additional Context Makes the Analysis 10x Better?

### The minimum viable questionnaire (4 questions, 30 seconds)

These questions should appear WHILE the screenshots are being analyzed (parallel processing, not sequential friction):

**Q1: "What is your situation right now?"**
- Student
- Working full-time
- Working part-time / freelance
- Between jobs
- Parent at home
- Other: ___

*Why:* A student spending 6h on games during summer break is different from the same student during finals. A freelancer checking email 47 times is different from someone on vacation. Role determines what "wasted" means.

**Q2: "What bugs you most about how you spend your time?"**
Free text input, with 3-4 clickable examples:
- "I get sucked into my phone and lose track of time"
- "I spend too long deciding things (what to eat, what to watch)"
- "I check the same apps over and over for no reason"
- "I procrastinate on things I actually want to do"

*Why:* This is the most important question. Without it, we are guessing what the user wants fixed. With it, we can frame the entire report around THEIR stated frustration. The difference between a generic dashboard and a personal diagnosis.

**Q3: "What would you do with 2 extra hours a day?"**
Free text input, with examples:
- "Exercise"
- "Learn something new"
- "Side project"
- "Sleep"
- "Spend time with people"

*Why:* This gives the report an emotional anchor. "You could have gone to the gym 5 times this week with the time you spent scrolling Instagram" hits harder than "you spent 7 hours on Instagram."

**Q4 (optional): "Have you tried anything to fix this?"**
- "Yes, I have tried screen time limits / app blockers"
- "Yes, I have tried productivity apps"
- "No, I have not tried anything"
- "I have tried and nothing works"

*Why:* Prevents us from suggesting things they have already rejected. If they have tried screen time limits and failed, suggesting "set a screen time limit" in the report will feel tone-deaf.

### What NOT to ask

- **CV / resume:** Way too invasive for a first interaction. Completely disproportionate to the value we are offering. Nobody uploads a CV to see how they spend their phone time.
- **Job title / company:** Too corporate. Our audience is Gen Z, not LinkedIn power users. "Student" vs. "working" is enough.
- **Salary / income:** Irrelevant to the time-waste analysis and instantly kills trust.
- **Detailed goals / OKRs:** Too serious. "What would you do with 2 hours?" is the lightweight version.

### The context multiplier

Without the questionnaire, the X-Ray output looks like:

> "You spent 6h22m on Cup Heroes, 36m on Safari, 35m on Hearthstone. Your top category is Games (78%)."

With the questionnaire, it becomes:

> "You told us you are a student and you want more time to exercise. Here is what we found: you spent 7 hours on mobile games yesterday -- that is 3x the average for your age group. Your phone interrupted you 232 times, mostly from Telegram (178 notifications for just 12 minutes of actual use). If you batch Telegram notifications to 3x/day and set a 2-hour game limit, you would free up roughly 4 hours -- enough for a full workout and meal prep."

The second version is worth paying for. The first version is a pie chart.

---

## 4. The Upload UX Problem

### The current problem

iOS Screen Time has 4 separate scrollable sections. Users need to:
1. Know which section(s) to screenshot
2. Scroll to each section
3. Take 2-4 screenshots
4. Upload multiple images

That is 2-5 minutes of friction for something we promised takes 30 seconds.

### The redesigned flow

**Total user effort: ~90 seconds (not 30, and we should stop promising 30)**

```
[Landing page / /xray page]
    |
    v
"Grab your phone. We need 2 screenshots."
    |
    v
Platform detection: "Looks like you are on iPhone" / "Android" / "Show me both"
    |
    v
Step 1/2: "Open Settings > Screen Time"
    [Animated GIF or static screenshot showing exactly where to go]
    [Visual highlight: "Screenshot THIS screen"]
    |
    v
[Drag-and-drop upload zone -- accepts paste from clipboard too]
    |
    v
Step 2/2: "Now scroll down to Notifications"
    [Visual guide showing the Notifications section]
    [Upload zone]
    |
    v
[Optional: "Want the full picture? Upload your Pickups section too"]
    |
    v
"Analyzing your data..." [meanwhile, show the 4-question survey]
    |
    v
Results: Your Time X-Ray
```

### Key UX decisions

1. **Show the upload on desktop with mobile instructions.** Most users will land on desktop but screenshot on mobile. Support AirDrop/email-to-self workflows. Also support direct mobile upload for users on their phone.

2. **Accept messy screenshots.** Users will screenshot slightly wrong. Claude Vision should handle partial captures, dark mode, different iOS versions, different languages. Build for real-world input, not perfect captures.

3. **Clipboard paste.** If a user takes a screenshot on their Mac of their iPhone Screen Time (via mirroring or a saved photo), they should be able to Cmd+V directly. This is the lowest-friction upload method.

4. **Progressive disclosure for additional screenshots.** Do not show a 3-slot upload form upfront. Show one slot. When filled, show the next. The optional third appears only after the first two.

5. **Honest time framing.** Stop saying "30 seconds." The real flow is ~90 seconds for 2 screenshots + 30 seconds for the questionnaire. Say "2 minutes" and overdeliver. Under-promising and overdelivering beats the reverse.

---

## 5. Alternative Data Sources -- PoC Feasibility

### Tier 1: Build now (PoC in days)

| Source | Effort | Signal quality | Privacy risk | Verdict |
|---|---|---|---|---|
| **Screen Time screenshots (iOS)** | Built (needs Claude Vision wiring) | Medium-high (usage + notifications) | Low (user-initiated, no account access) | **Ship this week** |
| **Digital Wellbeing screenshots (Android)** | Same parser, different layout | Medium | Low | Ship alongside iOS |
| **4-question questionnaire** | 1 day | High (context is the multiplier) | None | **Ship this week** |

### Tier 2: Build next sprint (PoC in 1-2 weeks)

| Source | Effort | Signal quality | Privacy risk | Verdict |
|---|---|---|---|---|
| **Google Takeout (selective)** | 1-2 weeks (client-side ZIP parser) | Very high (years of history) | Medium (large data set, must be client-side) | Build after X-Ray validates |
| **macOS Screen Time SQLite (knowledgeC.db)** | 3 days (if permissions work) | Very high (app-level granularity, includes iOS via iCloud sync) | Medium (local file access) | Investigate permissions |

### Tier 3: Build for scale (PoC in weeks)

| Source | Effort | Signal quality | Privacy risk | Verdict |
|---|---|---|---|---|
| **Chrome extension (domain-only)** | 2 weeks | Very high (continuous, real-time) | Medium (requires install + trust) | Build after 50 users validate X-Ray |
| **Apple Health XML** | 3-5 days | Medium (sleep + activity) | Low (user-initiated export) | Only if health angle resonates |
| **Instagram / TikTok data download** | 1 week each | Medium (social media time estimation) | Medium (JSON parsing, large files) | Only if social media is the top pain point |

### Tier 4: Deprioritize

| Source | Why not now |
|---|---|
| **Calendar (OAuth)** | Requires OAuth flow, token management, scope verification. Google Takeout includes calendar data anyway. |
| **Email volume (OAuth)** | Same -- Google Takeout includes Gmail metadata. No need for a separate OAuth integration. |
| **Browser history (direct)** | Chrome extension does this better. Direct history export is clunky. |
| **Banking / financial** | Way too sensitive for a first product. Trust not earned. |

### The PoC path

Week 1: Screen Time screenshots (iOS + Android) + questionnaire
Week 2-3: Google Takeout parser (client-side)
Week 4+: Chrome extension (only if the X-Ray proves users want ongoing monitoring)

This matches the effort escalation funnel but starts with the cheapest, fastest data source that proves the concept.

---

## 6. What Does the OUTPUT Look Like?

### The current output problem

If we only collect Screen Time data, the output is a pie chart with app names and times. That is what Screen Time already shows. We have added zero value.

### The output that makes someone pay

The X-Ray should NOT look like a Screen Time mirror. It should look like a **personal briefing** -- something a smart friend would tell you after looking at your phone for 5 minutes.

### Output format: The Time X-Ray Card

```
YOUR TIME X-RAY
Generated March 30, 2026

-------- YOUR HEADLINE --------
"Games are eating your week."

-------- THE NUMBERS --------
7h 12m    daily screen time (32% above average for your age)
6h 22m    on Cup Heroes alone (87% of your screen time)
232       notifications/day (178 from Telegram)
33        pickups/day (you open Cup Heroes first, 7 times)

-------- THE PATTERN --------
You told us you are a student who wants time to exercise.
Here is what we see:

- You spend 6+ hours on mobile games daily. That is 42 hours/week --
  more than a full-time job.
- Telegram sends you 178 notifications per day, but you only use
  it for 12 minutes. That is 1 notification every 4 seconds of
  actual use.
- You pick up your phone 33 times a day. 21% of the time, you
  open a game first -- before checking anything else.

-------- YOUR #1 FIX --------
The single biggest change: batch your Telegram notifications
to 3x/day (morning, lunch, evening).

Why: 178 interruptions/day is attention death by a thousand cuts.
Each notification pulls you out of whatever you are doing and
gives you a reason to "quickly check" your phone -- which turns
into 20 minutes of Cup Heroes.

Estimated time saved: 45-60 min/day from reduced context switching.

-------- WANT US TO SET THIS UP? --------
[Button: "Yes, fix this for me" --> email capture / paid offer]
```

### What makes this worth paying for

1. **The headline** -- not "here is your data" but "games are eating your week." A diagnosis, not a dashboard.
2. **The comparison** -- "32% above average for your age." Without this, the numbers are meaningless.
3. **The pattern connection** -- linking their stated goal (exercise) to their data (zero fitness app usage, 42h/week gaming). This is the "holy shit" moment.
4. **The notification insight** -- this is data they have never seen framed this way. 178 notifications for 12 minutes of use is genuinely surprising.
5. **The single fix** -- not "here are 10 tips." One fix. The highest-leverage one. Specific and actionable.
6. **The bridge to action** -- "Want us to set this up?" is the conversion moment. Not "sign up for our newsletter." Not "check out our pricing." A direct offer to fix the thing we just diagnosed.

### What the X-Ray is NOT

- **Not a career coaching report.** We are not qualified, and our data does not support career advice. Stay in the lane of "where your time goes and how to get it back."
- **Not a wellness assessment.** We are not a health app. "You should sleep more" is not our product.
- **Not a shaming tool.** The tone is "here is what we found, here is what you can do" -- never "you wasted X hours, you should feel bad."
- **Not a Spotify Wrapped clone.** Wrapped is annual and celebratory. The X-Ray is diagnostic and actionable. The shareable card CAN be Wrapped-style for virality, but the full report should feel like a personal briefing.

### Evolution of the output with more data

| Data available | Output level | What it adds |
|---|---|---|
| Screen Time only | Basic X-Ray | App usage, categories, "your #1 time-eater" |
| Screen Time + questionnaire | Personal X-Ray | Contextualized insights, goal-linked recommendations |
| + Google Takeout | Deep X-Ray | Browsing patterns, search behavior, multi-year trends |
| + Chrome extension (3 days) | Live X-Ray | Real-time pattern detection, weekly updates, trend changes |

Each level is more valuable. Each level requires more trust. The effort escalation funnel applies to the output too -- you see more value as you share more data.

---

## 7. The "So What" Problem: Bridging Data to Action

### The problem stated clearly

Showing "you spent 6h on Cup Heroes" is useless. Everyone who spends 6h on Cup Heroes already knows they spend too much time on Cup Heroes. The Screen Time app already shows them this number. If the number alone changed behavior, Screen Time would have solved the problem years ago.

The "so what" gap is: **what do I DO about it?**

### Why Screen Time fails at this

Apple's Screen Time shows the data but offers only one action: set a time limit. Time limits do not work because:
- Users dismiss the "time's up" notification (it is one tap to ignore)
- The limit feels like punishment, not help
- It addresses the symptom (too much time on X) but not the cause (why they keep opening X)

### How we bridge data to action

The bridge has three parts:

**Part 1: Reframe the problem**

Do not say "you spent 6h on games." Say "you pick up your phone 33 times a day, and 7 of those times you open Cup Heroes before anything else. It is a reflex, not a choice."

Reframing makes the behavior visible as a pattern, not a personal failure. Patterns can be interrupted. Personal failures just create guilt.

**Part 2: Identify the trigger, not just the behavior**

The Screen Time data includes pickups and first-app-after-pickup. The notification data shows which apps pull users back. Together, these reveal the trigger:

- "Telegram sends 178 notifications/day. Each one is a reason to pick up your phone. Once you pick it up, you open Cup Heroes 21% of the time."
- The fix is not "use Cup Heroes less." The fix is "reduce Telegram notifications so you pick up your phone less."

This is the insight users cannot generate themselves. They see time-on-app. They do not see the causal chain of notification -> pickup -> game -> lost hour.

**Part 3: Offer a specific, implementable fix**

Not "10 tips for better screen time management." One fix. The highest-leverage one.

The fix should be:
1. **Specific** -- "Batch Telegram notifications to 3x/day" not "reduce notifications"
2. **Implementable in under 5 minutes** -- or we offer to do it for them
3. **Tied to their stated goal** -- "This frees up ~45 min/day. That is enough for the gym session you said you wanted."
4. **Framed as a gain, not a loss** -- "Get 45 minutes back" not "Stop wasting 45 minutes"

### The action menu (what we can actually offer)

| User's data shows | Fix we suggest | Can we automate it? | Revenue opportunity |
|---|---|---|---|
| Excessive notifications from one app | Batch notification settings | Partial (we can walk them through settings) | Free tier -- builds trust |
| Repetitive app checking (polling) | Monitoring bot that checks for them and alerts on changes | Yes (this is a buildable automation) | Paid tier -- "we build it for you" |
| Comparison shopping across apps | Price/deal aggregator bot | Yes (web scraping + notification) | Paid tier |
| Email overload | Email triage bot (summarize, prioritize, draft replies) | Yes (with Gmail access) | Paid tier |
| Social media time sink | Daily digest of feeds (curated summary) | Yes (with API access) | Paid tier |
| Decision fatigue (food delivery, streaming) | Recommendation bot (learns preferences, suggests) | Yes | Paid tier |
| Context switching | Focus mode scheduler + batched communication | Partial (needs OS-level integration) | Free tier |

### The conversion moment

The X-Ray report ends with one fix. The fix is specific and tied to their data. The CTA is:

> "Want us to set this up for you? We will build a [specific automation] that [specific outcome]. First 50 users get it for EUR 29."

This is not "sign up for our app." This is "pay us to fix the specific thing we just showed you." The data creates the demand. The fix fulfills it. The payment validates willingness to pay.

---

## 8. Recommended Decision

### What to build this week

1. **Wire Claude Vision to the Screen Time screenshot parser.** Accept 1-2 screenshots (section 1 required, section 4 recommended, section 3 optional). Extract: app names, durations, categories, notification counts, pickup data.

2. **Build the 4-question contextual questionnaire.** Show it while screenshots are being analyzed. Role, frustration, goal, prior attempts. 30 seconds. No friction.

3. **Design the X-Ray output as a personal briefing, not a dashboard.** Headline diagnosis, contextualized numbers, one specific fix, CTA to get the fix built.

4. **Do NOT collect CVs, job histories, or detailed professional context.** It is disproportionate, invasive, and unnecessary for the core value proposition.

### What to build next

5. **Google Takeout parser** -- the deep data source that turns one X-Ray into a life audit. But only after the Screen Time X-Ray validates that users find the basic report valuable enough to want more.

6. **Chrome extension** -- the living data source. But only after 50+ users have completed the X-Ray and expressed interest in ongoing monitoring.

### What to stop saying

- "30 seconds" -- it is 90 seconds for 2 screenshots + 30 seconds for the questionnaire. Say "2 minutes."
- "See your Time X-Ray" without specifying what sections to screenshot. Users need exact visual instructions.
- "We analyze your screen time" -- too vague. Say "We analyze which apps eat your time and which notifications interrupt you the most."

### The key insight

**Screen Time data alone is shallow. Screen Time data + user context + comparative benchmarks + one actionable fix = a product people will pay for.**

The screenshots are the input. The questionnaire is the context. The AI is the analysis. The fix is the product.

---

## Decision Summary

| Question | Answer |
|---|---|
| How many screenshots? | 2 required (Screen Time + Notifications), 1 optional (Pickups) |
| Which sections? | Section 1 (usage) + Section 4 (notifications). Skip Section 2 (redundant). |
| Additional context needed? | 4-question survey: role, frustration, goal, prior attempts. 30 seconds. |
| Should we collect CVs/job info? | No. Disproportionate and invasive for the value delivered. |
| Upload UX? | Sequential reveal (1 slot at a time), visual guides, platform detection. |
| Best alternative data source? | Google Takeout (next sprint), then Chrome extension (after validation). |
| What does the output look like? | Personal briefing with headline diagnosis, contextualized numbers, one fix, CTA. |
| How to bridge data to action? | Reframe as pattern (not failure), identify trigger (not just behavior), offer one specific fix. |
| What makes someone pay? | The fix, not the data. Data creates demand. Fix fulfills it. |
