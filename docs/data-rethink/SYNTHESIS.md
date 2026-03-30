# Data Rethink: Action Plan

**Date:** 2026-03-30
**Status:** Final synthesis. Act on this.

---

## 1. The Recommended Data Collection Flow

This is the step-by-step flow, from first tap to paid conversion. Every step delivers value. No step requires the next.

### Step 1: Context chip (3 seconds)

Before the screenshot walkthrough, one screen:

> "What's your week mostly about?"
> [ Student ] [ Working ] [ Freelance ] [ Job hunting ] [ A bit of everything ]

One tap. Zero typing. This single signal transforms generic output into personal output ("As a student, that's more time than a full course load").

### Step 2: Animated walkthrough + first screenshot (30 seconds)

Four-screen tap-by-tap guide: Settings > Screen Time > See All Activity > Week > screenshot the "Most Used" view.

Not a video. Not a wall of text. Each step is one mockup with a pulsing "tap here" indicator. User taps "I'm there -- Next" to advance. The guide survives Safari tab-switching via sessionStorage.

Android users see Digital Wellbeing equivalents.

### Step 3: Instant partial X-Ray (5 seconds)

Live extraction feed ("Found: Instagram -- 3h 12m...") followed by the partial Time X-Ray card. The user sees their data for the first time. This is the aha moment.

The card includes:
- One shocking headline number ("43 hours a week on your phone")
- Context-calibrated comparison ("As a student, that's more time than a full course load")
- Top 5 apps with durations
- 2-3 automation suggestions referencing THEIR apps ("Instagram + TikTok = 4h 50m. I'll nudge you at your limit.")
- Share button (generates a Data Receipt card for Instagram Stories)

**Total time to first value: under 50 seconds.**

### Step 4: Optional second screenshot -- Pickups (30 seconds)

Below the results, a calm card (not a popup, not a modal):

