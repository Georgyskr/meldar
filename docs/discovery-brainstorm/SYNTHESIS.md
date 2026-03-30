# Discovery Brainstorm Synthesis

**Date:** 2026-03-30
**Status:** Roadmap for execution
**Inputs:** ai-data-sources.md, rapid-prototypes.md, discovery-engine.md, architecture.md, email-discovery.md, messaging.md

---

## 1. The Discovery Menu

All data sources ranked across four dimensions (1-5 scale). Sorted by composite score.

| Rank | Data Source | User Effort (5=easy) | Insight Value (5=high) | Technical Feasibility (5=proven) | Privacy Risk (5=low risk) | Composite | Ship Priority |
|------|-----------|:----:|:----:|:----:|:----:|:----:|:---:|
| 1 | **Screen Time / Digital Wellbeing** | 5 | 5 | 5 | 5 | 20 | **Build now** |
| 2 | **Notification Count (Screen Time > Notifications)** | 5 | 5 | 5 | 5 | 20 | **Build now** |
| 3 | **Calendar Screenshot** | 5 | 4 | 5 | 4 | 18 | **Build this week** |
| 4 | **iPhone/Play Subscriptions Screenshot** | 5 | 5 | 5 | 3 | 18 | **Build this week** |
| 5 | **Email Inbox Screenshot** | 4 | 4 | 5 | 3 | 16 | **Build next week** |
| 6 | **Alarm Clock Screenshot** | 5 | 3 | 5 | 5 | 18 | Next week (viral, easy) |
| 7 | **Battery Usage Screenshot** | 5 | 3 | 5 | 5 | 18 | Next week (great combo) |
| 8 | **Google Search History (My Activity)** | 3 | 5 | 5 | 2 | 15 | Next week |
| 9 | **Chat List (WhatsApp/Telegram)** | 5 | 3 | 5 | 2 | 15 | Phase 2 |
| 10 | **Browser Tabs** | 5 | 3 | 4 | 3 | 15 | Phase 2 |
| 11 | **Notes/To-Do Screenshot** | 4 | 3 | 5 | 4 | 16 | Phase 2 |
| 12 | **Home Screen Layout** | 5 | 3 | 5 | 4 | 17 | Phase 2 |
| 13 | **Photo Library Stats** | 5 | 2 | 5 | 5 | 17 | Phase 3 |
| 14 | **Storage Usage** | 5 | 2 | 5 | 5 | 17 | Phase 3 |
| 15 | **Bank Statement Screenshot** | 3 | 5 | 4 | 1 | 13 | Phase 3 (privacy) |
| 16 | **Spotify/Music History** | 4 | 2 | 5 | 5 | 16 | Phase 3 |
| 17 | **Google Takeout (full)** | 2 | 5 | 4 | 2 | 13 | Phase 3+ |
| 18 | **Clipboard History** | 4 | 3 | 3 | 1 | 11 | Phase 3+ (privacy) |

### Top 5 to Build

1. **Screen Time** -- Already planned. The anchor of the entire discovery engine. Every other source becomes more valuable when combined with this.
2. **Notification Count** -- Pairs with Screen Time to create the "interruption cost" insight that no other product shows. Same settings screen, different tab. Trivial to add.
3. **Calendar Screenshot** -- Unlocks the "free time waste" insight (calendar gaps vs. Screen Time usage). 15 seconds of user effort, extremely structured UI, very high Vision accuracy.
4. **Subscriptions Screenshot** -- Money is the strongest viral trigger. "I'm wasting $47/month" gets shared. Cross-referencing with Screen Time creates the "zombie subscription" insight.
5. **Email Inbox Screenshot** -- Completes the communication picture. Unread count + sender patterns + newsletter overload. Pairs with notifications for the full "interruption audit."

---

## 2. Implementation Order

### This Week (March 31 - April 6)

**New source #1: Notification Count**
- Input: Screenshot of Screen Time > Notifications (iOS) or equivalent
- Build: New `SourceProcessor` for notifications, reuse existing upload infrastructure
- Key output: notification-to-usage ratio per app, total daily interruption count, "your phone interrupts you every X minutes"
- Effort: ~4 hours. Same Vision extraction pattern as Screen Time. New prompt + signal mapper.
- Why first: Same settings screen as Screen Time (users are already there), and the cross-source insight with Screen Time is the most powerful single combo we have.

