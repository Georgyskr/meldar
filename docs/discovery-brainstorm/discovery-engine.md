# Discovery Engine: Self-Improving Life X-Ray Architecture

**Date:** 2026-03-30
**Author:** Autonomous Optimization Architect
**Status:** Brainstorm / architectural proposal
**Dependency:** Builds on [discovery/SYNTHESIS.md](../discovery/SYNTHESIS.md), [discovery/data-sources.md](../discovery/data-sources.md), [discovery/progressive-discovery.md](../discovery/progressive-discovery.md)

---

## 1. The Discovery Engine Concept

### The Core Idea

Every individual data source tells a story. Combined data sources tell the **truth**.

Screen Time alone says "you use Instagram 47 min/day." That is a fact, but it is not actionable — maybe you are a social media manager. The Discovery Engine turns isolated data points into **cross-referenced behavioral diagnoses** by layering sources on top of each other. Each new source does not just add data — it **multiplies the insight quality** of every source already connected.

### The Unified Life X-Ray Model

All data sources normalize into a single internal model: the **Activity Timeline**.

```
ActivityEvent {
  timestamp:   DateTime
  source:      "screen_time" | "calendar" | "notifications" | "bank" | "browser" | "takeout"
  category:    "communication" | "entertainment" | "productivity" | "finance" | "health" | "social"
  domain:      string            // e.g., "instagram.com", "Gmail", "Uber Eats"
  duration_s:  number | null     // null for point events (notification, transaction)
  event_type:  "usage" | "notification" | "meeting" | "transaction" | "search" | "visit"
  metadata:    Record<string, unknown>  // source-specific extras
}
```

Everything — a Screen Time session, a calendar event, a bank charge, a notification, a browser visit — becomes an `ActivityEvent`. The engine does not care where data came from. It cares about **temporal overlap, frequency patterns, and contradictions**.

### Cross-Source Fusion Examples

**Screen Time + Calendar = Wasted Free Time Detection**

```
Calendar says:  3 free hours between meetings (2pm-5pm)
Screen Time:    2h 10min of those hours spent on Instagram + Reddit
Engine output:  "You have 3 hours of open time on Tuesdays and Thursdays.
                 You spend 72% of it on social media. That's 4.3 hours/week
                 you could reclaim."
Suggestion:     Focus mode automation that blocks social apps during calendar gaps
```

**Screen Time + Notifications = Interruption Cost Analysis**

```
Notifications:  178 Telegram notifications today
Screen Time:    11 minutes total Telegram usage
Engine output:  "Telegram interrupted you 178 times for 11 minutes of actual use.
                 Each notification costs ~23 seconds of context-switch time.
                 That's 68 minutes of invisible lost focus."
Suggestion:     Notification batching — deliver Telegram alerts in 3 daily digests
```

**Screen Time + Bank Statement = Zombie Subscription Detection**

```
Bank:           6 active subscriptions ($74/month total)
Screen Time:    3 of those apps have 0 minutes usage in 30 days
Engine output:  "You pay $31/month for Headspace, Duolingo Plus, and Strava
                 Premium. You haven't opened any of them in 30 days."
Suggestion:     Cancel or pause unused subscriptions (with one-click links)
```

**Browser History + Screen Time = Intent vs. Action Gaps**

```
Browser:        45 minutes browsing recipe sites (3 visits this week)
Screen Time:    Uber Eats app opened within 30 min of recipe browsing (2 of 3 times)
Engine output:  "You research recipes for 45 minutes, then order Uber Eats.
                 This happened twice this week. You spent $47 on delivery after
                 browsing recipes you never cooked."
Suggestion:     Meal planner that converts browsed recipes into a grocery list
                 with estimated prep time
```

**Calendar + Email = Meeting Overhead Calculator**

```
Calendar:       8 meetings this week (6.5 hours)
Email:          34 emails with subjects matching meeting titles
Engine output:  "Your 8 meetings generated 34 follow-up emails. You spent
                 6.5 hours in meetings and an estimated 2.8 hours on meeting email.
                 Total meeting cost: 9.3 hours (23% of your work week)."
Suggestion:     Meeting notes auto-summarizer + action item extractor
```

**Search History + Screen Time = Decision Paralysis Detector**