> "Your X-Ray is at 40% resolution. Scroll down on that same screen and screenshot 'Pickups' -- it shows what pulls you back."
> [ Add Pickups screenshot ] [ I'm good with this ]

If uploaded, a new section appears: "You unlock your phone 78x/day. Instagram pulls you back 40% of the time. That's not just time -- it's interruptions."

### Step 5: Optional third screenshot -- Notifications (30 seconds)

Same pattern:

> "Your X-Ray is at 65% resolution. Screenshot 'Notifications' to see what interrupts you."

If uploaded: notification-to-usage ratios. "Telegram sent 178 notifications for 11 minutes of actual use. That's 1 notification every 4 seconds of value."

### Step 6: Optional open-ended question (15 seconds)

After seeing results:

> "What's the one task you wish someone would just handle for you?"
> [ Type anything... ]
> Examples: "figuring out what to eat" / "sorting my email" / "tracking job applications"

This maps directly to automation suggestions and appears AFTER value has been delivered.

### Step 7: Email capture (10 seconds)

AFTER results are shown, not before:

> "Save your X-Ray and get your first automation built."
> [ Email ]

---

## 2. How Many Screenshots?

**Answer: Start with 1. Encourage 2. Accept up to 4. Never ask for all 4 upfront.**

The decision matrix:

| Screenshots | Signal coverage | Estimated completion rate | When to ask |
|-------------|----------------|--------------------------|-------------|
| 1 (Most Used) | 55% | 65-75% | Always -- this is the entry point |
| 2 (+ Pickups) | 80% | 45-55% | After showing partial results |
| 3 (+ Notifications) | 95% | 35-45% | After showing pickup insights |
| 4 (+ Daily chart) | 100% | 20-30% | Only if user asks |

**Rationale:**

- "Most Used" is the single richest screenshot: it names specific apps with durations. It reveals 15-30 apps vs. the top 5 on the overview. It is the least emotionally sensitive section (no notification counts, no pickup counts). It maps directly to automation suggestions.

- "Pickups" is the second-best because it reveals the distinction between intentional use and compulsive habit -- data the user has never seen framed this way.

- "Notifications" creates the notification-to-usage ratio, which produces genuine outrage ("178 interruptions for 11 minutes of value").

- The "Daily Average" overview screenshot is redundant with Most Used for our purposes. Skip it unless the user volunteers it.

- Section 2 ("Most Used" ranked separately) is fully redundant with Section 1. Never ask for it.

**Skip the Overview section as a required screenshot.** The PM analysis recommended Overview + Notifications. The Nudge analysis recommended Most Used alone. The UX analysis recommended Most Used alone. The tiebreaker is friction: Most Used is visible immediately when the user reaches the right screen. Overview requires no scrolling on some iOS versions but does on others. Most Used is safer as the default.

---

## 3. What Context Beyond Screenshots?

**Collect 3 signals. No forms. No typing required for the first two.**

| Signal | How | When | Why |
|--------|-----|------|-----|
| Life stage | Chip tap (Student / Working / Freelance / Job hunting / A bit of everything) | Before screenshot, during setup mode | Determines what "wasted" means. Changes every comparison, every recommendation. |
| Top frustration / aspiration | Chip tap or free text ("What would you do with 2 extra hours?") | After showing results, when the user is in reflective mode | Emotional anchor. "You could have gone to the gym 5x with the time you spent scrolling" hits harder than raw numbers. |
| Relationship to top app | Inline reaction (This is my job / This is my hobby / This is a problem / I didn't realize) | Shown per top app, after X-Ray results | Prevents suggesting cuts to intentional use. A game reviewer spending 6h gaming doesn't need to "fix" that. |

**What NOT to collect:**

- CV / resume -- disproportionate, invasive, kills trust. CV analysis is technically possible (Claude can extract role + seniority from a PDF for $0.002) but wrong for a first interaction. Revisit only for a premium "Career X-Ray" product later, after trust is earned.
- Age, gender, location -- inferable from device/screenshot. Asking feels like profiling.
- Detailed goals or schedules -- too serious. "What would you do with 2 hours?" is the lightweight version.
- Pre-screenshot questionnaire longer than 1 question -- every question before value delivery is a trust withdrawal.

**The "data asks the questions" principle:** Show users their data and let their reaction provide context, rather than asking them to describe themselves. "Is this intentional?" after seeing 6h of gaming is more honest and less invasive than "How much do you game?" before showing data.

---

## 4. What the X-Ray Output Becomes

The X-Ray is NOT a dashboard. Not a pie chart. Not a mirror of Screen Time. It is a **personal briefing** -- what a smart friend would tell you after looking at your phone for 5 minutes.

### Structure of the output:

**1. Headline diagnosis** (not "here's your data" but "games are eating your week")

**2. The shocking number** with context
- "6.2 hrs/day -- that's 43 hours a week, more than a full course load"
- Always stated per-week (sounds larger and more motivating than per-day)
- Compared against their stated life stage, not generic population averages

**3. Where it goes** -- top 5 apps with durations and visual bars

**4. The hidden pattern** (if pickups data exists)
- "You unlock your phone 78x/day. Instagram pulls you back 40% of the time."
- Reframed as habit loop, not personal failure

**5. The interruption load** (if notifications data exists)
- Notification-to-usage ratios
- "Muting your top 3 apps would remove 82% of interruptions"

**6. "What I'd build for you"** -- 2-3 automation cards, each referencing THEIR data
- Each card: specific app + specific fix + estimated time saved per week
- Each card: "Build this for me" CTA (leads to paid tier)
- Total recoverable time stated at bottom

**7. "Share my X-Ray"** -- generates a Data Receipt card (9:16 for Instagram Stories, includes meldar.ai watermark)

**8. "Sharpen your X-Ray"** -- progressive disclosure to add more screenshots, below the results

### Personality types (the viral hook)

Assign a label based on data patterns: "The Doom Scroller," "The Notification Junkie," "The Late Night Gamer," "The Tab Hoarder." This gives users a social identity hook -- they share because it's funny, not because we ask them to.

### What the output is NOT

- Not a wellness assessment or shaming tool. Tone: opportunity, not guilt.
- Not a Spotify Wrapped clone. Wrapped is celebratory. The X-Ray is diagnostic and actionable.
- Not career advice. Stay in the lane of "where your time goes and how to get it back."

---

## 5. Free vs. Paid Split

**Core principle: Data is the hook, not the product. Give away all the data. Charge for knowing what to do about it.**

### Free tier: The Viral X-Ray

Everything the user needs to share and feel the problem:

- Full data card with all metrics from uploaded screenshots (no data withheld)
- Shocking headline number + context comparison
- Personality type label
- Shareable Data Receipt card (9:16, with meldar.ai watermark)
- Preview of automation suggestions ("We found 3 fixes")

**Why free is generous:** Every shared card is a zero-cost acquisition ad. Gating data behind a paywall violates the brand promise ("Your data. Your apps.") and kills the viral loop.

### Paid tier: The Action Layer

| Product | Price | What they get | Data required |
|---------|-------|---------------|---------------|
| Quick Fix | EUR 9 | One targeted fix: Notification Audit OR Pickup Breaker OR Focus Mode setup. Automated delivery. | 2+ screenshots + context |
| Time Audit | EUR 29 | Founder-reviewed, context-aware report with personalized recommendations + video walkthrough. Includes all Quick Fixes. | 3+ screenshots + context |
| Build It | EUR 79 | Founder builds one custom automation from audit findings. | Completed audit |
| Weekly Pulse | EUR 9.99/mo | Ongoing tracking, weekly trend email, Quick Fix library access. | Ongoing screenshot uploads or extension |

### The conversion funnel

```
Screenshot (free) --> X-Ray card (free, shareable)
  --> "We found 3 fixes" (teaser)
    --> Quick Fix (EUR 9, impulse buy)
      --> Time Audit (EUR 29, the flagship)
        --> Build It (EUR 79, premium)
          --> Weekly Pulse (EUR 9.99/mo, recurring)
```

**The EUR 9 Quick Fix is the critical bridge.** The cognitive leap from EUR 0 to EUR 9 is much smaller than EUR 0 to EUR 29. Once someone pays EUR 9, paying EUR 29 feels natural.

### Revenue model (per 1,000 screenshot uploads)

- 300 add a second screenshot (30%)
- 24 buy a Quick Fix at EUR 9 (8% of enriched) = EUR 216
- 5 buy a Time Audit at EUR 29 = EUR 145
- 1 buys Build It at EUR 79 = EUR 79
- 2 subscribe to Weekly Pulse = EUR 20/mo

**First-month revenue per 1,000 signups: ~EUR 460 + EUR 20/mo recurring.**

Conservative. The viral loop (15% share rate) compounds each cohort.

---

## 6. Implementation Priority

### This week (days 1-5)

1. **Wire Claude Vision to accept 1-4 screenshots in a single API call.** Update `extractScreenTime` to accept an array of images. Expand the `ScreenTimeExtraction` type with `notifications`, `firstAfterPickup`, and `pickupsByHour` fields. Cost goes from $0.003 to $0.005-0.01 per analysis -- negligible.

2. **Build the animated tap-by-tap walkthrough.** 4 screens with stylized iPhone mockups. "I'm there -- Next" buttons. State persists via sessionStorage. Android detection swaps mockups.

3. **Build the context chip screen.** One question before the walkthrough: "What's your week mostly about?" Five chip options. One tap.

4. **Redesign the X-Ray output as a personal briefing.** Headline diagnosis, context-calibrated comparison, top apps, automation cards with "Build this for me" CTAs, share button. Kill the pie chart.

5. **Make the screenshot the primary entry point.** Move "Get your Time X-Ray" above the quiz. Quiz becomes the fallback for users who won't screenshot ("I'd rather not upload").

### Next sprint (days 6-14)

6. **Progressive disclosure for additional screenshots.** After partial X-Ray, show the "Sharpen your X-Ray" card. Handle pickups + notifications extraction. Compute cross-section insights (notification-to-usage ratio, reflex vs. intentional use, interruption cost).

7. **Shareable Data Receipt card with real data.** 9:16 format for Instagram Stories. Include personality type label. meldar.ai watermark. One-tap share.

8. **EUR 9 Quick Fix product.** Notification Audit (ranked list of noisy apps with step-by-step fix instructions). Automated or semi-automated delivery.

9. **Post-results context question.** "What's the one task you wish someone would handle?" Free text with examples.

### Later (after validation)

10. **Google Takeout client-side parser** -- only after X-Ray proves users want deeper data.
11. **Chrome extension** -- only after 50+ users complete X-Ray and express interest in ongoing monitoring.
12. **CV/resume analysis** -- only as a premium add-on, after trust is earned, with GDPR-compliant extract-and-delete flow.
13. **Voice/chat intake** -- technically feasible (96% accent accuracy, $0.006 per conversation), but premature. Build after the screenshot flow validates.
14. **Weekly Pulse subscription** -- needs ongoing data source (extension or repeated uploads).

---

## 7. Updated Product Thesis

**Meldar shows you what's eating your week using one screenshot and 50 seconds, then builds the fix.**

---

## Points of Consensus Across All 6 Analyses

These conclusions were reached independently by every analysis:

1. **Raw Screen Time data alone is shallow.** Screenshots + context + contrast = a product worth paying for. Without context, it's a mirror. Without contrast, it's a summary. Without action, it's a lecture.

2. **Start with 1 screenshot, not 4.** Progressive disclosure beats batch upload. Sunk cost + curiosity pull 35-45% of users to a second screenshot vs. 15-20% who would upload all 4 upfront.

3. **The quiz becomes the fallback, not the primary path.** Screenshot-first delivers objective data. Quiz-first creates expectation mismatches. The quiz catches the 30% who won't screenshot.

4. **Context should be collected AFTER showing data, not before.** Data makes the questions feel earned. Answers are more honest when truth is already on screen. Maximum 3 context signals, all single-tap except one optional free-text.

5. **Email capture comes AFTER value delivery.** No email gate before showing results. Transactional trust: value first, ask second.

6. **"What should I build?" is the unsolved problem.** No no-code platform helps users discover what to automate. Every competitor assumes you arrive with an idea. Meldar's discovery engine is genuinely novel.

7. **Data is the hook. Action is the product.** Give away all the data. Charge for knowing what to do about it.

---

## Disagreements Resolved

| Topic | PM Analysis | Nudge Analysis | UX Analysis | Decision |
|-------|-------------|----------------|-------------|----------|
| Primary screenshot | Overview (Section 1) | Most Used (Section 2) | Most Used | **Most Used.** Higher signal, less scrolling ambiguity, maps directly to automations. |
| Second screenshot | Notifications | Overview | Pickups | **Pickups.** Reveals reflex vs. intentional use -- data users have never seen. Notifications third. |
| Context timing | 4-question survey DURING analysis | 3 taps AFTER data | 1 chip BEFORE + 1 question AFTER | **Hybrid: 1 chip before (life stage), 1-2 taps after (aspiration + app relationship).** Life stage before upload personalizes the walkthrough. Everything else after, when data makes questions feel earned. |
| Time promise | "Stop saying 30 seconds, say 2 minutes" | "30-second viral hook" | "Under 50 seconds to first value" | **Say nothing about time.** Under-promise by not promising. Users will find out it's fast. |
| CV collection | "Do NOT collect CVs" | Not addressed | Not addressed | **No CVs.** Disproportionate for the value delivered. Revisit later for premium tier. |