**New source #2: Subscriptions Screenshot**
- Input: Screenshot of Settings > Apple ID > Subscriptions (iOS) or Play Store > Subscriptions (Android)
- Build: New `SourceProcessor`, new result card with dollar amounts
- Key output: total monthly subscription cost, zombie subscriptions (cross-ref with Screen Time for unused apps), "you pay $X/month for Y apps you never open"
- Effort: ~4 hours. Highly structured screenshot, high Vision accuracy.
- Why this week: Dollar amounts are the #1 viral trigger. The "Subscription Autopsy" rapid prototype scored 10/10 viral potential.

**Also this week: Two questionnaire-based rapid prototypes (no AI, pure frontend)**
- Decision Fatigue Calculator (3 hours, client-side only, 9/10 viral)
- Sleep Procrastination Score (2 hours, client-side only, 9/10 viral)
- Why: Zero API cost, can ship same day, each is a standalone viral moment and funnel entry point. They validate the "discovery tool" pattern before investing in more Vision-based features.

### Next Week (April 7 - 13)

- **Calendar Screenshot** source (4 hours) -- unlocks free-time-waste detection
- **Email Inbox Screenshot** source (4 hours) -- unlocks inbox overwhelm scoring
- **Doomscroll Meter** rapid prototype (2 hours) -- extends existing Screen Time feature, focused on pickups
- **Content Creation vs Consumption Ratio** rapid prototype (2 hours) -- pure questionnaire, meme-ready output

### Later (April 14+)

- Battery Usage source (great for cross-referencing with Screen Time)
- Google Search History (highest insight density per screenshot but higher privacy friction)
- Alarm Clock (low insight value alone, but strong viral hook and great cross-source combos)
- Browser Tabs, Notes/To-Do, Home Screen (Phase 2 sources)
- Google Takeout full pipeline (Phase 3, client-side processing)
- Bank statement analysis (Phase 3, sensitive data requires extra trust)

---

## 3. The Moto

**Winner: "What's eating your week?"**

Five words. It works because:

1. **It's a question, not a statement.** Questions create an itch. Statements get ignored. "See where your time goes" is a command. "What's eating your week?" is a mystery.
2. **"Eating" implies something predatory.** Your time isn't just disappearing -- something is consuming it. That something is invisible and you haven't noticed. This creates urgency without accusation.
3. **"Your week" makes it personal.** Not "your time" (abstract), not "your day" (too small). A week is the unit where patterns become visible. It's the Spotify Wrapped timeframe.
4. **It's internet-native.** Gen Z would text this to a friend. It could be a TikTok caption. It works as a meme format: "What's eating your week? Mine was eating my week." (showing their X-Ray results).
5. **It naturally leads to the CTA.** "What's eating your week?" -> "Get your Time X-Ray" -> the answer.

**Runner-up:** "Find your invisible hours." -- More poetic, slightly less urgent. Better for brand campaigns than scroll-stopping hero copy.

**Recommendation:** Use "What's eating your week?" as the hero headline. Keep "See where your time actually goes" as a subheadline or CTA descriptor. A/B test both with the Gen Z audience.

---

## 4. Cross-Source Killer Insights

These five insights are impossible with any single data source. They are Meldar's moat.

### 1. The Zombie Subscription Detector
**Sources:** Screen Time + Subscriptions
**Insight:** "You pay $31/month for Headspace, Duolingo Plus, and Strava Premium. You haven't opened any of them in 30 days. That's $372/year for guilt."
**Why it's killer:** Neither the App Store nor Screen Time shows this. The App Store doesn't know you never open the app. Screen Time doesn't know you're paying for it. Only the cross-reference reveals the waste. Dollar amounts make it concrete and shareable.

### 2. The Interruption Cost Calculator
**Sources:** Screen Time + Notifications
**Insight:** "Telegram sent you 178 notifications for 11 minutes of actual use. Each notification costs 23 seconds of context-switch time. That's 68 minutes of invisible lost focus -- more than the app itself."
**Why it's killer:** Screen Time shows duration. Notification settings show volume. Nobody has ever seen the RATIO. The ratio reframes the problem: it's not about how long you use Telegram, it's about how many times Telegram interrupts you. This is the insight that makes people mute group chats on the spot.

### 3. The Free Time Autopsy
**Sources:** Screen Time + Calendar
**Insight:** "You had 3 free hours between meetings on Tuesday. You spent 2h10m on Instagram and Reddit. That's 4.3 hours/week of open time consumed by social media. You don't have a time problem -- you have a free-time problem."
**Why it's killer:** Calendar knows your schedule. Screen Time knows your usage. Neither knows what you do DURING your free blocks. This insight reframes "I don't have enough time" into "I have time, I just set it on fire." The specificity (which day, which gap, which apps) makes it undeniable.