```
Search:         "best running shoes 2026" searched 7 times over 14 days
Browser:        Visited Nike, Asics, On, Brooks, and 3 comparison sites (12 sessions)
Screen Time:    4.2 hours total spent across these sessions
Engine output:  "You've been researching running shoes for 2 weeks.
                 4.2 hours across 12 sessions. You haven't bought any."
Suggestion:     Decision assistant that synthesizes reviews and recommends top 2
                 options based on your criteria
```

---

## 2. Progressive Discovery: From Shallow to Deep

### The Trust Escalation Model

Users do not hand over their life data on day one. They do it incrementally, only after each step proves value. The engine is designed so **every level generates a useful report on its own**, but each new level retroactively enriches all previous levels.

```
Insight quality
     ^
  5x |                                           ******* L5: Google Takeout
     |                                    *******
  4x |                              ******
     |                        ******
  3x |                  ****** L4: Bank/Subscriptions
     |            ******
  2x |       ***** L3: Calendar or Email
     |    *** L2: Notifications
  1x | ** L1: Screen Time
     |
     +--+--------+--------+--------+--------+---> Effort
       30s      1 min    2 min    3 min    5 min
```

### Level 1: Screen Time Screenshot (30 seconds)

**Input:** One screenshot of iOS/Android Screen Time settings
**Processing:** Claude Haiku Vision extracts app names, durations, pickup counts, categories
**Cost:** $0.002 per parse

**Standalone insights:**
- Top 5 time-consuming apps with daily/weekly averages
- Pickup frequency vs. actual usage ratio
- Category breakdown (social, productivity, entertainment)
- Time-of-day patterns (if multiple screenshots provided)

**Report output:** "Your Screen Time Snapshot" — a single card with 3-4 headline stats and 2 suggestions

**Why it works at this level:** People are already curious about their screen time. Turning raw numbers into a narrative ("You pick up your phone 89 times a day but spend only 7 minutes per pickup on average — you're in a notification-driven loop") gives them something they cannot get from the Screen Time page itself.

### Level 2: + Notification Export (1 minute)

**Input:** Screenshot of notification settings OR notification summary
**Processing:** Rule-based extraction of notification sources and volumes

**New insights (combining with L1):**
- Interruption cost calculation (notifications x context-switch penalty)
- Signal-to-noise ratio per app (notifications received vs. time spent)
- Apps that interrupt the most but deliver the least value
- "Silent killers" — apps with high notification volume that you never consciously open

**Upgrade pitch from L1:** "Your Screen Time says you use Slack for 22 min/day. But do you know how many times it interrupts you? Add your notification data and find out."

### Level 3: + Calendar or Email Metadata (2 minutes)

**Input:** Google Calendar export (ICS) or email header metadata
**Processing:** Rule-based calendar parsing, email frequency analysis

**New cross-source insights:**
- Meeting time vs. deep work time ratio
- Free time blocks vs. what you actually do during them (cross-ref L1)
- Email senders who consume the most time
- Meeting frequency trends (getting better or worse?)
- The "fragmentation score" — how choppy is your day?

**Upgrade pitch from L2:** "We see you have 3 hours of free time between meetings. Want to know what you're actually doing with it?"

### Level 4: + Bank Statement or Subscription List (3 minutes)

**Input:** CSV bank export or manual subscription list
**Processing:** Rule-based transaction categorization, subscription matching

**New cross-source insights:**
- Zombie subscriptions (paying but not using, cross-ref L1)
- Spending vs. usage correlation ("You spent $156 on food delivery last month while spending 3 hours browsing recipes")
- The "digital waste" number — total monthly spend on unused or underused services
- Impulse purchase pattern detection (late-night transactions)

**Upgrade pitch from L3:** "We know where your time goes. Want to see where your money goes — and where the two don't match?"

### Level 5: Google Takeout (5 minutes + processing wait)

**Input:** Google Takeout ZIP (selective: Chrome, Search, YouTube, Calendar, Maps)
**Processing:** Client-side ZIP parsing (data stays on device), rule-based pattern extraction

**New cross-source insights (the full X-Ray):**
- Complete browsing pattern analysis (years of data, not just recent)
- Search pattern analysis (what you Google repeatedly = decision fatigue)
- YouTube consumption categorization (learning vs. entertainment ratio)
- Location patterns (commute time, frequent places, travel habits)
- The "full picture" report — all previous levels enriched with historical depth

