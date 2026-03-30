# Progressive Discovery System

**Date:** 2026-03-30
**Focus:** How Meldar gets smarter about what to automate over time, starting from zero data
**Dependency:** Builds on [product-manager.md](./product-manager.md) (non-technical user reframe) and [SYNTHESIS.md](../research/SYNTHESIS.md) (2,847-person research base)

---

## The Unfair Shortcut: One Install, 80% of the Signal

> **Founder directive:** We CAN ask users to install one thing — if it is surgically precise, one click, with a clear reason. Design the laziest, cleverest shortcut. 80% of the insight from 20% of the effort.

### The Hack: Google Takeout + One Browser Extension

The entire trust ladder and 6-source progressive system below is the *ideal* design. But the unfair shortcut that gets us 80% of the way there with a fraction of the effort is two moves:

**Move 1 (Day 0, zero install): Google Takeout — The God Export**

Google already has the richest behavioral profile on earth for most of our users. Under GDPR Article 20, users have the legal right to export it. Google Takeout contains:

| Data | What It Reveals | Automation Signal |
|------|----------------|-------------------|
| Chrome browsing history | What sites they visit repeatedly (polling pattern), what they research, what they comparison-shop | Price watchers, research aggregators, form auto-fillers |
| YouTube watch history | Interests, learning topics, entertainment patterns, rabbit holes | Content curation, "watch later" management, time-sink detection |
| Google Search history | What they ask Google repeatedly, what decisions they struggle with | Decision fatigue detection, FAQ-type automations |
| Google Maps / Location | Commute, frequent places, travel patterns | Route optimization, "leaving now" notifications, local deal alerts |
| Gmail metadata (labels, counts) | Email volume, top senders, newsletter overload, unread pile | Email triage, unsubscribe automation, sender priority |
| Calendar | Meetings, recurring events, free time, schedule density | Meeting prep, agenda generation, scheduling optimization |
| Google Pay / transactions | Spending at merchants (if enabled) | Expense sorting, subscription detection, budget alerts |
| Google Fit | Activity, sleep, steps (if enabled) | Health routine automations |

**One export. One upload. We know almost everything.**

The friction problem: Google Takeout takes hours to prepare (Google queues the export). The hack for this:

1. **Guided flow on our site:** "Click this link. Check these 6 boxes. Hit export. We'll email you when it's ready." (We literally walk them through it with screenshots.)
2. **"Check back tomorrow" flow:** They start the export, we send them an email 12-24 hours later: "Your Google data is ready. Upload it here for your full personal report."
3. **Selective export:** We don't need ALL of Takeout. Guide them to export ONLY: Chrome history, YouTube history, Search history, Calendar, and Maps. This is faster and less scary than "download everything Google knows about you."

**Why this is an unfair advantage:** Every competitor starts from zero. We start from years of behavioral data that Google already collected. We are not building a surveillance system — we are helping users make sense of data that already exists about them.

**Move 2 (Week 1, one install): The Meldar Browser Extension — The Living Wire**

Google Takeout is a snapshot. It tells us the past but not the present. One browser extension closes the gap.

**What the extension does (surgically scoped):**

It does exactly ONE thing: it watches which tabs are open and for how long. That is it. No content reading. No form data. No keystrokes. No screenshots. Just: `{domain, seconds_active, timestamp}`.

```
Example data stream:
  gmail.com        — 340 seconds (active tab)
  docs.google.com  — 120 seconds
  reddit.com       — 480 seconds
  ubereats.com     — 90 seconds
  gmail.com        — 200 seconds
  ubereats.com     — 60 seconds
  ubereats.com     — 45 seconds
```

**What we extract from this trivial data:**

| Pattern | Detection | Automation Opportunity |
|---------|-----------|----------------------|
| **Tab ping-pong** | Same 2-3 domains visited repeatedly in short cycles | "You checked gmail 14 times today. An email triage bot checks once and texts you what matters." |
| **Comparison shopping** | Multiple visits to similar sites (food delivery, flights, products) in one session | "You visited 4 food delivery sites in 20 minutes. A price comparison bot can do that in 2 seconds." |
| **Polling behavior** | Same domain visited at regular intervals (grade portal, job board, tracking page) | "You checked [site] 8 times today. A monitoring bot can watch it and alert you on changes." |
| **Context switching** | Rapid alternation between unrelated domains | "You switch between email and documents 30+ times a day. An email batching schedule could cut that in half." |
| **Time sinks** | Domains with disproportionately high active time vs. apparent value | "You spent 2 hours on Reddit today. Want a daily digest of your subscribed subreddits instead?" |
| **Routine detection** | Same sequence of sites visited at the same time daily | "Every morning you visit gmail, calendar, then news. A morning briefing automation could combine all three." |

**Why domain-only is the genius constraint:**

