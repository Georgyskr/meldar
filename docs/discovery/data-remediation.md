# Data Remediation: Handling Messy, Incomplete, Real-World User Data

**Date:** 2026-03-30
**Focus:** Engineering strategies for extracting actionable data from non-technical users aged 18-28
**Depends on:** [product-manager.md](product-manager.md) (discovery mechanism design)

---

## The Problem Statement

Our users won't give us clean data. They'll give us vague chat answers, huge file dumps, blurry screenshots in different languages, empty calendars, and self-reported numbers that are wildly inaccurate. Every data pipeline we build must assume the input is messy, partial, contradictory, or missing entirely -- and still produce a useful automation suggestion.

This document covers five engineering challenges, a sixth question (what's the absolute minimum we need to be useful?), and -- most importantly -- the unfair shortcuts that let us skip most of this work.

---

## 0. The Unfair Shortcuts (Read This First)

**Founder directive:** We CAN ask users to install ONE thing, if it's surgical, one-click, and the reason is obvious. Design for the laziest possible path to the richest possible data. 80% of the insight from 20% of the effort.

The sections below (1-6) describe the "proper" way to handle each data source. This section describes the hacks that make most of that unnecessary.

### Shortcut 1: iOS Shortcuts Automation -- Screen Time Without Screenshots

**The hack:** Instead of asking users to screenshot Screen Time and us parsing it with expensive vision AI, build an iOS Shortcut that extracts Screen Time data programmatically and sends it to our API.

**How it works:**
- iOS Shortcuts app can access Screen Time data via the "Get Screen Time" actions (available since iOS 16.4+)
- We build a pre-made Shortcut that: reads daily app usage, pickups, and notifications -> formats as JSON -> sends a POST to our endpoint
- User installs it with ONE TAP from a shared iCloud link
- Set it to run daily via Personal Automation (trigger: time of day, e.g., midnight) -- zero ongoing effort

**What this replaces:** The entire Screen Time screenshot pipeline (Section 3). No vision API calls, no OCR, no language/version/cropping issues, no $0.01-0.03 per parse. Just clean structured data, daily, automatically.

**The install flow:**
```
Chat: "Want to see exactly where your time goes? Tap this link to add
       a one-time shortcut. It takes 5 seconds."
       [Add Shortcut]

-> User taps -> iOS Shortcuts opens -> "Add Shortcut" confirmation
-> Done. Data starts flowing at midnight.
```

**Why users will do this:**
- iOS Shortcuts is pre-installed on every iPhone. No App Store download.
- Adding a shortcut is a native iOS experience they've probably done before (Shazam, etc.)
- It's ONE tap, not a multi-step screenshot + upload flow
- Clear value exchange: "Add this, and tomorrow we'll show you where your time went"

**Limitations:**
- iOS only (Android users fall back to screenshot flow or Digital Wellbeing export)
- Requires iOS 16.4+ (covers ~90% of active iPhones as of 2026)
- User must approve the Shortcut's permissions on first run
- Apple could restrict Shortcuts Screen Time access in a future iOS update (low risk -- it's been stable for 2+ years)

**Effort to build:** 1-2 days (build the Shortcut, build the receiving API endpoint, test across iOS versions). Replaces weeks of vision parsing work.

**This is the single highest-value shortcut in this document.** It turns a fragile, expensive, manual process (screenshot -> upload -> vision parse) into a reliable, free, automated pipeline.

### Shortcut 2: "Share My Google" -- One OAuth Tap, Four Data Sources

**The hack:** Instead of guiding users through Google Takeout (hours of waiting, confusing UI, huge downloads), build a single Google OAuth scope that reads the 4 things we actually need via API.

**What we request in ONE consent screen:**
1. `https://www.googleapis.com/auth/calendar.readonly` -- Calendar events
2. `https://www.googleapis.com/auth/gmail.metadata` -- Email headers (sender, subject, timestamps -- NOT content)
3. `https://www.googleapis.com/auth/youtube.readonly` -- Watch/search history
4. `https://www.googleapis.com/auth/fitness.activity.read` -- Step count, sleep (if available)

**What this replaces:** The entire Google Takeout pipeline (Section 2). No 5-50GB downloads, no zip extraction, no format version drift, no upload limits. Real-time API access to exactly what we need.

**The flow:**
```
Chat: "Connect your Google account to unlock your full time profile.
       We only read metadata -- never email content, never files."
       [Connect Google]

-> Standard Google OAuth consent screen
-> User sees exactly what we're requesting
-> One tap -> done
```

**What we DON'T get vs Takeout:**
- Chrome browsing history (no API -- would need extension or Takeout)
- Google Search history (no API -- Takeout only)
- Google Maps location history (API deprecated in favor of Timeline, which is now on-device only)

**Is that worth it?** YES. Calendar + email metadata + YouTube already gives us:
- Daily schedule structure (calendar)
- Communication load and patterns (email metadata)
- Content consumption patterns and routines (YouTube)
- Basic health signal (Google Fit, if user has it)

Chrome history and search history are nice-to-have. They're NOT the 80% of insight. Calendar and email metadata ARE.

**Effort to build:** 3-5 days (OAuth integration, Google Cloud project setup, consent screen verification, data parsing). One-time setup, then it works for every user forever. No ongoing Takeout format maintenance.

**Important trade-off:** Google OAuth verification for sensitive scopes (gmail.metadata) requires Google security review, which can take 2-6 weeks. Start this process immediately -- it's the longest lead time item. For MVP, can use "testing" mode with up to 100 users while verification is pending.

### Shortcut 3: The One Extension That Does Everything (Chrome)

**The hack:** A lightweight Chrome extension that passively observes browsing patterns. This is the ONE install we ask for beyond the iOS Shortcut.

**What it captures:**
- Domain-level browsing time (not URLs, just "25 minutes on reddit.com, 18 minutes on mail.google.com")
- Tab-switching patterns (frequency = focus/distraction signal)
- Time-of-day patterns (when are they most active online?)
- SaaS tool usage (Notion, Sheets, Canva -- reveals workflows)

**What it explicitly does NOT capture:**
- Page content
- Form inputs
- Passwords
- Full URLs (just domains)
- Anything in incognito mode

**Why this is worth asking users to install:**
- Chrome extensions are ONE click from the Web Store
- It fills the biggest gap: desktop/laptop behavior. Screen Time only covers phone. Calendar only covers scheduled events. This covers the "dark matter" of how they spend time on a computer.
- Most 18-28 year olds already have 3-10 Chrome extensions installed. One more is nothing.

**The pitch:**
```
"Add our Chrome extension to see what you're spending time on
 at your computer. It only tracks which sites -- never what you do there."
 [Add to Chrome]
```

**Effort to build:** 3-5 days for a basic extension (content script that logs domain + active tab duration, background script that batches and sends to API). Publishing to Chrome Web Store takes 1-3 business days for review.

**MVP scope:** Domain-level time tracking only. No content analysis, no form detection, no screenshot capture. Keep it dead simple and privacy-respectable.

### Shortcut 4: Skip Takeout Entirely -- Piggyback on What's Already Shared

**The hack:** Users already share data publicly or semi-publicly. Before asking them to export anything, scrape what's already visible:

- **Spotify "Recently Played"** -- OAuth is one tap, reveals daily routine via listening patterns (morning playlist = commute, lo-fi beats = study, nothing = sleep)
- **Public social media** -- if they link their Instagram/TikTok, their posting frequency and timing reveals routine patterns
- **University portal** (if student archetype) -- many use common platforms (Canvas, Blackboard). One login captures grades, deadlines, assignments. This is the highest-pain data source for students and it's behind ONE password.

**The laziest version:** Spotify alone. One OAuth tap. It reveals:
- Wake-up time (first play)
- Commute (listening during transit hours)
- Work/study blocks (focus playlists or no music = meetings)
- Wind-down time (evening listening patterns)
- Sleep time (last play)

This is surprisingly close to what Screen Time tells us about routine structure, and it works across iOS AND Android.

### Shortcut 5: The "Screenshot Your Report" Viral Loop

**The hack:** Don't just USE screenshots as input -- make the OUTPUT screenshot-worthy. Design the personal report to be optimized for Instagram Stories / TikTok sharing.

This isn't a data collection shortcut -- it's a data VOLUME shortcut. If 10% of users share their report to Stories, and each share brings 2 new users, data collection scales itself. The more users, the better our archetype models, the less we need from each individual.

**Design constraints for shareability:**
- Report fits in a phone-screen-sized card (9:16 aspect ratio)
- Bold headline number: "You waste 2.1 hours/day on stuff AI could handle"
- Exactly 3 key insights (more is overwhelming, fewer feels thin)
- Personal but not embarrassing (show time on "social media" not "Instagram")
- Clear CTA for the viewer: "Find YOUR number at meldar.com"
- Watermark/branding subtle but present

### The Shortcut Stack: Priority Order

For a new user arriving from a TikTok ad on their iPhone:

```
Minute 0:    Chat (5 questions, 90 seconds, zero installs)
             -> Already enough for a basic suggestion

Minute 2:    "Add this Shortcut for your real Screen Time data"
             -> One tap. Data starts flowing tonight.

Minute 3:    "Connect Google for your full picture"
             -> One tap. Calendar + email metadata + YouTube.

Minute 5:    Personal report generated.
             -> Shareable card. Viral loop starts.

Day 1:       "Add our Chrome extension to see your laptop time too"
             -> One click. Desktop gap filled.

Day 3:       "Connect Spotify for routine insights"
             -> One tap. Sleep/commute/focus patterns.

NEVER:       Google Takeout. We don't need it anymore.
```

**Total installs asked: 2** (iOS Shortcut + Chrome extension). Both are one-tap. Both have clear value exchange. Both are things this demographic already does routinely.

**Total OAuth connections: 2** (Google + Spotify). Both are one-tap consent screens. Both request minimal scopes.

**What we SKIP entirely:**
- Google Takeout (replaced by OAuth API access)
- Screen Time screenshots (replaced by iOS Shortcut)
- Manual data entry of any kind
- Any desktop app install
- Any Android-specific tooling for MVP (fall back to screenshot flow)

### Effort/Value Matrix

| Shortcut | Effort | Value | Ratio | Priority |
|----------|--------|-------|-------|----------|
| iOS Shortcut (Screen Time) | 2 days | Replaces entire vision pipeline, daily automated data | **Extreme** | Week 1 |
| Google OAuth (Calendar + Email + YouTube) | 5 days | Replaces Takeout, real-time access, no format drift | **Extreme** | Week 1 (start OAuth verification immediately) |
| Shareable report card | 1 day | Viral loop = free user acquisition = more data | **High** | Week 1 |
| Chrome extension | 4 days | Fills desktop gap, captures the "dark matter" | **High** | Week 2 |
| Spotify OAuth | 1 day | Routine patterns from music, cross-platform | **Medium** | Week 2 |

---

## 1. Vague Questionnaire Responses

### The Problem

"I spend a lot of time on emails" is not actionable. We need: how many emails per day, what kind, what actions they take, how long each action takes, and which actions are automatable. But we can't ask all that directly -- the user will bail after question 2.

### The Decision Tree

The onboarding chat (5 questions, 90 seconds) is designed to be vague on purpose -- it builds trust and captures emotional pain points. But we need a second layer that extracts specifics without feeling like an interrogation.

**Layer 1: The Onboarding Chat (Day 0)**

Captures: emotional pain point, self-identified time waste category, archetype signal.

The 5 questions from the product-manager doc are intentionally open-ended. The AI's job here is CLASSIFICATION, not extraction. Map each answer to one of our ~30 validated use cases from the research synthesis.

```
User says: "I spend forever on emails"
System classifies: email_triage (confidence: 0.7)
Possible sub-categories: [inbox_zero, auto_reply, newsletter_filter, invoice_extraction]
```

**Layer 2: The Clarifying Fork (immediate follow-up, still in chat)**

After the 5 questions, the AI asks ONE targeted follow-up per identified pain point. This is where specificity comes from. The follow-up is chosen from a decision tree:

```
IF category == email_triage:
  ask: "When you say emails take a lot of time -- is it more about
        (a) sorting through junk to find what matters,
        (b) writing replies, or
        (c) something else?"

IF category == meal_planning:
  ask: "Is the hard part deciding WHAT to eat, or the shopping/cooking after?"

IF category == expense_tracking:
  ask: "Do you currently track expenses anywhere, or do you just check
        your bank app sometimes?"
```

Rules for clarifying questions:
- Maximum ONE follow-up per pain point
- Always offer 2-3 concrete options plus an open-ended escape ("or something else?")
- Options are phrased in the user's language, not ours
- Each option maps to a different automation template

**Layer 3: Passive Extraction from Natural Language**

The AI extracts implicit data from the user's phrasing without asking more questions:

| User says | System extracts |
|-----------|----------------|
| "every Monday" | frequency: weekly, day: Monday |
| "takes me like an hour" | estimated_duration: 60min (flag as self-reported) |
| "I have 3 email accounts" | account_count: 3, complexity: high |
| "my boss keeps asking for..." | trigger: external_person, urgency: high |
| "I always forget to..." | pattern: memory_failure, automation_type: reminder/auto-do |

This extraction runs on every message throughout the conversation, not just in response to specific questions. It accumulates a structured profile silently.

**Layer 4: Deferred Enrichment (Day 1-7)**

After the initial chat, send targeted micro-questions via email or push notification -- one per day, max. Each one looks like an insight, not a question:

> "You mentioned email takes a lot of your time. Fun fact: the average person your age gets 47 emails/day but only 11 need a response. Does that sound about right for you?"

The user's response (even "yeah, probably" or "way more than that") refines the model.

### Fallback: When Answers Are Truly Useless

If the user gives only single-word or nonsensical answers to all 5 questions, fall back to the archetype engine. Ask ONE binary question:

> "Are you a student, or working?"

This alone maps to a top-3 suggestion list from the research synthesis. A student gets: grade checker, meal planner, deadline tracker. A worker gets: email triage, expense sorter, meeting prep. It's generic, but it's not nothing.

### Data Quality Scoring

Every piece of user-reported data gets a confidence score:

| Source | Default Confidence |
|--------|--------------------|
| Specific number with context ("47 emails/day") | 0.8 |
| Vague quantifier ("a lot", "tons") | 0.3 |
| Multiple-choice selection | 0.7 |
| Implied from phrasing | 0.5 |
| Cross-referenced with actual data (Screen Time, Calendar) | 0.9 |
| Archetype average (no personal data) | 0.4 |

The report shows confidence implicitly: high-confidence estimates get specific numbers ("~45 min/day"), low-confidence estimates get ranges ("between 20 min and 1 hour/day").

---

## 2. Google Takeout: Handling 5-50GB Exports

> **Shortcut update:** Section 0's "Share My Google" OAuth shortcut replaces Takeout for Calendar, Email metadata, and YouTube. This section is now a FALLBACK for the two things OAuth can't get: Chrome browsing history and Google Search history. If those data sources prove unnecessary in MVP testing, this entire section can be deleted.

### The Problem

A full Google Takeout export includes Photos (often 20GB+), Drive files, Gmail (full MBOX), Maps timeline, YouTube history, Chrome bookmarks, and 70+ other products. We need maybe 1% of that. But we can't control what the user exports -- the Takeout UI is confusing and Google changes it periodically.

### Strategy: Guide First, Filter Second

**Option A: Guided Selective Export (preferred)**

Walk the user through exporting ONLY what we need. The guided flow shows screenshots of the Takeout UI with exactly which checkboxes to check/uncheck.

What we need from Takeout:
1. **My Activity** (search history, app usage, assistant queries) -- typically 10-50MB
2. **YouTube** (watch history, search history) -- typically 5-20MB
3. **Chrome** (browsing history, bookmarks) -- typically 1-10MB
4. **Maps** (location history, frequent places) -- typically 5-50MB
5. **Calendar** (better via OAuth, but Takeout works as fallback)

What we explicitly tell them to DESELECT:
- Google Photos (biggest culprit, often 10-40GB alone)
- Google Drive (large, mostly irrelevant)
- Gmail (MBOX files are huge and we only need metadata anyway)
- Keep, Contacts, Fit, Pay, and all other products

**Expected export size after guidance: 50-200MB** (vs 5-50GB unguided).

The guided flow:
```
Step 1: "Go to takeout.google.com"
Step 2: "Click 'Deselect all' first" (screenshot with arrow)
Step 3: "Now select ONLY these 4:" (screenshot with checkboxes highlighted)
Step 4: "Choose .zip format, single export, send via email"
Step 5: "You'll get an email in 10 minutes to a few hours. Upload the zip here when ready."
```

**Option B: Accept Full Dump, Filter Server-Side**

If the user ignores guidance and uploads a 30GB zip, we handle it:

1. **Stream-extract the zip** -- never load the full archive into memory
2. **Whitelist by path** -- only extract files matching our known-useful paths:
   ```
   Takeout/My Activity/**/*.json
   Takeout/YouTube and YouTube Music/history/*.json
   Takeout/Chrome/BrowserHistory.json
   Takeout/Location History (Timeline)/*.json
   Takeout/Calendar/**/*.ics
   ```
3. **Discard everything else immediately** -- don't store photos, drive files, etc.
4. **Enforce a hard upload limit** -- 500MB for web upload. If the file is larger, show a message: "Your export includes data we don't need (probably photos). Here's how to re-export with only what matters." Link back to guided flow.

### Processing Pipeline

```
Upload (zip)
  -> Stream extract (whitelist filter)
  -> Per-product parser:
     - My Activity: JSON array of {title, time, products, details}
     - YouTube: JSON array of {title, titleUrl, time}
     - Chrome: JSON with browser_history[{url, title, time_usec}]
     - Maps: JSON with timelineObjects[{placeVisit, activitySegment}]
  -> Normalize to unified timeline events
  -> Run pattern detection
  -> Store structured output only (delete raw files within 24h)
```

### Version Drift

Google changes Takeout format periodically. Defenses:

1. **Schema-tolerant parsing** -- use optional field access, never crash on missing keys
2. **Format version detection** -- check for known structural changes (Google added `activitySegment` to Maps in 2023, changed YouTube format in 2024)
3. **Graceful degradation** -- if a product's format is unrecognized, skip it and note "We couldn't read your YouTube history -- it may be in a newer format. We'll update soon."
4. **Automated regression tests** -- maintain a corpus of anonymized Takeout samples from different export dates

### Privacy

- Raw Takeout data is processed in a transient pipeline -- extracted, parsed, structured output saved, raw deleted within 24 hours
- We never store raw search queries or URLs. We store: categories, frequencies, time patterns
- Example: "User searched for flights 7 times in 14 days" is stored. "User searched for 'cheap flights to Barcelona'" is not
- GDPR Art. 17: user can request deletion of all derived data at any time

---

## 3. Screen Time Screenshot Parsing

> **Shortcut update:** Section 0's iOS Shortcuts automation replaces screenshot parsing for iOS 16.4+ users (~90% of active iPhones). This section is now an ANDROID FALLBACK and a fallback for older iOS devices. For Android: Digital Wellbeing has no automation equivalent to iOS Shortcuts, so screenshot + vision parsing remains the path. Consider deprioritizing Android screenshot parsing for MVP and serving Android users with chat-only + Google OAuth data.

### The Problem

iOS Screen Time screenshots vary by:
- **iOS version** (layouts changed in iOS 15, 16, 17, 18)
- **Language** (our initial audience is global -- Finnish, English, Spanish, Arabic, etc.)
- **View mode** (daily vs weekly, "show more" expanded or collapsed)
- **Device** (different screen sizes, dark mode vs light mode)
- **User cropping** (some will screenshot just the chart, some the whole page, some will take a photo of their screen with another phone)

### Strategy: Vision LLM, Not Traditional OCR

Traditional OCR + layout heuristics would require maintaining templates for every iOS version x language combination. Instead, use a vision-capable LLM (Claude with vision) to interpret screenshots semantically.

**Prompt strategy:**

```
Analyze this iOS Screen Time screenshot. Extract:
1. Time period shown (today, this week, or specific date range)
2. Total screen time for the period
3. Top apps with their usage time, listed in order
4. Number of pickups if visible
5. Number of notifications if visible

Return structured JSON. If any field is unclear or partially obscured,
set it to null with a "confidence" field explaining why.

Handle: any iOS version (15-18+), any language, daily or weekly view,
dark or light mode, partial screenshots.
```

**Why this works better than OCR:**
- Handles layout variations without templates
- Reads any language without locale-specific config
- Understands context ("3h 22m" next to an app icon means usage time)
- Handles partial/cropped images gracefully
- Can identify and flag photos-of-screens vs actual screenshots

**Expected output:**

```json
{
  "period": "2026-03-29",
  "period_type": "daily",
  "total_screen_time_minutes": 312,
  "apps": [
    {"name": "Instagram", "minutes": 87, "confidence": 0.95},
    {"name": "WhatsApp", "minutes": 54, "confidence": 0.95},
    {"name": "Safari", "minutes": 41, "confidence": 0.90},
    {"name": "TikTok", "minutes": 38, "confidence": 0.85},
    {"name": "Mail", "minutes": 22, "confidence": 0.90}
  ],
  "pickups": 67,
  "notifications": 142,
  "parse_warnings": []
}
```

### Robustness Tiers

**Tier 1: Clean screenshot (90% of cases)**
- Standard iOS Screen Time page, proper screenshot, one of the supported iOS versions
- Expected accuracy: >95% on app names, >90% on times

**Tier 2: Degraded input (8% of cases)**
- Cropped image, partial data visible, unusual language, older iOS version
- Strategy: extract what's visible, mark missing fields as null, ask user to retake if critical data is missing
- "We could read 3 of your top apps but the image was cut off. Can you take a full screenshot?"

**Tier 3: Unusable input (2% of cases)**
- Photo of screen (moiré patterns, glare, angle), completely wrong screenshot (not Screen Time), image is a meme
- Strategy: detect and reject gracefully
- "This doesn't look like a Screen Time screenshot. Here's exactly how to find it: Settings > Screen Time > See All Activity"

### Validation Heuristics

After parsing, sanity-check the data:
- Total screen time should be 0-24 hours (flag if >18h or <30min)
- Individual app times should sum to approximately the total (within 20%)
- App names should match known apps (flag unknown names for manual review or re-parse)
- If the same user uploads daily and weekly screenshots, cross-validate

### Multi-Screenshot Aggregation

Users may upload multiple screenshots over days/weeks. Merge logic:
- Deduplicate by date (if two screenshots cover the same day, keep the one with more data)
- Build a longitudinal profile: "This user averages 5.2h/day, mostly Instagram (1.5h) and WhatsApp (0.8h)"
- Detect trends: "Your TikTok usage increased 40% this week vs last week"

### Cost Control

Vision API calls are expensive. Mitigations:
- Cache parsed results -- never re-parse the same image
- Resize images to max 1024px before sending (Screen Time data is text-heavy, doesn't need 4K)
- Batch multiple screenshots in a single API call if the model supports it
- For MVP: budget ~$0.01-0.03 per screenshot parse. At 10K users uploading 2 screenshots each, that's $200-600

---

## 4. Sparse Calendar Data

### The Problem

Many 18-28 year olds don't use a digital calendar at all. Those who do often only track some things -- classes and work shifts, but not meals, exercise, commute, or social plans. A calendar with 3 events per week tells us almost nothing by itself.

### Strategy: Calendar as Skeleton, Not Source of Truth

The calendar isn't our primary data source -- it's a structural overlay that gives shape to data from other sources.

**What sparse calendar data CAN tell us:**

| Calendar state | What we infer |
|---------------|---------------|
| Completely empty | User doesn't calendar-manage. Fall back entirely to chat + Screen Time |
| Only classes/work shifts | We know their FIXED commitments. Everything else is discretionary time we can help with |
| Meetings with others | Social/work obligations. Density = busyness signal |
| Recurring events | Structure. These are the anchors of their routine |
| Gaps between events | Potential automation windows ("You have 90 free minutes between your 2pm and 5pm classes every Tuesday") |
| All-day events | Deadlines, trips, exams -- high-stress markers |

**What sparse calendar data CANNOT tell us (and what fills the gap):**

| Missing data | Compensating source |
|-------------|---------------------|
| What they do in free time | Screen Time data |
| How long tasks actually take | Self-report + Screen Time patterns |
| Commute time | Google Maps history (Takeout) or ask in chat |
| Sleep schedule | Screen Time first/last pickup times |
| Meal times | Inferred from Screen Time gaps + food delivery app usage |

### The "Time Budget" Model

Even with sparse calendar data, we can construct a useful time budget:

```
24 hours in a day
  - Sleep: inferred from Screen Time (last pickup to first pickup)
  - Fixed commitments: from calendar events
  - Phone time: from Screen Time total
  - = Remaining "untracked" hours

Example for a student:
  Sleep: 7h (Screen Time: last pickup 1:15am, first 8:20am)
  Classes: 4h (Calendar: 3 lectures)
  Phone: 5.2h (Screen Time total)
  Untracked: 7.8h

The 7.8h untracked hours are where the biggest automation opportunities live.
"You have about 8 hours of unstructured time on class days.
 What fills that time?"
```

This is a MUCH more useful question than "what does your day look like?" because it's grounded in real numbers.

### Zero-Calendar Fallback

If the user has no calendar data at all (or declines to connect), we still function. The onboarding chat becomes the primary structure source:

> "Walk me through a typical Tuesday. What's the first thing you do when you wake up?"

The AI builds a rough schedule from the narrative and shows it back:

> "So your Tuesday looks roughly like this:
> 8:30 - Wake up, phone for 30 min
> 9:00 - Get ready, commute
> 10:00-2:00 - Classes
> 2:00-3:00 - Lunch (this is where you said you waste time deciding what to eat)
> 3:00-6:00 - Library/studying
> 6:00 onwards - Free time
>
> Does that sound right?"

Showing the schedule back achieves two things: validates our understanding, and creates the "Screen Time shock" moment ("wow, I really do waste that lunch hour every day").

### Calendar Enhancement Suggestions

Once we have calendar data (even sparse), we can suggest calendar-based automations:

- "You have 'Team Meeting' every Wednesday at 2pm but no prep time blocked. Want an AI that sends you an agenda at 1:30pm?"
- "You have 3 back-to-back classes Monday. Want a summary of all due assignments texted to you Sunday night?"
- "Your calendar shows nothing on weekends but Screen Time shows 7h+ phone usage. Want a weekend planner?"

---

## 5. Self-Report vs Reality: Cross-Referencing Data

### The Problem

Self-reported data is systematically biased:
- **Social media:** underreported by 2-4x (people say 30min, reality is 2h)
- **Productive activities:** overreported by 1.5-2x ("I study for 4 hours" = 2 hours studying, 2 hours on phone)
- **Email/messaging:** depends on whether they count passive checking (they don't, but it's most of the time)
- **Exercise:** overreported ("I go to the gym 4 times a week" = 2 times, sometimes)
- **Sleep:** overreported by ~45 minutes on average

This isn't lying -- it's genuine self-perception error. But it means self-reported data alone produces garbage suggestions.

### The Reconciliation Framework

When we have both self-reported and actual data for the same category, use this hierarchy:

```
Priority 1: Measured data (Screen Time, Calendar events, Takeout history)
Priority 2: Measured data from a proxy (e.g., food delivery app usage as proxy for meal planning time)
Priority 3: Self-reported data adjusted by known bias factors
Priority 4: Raw self-reported data (only if nothing else available)
```

### Specific Cross-Reference Strategies

**Social Media: Self-Report vs Screen Time**

```
User says: "I spend about 30 minutes on Instagram"
Screen Time shows: Instagram 1h 47m

Resolution: Use Screen Time number. But DON'T say "you're wrong."
Instead, frame it as discovery:

"Your Screen Time shows Instagram at 1h 47m yesterday.
 Most of that is probably quick checks that don't feel like 'spending time'
 -- but they add up to almost 2 hours.
 Want to see what you could do with that time?"
```

The framing matters enormously. "You lied" kills trust. "Here's something surprising" creates the aha moment.

**Email/Messaging: Self-Report vs Observable Behavior**

Email time is hard to measure from Screen Time alone (Mail app usage doesn't capture time spent reading/composing). Cross-reference:

| Data point | Source |
|-----------|--------|
| Mail app usage | Screen Time |
| Gmail web time | Chrome history (Takeout) |
| Email volume | Email metadata (if OAuth'd) |
| Self-reported time | Chat |

Synthesize: "You said email takes about an hour. Your Mail app shows 22 minutes, but you also spent 35 minutes on Gmail in Chrome. Plus quick phone checks -- probably close to 1.5 hours total across devices."

**Productivity vs Actual Focus**

This is the hardest to measure. A user says "I study for 4 hours" but their Screen Time during "study time" shows constant app-switching.

If we have Screen Time data by hour (from a detailed screenshot or multiple screenshots):
- Look at the hours they claim to be productive
- Compare app usage during those hours vs their "free time" hours
- If the pattern is similar, their "productive" time has significant phone interruption

Frame as helpful, not accusatory:
> "During your study hours (2-6pm), you're still picking up your phone about 15 times. Each pickup averages 3 minutes -- that's 45 minutes of interruptions. Want a focus mode that auto-replies to messages during study time?"

**Exercise and Health: Self-Report vs Activity Data**

If available (Apple Health, Strava, etc. -- Tier 2 data source, not MVP):
- Cross-reference claimed gym visits with location data or workout logs
- Cross-reference claimed sleep with Screen Time first/last pickup

For MVP without health data:
- Use Screen Time as a sleep proxy (surprisingly accurate -- most people check their phone within 10 minutes of waking and within 20 minutes of trying to sleep)
- Don't challenge exercise claims directly. Instead: "You mentioned you work out 4 times a week. Want a reminder system that helps you hit that consistently?"

### The Bias Adjustment Table

When we only have self-reported data and no cross-reference, apply known correction factors:

| Category | Self-Report Bias | Adjustment |
|----------|-----------------|------------|
| Social media time | -60% to -75% (major underreport) | Multiply by 2.5x |
| "Productive" time | +30% to +50% (overreport) | Multiply by 0.7x |
| Email/messaging | -20% to -40% (moderate underreport) | Multiply by 1.5x |
| Commute time | Roughly accurate | Use as-is |
| Cooking/meal prep | Roughly accurate | Use as-is |
| Decision-making time | -80% (severely underreported -- people don't notice it) | Multiply by 3x |
| Exercise | +30% to +50% (overreport frequency) | Multiply by 0.65x |
| Sleep | +10% to +15% | Subtract 45min |

These are population-level averages from time-use research. They're wrong for any individual, but they're less wrong than raw self-report.

### The Diplomatic Reveal

When we find a large discrepancy, the reveal must be:
1. **Surprising** -- "Here's something you might not know about your day"
2. **Non-judgmental** -- "This is normal. 80% of people underestimate their phone time."
3. **Actionable** -- "Here's what you could do with that time if you wanted to"
4. **Optional** -- "This is just data. You decide what to do with it."

Never:
- "You said X but actually Y" (accusatory)
- "You're wasting N hours" (judgmental)
- "You should stop doing X" (preachy)

Always:
- "Your phone says X. That surprised a lot of our users too."
- "That's about N hours a week -- enough to [aspirational thing the user mentioned wanting to do]."
- "Want us to build something that helps with this, or is this one you're okay with?"

---

## 6. The Minimum Viable Data Point

### The Question

What's the LEAST amount of information we need from a user to give them ONE useful automation suggestion?

### The Answer: One Sentence

A single sentence is enough IF it contains a pain point we recognize.

**Example inputs and what we can suggest:**

| User input | Detected pattern | Suggestion |
|-----------|-----------------|------------|
| "I hate deciding what to eat" | meal_decision_fatigue | Meal planner: tell it your preferences, get a weekly plan every Sunday |
| "I check my grades constantly" | polling_anxiety | Grade checker: get a text the moment a grade is posted |
| "Invoices are killing me" | invoice_management | Invoice tracker: auto-remind clients at day 7, 14, 30 |
| "I spend too long on my phone" | screen_time_awareness | Daily digest: your phone time yesterday + one thing to try today |
| "I never know what to watch" | decision_fatigue_entertainment | Watchlist curator: tell it what you liked, get one perfect pick per night |
| "I forget to drink water" | habit_tracking | Hydration nudge: gentle reminders adapted to your schedule |

Each of these maps to a pre-built automation template from our research synthesis. The suggestion doesn't require ANY quantitative data -- just pain-point recognition.

### The One-Sentence Pipeline

```
User input (natural language)
  -> Pain point classification (LLM, maps to ~30 known categories)
  -> Archetype detection (student? freelancer? parent? from context clues)
  -> Template selection (best-fit automation from category x archetype matrix)
  -> Personalized pitch (uses their exact words back to them)
```

**Example flow:**

```
User: "I spend like an hour every morning just going through emails"

Classification: email_triage (confidence: 0.9)
Sub-signal: morning_routine, time_estimate_60min
Archetype: unclear (need more context, but doesn't block suggestion)

Suggestion: "An hour every morning on email -- that's 7+ hours a week.
What if an AI pre-sorted your inbox overnight so you woke up to only
the 5 emails that actually need you? The rest get auto-labeled and
archived. Most users cut their morning email from 60 minutes to 15."
```

This works with ZERO data connections, ZERO screenshots, ZERO OAuth. Just one sentence from the user and our knowledge of common pain points.

### Minimum Data for BETTER Suggestions

The one-sentence baseline gives a generic (but relevant) suggestion. Each additional data point sharpens it:

| Additional data | How it improves the suggestion |
|----------------|-------------------------------|
| + Archetype (student/worker/freelancer) | Narrows template selection. Student email triage is different from freelancer email triage |
| + Screen Time screenshot | Quantifies the problem with real numbers. "You said an hour -- Screen Time shows 47 minutes in Mail plus 23 minutes in Gmail" |
| + Calendar | Identifies WHEN to deploy the automation. "Your first meeting is at 10am. The AI runs at 7am so your inbox is ready by 8" |
| + Google Takeout (search history) | Reveals related patterns. "You also searched 'unsubscribe from newsletters' 4 times this month -- want the AI to handle that too?" |
| + One week of usage | Trend data. "Your worst email day is Monday (73 minutes). The AI could pre-sort Sunday night" |

Each layer is optional. The product works at every level. It just gets better with more data.

### The Confidence-to-Specificity Mapping

| Data available | Confidence | What we show |
|---------------|------------|-------------|
| One sentence only | Low | Category-level suggestion with population statistics ("most people your age...") |
| Sentence + archetype | Medium | Archetype-specific suggestion with relevant examples |
| Sentence + Screen Time | High | Quantified suggestion with their real numbers |
| Sentence + Screen Time + Calendar | Very high | Time-specific, schedule-aware suggestion |
| All data sources | Maximum | Fully personalized, cross-referenced, validated suggestion |

The key insight: **we never gate the product on data availability.** Every user gets a suggestion. Data just makes the suggestion better.

---

## Implementation Priority for MVP (2-Week Build)

**Philosophy change:** Build the shortcuts first. The "proper" pipelines (Takeout processing, vision parsing) are fallbacks, not primaries.

### Week 1 (Must-have -- the unfair advantages)

1. **Chat classification pipeline** -- Map natural language to pain-point categories. Use Claude API with a structured output schema. Test against 200+ sample inputs from research synthesis.
2. **Archetype detection** -- 4 archetypes (student, worker, freelancer, parent) from first 2 chat messages. Simple classifier, doesn't need to be perfect.
3. **Template suggestion engine** -- 10 pre-written automation templates covering Tier 1 use cases. Each template has variants per archetype.
4. **iOS Shortcut for Screen Time** -- Build the Shortcut, build the receiving API endpoint, test across iOS 16.4-18+. This replaces the entire vision parsing pipeline. (2 days)
5. **Start Google OAuth verification process** -- Submit the Google Cloud app for sensitive scope verification. This has a 2-6 week lead time, so START NOW even though the integration isn't built yet. Use testing mode (100 users) for MVP while verification is pending.
6. **Shareable report card** -- Design the 9:16 card format. Render server-side. Include share-to-Stories deep link. (1 day)

### Week 2 (Should-have -- filling gaps)

7. **Google OAuth integration** -- Calendar + email metadata + YouTube. Single consent screen. Parse into time-budget model. (3-5 days)
8. **Chrome extension (basic)** -- Domain-level time tracking only. No content analysis. Batch upload to API. Publish to Chrome Web Store. (3-4 days)
9. **Cross-reference engine** -- When iOS Shortcut data and self-report overlap, compute discrepancy and generate diplomatic reveal copy.
10. **Spotify OAuth** -- Quick win, one-tap, reveals routine structure. (1 day)

### Deferred (fallbacks, not primaries)

- Screen Time vision parser (only needed for Android users and older iOS)
- Google Takeout processing pipeline (only needed if OAuth doesn't cover enough data)
- Multi-screenshot aggregation (superseded by daily iOS Shortcut data)
- Bias adjustment table integration (can hardcode population averages for now)
- Android Digital Wellbeing parsing (lower priority -- our primary audience skews iPhone)
- Confidence scoring system (nice-to-have, the shortcuts give high-confidence data by default)

---

## Open Questions

1. **iOS Shortcut reliability.** Can the iOS Shortcut's "Get Screen Time" action reliably extract per-app usage data across all iOS 16.4+ versions? Need to prototype and test on real devices. If Apple restricts this in a future iOS update, we fall back to screenshot parsing (Section 3 still exists for this reason).

2. **Google OAuth verification timeline.** Sensitive scopes (gmail.metadata) require Google security review. Estimated 2-6 weeks. Can we launch MVP with testing mode (100 users) while this is pending? What if Google rejects the scope request?

3. **Chrome extension store review.** Chrome Web Store reviews take 1-3 business days but can be delayed by Manifest V3 policy changes. Do we have a backup distribution path (direct CRX download) for beta users?

4. **Spotify as primary routine signal.** How many of our target demographic (18-28) use Spotify vs Apple Music vs YouTube Music? If Spotify covers <60%, do we need Apple Music MusicKit integration too?

5. **Android gap.** The shortcut stack is heavily iOS-biased (iOS Shortcut is the centerpiece). What's the Android equivalent? Options: (a) Tasker automation (too technical), (b) Android Digital Wellbeing screenshot + vision parse (Section 3 fallback), (c) build a minimal Android app. Which is the least-effort path to parity?

6. **Legal: storing adjusted self-report data.** If a user says "30 minutes" and we store "estimated: 75 minutes (adjusted)", is the adjusted figure considered derived personal data under GDPR? Likely yes -- needs DPA review.

7. **Extension privacy review.** The Chrome extension collects domain-level browsing data. This likely triggers Chrome Web Store's "privacy practices" review and may require a privacy policy. How does this interact with our GDPR-native positioning?

8. ~~**Vision API cost at scale.**~~ Mostly resolved by iOS Shortcut. Only relevant for Android fallback path.

9. ~~**Takeout processing latency.**~~ Mostly resolved by Google OAuth. Takeout is now a deferred fallback, not a primary path.