**Upgrade pitch from L4:** "Everything so far is a snapshot. Your Google Takeout has YEARS of data. See the patterns you've never noticed."

### Inter-Level Enrichment

The key architectural principle: **adding Level N retroactively reprocesses Levels 1 through N-1**.

Example: User has L1 (Screen Time) showing 47 min/day Gmail. When they add L3 (Email), the engine re-analyzes L1 in light of email volume:
- Before L3: "You spend 47 min/day on Gmail"
- After L3: "You spend 47 min/day on Gmail processing 120 emails, but only 8 require a response. The other 112 are newsletters and notifications you could auto-filter."

This retroactive enrichment is the "wow" moment that drives users to the next level.

---

## 3. Cross-Source Insights: What Becomes Possible Only with 2+ Sources

These are insights NO single app can provide. This is Meldar's moat.

### The Insight Matrix

| Source A | Source B | Unique Insight | No single app provides this because... |
|----------|----------|---------------|---------------------------------------|
| Screen Time | Calendar | "You spend your free time on social media" | Screen Time does not know your schedule. Calendar does not know your app usage. |
| Screen Time | Notifications | "App X interrupts you 200x for 8 min of use" | Screen Time shows duration. Notification settings show volume. Neither shows the ratio. |
| Screen Time | Bank | "You pay for 4 apps you never open" | Bank shows charges. Screen Time shows usage. Neither cross-references. |
| Browser | Screen Time | "You research X then buy from Y instead" | Browser shows intent. Screen Time shows action. The gap is invisible to both. |
| Calendar | Email | "Meetings generate 4x follow-up emails" | Calendar tracks events. Email tracks threads. Neither links them. |
| Browser | Bank | "You comparison-shop for 3 hours then impulse buy" | Browser shows research. Bank shows purchase. Neither tracks the journey. |
| Search | Browser | "You Google the same thing weekly" | Search history is buried in Google. Browser history is a raw log. Neither detects repetition patterns. |
| Notifications | Calendar | "You get interrupted most during deep-work blocks" | Neither system knows what the other is doing. |
| Screen Time | Health (sleep) | "Phone usage after 11pm correlates with poor sleep" | Health app has no idea about phone usage. Screen Time has no idea about sleep quality. |

### The Compound Insight Categories

**1. Intent-Action Gaps**
What you plan to do vs. what you actually do. Requires: Calendar/Goals + Screen Time/Browser.
- "You blocked 2 hours for 'deep work' but spent 1h 40m context-switching between email and Slack"
- "You searched 'home workout routine' 5 times this month but your Apple Health shows 0 workout sessions"

**2. Cost-of-Behavior Analysis**
What your habits actually cost in time AND money. Requires: Screen Time/Browser + Bank.
- "Your Instagram usage costs you 18 hours/month. At your implied hourly rate, that's $540 of your time."
- "You spent 3.5 hours comparing food delivery options this month and $210 on delivery fees."

**3. Invisible Overhead**
Time costs you do not perceive because they are spread across the day. Requires: Notifications + Screen Time + Calendar.
- "Context switching costs you 2.3 hours/day. That is more than any single app."
- "You attend 6 meetings that could be emails, costing 4.5 hours/week."

**4. Behavioral Contradictions**
Where your actions contradict your stated or implied goals. Requires: any 2+ sources with conflicting signals.
- "You have a meditation app subscription but your average session is 2 minutes."
- "You set a budget of $200/month for eating out but spent $340 in the first 3 weeks."

**5. Temporal Pattern Discovery**
Time-based patterns invisible within a single source. Requires: 2+ sources with timestamps.
- "Your worst spending decisions happen between 10pm-midnight."
- "You are most productive between 9-11am but schedule meetings during that window 3x/week."

---

## 4. The Suggestion Engine

### Architecture: Two-Tier System

The suggestion engine uses a **rule-based first, AI-enhanced second** approach. This keeps costs near zero for 90% of users while delivering genuinely personalized suggestions for the remaining 10%.

### Tier 1: Rule-Based Pattern Matching (free, instant)

A library of **pattern detectors** that run deterministically against the Activity Timeline. No AI calls. Pure logic.