1. **Privacy story is bulletproof.** "We see which websites you visit, never what you do on them." This is the same data your ISP already has.
2. **Technically trivial to build.** A browser extension that logs `{domain, active_seconds, timestamp}` is maybe 50 lines of JavaScript. No content scripts, no page manipulation, no complex permissions.
3. **Signal density is absurd.** Domain + time is enough to detect every cross-cutting pattern from the research synthesis: polling, comparison shopping, decision fatigue, context switching, time sinks, routines. We do not need to know WHAT they typed — just WHERE they spent time.
4. **Works for every user type.** Students, professionals, freelancers, parents — everyone uses a browser. Unlike Screen Time (iPhone only) or Calendar (assumes meetings), the browser is universal.

**The extension install pitch:**

> "Install one thing. It takes 10 seconds. It watches which sites you visit (never what you type). In 3 days, we'll show you exactly where your time goes — and what an AI could do about it."

This is surgical: one install, one capability, one clear promise, one timeline.

**The 3-Day Payoff:**

After 72 hours of passive data collection, the extension has enough signal to generate the first truly personalized discovery report:

> "In the last 3 days, you:"
> - Checked Gmail 47 times (avg. 45 seconds each = 35 min of email checking, not counting reading/writing)
> - Visited UberEats, DoorDash, or Grubhub 11 times (spent 28 minutes deciding what to order)
> - Refreshed LinkedIn Jobs 9 times (spent 40 minutes scanning the same listings)
> - Switched between Google Docs and Gmail 23 times on Monday alone
>
> "Your top 3 automation opportunities:"
> 1. **Email batching** — check once at 9am, once at 2pm, get a text if something urgent lands. Save ~30 min/day.
> 2. **Food delivery optimizer** — tell it your preferences, it checks all apps and texts you the best option. Save ~25 min/day.
> 3. **Job listing monitor** — it watches LinkedIn for new posts matching your criteria. You get a daily digest instead of refreshing. Save ~35 min/day.

This report is not from a chat. It is not from research averages. It is from THEIR actual behavior. That is the unfair advantage.

### The Shortcut Stack (What Replaces What)

| Original Design (6 sources, months of trust-building) | The Hack (2 moves, 1 week) | % of Signal Captured |
|-------------------------------------------------------|---------------------------|---------------------|
| Screen Time screenshot + OCR | Browser extension tab data (richer, cross-platform, live) | 90% — and better, because it is continuous not a snapshot |
| Google Calendar OAuth | Google Takeout includes Calendar | 100% |
| Email metadata OAuth | Google Takeout includes Gmail metadata + extension shows email checking patterns | 95% |
| Spotify OAuth | Google Takeout includes YouTube (similar routine proxy) | 70% |
| Google Takeout (positioned as power unlock) | Google Takeout (positioned as Day 0 move) | 100% |
| Banking screenshot | Not replaced — stays as Month 2+ for power users | 0% (but this was always optional) |

**Total signal from 2 moves vs. 6 sources: approximately 85-90%.**

The trust ladder still exists for users who refuse the extension or Takeout. The chat-only path still works. But the hack path gets us to the deep aha moment in 3 days instead of 3 weeks.

### Build Cost Comparison

| Original Plan | Hack Plan | Savings |
|--------------|-----------|---------|
| Screen Time OCR parser | Skip (extension replaces it) | ~1 week of dev |
| Gmail OAuth integration | Skip (Takeout covers it) | ~1 week of dev |
| Spotify OAuth integration | Skip (YouTube history in Takeout) | ~3 days of dev |
| 6 separate data pipelines | 2 pipelines (Takeout parser + extension stream) | ~2 weeks of dev |
| Progressive trust ladder UI (6 stages) | 2-stage UI (Takeout + extension) | ~1 week of dev |
| **Total MVP: ~8 weeks** | **Total MVP: ~3-4 weeks** | **~50% faster** |

### What We Build for the Extension (MVP)

**Permissions required:** `tabs` (to read the active tab URL), `storage` (to buffer data locally before sync). That is it. No `<all_urls>`, no `activeTab` content access, no `webRequest`.

**Architecture:**
```
background.js (service worker)
  - Listen to chrome.tabs.onActivated
  - Listen to chrome.tabs.onUpdated (URL changes within a tab)
  - Record: {domain (extracted from URL, path stripped), timestamp, active_duration}
  - Buffer locally in chrome.storage.local
  - Sync to Meldar API every 5 minutes (or on browser close)
  - Total code: ~80 lines

popup.html (minimal)
  - "Meldar is watching. 47 sites visited today."
  - "Your first report is ready in [countdown]."
  - Link to Meldar dashboard
  - Pause/resume toggle
  - Total code: ~40 lines
```

**What we explicitly do NOT build:**
- Content scripts (no page injection)
- Screenshot capture
- Form data capture
- Cookie or session reading
- Cross-extension communication
- Any page modification

The Chrome Web Store review for an extension with only `tabs` + `storage` permissions is fast (~1-3 days) because these are low-risk permissions.

---

## Design Principles