### 4. The Recipe-to-Delivery Pipeline
**Sources:** Screen Time + Email (or Browser + Bank)
**Insight:** "You browsed recipe sites for 47 minutes this week, then opened Uber Eats within 30 minutes -- twice. You spent $47 on delivery after researching meals you never cooked."
**Why it's killer:** This exposes a behavioral loop nobody has language for. The intent (cooking) contradicts the action (ordering). The user feels it but has never seen it quantified. The fix is obvious and monetizable: a meal planner that converts browsed recipes into a grocery list.

### 5. The Productivity Theater Score
**Sources:** Screen Time + Calendar + Email
**Insight:** "You had 12 meetings this week (6.5 hours). They generated 34 follow-up emails (2.8 hours). Your longest uninterrupted focus block was 47 minutes. Deep work needs 2+ hours. Your calendar is optimized for appearing busy, not for getting things done."
**Why it's killer:** This combines three data streams that each tell a partial story. Meetings alone seem manageable. Email alone seems normal. Together they reveal that meetings + meeting email consume 9.3 hours (23% of a work week), and the fragmentation they cause destroys the remaining time. This is the insight that makes corporate professionals pay for Concierge.

---

## 5. Architecture Recommendation

**Decision: Unified pipeline with pluggable source processors.**

The architecture.md proposal is the right approach. Here's why, and what to lock in:

### Use the `SourceProcessor` registry pattern
Every data source implements the same interface: `validate -> extract -> normalize -> persist`. The route handler is a thin dispatcher. Adding a new source is one file, one registration call, zero new routes, zero new tables.

### Keep JSONB signals, not table-per-source
At PoC/early scale, `discovery_sources` with `source_type` discriminator and `signals` JSONB column is correct. No migrations per source. Schema flexibility during rapid iteration. Promote to typed columns only when query patterns demand it.

### Computed profiles, not materialized
`buildProfile()` reads all `discovery_sources` for a session and computes the aggregate. At current scale (< 10 sources per session), this is sub-millisecond. No cache invalidation problem. Add materialization later if needed.

### Rule-based first, AI for narrative only
The pattern detector library (10-15 detectors at launch) runs deterministically against the Activity Timeline. Zero AI cost for 90% of users. AI is invoked only for:
- Screen Time OCR ($0.002/image, Haiku)
- Multi-source narrative generation ($0.001, Haiku)
- Deep analysis on request ($0.008, Sonnet)
Target: $0.003/user for typical journey, $0.013 for power users.

### Retroactive enrichment is the key UX mechanic
When a user adds source N, reprocess sources 1 through N-1 with the new context. This is what makes each level feel more valuable than the sum of its parts. The buildProfile + generateInsights pipeline already supports this by design -- it always consumes ALL session signals.

### Client-side processing for sensitive data
Google Takeout and bank statements are parsed in the browser. The server receives only normalized Signal arrays. Raw screenshots are proxied to Claude API but never stored. This is the genuine privacy story, not theater.

### Do NOT build:
- No separate tables per data source
- No OAuth integrations (screenshots only for now)
- No real-time syncing or background polling
- No user accounts beyond email (session-based discovery)
- No separate API endpoints per source type

---

## 6. The "Holy Shit" Moment

For each data source, the ONE insight that makes users stop and think.

| Source | The "Holy Shit" Moment |
|--------|----------------------|
| **Screen Time** | "You pick up your phone 89 times a day but average 47 seconds per pickup. That's not using your phone -- that's your phone using you." |
| **Notifications** | "Telegram interrupted you 178 times for 11 minutes of actual use. That's one interruption every 5 minutes for something you barely read." |
| **Calendar** | "Your longest uninterrupted block this week was 47 minutes. Deep work needs 2 hours. Your schedule is structurally incompatible with focus." |
| **Subscriptions** | "You pay $127/month for 11 subscriptions. You actively use 4. The other 7 cost you $876/year to forget about." |
| **Email Inbox** | "You have 4,293 unread emails. 3,800 are in Promotions. You're subscribed to 60 newsletters you never read. Your inbox isn't a communication tool -- it's a marketing dump." |
| **Decision Fatigue Quiz** | "You spend 6.2 hours/week making decisions that don't matter. That's 13.4 full days per year choosing what to eat, what to watch, and what to wear." |
| **Sleep Procrastination Quiz** | "You sacrifice 620 hours of sleep per year to revenge bedtime procrastination. That's 26 full days of sleep you're trading for low-quality scrolling." |
| **Doomscroll Meter** | "Your gravity app is Instagram. You open it 23 times a day before you open anything else. It's the first thing you see after every unlock." |
| **Content Creation Ratio** | "Your social media ratio is 68:1. You consume 68 times more than you create. You have 847 unused photos on your phone -- 7 hours of content you never shared." |
| **Search History** | "You searched 'easy dinner recipes' 23 times this month. Each time you scroll, pick something, and forget it by next week. You don't need more recipes -- you need a meal planner that remembers." |
| **Battery Usage** | "Facebook uses 18% of your battery but you only spend 20 minutes in it. It's running in the background constantly -- tracking you while you think it's closed." |
| **Alarm Clock** | "You have 7 alarms between 6:30am and 7:15am. You're getting 45 minutes of fragmented, low-quality sleep every morning. You're not waking up -- you're being tortured awake in stages." |
| **Browser Tabs** | "You have 127 open tabs. 47 have been open for over a week. Those aren't tabs -- they're a to-do list disguised as a browser." |