```
PatternDetector {
  id:          string
  name:        string                        // e.g., "polling_behavior"
  description: string
  required_sources: Source[]                  // minimum data needed
  detect:      (timeline: ActivityEvent[]) => PatternMatch[]
  suggest:     (match: PatternMatch) => Suggestion
}
```

**Core Pattern Detectors (ship with MVP):**

| Detector | Logic | Suggestion Template |
|----------|-------|-------------------|
| **Polling** | Same domain visited >3x/day for >3 days | "You check {domain} {frequency}. A monitor bot can watch it and notify you on changes." |
| **Zombie Subscription** | Bank charge from app with <5 min usage in 30 days | "You pay {amount}/month for {app}. You haven't used it in {days} days." |
| **Notification Flood** | >50 notifications/day from a single app with <15 min usage | "{app} sent {count} notifications for {minutes} min of use. Batch these into a daily digest." |
| **Research-Then-Buy** | >20 min browsing in a category followed by a purchase in <2 hours | "You spent {minutes} min comparing {category}. A price comparison bot does this in seconds." |
| **Context Switching** | >5 domain switches in 10 minutes, repeated pattern | "You switch between {apps} {count} times/day. A unified dashboard could cut this." |
| **Decision Paralysis** | Same search query >3 times in 7 days | "You've searched '{query}' {count} times. A decision assistant can synthesize options for you." |
| **Free Time Waste** | Calendar gap >1 hour with >60% social media usage | "You have {hours} free hours but spend {percent}% on {apps}." |
| **Meal Planning Fail** | Recipe site browsing followed by delivery app within 1 hour | "You browse recipes then order delivery. A meal planner with grocery list could break this cycle." |
| **Email Overload** | >100 emails/day with <10% response rate | "You receive {count} emails/day but respond to {percent}%. Auto-filtering could save {minutes} min/day." |
| **Sleep Disruptor** | >30 min screen time within 1 hour before average sleep time | "You average {minutes} min of screen time before bed. This correlates with later sleep onset." |

**Suggestion output format:**

```
Suggestion {
  title:           string           // "Stop Checking Zillow Manually"
  insight:         string           // The data-backed observation
  action:          string           // What Meldar will build
  estimated_save:  string           // "~25 min/week"
  confidence:      "high" | "medium" | "low"
  required_tier:   "free" | "starter" | "concierge"
  data_sources:    Source[]         // What data powered this insight
}
```

**How many detectors do we need?** Start with 10-15 covering the Tier 1 use cases from research (meal planning, polling, email triage, expense tracking, grade checking, etc.). Each detector is 50-100 lines of TypeScript. Total investment: 2-3 days of development.

### Tier 2: AI-Enhanced Insights (paid, deliberate)

AI is invoked only when:

1. **The user explicitly asks for deeper analysis** ("Tell me more about my email patterns")
2. **Rule-based detectors find an ambiguous pattern** (e.g., high usage of an app that could be productive or wasteful — Figma? YouTube learning?)
3. **Generating the final Time X-Ray narrative** (turning raw pattern matches into a readable, shareable report)
4. **The user has 3+ data sources connected** (cross-source narratives are hard to template)

**AI call structure:**

```
System prompt: You are a personal productivity analyst.
               Here are the user's detected patterns: {patterns_json}
               Generate a 3-paragraph Time X-Ray narrative that:
               1. Leads with the most surprising finding
               2. Quantifies the total time/money impact
               3. Recommends the single highest-impact automation

User data:     {anonymized_pattern_summaries}
               // NEVER send raw data. Only send aggregated patterns.
```

**Model selection:**
- Pattern narrative generation: Claude Haiku ($0.001/report)
- Complex cross-source analysis: Claude Sonnet ($0.008/analysis)
- Screen Time OCR: Claude Haiku Vision ($0.002/image)

---

## 5. Cost Optimization

### The $0.02/user Budget

**Design principle:** AI is a condiment, not the main course. The engine should function with zero AI calls and deliver 80% of the value.

### Cost Breakdown Per User Journey