1. **Value before data.** Every stage delivers an insight before asking for the next data source. The user never feels like they are feeding a machine — they feel like the machine is learning them.
2. **Surprise over accuracy.** A perfectly accurate but obvious insight ("you use your phone a lot") is worthless. A slightly rough but surprising insight ("you spend more time deciding what to eat than actually eating") creates the aha moment.
3. **Trust is a resource, not a binary.** Each interaction either deposits or withdraws from the trust account. We never ask for more access than we have earned.
4. **Cross-user patterns amplify, not replace, individual data.** Aggregate patterns fill cold-start gaps. Individual data overrides aggregates as soon as it arrives.
5. **Every dismissal is signal.** A rejected suggestion is not noise — it is a labeled training example with a negative label.
6. **Piggyback, don't rebuild.** Google already surveilled our users for a decade. Apple already computed their Screen Time. We do not need to replicate any of that — we help them USE what already exists.

---

## The Timeline: Day 0 to Month 6

### Day 0: Signup (Email Only)

**What we know:** An email address. Possibly a referral source (TikTok ad, friend's link, specific subreddit).

**What we can infer:**

| Signal | Inference | Confidence |
|--------|-----------|------------|
| Email domain (gmail, .edu, company) | Student, professional, or enterprise | Medium |
| Referral source UTM | Which pain point resonated (the ad/post they clicked) | High |
| Time of signup | Timezone, possibly night-owl vs. early-riser | Low |
| Device/OS (user agent) | iPhone/Android, desktop/mobile, tech comfort level | Medium |

**What we show: The Curated Shortlist**

Before the user gives us anything, we present the 8 most-validated automation opportunities from our 2,847-person research base, ordered by the archetype we can best guess from signup context:

> "People who signed up from [source] typically automate these first:"
>
> 1. Meal planning + grocery list (extreme pain, universal)
> 2. Email triage + auto-reply drafts (extreme pain, universal)
> 3. Price drop / restock alerts (high pain, immediate payoff)
> 4. Student deadline notifications (if .edu email)

Each item shows:
- What it does (one sentence)
- Time saved per week (from research averages)
- How many people built it ("1,240 people use this")
- A "This sounds like me" button (zero-commitment signal)

If the user taps nothing, that is fine. The shortlist is not a gate — it is a gift. It communicates: "We already know useful things. Imagine what we could do with actual data about you."

**Why this works on Day 0:**
- No questions asked yet — we are giving, not taking
- Social proof baked in ("1,240 people")
- The shortlist is always right because it comes from validated research, not guesses
- Even if the user does nothing else, they leave with "that was interesting"

---

### Day 1: First Interaction (The 90-Second Chat)

**Trigger:** User returns, or continues from Day 0 signup flow.

**The onboarding chat** (detailed in product-manager.md) asks 5 conversational questions. The system identifies the user's archetype within the first 2 questions.

**Archetype Detection Matrix:**

| Q1 Answer ("What do you spend most of your day on?") | Archetype | Top Pain Points |
|------------------------------------------------------|-----------|----------------|
| University / school / studying | Student | Grade checking, deadline tracking, meal planning, textbook prices |
| Work / office / job | Professional | Email triage, meeting prep, expense tracking, commute optimization |
| Freelance / clients / projects | Freelancer | Invoice follow-up, scope creep, time tracking, client comms |
| Kids / family / home | Parent | School comms, meal planning, activity logistics, routine management |
| Job hunting / applications | Job Seeker | Resume tailoring, application tracking, ghost job detection, follow-ups |
| Content / social media / creating | Creator | Cross-platform posting, analytics aggregation, content calendar, engagement |

**What changes after the chat:**

1. **The shortlist reranks.** Generic top-8 becomes personalized top-5 based on archetype + specific answers.
2. **Micro-insights appear.** After each answer, the system responds with a research-backed statistic:
   - "73% of people your age say the same thing about meal planning."
   - "The average freelancer loses $5,400/year to late invoice follow-up."
   - "Students check their grade portal 10+ times per day during finals — an app can do that once and text you."
3. **The Personal Report generates.** Time-waste estimate, top 3 automatable tasks, and a specific CTA: "Build my [top suggestion]."

**Data captured (with consent):**
- Archetype classification
- Specific pain points in the user's own words
- Relative priority of pain points (what they mentioned first, what they called "most annoying")
- Whether they opted into the first suggested automation

**Signal value:** HIGH. Five open-ended answers tell us more about intent than a week of passive monitoring would. The chat is not just UX — it is the richest data collection mechanism we have at this stage.

---

### Week 1: First Data Connection

**The trust ladder — what to ask for and in what order:**

The order is determined by the ratio of (insight quality) to (permission anxiety). We ask for the source that delivers the most surprising insight for the least scary permission.

| Order | Data Source | How | Permission Anxiety | Insight Quality | Why This Position |
|-------|-----------|-----|-------------------|----------------|-------------------|
| 1 | Screen Time screenshot | Upload photo | Very low (user controls what they share) | High (app usage, daily hours, pickup count) | Zero-permission, high-surprise. "You pick up your phone 87 times a day" is a guaranteed aha moment. |
| 2 | Google Calendar | OAuth read-only | Low (calendar feels "professional," not private) | High (meeting density, recurring events, free time patterns) | One-tap OAuth, non-threatening data, immediately actionable insights. |
| 3 | Email metadata | Gmail/Outlook OAuth (metadata only) | Medium (email feels private, even metadata) | High (volume, senders, frequency, unread count) | Only asked after calendar trust is established. Explicitly "metadata only, we never read content." |
| 4 | Spotify/Apple Music | OAuth | Low | Medium (routine proxy — commute, focus, wind-down times) | Low stakes, adds texture to daily rhythm understanding. |
| 5 | Google Takeout | Guided export | High (feels invasive, slow process) | Very high (search history, YouTube, Maps, Chrome) | Only asked of engaged users who have already seen value from earlier connections. This is the "power unlock." |
| 6 | Banking categories | Screenshot upload | Very high (money is the most private data) | Very high (spending patterns, subscription waste, delivery frequency) | Only for users who are already building automations and trust the system. This is Month 2+ territory. |

**Week 1 prompt strategy:**

Day 2 email/notification:
> "Your report said meal planning is your #1 time sink. Want to make it more accurate? Share a Screen Time screenshot and we'll show you exactly how much time goes to food apps vs. everything else."

The key: the prompt is tied to THEIR stated pain point, not our data hunger. We are not saying "give us your data." We are saying "want a better answer to the question YOU asked?"

**What the system learns from Screen Time:**

| Screen Time Data | Inference |
|-----------------|-----------|
| Top apps by time | What workflows dominate their day |
| Social media hours | Potential for "digital wellbeing" automations |
| Pickups per day | Notification-driven behavior (polling pattern) |
| First/last app used | Morning and evening routines |
| Category breakdown | Where the real time goes vs. where they think it goes |

**Insight generated (example):**
> "You told us meal planning is your biggest time waste, but your Screen Time says you spend 3x more time on email than food apps. Your actual #1 automation opportunity might be email triage. Want to explore that?"

This is the first trust-deepening moment. The system knows something the user did not know about themselves. That is the aha moment.

---

### Month 1: First Automation Built

**State:** User has completed the chat, connected 1-2 data sources, received personalized suggestions, and built (or had us build) their first automation.

**The feedback loop activates.**

Three signal streams now flow:

**1. Usage telemetry (from the automation itself)**

| Signal | What It Means |
|--------|--------------|
| Automation runs daily | High value — look for adjacent automations in the same domain |
| Automation stopped running | Either broken (alert user) or low value (deprioritize similar suggestions) |
| User modifies the automation | They want MORE from this category — suggest enhancements |
| User shares the automation | Social proof signal — feature this template for similar users |

**2. Explicit feedback on suggestions**

Each suggestion card the user sees has three actions:

- **"Build this"** → Positive signal. Weight this category higher. Find related automations.
- **"Not now"** → Temporal signal. Resurface in 2 weeks with different framing.
- **"Not for me"** → Negative signal. Downweight this category. Ask why (optional one-tap reason: "I don't do this," "I already have a solution," "Too personal").

The "ask why" on dismissal is critical. "I already have a solution" means we should look for adjacent problems, not stop suggesting in this category. "Too personal" means we pushed too far — pull back the trust ladder on data requests too.

**3. Behavioral inference from what they do NOT build**

If we suggest 5 things and they build the meal planner but ignore the email triage, the expense tracker, the grade checker, and the price watcher:
- Meal planning is their entry point
- They may not trust us with email yet (too personal)
- They may not have the problems we assumed from archetype alone

The system should note: this user's archetype match is only partial. Adjust the archetype weighting, do not replace it.

**Month 1 insight quality:**

By now the system can generate insights like:
> "Your meal planner has saved you an estimated 2.5 hours this month. People who built a meal planner next built a grocery price watcher — it catches deals on ingredients your planner already uses. Want to add it?"

This is not a generic upsell. It is a logical extension of what they already use. The suggestion is earned.

---

### Month 6: Power User

**State:** 3-5 active automations, 2+ data sources connected, regular interaction with suggestion feed.

**What the fully-realized discovery looks like:**

**1. Proactive pattern detection**

The system now has enough behavioral data to detect patterns the user has never articulated:

> "Every Monday morning you spend 40 minutes in your email before opening your task manager. An automation could triage your weekend emails and have a prioritized summary ready by 8am. Want to try it?"

> "You order food delivery every Thursday and Sunday. A meal prep automation on Wednesday and Saturday could cut your delivery spend by ~$120/month."

> "Your calendar shows 6 meetings next week with no agenda attached. An agenda-generator could draft them from the meeting invite + previous notes."

These are not suggestions from a template library. They are observations from THIS user's data, cross-referenced with patterns from similar users.

**2. The personal automation graph**

Power users see a visualization of their "automation surface area":

```
┌─────────────────────────────────────────────────────┐
│                Your Automation Map                    │
│                                                       │
│   [Meal Planning] ──── [Grocery Lists] ── [Deals]   │
│        │                                              │
│   [Email Triage] ──── [Meeting Prep]                 │
│        │                                              │
│   [Expense Tracking] ──── [Subscription Audit]       │
│                                                       │
│   ○ Active    ◐ Suggested    ○ Unexplored             │
│                                                       │
│   Coverage: 35% of detectable automation surface      │
└─────────────────────────────────────────────────────┘
```

The "35% coverage" number creates natural curiosity: "What's the other 65%?" This gamification is subtle — it does not use points or streaks, just a map of what is possible vs. what exists.

**3. Cross-automation intelligence**

Automations start talking to each other:
- The meal planner feeds the grocery list
- The grocery list feeds the price watcher
- The calendar feeds the meeting prep
- The meeting prep feeds the email triage (auto-draft follow-ups)

The system suggests these connections:
> "Your meal planner already knows what you need this week. Your grocery app has a sale on chicken thighs. Want to connect them so you get notified when ingredients on your plan go on sale?"

**4. Seasonal and lifecycle awareness**

With 6 months of data, the system detects temporal patterns:
- "Last semester you checked grades 15 times a day during finals. Finals start in 3 weeks. Want to reactivate your grade checker?"
- "You set up a price watcher for flights last summer. Summer is coming — should we start watching again?"
- "Your Screen Time jumped 2 hours/day this week. New app? New habit? Want to review?"

---

## Cross-User Learning

### The Anonymous Pattern Engine

Every user interaction contributes to a pattern library that improves suggestions for everyone. The design must balance utility with privacy.

**What we aggregate (anonymized, no PII):**

| Pattern | Example | How It Helps New Users |
|---------|---------|----------------------|
| Archetype → first automation | "72% of students build the grade checker first" | Cold-start ranking for new students |
| Automation → next automation | "People who built meal planners next built grocery lists (64%)" | Suggestion sequencing |
| Dismissal patterns | "Email triage gets dismissed by 45% of students but built by 78% of professionals" | Archetype-specific suppression |
| Data source → insight quality | "Calendar connection produces 3x more actionable suggestions than Spotify" | Trust ladder optimization |
| Automation retention | "Price watchers have 89% 30-day retention vs. 34% for routine trackers" | Prioritize high-retention suggestions |
| Time-to-value | "Meal planner users see value in 2 days; expense trackers take 2 weeks" | Set expectations, delay gratification warnings |

**What we never aggregate:**

- Specific app names from Screen Time (only categories)
- Calendar event titles or attendees
- Email sender/recipient identifiers
- Amounts from banking screenshots
- Anything that could re-identify a specific person

**How we present cross-user insights (the anti-creepy playbook):**

Bad: "We analyzed your behavior and 78% of people who do what you do..."
Good: "78% of people who connected their calendar discovered they spend 8+ hours a week in meetings that could be async."

The difference: the good version references a GENERAL population finding, not surveillance of the individual user. The insight is presented as something we learned from our community, not from watching them specifically.

**Rules for cross-user messaging:**

1. **Round numbers only.** "About 4 in 5 people" not "78.3% of users." Precision implies individual tracking.
2. **Reference the action, not the person.** "People who connected their calendar" not "People like you."
3. **Make it useful, not impressive.** The insight should tell them something they can act on, not demonstrate how much we know.
4. **Never reference small cohorts.** If fewer than 100 people match a pattern, do not surface it. "3 people with your exact Screen Time profile..." is stalker energy.
5. **Opt-out available.** Users can opt out of contributing to and receiving cross-user patterns. No penalty, no dark patterns.

---

## The Feedback Loop: Architecture

### Signal Collection

```
User Action                    Signal Type        Weight    Decay
──────────────────────────────────────────────────────────────────
Answers onboarding chat        Explicit intent    1.0       Never
Taps "This sounds like me"     Soft positive       0.6       30 days
Taps "Build this"              Hard positive       1.0       90 days
Taps "Not now"                 Soft negative        0.3       14 days
Taps "Not for me"              Hard negative        0.8       180 days
Provides dismissal reason      Labeled negative    1.0       180 days
Connects data source           Trust escalation    0.7       Never
Disconnects data source        Trust withdrawal    1.0       Never
Automation runs successfully   Usage positive      0.4       7 days (cumulative)
Automation stops running       Usage negative      0.5       30 days
User modifies automation       Engagement signal   0.6       60 days
User shares automation         Advocacy signal     0.8       Never
Ignores suggestion (72h)       Passive negative    0.2       7 days
Opens suggestion detail        Interest signal     0.3       14 days
```

### Suggestion Scoring

Each candidate suggestion gets a composite score:

```
Score = (Archetype_match × 0.25)
      + (Cross_user_popularity × 0.15)
      + (Personal_signal_history × 0.30)
      + (Data_quality_bonus × 0.15)
      + (Novelty_factor × 0.15)
```

Where:
- **Archetype_match:** How well this suggestion fits the user's detected archetype(s)
- **Cross_user_popularity:** How often similar users build and retain this automation
- **Personal_signal_history:** Net of positive and negative signals for this suggestion category
- **Data_quality_bonus:** How much better this suggestion is because of connected data sources (incentivizes connections without requiring them)
- **Novelty_factor:** Suggestions the user has never seen score higher than re-surfaced ones. Prevents staleness.

### Decay and Freshness

- Signals decay over time (see table above). A "not now" from 3 weeks ago should not permanently suppress a suggestion.
- The system tracks a "suggestion budget" per session: show max 3 new suggestions per day. More than that creates decision fatigue.
- Re-surfaced suggestions (after decay) get different framing: "We suggested email triage 3 weeks ago. Since then, 200 people built it and report saving 4 hrs/week. Worth another look?"

---

## The "Aha Moment" Timing

### The Aha Moment Spectrum

| Timing | Risk | Strategy |
|--------|------|----------|
| First 30 seconds | Too early = feels generic and algorithmic | Only use research-backed stats, not personalized claims |
| During onboarding chat (90 sec) | Sweet spot for first mild aha | Micro-insights after each answer ("73% of people your age...") |
| Personal report (2 min) | Sweet spot for real aha | Time-waste estimate that is specific and slightly uncomfortable |
| First data connection (Day 2-3) | The deep aha | System knows something about the user that the user did not know about themselves |
| First automation working (Day 3-7) | The commitment aha | "Wait, this actually works and it's mine" |

### The Aha Moment Design

**Mild aha (onboarding chat):** Social proof micro-insights. Low risk because they are about OTHER people, not claims about the user. Purpose: establish that the system has real knowledge.

**Real aha (personal report):** The time-waste estimate. Must be:
- Specific ("1.8 hours/day" not "a lot of time")
- Slightly uncomfortable (the number should be higher than they expected)
- Broken into components (meal decisions: 25 min, email triage: 40 min, price comparison: 20 min)
- Benchmarked ("national average for your age: 22 min")

The report should feel like the first time someone showed you your Screen Time data. The reaction we want: "I didn't realize I was wasting time on THAT."

**Deep aha (first data connection):** The system contradicts the user's self-perception.

Example: User said meal planning is their biggest problem. Screen Time shows they spend 3x more time on email. The system says: "You told us meal planning, but your data says email. Your actual biggest opportunity might not be the one that annoys you most — it's the one you don't even notice."

This moment is powerful but dangerous. If the insight is wrong, trust collapses. Only deliver contradiction insights when the data is unambiguous (3x difference, not 1.2x).

**Commitment aha (first automation):** This is not a data insight — it is the moment the product proves it works. The automation runs, produces a real result, and the user thinks: "Wait, this thing actually does what I asked? And it's MINE?"

### Timing Calibration

The first genuinely surprising insight should appear **during the personal report at the end of the 90-second onboarding chat.** Not before (too generic), not after (they might leave).

The time-waste estimate is the vehicle. Even without any connected data, the chat answers + research averages produce a number that is specific enough to feel personal and large enough to be surprising. Directional accuracy is sufficient. The number does not need to be precise — it needs to be plausible and slightly alarming.

If the user connects Screen Time on Day 2, the SECOND aha moment should arrive within 60 seconds of upload: an instant comparison of their stated priorities vs. their actual screen behavior. This speed matters — delayed gratification on data connections trains users not to connect more.

---

## Day-by-Day Experience Map

### The Hack Path (Primary — Extension + Takeout)

```
DAY 0
├── User arrives (email + referral source only)
├── 90-second onboarding chat (5 questions, archetype detection, micro-insights)
├── Personal report: time-waste estimate from chat + research averages
├── Value delivered: "You waste 1.8 hrs/day. Here's where."
├── Ask 1: "Start your Google Takeout export — here's exactly what to click." (guided flow)
└── Ask 2: "Install Meldar for Chrome. 10 seconds. It watches which sites you visit, never what you type."

DAY 1
├── Extension collecting: {domain, seconds, timestamp}
├── Google Takeout export queuing (Google's side)
├── Minimal extension popup: "12 sites visited so far. Your report builds in 2 days."
├── Value delivered: The countdown creates anticipation
└── Ask: Nothing. Let the data accumulate.

DAY 2
├── Extension has ~48 hours of browsing data
├── Google Takeout ready notification → user uploads
├── INSTANT combined analysis: Takeout (years of history) + extension (last 48 hours of live behavior)
├── Value delivered: The Deep Report. "In the last 2 days you checked Gmail 47 times..."
├── Cross-referenced with Takeout: "...and your search history shows you've been Googling flights
│   to Barcelona for 2 weeks. A price watcher could do that for you."
└── Ask: "Build my [top suggestion]?" (the suggestion is now backed by real data, not guesses)

DAY 3-5
├── First automation delivered / built
├── Extension continues enriching: patterns solidify with more data
├── "Your browsing data confirms: you context-switch between email and docs 30x/day on weekdays."
├── Value delivered: "Wait, this actually works" + ongoing behavioral insights
└── Ask: "How's it going?" (casual check-in, feedback opportunity)

DAY 7
├── One-week summary from extension data
├── "This week: 47 hrs of browsing across 89 unique sites. Top time sinks: [ranked list]."
├── "Your [first automation] ran 7 times. Estimated 2 hours saved."
├── "Based on your browsing patterns, your next best automation: [data-driven suggestion]"
├── Value delivered: Quantified impact + data-driven next step (not archetype-based)
└── Ask: Nothing. Let them build.

WEEK 2-4
├── Extension data now has strong weekly patterns (weekday vs. weekend, morning routines)
├── Takeout data enriches with historical context (seasonal patterns, long-term habits)
├── Suggestions become increasingly specific and surprising
├── "Every Tuesday afternoon you spend 45 min on recipe sites. Thursday you order delivery anyway.
│    A meal planner that runs Monday night could fix both."
├── Value delivered: The system observes patterns the user has never noticed
└── Ask: Build second automation

MONTH 1
├── 1-3 active automations running
├── Feedback loop active (extension data + automation telemetry + explicit feedback)
├── Monthly impact report: "You saved approximately 12 hours this month"
├── Cross-automation connections emerging from browsing patterns
├── Value delivered: Demonstrated ROI + the system is visibly getting smarter
└── Ask: Nothing aggressive. The extension does the work silently.

MONTH 3-6
├── Full behavioral profile from continuous extension data
├── Seasonal awareness from Takeout historical data
├── Proactive suggestions: "Your browsing pattern changed this week — new project? New routine?"
├── Cross-automation intelligence: automations start linking based on observed workflows
├── Personal automation graph fully populated
├── Value delivered: Genuine personal optimization engine
└── Ask: Referral ("Know someone who wastes time on [X]? Send them your report.")
```

### The Fallback Path (No Extension, No Takeout — Chat Only)

```
DAY 0
├── User arrives, completes onboarding chat
├── Personal report from chat + research averages (less precise but still valuable)
├── Value delivered: "You waste 1.8 hrs/day. Here's where." (directionally accurate)
└── Ask: Email. "Build my [top suggestion]?"

DAY 2
├── "Want to make your report more accurate? Share a Screen Time screenshot."
├── If they upload: instant analysis, aha moment
├── Value delivered: Self-knowledge from Screen Time data
└── Ask: Screen Time screenshot (the original trust ladder kicks in)

WEEK 1+
├── Original progressive trust ladder (Screen Time → Calendar → Email metadata → etc.)
├── Slower path to deep insights, but still works
└── Every email/notification gently mentions: "Install Meldar for Chrome for better suggestions"
```

The fallback path still exists and still works. It is just slower. The hack path gets to the same insights in days instead of weeks.

---

## Edge Cases and Failure Modes

### The Skeptic (Gives Nothing)

User signs up, refuses the chat, connects no data.

**Strategy:** The curated shortlist still works. Weekly emails with one anonymized community insight per week:
- "This week, 340 people built a price watcher. Average savings: $47/month."
- No pressure. No "you're missing out." Just consistent proof the system works.

If they do not engage after 4 weeks, move to a monthly digest cadence. Do not spam.

### The Oversharer (Connects Everything Day 1)

User connects calendar, uploads Screen Time, starts Google Takeout, all on Day 1.

**Strategy:** Do not overwhelm with insights. Queue them. Deliver one major insight per day for the first week. Make each one feel like a discovery, not a data dump.

### The Disagreer (Dismisses Everything)

User dismisses 5+ suggestions in a row.

**Strategy:** Stop suggesting for 48 hours. Then send one message:
> "We notice our suggestions haven't been hitting the mark. Want to tell us what you're actually looking for? A 30-second chat can recalibrate everything."

This resets the archetype detection and restarts the feedback loop with explicit corrections.

### The One-and-Done (Builds One, Disappears)

User builds one automation and never returns.

**Strategy:** The automation keeps running. Monthly "your automation saved X hours" emails maintain the relationship. After 60 days of inactivity, one reactivation prompt:
> "Your meal planner saved you approximately 14 hours over 2 months. People who added a second automation typically save 3x more. Want to see what's next?"

One attempt. If ignored, maintain the monthly summary and wait.

### The Privacy Regression (Disconnects a Data Source)

User disconnects Google Calendar after 2 weeks.

**Strategy:** Immediately acknowledge: "Calendar disconnected. We've deleted your calendar data. Your suggestions will be based on your other sources." No guilt, no "are you sure?", no dark patterns. Internally, treat this as a trust withdrawal signal — reduce the aggressiveness of future data connection requests for this user by increasing the interval before next ask.

---

## Technical Implementation Notes

### Data Storage Model

```
User
├── archetype: string (detected)
├── archetype_confidence: float
├── onboarding_answers: text[] (their own words)
├── connected_sources: enum[] (screen_time, calendar, email_meta, spotify, takeout, banking)
├── trust_level: int (0-5, derived from connected sources + interaction history)
│
├── Suggestions[]
│   ├── suggestion_id
│   ├── category: string
│   ├── score: float (composite)
│   ├── status: shown | built | dismissed_soft | dismissed_hard | ignored
│   ├── dismissal_reason: string? (optional)
│   ├── shown_at: timestamp
│   ├── actioned_at: timestamp?
│   └── framing_variant: int (which copy was used)
│
├── Automations[]
│   ├── automation_id
│   ├── category: string
│   ├── created_at: timestamp
│   ├── last_run: timestamp
│   ├── run_count: int
│   ├── modified_count: int
│   ├── shared: boolean
│   └── status: active | paused | broken | deleted
│
└── SignalHistory[]
    ├── signal_type: enum
    ├── target_id: string (suggestion or automation)
    ├── weight: float
    ├── created_at: timestamp
    └── decayed_weight: float (computed)
```

### Aggregate Pattern Store

```
Pattern
├── archetype: string
├── pattern_type: first_build | next_build | dismissal | retention | data_source_impact
├── source_category: string
├── target_category: string?
├── sample_size: int (must be >= 100 to surface)
├── percentage: float
├── last_updated: timestamp
└── confidence_interval: float
```

### Suggestion Generation Pipeline

```
1. Candidate generation
   - All automation templates in the library
   - Minus: already built, hard-dismissed within decay window

2. Scoring
   - Archetype match (from static mapping)
   - Cross-user patterns (from aggregate store)
   - Personal signal history (from user's signal history, with decay)
   - Data quality bonus (connected sources that make this suggestion better)
   - Novelty factor (time since last shown, or never shown)

3. Diversity filter
   - No more than 2 suggestions from the same category in one batch
   - At least 1 suggestion from a category the user has never seen

4. Budget enforcement
   - Max 3 new suggestions per day
   - Max 1 re-surfaced suggestion per week

5. Framing selection
   - Choose copy variant based on what has worked for similar users
   - If re-surfaced: use different framing than last time
```

---

## Metrics That Matter

| Metric | What It Measures | Target (Month 1) | Target (Month 6) |
|--------|-----------------|-------------------|-------------------|
| Chat completion rate | Is the onboarding engaging? | >70% | >80% (iterate copy) |
| First data connection rate | Is the trust ladder working? | >30% connect Screen Time in Week 1 | >50% |
| Suggestion acceptance rate | Are suggestions relevant? | >15% "build this" per suggestion shown | >25% |
| Suggestion dismissal rate (hard) | Are we annoying people? | <20% | <10% |
| Time to first automation | Is the path from discovery to action smooth? | <7 days | <3 days |
| Automation 30-day retention | Are automations actually useful? | >60% | >75% |
| Second automation rate | Does the flywheel work? | >25% build a second within 30 days | >50% |
| Data source count per user (avg) | Is trust growing? | 0.8 | 2.5 |
| NPS after first automation | Satisfaction baseline | >40 | >60 |
| Aha moment recall | In user interviews: "What surprised you?" should yield a specific answer | >50% recall a specific insight | >80% |

---

## What We Build First (MVP Scope — Hack Path)

### Phase 1 (Weeks 1-2): Chat + Report + Browser Extension

- Conversational onboarding (5 questions, archetype detection, micro-insights)
- Personal report v1 (time-waste estimate from chat + research averages)
- Static suggestion library (top 20 automations from research, manually curated)
- **Browser extension MVP** (~80 lines of JS: `tabs` + `storage` permissions, domain-only logging, 5-min sync to API)
- Extension data ingestion pipeline (domain, active seconds, timestamp → pattern detection)
- Extension popup (site count, countdown to first report)
- Email capture post-report
- "Build this for me" CTA (queues request, manually fulfilled or semi-automated)

### Phase 2 (Weeks 3-4): Google Takeout + The Deep Report

- Google Takeout guided export flow (screenshot walkthrough, selective export checklist)
- Takeout upload + parser (Chrome history, Search history, YouTube history, Calendar, Maps)
- **Personal Report v2** — combines Takeout (historical) + extension (live) + chat (intent)
- Pattern detection engine: tab ping-pong, comparison shopping, polling, context switching, time sinks, routines
- Basic feedback loop (build / not now / not for me buttons)
- Signal collection store
- Suggestion re-ranking based on real behavioral data (not just archetype)

### Phase 3 (Weeks 5-6): Feedback Loop + Cross-User Patterns

- Automation telemetry (run count, modification, sharing)
- Anonymous pattern aggregation (first-build patterns, next-build sequences)
- Cross-user pattern integration into suggestion scoring
- Weekly summary emails with impact metrics from extension data
- Suggestion framing variants

### Phase 4 (Weeks 7-8+): Polish + Fallback Paths

- Screen Time screenshot upload + OCR (fallback for users who refuse extension)
- Google Calendar direct OAuth (for users who do not want full Takeout)
- Seasonal awareness from Takeout historical patterns
- Cross-automation connection suggestions
- Personal automation graph visualization

**Total MVP timeline: ~6-8 weeks** (vs. ~12 weeks for the original 6-source progressive system)

The key difference: Phase 1-2 of the hack path delivers the same insight quality that the original plan reached in Phase 3-4. We front-load the value by piggybacking on Google's decade of data collection and a trivial browser extension.