---

## 7. Revenue Path

Each discovery source connects to payment through a clear, specific automation that solves the problem it revealed.

| Discovery Source | Free Value (Hook) | Starter ($) | Concierge ($$) |
|-----------------|-------------------|-------------|----------------|
| **Screen Time** | Your usage breakdown + top 3 insights | App-specific automation: social media time caps, doom scroll nudge, focus mode scheduler | Full digital audit + custom automation suite built for you |
| **Notifications** | Interruption count + cost calculation | Notification batching bot (daily digest instead of real-time), auto-mute rules | We audit your notification settings across all apps and configure optimal rules |
| **Calendar** | Free time analysis + meeting tax | Auto-decline meetings without agendas, focus block scheduler, calendar audit bot | We restructure your calendar, set up focus time, handle the "can you move this" emails |
| **Subscriptions** | Total waste number + zombie list | Auto-renewal reminders 3 days before charge, subscription tracker dashboard | We cancel the zombies for you, negotiate better rates, find free alternatives |
| **Email** | Inbox overwhelm score + sender analysis | Email triage bot: auto-label, auto-archive newsletters, VIP sender alerts | Full inbox zero setup + ongoing triage + unsubscribe blitz |
| **Decision Fatigue Quiz** | Your weekly decision hours lost | Meal planner, outfit rotator, "what to watch" picker -- all personalized | We build your entire decision-elimination system across food, clothing, entertainment |
| **Sleep Score** | Your revenge gap + yearly sleep debt | Wind-down automation: phone grayscale at 10pm, notification summary at 8am | Custom sleep hygiene program + phone lockdown + morning routine automation |
| **Doomscroll Meter** | Your gravity app + phantom check count | Phone unlock journal, app-specific time warnings, pickup nudges | Full digital minimalism program: home screen redesign, app audit, habit replacement |
| **Search History** | Your repeated searches + decision paralysis patterns | Auto-bookmark for repeated queries, price tracker for comparison shopping | Personal knowledge base that captures and organizes everything you Google |

### The Revenue Funnel

```
Free: "What's eating your week?" -> Screenshot -> X-Ray Report (shareable)
  |
  v  "Want to fix [top finding]?"
  |
Starter ($): One-click automation for the specific problem the X-Ray found
  |
  v  "Want us to handle everything?"
  |
Concierge ($$): White-glove service -- we audit, configure, and maintain all automations
```

**Key pricing insight:** The X-Ray report IS the sales pitch. Every finding has a dollar or time cost attached. The Starter CTA appears next to the finding: "This costs you $47/month. Fix it for $9/month." The sell is math, not marketing.

**The anchor:** "Google made ~$238 from your data last year. You're paying $47/month in zombie subscriptions. You lose 6.2 hours/week to decisions. Meldar costs $9/month and pays for itself in week one." The discovery data creates the price justification automatically.

---

## Executive Summary

**Build this week:**
1. Notification Count source processor (4h)
2. Subscriptions source processor (4h)
3. Decision Fatigue Calculator questionnaire (3h)
4. Sleep Procrastination Score questionnaire (2h)

**Architecture:** Unified SourceProcessor registry. One endpoint, discriminated by type. JSONB signals. Computed profiles. Rule-based insights with AI narrative at 3+ sources.

**Hero tagline:** "What's eating your week?"

**The moat:** Cross-source fusion + action. No single company controls all data sources. No Big Tech company will build a product that tells users to use their products less. Meldar is the neutral aggregator with no conflict of interest.

**Revenue logic:** Free X-Ray creates the price justification. Every finding has a cost. Every cost has a fix. Every fix has a price. The data sells the product.