| Step | AI? | Cost | Notes |
|------|-----|------|-------|
| Pick Your Pain quiz | No | $0.00 | Pure frontend, rule-based matching |
| Screen Time OCR | Yes (Haiku Vision) | $0.002 | One image, ~200 tokens output |
| Pattern detection (all levels) | No | $0.00 | Rule-based, runs on server in <100ms |
| Cross-source analysis | No | $0.00 | Rule-based combinators |
| Time X-Ray narrative (Level 1-2) | No | $0.00 | Templated narratives for simple cases |
| Time X-Ray narrative (Level 3+) | Yes (Haiku) | $0.001 | Only for multi-source reports |
| Deep analysis (on request) | Yes (Sonnet) | $0.008 | Only when user explicitly asks |
| **Typical user (L1 + L2)** | | **$0.003** | |
| **Power user (all levels + deep analysis)** | | **$0.013** | |
| **Maximum (edge case)** | | **$0.025** | Multiple deep analyses requested |

### Circuit Breakers

**Per-user limits:**
- Max 3 AI analysis calls per day (free tier)
- Max 1 Screen Time OCR per upload (reject duplicates)
- Max 1 deep analysis per data source connection
- Paid tiers: higher limits, still capped

**System-wide limits:**
- Daily AI spend cap: configurable, starts at $10/day
- If daily cap hit: queue requests, process in next billing cycle
- Alert founder at 80% of daily cap

**Cost-saving patterns:**

1. **Cache pattern detector results.** If a user's data has not changed, serve cached insights. Invalidate on new data source connection.

2. **Template narratives for common patterns.** If 60% of users have the same "zombie subscription" pattern, do not call AI for each one. Pre-write 20 narrative templates with variable slots.

3. **Batch AI calls.** When generating a full Time X-Ray report, send all patterns in ONE prompt rather than one prompt per pattern. Single call with 10 patterns is cheaper than 10 calls with 1 pattern each.

4. **Downgrade model based on complexity.** Single-source report? Template. Two sources? Haiku. Three+ sources with contradictions? Sonnet. Never use Opus for discovery (reserve for app building).

5. **Client-side processing wherever possible.** Google Takeout parsing happens in the browser. Pattern detection runs on the server but on pre-aggregated data. Raw data never hits AI.

### Cost Monitoring Dashboard

Track these metrics from day one:

```
- AI cost per user (7-day rolling average)
- AI calls per user action (should decrease over time as templates grow)
- Cache hit rate for pattern detection
- % of users who trigger Tier 2 AI analysis
- Cost per insight generated
```

---

## 6. The Moat: Why Apple, Google, and ChatGPT Cannot Replicate This

### Why Apple Cannot Do This

Apple has the best single-device data (Screen Time, Health, Wallet). But:

1. **Apple is a hardware company.** Their incentive is to sell you a new iPhone, not to tell you that you waste 3 hours/day on your current one.
2. **No cross-platform data.** Apple cannot see your Chrome history, your Gmail, your Android usage, or your bank statements. Meldar can combine all of them.
3. **No action layer.** Apple can show you Screen Time stats. Apple cannot build you a meal planner or an email triage bot. Apple's "Focus modes" are manual and static.
4. **Privacy absolutism prevents cross-referencing.** Apple's privacy architecture is designed to silo data. They will NEVER cross-reference your Screen Time with your Apple Card transactions to tell you about zombie subscriptions. That would violate their own privacy narrative.

### Why Google Cannot Do This

Google has the richest behavioral data on earth. But:

1. **Conflict of interest.** Google makes $238/year from your data via ads. Telling you to spend less time on YouTube directly hurts their revenue. They will never build a product that cannibalizes ad engagement.
2. **Digital Wellbeing is performative.** Google's "Digital Wellbeing" features are designed to deflect regulatory pressure, not to actually change behavior. The features are buried, minimal, and have not meaningfully evolved since 2018.
3. **No action layer.** Google can show you your data. Google will not build you a personal app that reduces your dependence on Google products.
4. **Google cannot touch your bank data.** Even with Google Pay, they cannot see your full financial picture or cross-reference it with screen time.

### Why ChatGPT Cannot Do This

ChatGPT is the closest conceptual competitor. But:

1. **No persistent data access.** ChatGPT processes what you paste into a chat. It cannot monitor your ongoing behavior, track patterns over time, or detect changes week-over-week.
2. **No action layer.** ChatGPT can advise you to "try batch-checking email." It cannot build a running automation that actually does it for you.
3. **Generic, not personal.** ChatGPT gives the same productivity advice to everyone. Meldar's advice is backed by YOUR data — "you check email 47 times because you get 3 important emails buried in 120 newsletters. Here is a filter that surfaces the 3 and archives the 120."
4. **Session-based, not continuous.** Discovery is not a single conversation. It is a system that watches patterns over weeks and surfaces new insights as behavior changes.

### The Real Moat: Cross-Source Fusion + Action

No single company controls all data sources (screen time + calendar + bank + browser + notifications + health). Meldar is the **neutral aggregator** — we have no conflict of interest because we do not sell ads, we do not sell hardware, and we do not monetize attention. We monetize the opposite: we get paid when you waste LESS time.

The combination of:
1. **Cross-source data fusion** (no one else combines these sources)
2. **Progressive trust model** (earn data access incrementally)
3. **Actionable output** (not just insights — actual automations)
4. **User-side data processing** (privacy story is genuine, not theater)

...creates a product that is structurally impossible for any Big Tech company to replicate without cannibalizing their core business model.

### The Network Effect Moat (Long-Term)

As more users go through the discovery funnel, Meldar learns:
- Which pattern detectors fire most often (prioritize development)
- Which suggestions users actually accept (improve ranking)
- Which automations deliver the most time savings (refine estimates)
- Which data source combinations yield the best insights (optimize the upgrade pitch)

This feedback loop improves the rule-based engine for everyone — without sharing individual data. The 1,000th user gets a better experience than the 1st user because the pattern library and suggestion templates have been refined by aggregate behavior.

---

## Appendix: Architecture Summary

```
                    USER DATA SOURCES
                    ─────────────────
        Screen Time   Calendar   Bank   Browser   Notifications
             │           │        │       │           │
             ▼           ▼        ▼       ▼           ▼
        ┌─────────────────────────────────────────────────┐
        │         INGESTION & NORMALIZATION                │
        │    (source-specific parsers → ActivityEvent)     │
        │    Screen Time: Vision AI OCR ($0.002)           │
        │    All others: deterministic parsers ($0.00)     │
        └────────────────────┬────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────┐
        │         PATTERN DETECTION ENGINE                 │
        │    10-15 rule-based detectors (free, <100ms)     │
        │    Polling, Zombie Subs, Notification Flood,     │
        │    Context Switching, Decision Paralysis, etc.   │
        └────────────────────┬────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────┐
        │         CROSS-SOURCE COMBINATOR                  │
        │    Temporal overlap detection                    │
        │    Contradiction detection                       │
        │    Intent-action gap analysis                    │
        │    All rule-based ($0.00)                         │
        └────────────────────┬────────────────────────────┘
                             │
                     ┌───────┴────────┐
                     │                │
              Simple (1-2 src)   Complex (3+ src)
                     │                │
                     ▼                ▼
              Template-based    AI Narrative
              Narrative         (Haiku $0.001)
              ($0.00)           or (Sonnet $0.008)
                     │                │
                     └───────┬────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────┐
        │         SUGGESTION RANKING                       │
        │    Sort by: estimated_time_saved * confidence     │
        │    Show top 3-5 with "Build this" buttons         │
        └────────────────────┬────────────────────────────┘
                             │
                             ▼
        ┌─────────────────────────────────────────────────┐
        │         TIME X-RAY REPORT                        │
        │    Shareable card (viral hook)                    │
        │    3-5 headline stats + suggestions              │
        │    "Spotify Wrapped for productivity"             │
        └─────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Rule-based by default, AI by exception.** This is not an AI product that uses rules to save money. This is a rules engine that uses AI for the 10% of cases where templates fall short.

2. **Client-side data processing.** Google Takeout and bank statements are parsed in the browser. The server only receives aggregated `ActivityEvent` arrays. Raw data never leaves the user's device.

3. **Retroactive enrichment.** Adding a new data source triggers reprocessing of all existing patterns. This is the key UX insight: each level makes previous levels more valuable.

4. **Pattern detectors are the product moat.** They are small, testable, composable. A library of 50 detectors covering every use case from the research synthesis makes Meldar's discovery engine impossible to replicate in a weekend.

5. **The suggestion is not the end — the automation is.** Discovery leads to "Build this." The suggestion engine feeds directly into the app-building engine. This closed loop (discover -> suggest -> build -> measure) is what no competitor has.
