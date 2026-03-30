# AI Engineer Assessment: Data Sources for Automation Discovery

## Evaluation Criteria

For each source: **technical feasibility** (can we build it?), **data richness** (what patterns emerge?), **privacy implications** (how scary is it?), **user friction** (how many steps to connect?).

---

## 1. Apple Screen Time / Google Digital Wellbeing

### Apple Screen Time

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **Very low.** Apple's Screen Time APIs (FamilyControls, ManagedSettings, DeviceActivity) are designed for parental controls, not data export. The DeviceActivityReportExtension is intentionally sandboxed -- data cannot leave the extension. There is no public API to read per-app usage durations. The Family Controls entitlement requires Apple approval, which is slow and often rejected for non-parental-control use cases. No web API exists. |
| Data richness | High if we could access it: per-app time, pickup frequency, notification counts, time-of-day patterns. |
| Privacy | Moderate -- users already see this data, so it feels "owned." |
| User friction | **Impossibly high.** No export button. No API. Would require building a native iOS app with a restricted entitlement. |

### Google Digital Wellbeing (Android)

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **Very low.** No public API. The only extraction path is `adb shell dumpsys usagestats`, which requires a computer, USB debugging enabled, and developer mode -- all non-starters for non-technical users. Samsung devices block backup extraction entirely. |
| Data richness | Similar to Apple: app usage durations, unlock counts, notification volume. |
| Privacy | Same as Apple -- feels like user's own data. |
| User friction | **Impossibly high** for the target audience. |

**Verdict: REJECT.** Both platforms have deliberately locked this data down. No viable path for non-technical users.

---

## 2. Google Takeout

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **High.** User downloads a .zip from takeout.google.com. We parse it server-side. Well-documented JSON/HTML formats. Mature tooling exists (e.g., `browserexport` for history). No API needed -- it's a file upload. |
| Data richness | **Extremely high.** 54+ data sources including: |
| | - **Chrome browsing history**: URLs, titles, timestamps, visit counts |
| | - **Google Search history**: every query with timestamps |
| | - **YouTube watch history**: videos watched, search queries |
| | - **Location history**: GPS coordinates over time (if enabled) |
| | - **Gmail**: full emails (can be filtered to metadata) |
| | - **Google Maps**: places visited, directions searched |
| | - **Google Calendar**: events, attendees |
| | - **Google Keep**: notes and to-dos |
| | - **Fitbit/health data** (newer addition, 2025) |
| | - **Android app usage** (partial, via My Activity) |
| Privacy | **High concern.** This is a comprehensive digital footprint. Users will hesitate to upload this much data. Must be very transparent about what we access and what we discard. Consider client-side processing. |
| User friction | **Moderate.** 5-7 clicks to initiate. Export takes minutes to hours depending on data size. User must download the .zip and re-upload it. Not real-time -- it's a snapshot. |

### What Patterns We Can Extract

From Chrome + Search history alone:
- **Repetitive site visits**: "User visits Jira 47 times/day" -> suggest automation
- **Search-then-action loops**: "User searches 'currency converter' 3x/week" -> suggest a widget
- **Tool-switching patterns**: "User alternates between Sheets and Salesforce" -> suggest integration
- **Time-of-day habits**: "User checks news sites at 9am, social media at 6pm"
- **Content consumption patterns**: YouTube categories, frequency

From Location + Calendar:
- **Commute patterns**: suggest commute-time automations
- **Meeting density**: suggest scheduling tools

**Verdict: TOP TIER.** Richest data source. Main risk is user reluctance to upload such comprehensive data.

---

## 3. Meta/Instagram Data Export

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **High.** User requests data download from Instagram/Facebook settings. Arrives as .zip with JSON files. Straightforward to parse. |
| Data richness | **Low for automation discovery.** Contains: followers/following, DMs, comments, likes, search history, ad interactions, login activity. Most of this is social graph data, not workflow data. |
| | Potentially useful: **ad interaction patterns** (what products/services they engage with), **time-of-day posting patterns**, **search history** within Instagram. |
| Privacy | **Very high concern.** DMs and social data feel deeply personal. Users will be uncomfortable sharing this. |
| User friction | **Moderate.** Similar to Takeout: settings -> request download -> wait (up to 14 days, usually hours) -> upload. |

### Automation Signals

Limited to:
- "You spend X hours/week on Instagram" (but we can't see this without Screen Time)
- "You interact with shopping posts frequently" -> suggest price tracking
- "You message the same 5 people daily" -> suggest group chat or shared tool

**Verdict: LOW VALUE.** Too social, not enough workflow signal. Skip for MVP.

---

## 4. Calendar (Google Calendar / Apple Calendar)

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **Very high.** Google Calendar has a mature REST API with OAuth 2.0. Well-documented, generous rate limits (1M requests/day, 250/user/100s). Apple Calendar via CalDAV is also possible but less common. |
| Data richness | **Moderate, but focused.** Events, attendees, durations, recurrence rules, free/busy blocks. |
| Privacy | **Low concern.** Calendar data feels professional, not personal. Users are comfortable sharing this. |
| User friction | **Very low.** Standard OAuth flow: click "Connect Google Calendar" -> authorize -> done. 2 clicks. Real-time access (not a snapshot). |

### Automation Signals

- **Meeting overload**: "You have 28 hours of meetings/week" -> suggest meeting audit
- **Prep gaps**: "You have 12 back-to-back meetings with no prep time" -> suggest buffer automation
- **Recurring patterns**: "You have a weekly 1:1 with 6 people" -> suggest consolidated scheduling
- **Free time blocks**: identify when automations could run
- **Travel time**: gaps between meetings at different locations
- **Meeting type classification**: by attendee count, duration, recurrence -> distinguish 1:1s, standups, all-hands

**Verdict: TOP TIER for MVP.** Easy to connect, low privacy friction, actionable insights. Best starting point.

---

## 5. Email Metadata (Gmail API)

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **Medium.** Gmail API exists and is mature. BUT: even the `gmail.metadata` scope is classified as **restricted** by Google. This requires: (1) OAuth app verification, (2) third-party security assessment (annual), (3) review process taking weeks. This is a significant business overhead. |
| Data richness | **High.** Without reading email content, metadata alone reveals: sender/recipient frequency, response times, volume patterns by hour/day, thread lengths, label usage. |
| Privacy | **Moderate-to-high.** "We only read metadata, not content" is a hard sell. Users see "Gmail access" and get nervous regardless of scope. |
| User friction | **Low for user** (OAuth click), **high for us** (restricted scope verification, annual security audit). |

### Automation Signals

- **Newsletter overload**: "You receive 47 newsletters/week, open 3" -> suggest unsubscribe
- **Response patterns**: "You take avg 4 hours to respond to X" -> suggest priority inbox rules
- **Sender clustering**: "80% of your email is from 12 senders" -> suggest filters
- **Volume patterns**: "You get 150 emails/day, peak at 2pm" -> suggest batch processing
- **Follow-up gaps**: threads where you're the last responder and no reply came

**Verdict: HIGH VALUE but HIGH COST.** The restricted scope verification is a real barrier. Consider deferring to v2, or using Google Takeout for a one-shot email metadata analysis instead.

---

## 6. Phone Screenshots / Screen Recordings

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **High.** Vision models (Claude Sonnet, GPT-4o) can analyze screenshots with high accuracy. Cost is ~$0.002-0.005 per screenshot. A 5-minute screen recording at 1 fps = 300 frames, costing ~$0.60-1.50 to analyze. Processing a recording requires frame extraction (ffmpeg) server-side. |
| Data richness | **Very high for workflow analysis.** Vision AI can identify: which apps are open, what the user is doing, navigation patterns, data entry sequences, copy-paste workflows, tab-switching patterns. |
| Privacy | **Extremely high concern.** Screenshots capture everything: passwords, personal messages, financial data, private content. Even if we process and discard, the upload itself is terrifying. |
| User friction | **Moderate.** Recording screen is easy (built into iOS/Android/Mac/Windows). Uploading a video file is straightforward. But the privacy hesitation creates high *psychological* friction. |

### Automation Signals

The richest possible source. Vision AI could identify:
- "User copies data from App A, pastes into App B" -> suggest integration
- "User fills out the same form fields repeatedly" -> suggest auto-fill
- "User switches between 4 tabs in a pattern" -> suggest workflow tool
- "User manually updates a spreadsheet from an email" -> suggest automation

### Technical Implementation

```
1. User records 5-min screen recording
2. Upload to our server (or process client-side with WASM)
3. Extract frames at 1fps with ffmpeg
4. Deduplicate similar frames (perceptual hash)
5. Send unique frames to vision model
6. Model identifies: app names, actions, data flows
7. Aggregate into workflow patterns
8. Generate automation suggestions
```

**Verdict: HIGHEST SIGNAL but HARDEST TRUST.** The privacy barrier is the biggest obstacle. Could work as an opt-in "power user" feature with very strong trust signals (client-side processing, immediate deletion guarantees).

---

## 7. Questionnaire + LLM

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **Trivially high.** No APIs, no integrations, no data connections. User types text, LLM processes it. Can ship in a day. |
| Data richness | **Depends entirely on user's self-awareness.** Users are notoriously bad at describing their own workflows. They'll say "I check email" not "I spend 45 minutes triaging 150 emails, manually forwarding 12 to my team, and copying 5 action items into Asana." |
| Privacy | **Lowest possible.** User chooses exactly what to share. No data access whatsoever. |
| User friction | **Very low.** Open text box, describe your day. No accounts, no downloads. |

### How to Make This Work

The LLM needs to be an **active interviewer**, not a passive form:

```
Round 1: "Walk me through a typical workday, from when you start to when you stop."
Round 2: "You mentioned checking email -- how many emails do you get? What do you do with them?"
Round 3: "You said you update a spreadsheet -- where does that data come from? Where does it go?"
Round 4: "What tasks do you dread or find tedious?"
Round 5: "Show me the tools you use" (screenshots of app list / browser bookmarks)
```

This conversational approach compensates for users' inability to self-report accurately.

### Automation Signals

Quality depends on interview depth:
- **Explicit pain points**: "I hate manually entering data" -> direct automation target
- **Tool ecosystem**: "I use Slack, Jira, and Google Sheets" -> suggest integrations between them
- **Time allocation**: "I spend 2 hours on reports" -> suggest report automation
- **Repetitive tasks**: "Every Monday I..." -> suggest scheduled automation

**Verdict: BEST MVP STARTING POINT.** Zero friction, zero privacy concern, ships fast. Accuracy is lower but it's the perfect entry point that builds trust for deeper analysis later.

---

## 8. Browser History Export

| Dimension | Assessment |
|-----------|------------|
| Technical feasibility | **High.** Two paths: (a) Google Takeout includes Chrome history as JSON -- already covered above. (b) Direct SQLite file from Chrome profile at `~/Library/Application Support/Google/Chrome/Default/History`. User can export or use tools like `browserexport`. |
| Data richness | **High for web-based workflows.** URLs, titles, timestamps, visit counts, visit durations, typed URLs vs. clicked links. |
| Privacy | **Moderate.** Browser history is sensitive (health searches, personal browsing) but less scary than email or screenshots. |
| User friction | **Moderate.** Exporting the SQLite file is technical. Google Takeout path is easier but slower. Could provide a simple download instruction or a bookmarklet. |

### Automation Signals

- **Most-visited sites**: reveals primary tools and workflows
- **Site-switching patterns**: A->B->A->B suggests manual data transfer
- **Search frequency**: repeated searches = unresolved needs
- **Time-on-site patterns**: where time is actually spent vs. perceived

**Verdict: HIGH VALUE, covered by Google Takeout.** No need for a separate integration -- Takeout already includes this. For users who don't want full Takeout, could offer a lighter "export just your history" option.

---

## Top 3 Most Viable Approaches

### Tier 1: Questionnaire + LLM (MVP, Ship First)

| Aspect | Detail |
|--------|--------|
| **MVP build time** | 1-2 weeks |
| **Accuracy** | 40-60% (depends on user's self-reporting quality) |
| **User experience** | Conversational onboarding. User describes their day in 5-10 minutes. LLM asks follow-up questions. Generates personalized automation suggestions within minutes. |
| **Why first** | Zero integration needed. Zero privacy concern. Establishes the product's value proposition immediately. Every user goes through this regardless of what other sources they connect later. |
| **Technical stack** | LLM API (Claude/GPT-4), structured prompt chain (5-7 rounds of interview), suggestion template engine. |
| **Key risk** | Users give surface-level answers. Mitigate with smart follow-up questions and optional screenshots of their app list. |

### Tier 2: Google Calendar (OAuth, Ship Second)

| Aspect | Detail |
|--------|--------|
| **MVP build time** | 2-3 weeks |
| **Accuracy** | 70-85% for time/meeting patterns |
| **User experience** | "Connect your Google Calendar" button. OAuth popup. Instant analysis. "You spend 24 hours/week in meetings. Here are 5 ways to reclaim 6 hours." |
| **Why second** | Lowest-friction OAuth integration. Non-sensitive scope (calendar.readonly). No restricted scope verification needed. Users are comfortable sharing calendar data. Provides concrete, quantified insights that feel magical. |
| **Technical stack** | Google Calendar API, OAuth 2.0, event analysis pipeline, pattern detection (meeting categorization, gap analysis, recurring event detection). |
| **Key risk** | Limited to time-management automation suggestions. Less useful for users whose work isn't meeting-heavy. |

### Tier 3: Google Takeout (Upload, Ship Third)

| Aspect | Detail |
|--------|--------|
| **MVP build time** | 3-4 weeks |
| **Accuracy** | 75-90% for web-based workflow patterns |
| **User experience** | "Download your Google data, upload it here." Guide user through Takeout with step-by-step screenshots. Analysis takes 1-5 minutes. "Based on your browsing patterns, you visit Jira 47 times/day and alternate between Sheets and Salesforce. Here's how to automate that." |
| **Why third** | Richest data source available without OAuth complexity. Covers browsing, search, YouTube, location, and more. But requires trust -- users need to believe we handle their data responsibly. The questionnaire + calendar phases build that trust first. |
| **Technical stack** | File upload pipeline, Takeout archive parser (zip -> JSON), Chrome history analyzer, Search history pattern detector, cross-source correlation engine. Consider client-side WASM processing to avoid server-side data handling. |
| **Key risk** | Users won't upload. Mitigate by: (1) building trust through earlier tiers, (2) client-side processing option, (3) clear data deletion policy, (4) allowing selective upload (just Chrome history, not everything). |

---

## Recommended Rollout Strategy

```
Week 1-2:  Questionnaire + LLM  (everyone starts here)
           |
           v
Week 3-5:  + Google Calendar     (first "connect" integration)
           |
           v
Week 6-9:  + Google Takeout      (deep analysis for engaged users)
           |
           v
Future:    + Screenshot analysis  (power users who trust the platform)
           + Gmail metadata       (after restricted scope verification)
```

Each tier builds trust for the next. The questionnaire is the funnel entry. Calendar proves we can deliver value from connected data. Takeout is the deep dive for users who are bought in. Screenshots and email are advanced features for power users.

## Sources Referenced

- [Apple Screen Time Developer Documentation](https://developer.apple.com/documentation/screentime)
- [Screen Time API Developer Guide (Medium)](https://medium.com/@juliusbrussee/a-developers-guide-to-apple-s-screen-time-apis-familycontrols-managedsettings-deviceactivity-e660147367d7)
- [Google Takeout Wikipedia](https://en.wikipedia.org/wiki/Google_Takeout)
- [Google Takeout Download Instructions](https://support.google.com/accounts/answer/3024190?hl=en)
- [Gmail API Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail Restricted Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [Google Calendar API Auth](https://developers.google.com/workspace/calendar/api/auth)
- [Worklytics: Meeting Pattern Analysis with Calendar + BigQuery](https://www.worklytics.co/resources/track-meeting-time-per-employee-google-calendar-bigquery-worklytics)
- [browserexport: Parse Browser History Databases](https://github.com/seanbreckenridge/browserexport)
- [Instagram Data Export Guide](https://help.instagram.com/181231772500920)
- [Chrome Browsing History Database (Wikiversity)](https://en.wikiversity.org/wiki/Chromium_browsing_history_database)
- [Vision AI for UI Screenshot Analysis](https://www.grizzlypeaksoftware.com/articles/p/multimodal-ai-wins-using-vision-models-to-debug-ui-screenshots-automatically-Xvk1dF)

---

# ADDENDUM: The Unfair Shortcut (Updated Constraint)

> Founder says: installs are OK if surgical. One thing, one click, clear reason. We want to HACK the system -- laziest, cleverest shortcut for max value.

## The Hack: One Chrome Extension That Does Everything

Forget the 3-tier rollout. The single highest-value shortcut is a **tiny Chrome extension** that passively watches what the user does in their browser and streams it to our analysis engine. Here's why this is the cheat code:

### What One Extension Can Capture (Zero Effort From User After Install)

| Signal | How | API |
|--------|-----|-----|
| **Every site visited** | `chrome.history.search()` pulls last 90 days on install. After that, `chrome.tabs.onUpdated` streams new visits in real-time. | `history` permission |
| **Time spent per site** | `chrome.tabs.onActivated` + `chrome.idle.onStateChanged` = know exactly when user is active on which tab. RescueTime does exactly this. | `tabs` + `idle` permissions |
| **Active tab right now** | `chrome.tabs.query({ active: true })` every 60 seconds via `chrome.alarms`. | `tabs` + `alarms` permissions |
| **Tab switching patterns** | `chrome.tabs.onActivated` fires every tab switch. Sequence of (site, timestamp) pairs = workflow graph. | `tabs` permission |
| **Site categories** | We classify URLs server-side (or with an LLM). "docs.google.com/spreadsheets" = Spreadsheet. "mail.google.com" = Email. "linear.app" = Project Management. | No extra permission |
| **Search queries** | `chrome.webNavigation.onCompleted` with URL parsing extracts Google/Bing search queries from the URL. | `webNavigation` permission |
| **Form fill patterns** | Content script detects repeated form interactions on the same domains. | `activeTab` + content script |

### Why This Is the Cheat Code

1. **One install, infinite data.** User clicks "Add to Chrome" once. From that moment, we passively collect everything we need. No downloads, no uploads, no OAuth, no Takeout. The extension IS the data pipeline.

2. **Real-time, not a snapshot.** Google Takeout gives you a frozen export. The extension gives a live stream. We can show "Your workflow TODAY" not "Your workflow from when you last exported."

3. **Works on computer immediately.** Desktop Chrome is where most knowledge work happens. This captures the highest-value work surface.

4. **History backfill is free.** On first install, `chrome.history.search({ text: '', maxResults: 10000, startTime: 90_days_ago })` instantly pulls the user's last 90 days of browsing. Day-one insights with zero waiting.

5. **Phone coverage via Google account sync.** Chrome syncs history across devices. If the user has Chrome on their phone with sync enabled (most people do), we get phone browsing data for free through the desktop history API.

6. **Permission prompt is mild.** The install prompt says "Read your browsing history" -- not great, but users install extensions with this permission constantly (ad blockers, password managers, Grammarly all ask for more). The permission is normalized.

### The Extension: Technical Spec

```
manifest.json:
{
  "manifest_version": 3,
  "name": "Meldar - Discover Your Workflow",
  "permissions": ["history", "tabs", "idle", "alarms", "storage"],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" }
}

background.js (pseudocode):
- ON INSTALL: chrome.history.search() -> backfill last 90 days -> send to API
- ON TAB ACTIVATED: record (url, timestamp) -> track active time
- ON IDLE STATE CHANGE: pause/resume active time tracking
- EVERY 60s (chrome.alarms): batch send events to API
- ALL DATA: stored locally first, sent in compressed batches
```

**Build time: 1-2 weeks for the extension + backend ingestion.**

### What We Analyze (Server-Side)

From the raw stream of (URL, timestamp, duration) tuples:

1. **Top tools by time**: "You spend 4.2 hours/day in Gmail, 2.1 hours in Google Sheets, 1.8 hours in Jira"
2. **Switching patterns**: "You switch between Gmail and Sheets 34 times/day" -> suggests they're copying data from email to a spreadsheet -> automation opportunity
3. **Repetitive sequences**: A->B->C->A->B->C detected -> "You follow this workflow 12 times/week"
4. **Search-then-action**: "You Google 'time zone converter' 5x/week" -> suggest a widget/shortcut
5. **Time-of-day patterns**: "Your deep work window is 10am-12pm (fewest tab switches)"
6. **Site dwell time distribution**: long tail of sites visited once vs. power-law of daily tools

### Combine With the LLM Interview (The 1-2 Punch)

The extension gives us the WHAT. The LLM interview gives us the WHY.

```
Extension data:  "User switches between Salesforce and Google Sheets 28 times/day"
LLM interview:   "What are you doing when you go between Salesforce and Sheets?"
User response:    "I copy new lead info from Salesforce into our tracking sheet"
Automation:       "Zapier/Make integration: auto-sync Salesforce leads to Google Sheets"
```

The extension identifies the PATTERNS. The LLM clarifies the INTENT. Together they produce accurate, actionable automation suggestions.

### Revised Rollout: The Shortcut Version

```
Day 1-14:   Ship Chrome extension + LLM interview chat
            Extension backfills 90 days of history on install
            LLM asks 5 smart questions informed by the browsing data
            -> First automation suggestions within 5 minutes of install

Day 15-30:  Passive monitoring accumulates real-time data
            Weekly "workflow report" email/notification
            Suggestions improve as patterns solidify

Day 30+:    Offer Google Calendar OAuth for meeting layer
            (Only for users who want time-management insights)
```

### What About Mobile?

Three options, in order of laziness:

1. **Chrome sync (free).** If user has Chrome on phone with sync on, their mobile browsing shows up in desktop history API. We already get it.
2. **Screenshot-based.** Ask user to share one screenshot of their phone's Screen Time / Digital Wellbeing page. Vision AI reads it. One-time action, gives us app usage breakdown.
3. **Apple Shortcuts hack.** On iOS, a Shortcut can screenshot Screen Time and share the image to our app. We provide a one-tap Shortcut install link. User runs it weekly.

Option 1 is truly zero effort. Options 2 and 3 are "one surgical action" per the founder's constraint.

---

## Final Recommendation: The Laziest Path to Maximum Value

| Priority | Action | Effort | Value |
|----------|--------|--------|-------|
| **1** | Chrome extension (passive browsing tracker) | 1-2 weeks | Captures 80% of digital workflow patterns |
| **2** | LLM conversational interview | 1 week (parallel) | Turns patterns into actionable automation suggestions |
| **3** | Screen Time screenshot (vision AI) | 2 days | Covers mobile app usage gap |
| **4** | Google Calendar OAuth | 2 weeks | Adds meeting/time layer for knowledge workers |

The Chrome extension is the unfair advantage. It's one install that gives us a permanent, real-time, high-resolution view of the user's digital life -- without asking them to do anything else ever again. Every other data source is additive on top of this foundation.

---

# ADDENDUM 2: The Self-Export Model (User Pulls Own Data, We Analyze)

> Founder update: User exercises their own data rights (GDPR exports, Screen Time screenshots, browser history files). They do the extraction. We provide step-by-step tutorials. They hand us a file. We find the patterns. We NEVER touch their accounts.

This is architecturally beautiful: zero OAuth, zero API keys, zero restricted scope verification, zero account access. The user is the data pipeline. We are the analysis engine.

## The Data Export Catalog

Here is every self-export path available, ranked by **signal value for automation discovery**.

---

### TIER 1: Highest Value -- Ship These First

#### 1A. Google Takeout (Chrome History + My Activity)

| Aspect | Detail |
|--------|--------|
| **What it contains** | Chrome browsing history (URL, title, timestamp, transition type, device ID), Google Search queries with timestamps, YouTube watch/search history, Google Maps searches, and 50+ other data sources |
| **JSON structure** | `BrowserHistory.json`: array of `{ url, title, time_usec, page_transition, client_id }`. My Activity: `{ title, time, products, details }` per event. |
| **File size** | Chrome history alone: typically 5-100MB depending on usage. Selective export (just Chrome + My Activity) keeps it small. |
| **Time to get** | Export ready in 5-20 minutes for selective exports. |
| **Works on** | Desktop and mobile (takeout.google.com works in mobile browser) |

**Tutorial for user (7 steps):**
```
1. Go to takeout.google.com
2. Click "Deselect all"
3. Scroll down, check ONLY "Chrome"
4. Click "All Chrome data included" -> Deselect all -> check ONLY "History" -> OK
5. Also check "My Activity" (captures Search, YouTube, Maps queries)
6. Click "Next step" -> "Create export"
7. Wait for email (~10 min) -> Download zip -> Upload to Meldar
```

**What we extract:**
- Top sites by visit frequency and recency (= primary tools)
- Visit sequences within time windows (= workflow patterns)
- Search queries (= unmet needs, repeated lookups)
- Device ID field distinguishes desktop vs. mobile browsing
- Transition type (LINK vs. TYPED vs. RELOAD) reveals intent
- YouTube/Maps queries add lifestyle and commute context

**Automation signals (examples):**
| Pattern detected | Automation suggestion |
|-----------------|----------------------|
| Visits `mail.google.com` -> `docs.google.com/spreadsheets` 28x/day | "You seem to copy data from Gmail to Sheets. Set up a Zapier trigger." |
| Searches "usd to eur" 5x/week | "Pin a currency converter widget to your browser." |
| Visits `jira.atlassian.net` then `slack.com` repeatedly | "Get Jira notifications in Slack instead of checking manually." |
| 47 YouTube visits/day, mostly during 12-1pm | "You watch YouTube at lunch. Would a curated playlist save browsing time?" |

**Accuracy estimate: 75-90%** for web-based workflow patterns.

---

#### 1B. Screen Time / Digital Wellbeing Screenshot

| Aspect | Detail |
|--------|--------|
| **What it contains** | Daily/weekly screen time, per-app usage hours, app categories (Social, Entertainment, Productivity, etc.), pickup count, notification count, most-used apps ranked |
| **Format** | Screenshot image (PNG/JPG). Vision AI reads it. |
| **Data retention** | iOS: ~4 weeks of detail. Android: varies by device. |
| **Works on** | Phone only (this IS the mobile gap-filler) |

**Tutorial for user (iOS, 4 steps):**
```
1. Open Settings > Screen Time > See All App & Website Activity
2. Tap "Week" at the top for weekly view
3. Scroll down to see the full app list
4. Take 2-3 screenshots (top of page + scrolled down) -> Upload to Meldar
```

**Tutorial for user (Android, 4 steps):**
```
1. Open Settings > Digital Wellbeing & Parental Controls
2. Tap the pie chart to see daily breakdown
3. Scroll to see full app list
4. Take 2-3 screenshots -> Upload to Meldar
```

**What Vision AI extracts from the screenshot:**
- App names and time spent (e.g., "Instagram 2h 14m", "Gmail 1h 47m")
- Category breakdown (Social 4h, Productivity 3h, Entertainment 2h)
- Pickup count and first pickup time
- Notification counts per app
- Daily vs. weekly averages

**Automation signals:**
| Pattern detected | Automation suggestion |
|-----------------|----------------------|
| Instagram 3h/day, TikTok 2h/day | "You spend 5h on social media. Want focus mode scheduling?" |
| Gmail 2h on phone + high pickup count | "You check email 47x/day. Batch processing could save 1h." |
| WhatsApp is #1 app by time | "Your main communication is WhatsApp. Let's see what tasks flow through it." |
| Low Productivity category, high Entertainment | Baseline for measuring improvement after automations |

**Accuracy estimate: 85-95%** for app-level time allocation. Vision AI reads Screen Time screenshots with near-perfect accuracy since the layout is standardized.

**Build time: 2-3 days.** Just a file upload + vision model call + structured extraction prompt.

---

### TIER 2: High Value -- Ship After Tier 1

#### 2A. Apple Data & Privacy Export (privacy.apple.com)

| Aspect | Detail |
|--------|--------|
| **What it contains** | App usage history, purchase history, Apple Store activity, iCloud data, sign-in records. EU/UK users also get: app install history, push notification history, and can schedule recurring exports. |
| **Format** | Mix of JSON, CSV, and PDF files in a zip archive. |
| **Time to get** | Up to 7 days (Apple is slow). This is a major friction point. |
| **Works on** | Desktop and mobile (privacy.apple.com in browser) |

**What's useful for automation discovery:**
- **App install history**: complete list of every app ever installed = tool ecosystem map
- **App usage data**: which apps are actually used vs. installed
- **Purchase history**: what they pay for = what they value

**Limitation:** 7-day wait time makes this impractical for an onboarding flow. Better as a "deep dive" offered later.

#### 2B. Meta/Instagram Data Export

| Aspect | Detail |
|--------|--------|
| **What it contains** | Messages, comments, likes, search history, ad interactions, login activity, followers/following, story interactions. JSON format in a zip. |
| **Format** | JSON files organized in folders. Ready in ~1 hour. |
| **Works on** | Mobile app or desktop browser |

**What's useful (limited):**
- **Search history**: what they look for on Instagram = interests
- **Ad interactions**: what products/services they engage with
- **Time-of-day activity patterns**: when they're most active
- **Message volume/frequency**: communication patterns

**Limitation:** Mostly social data, not workflow data. Low signal for automation discovery unless user's work involves social media management.

#### 2C. Browser History Direct Export (Non-Google Users)

For Firefox, Safari, Edge users who don't use Google Takeout:

| Browser | Export method | Format |
|---------|--------------|--------|
| **Firefox** | `places.sqlite` in profile folder, or use "Export History" add-on | SQLite or CSV |
| **Safari** | `~/Library/Safari/History.db` | SQLite |
| **Edge** | Same as Chrome (Chromium-based), or use edge://history export | SQLite or JSON |

**Tutorial approach:** Provide browser-specific instructions. Or simpler: tell users to install the free "Export History" extension for their browser (one-click install, one-click export, then uninstall).

---

### TIER 3: Bonus Sources -- Offer as Optional Deep Dives

#### 3A. Google Calendar Export (.ics file)

| Aspect | Detail |
|--------|--------|
| **What** | User exports calendar as .ics file from Google Calendar settings. Contains all events, attendees, times, recurrence rules. |
| **Tutorial** | Google Calendar > Settings > Import & Export > Export. Downloads a .ics zip file. |
| **Signal** | Meeting density, recurring commitments, free time blocks. |

#### 3B. WhatsApp Chat Export

| Aspect | Detail |
|--------|--------|
| **What** | Text file with timestamped messages, sender names. Mobile-only export. |
| **Format** | `.txt` file, one message per line: `[date, time] sender: message` |
| **Tutorial** | Open chat > Menu > More > Export chat > Without media > Email to self > Upload |
| **Signal** | Communication patterns, task delegation, repeated questions. |
| **Limitation** | Per-chat export only (no bulk). 40,000 message limit per export. Very manual. |

#### 3C. Apple App Privacy Report

| Aspect | Detail |
|--------|--------|
| **What** | JSON file showing which apps access camera, microphone, location, contacts, and network domains contacted. |
| **Tutorial** | Settings > Privacy & Security > App Privacy Report > Save App Activity |
| **Signal** | Which apps are most active behind the scenes, network activity patterns. Limited automation signal but useful for privacy-conscious users. |

---

## Analysis Architecture: The File Upload Pipeline

```
User's device                          Meldar
─────────────                          ─────

1. User follows tutorial
2. Downloads their data file
3. Uploads file to Meldar  ──────────> 4. Receive file
                                       5. Detect file type (Takeout zip? Screenshot? .ics?)
                                       6. Route to appropriate parser:
                                          ├── Takeout ZIP → unzip → parse BrowserHistory.json + MyActivity/
                                          ├── Screenshot  → Vision AI → structured extraction
                                          ├── .ics file   → iCal parser → event analysis
                                          └── .txt file   → WhatsApp parser → message patterns
                                       7. Run pattern detection engine
                                       8. Generate automation suggestions
                                       9. Present interactive report to user
```

### Key Design Decision: Client-Side vs. Server-Side Processing

| Approach | Pros | Cons |
|----------|------|------|
| **Server-side** | Simpler, faster to build, can use heavy models | User's data leaves their device. Privacy concern. |
| **Client-side (WASM)** | Data never leaves device. Maximum trust. | Harder to build. Can't use large models. Limited processing power. |
| **Hybrid** | Parse + anonymize client-side, send only aggregated patterns server-side | Best of both worlds. User sees raw data stays local, only patterns are sent. |

**Recommendation: Hybrid.**

Parse the file in the browser using JavaScript/WASM. Show the user what was found locally ("We found 12,847 browsing history entries. Your top 10 sites are..."). Then ask permission to send the aggregated pattern data (not raw URLs) to the server for LLM-powered automation analysis. This way:
- Raw browsing history / personal URLs never leave the device
- Server only sees: "Site category: Spreadsheet, visits: 847, avg duration: 4.2min"
- User has full transparency and control

---

## The Combined User Experience (End to End)

```
Step 1: LLM Interview (0 min)
  "Tell me about your typical workday..."
  → Baseline understanding, identifies which exports to recommend

Step 2: Screen Time Screenshot (2 min)
  "Take a screenshot of your Screen Time and upload it here"
  → Instant mobile app usage breakdown
  → "You spend 5h/day on your phone. Top apps: WhatsApp, Gmail, Instagram"

Step 3: Google Takeout - Chrome History (15-30 min, mostly waiting)
  "Follow these 7 steps to export your Chrome history..."
  → Deep web workflow analysis
  → "You visit 23 unique tools daily. Your main workflow loop is Gmail→Sheets→Jira"

Step 4: Results Dashboard
  → Combined view: phone habits + web workflows + self-reported pain points
  → Ranked automation suggestions with estimated time savings
  → "We found 7 automation opportunities that could save you ~6 hours/week"
```

**Total user effort: ~5 minutes of active work + 15-30 minutes of waiting.**

---

## Revised Final Recommendation

| Priority | Data source | User effort | Our build time | Signal quality |
|----------|------------|-------------|----------------|----------------|
| **1** | LLM Interview | 5 min conversation | 1 week | Medium (40-60%) |
| **2** | Screen Time screenshot | 2 min (take + upload) | 3 days | High (85-95%) |
| **3** | Google Takeout (Chrome + My Activity) | 5 min setup + 15 min wait | 2 weeks | Very high (75-90%) |
| **4** | Google Calendar .ics export | 2 min | 3 days | Medium-high (70-85%) |
| *Later* | Apple Data & Privacy export | 5 min + 7 day wait | 1 week | Medium |
| *Later* | Meta/Instagram export | 5 min + 1h wait | 1 week | Low for workflows |

**The self-export model is strictly better than OAuth for MVP** because:
1. Zero API costs, zero OAuth verification, zero restricted scope headaches
2. User maintains full control -- they chose what to export and upload
3. Works across all platforms (Google, Apple, Meta) without per-platform API work
4. GDPR/privacy positioning is a feature, not a bug: "We don't access your accounts. You bring your own data."
5. The Chrome extension from Addendum 1 remains viable as a v2 upgrade for users who want real-time tracking

## Additional Sources

- [Google Takeout Chrome History JSON Format (GitHub Gist)](https://gist.github.com/monperrus/a89781ffe69588cabe64fa60b92e89f7)
- [google_takeout_parser Python library](https://github.com/purarue/google_takeout_parser)
- [Apple Data & Privacy Portal](https://privacy.apple.com/)
- [Apple App Privacy Report](https://support.apple.com/en-us/102188)
- [Screen Time on iPhone Guide](https://support.apple.com/guide/iphone/get-started-with-screen-time-iphbfa595995/ios)
- [Instagram Data Export](https://help.instagram.com/181231772500920)
- [WhatsApp Chat Export Guide](https://www.zapptales.com/en/how-to-export-whatsapp-chat-android-iphone-ios/)
- [Google Takeout Selective Export Steps](https://support.google.com/accounts/answer/3024190?hl=en)

---

# ADDENDUM 3: The Viral Angle -- "Take Back Your Data"

> Founder positioning: "Big Tech has been collecting your data for a decade. They used it to sell you ads. Now take it back and use it for YOURSELF." The emotional arc: REVENGE + EMPOWERMENT. "They profited from your data. Now YOU profit from it."

## Why This Works: The Spotify Wrapped Playbook

Spotify Wrapped gets 200 million users engaged in 24 hours. Why? Because it takes data the platform already collected and reflects it back as a **gift to the user**. The user sees themselves in the data. It becomes identity. They share it.

Meldar does the same thing, but with a twist: **the data isn't ours to give -- the user has to reclaim it first.** That reclamation act IS the viral moment. The emotional sequence:

```
1. SHOCK:      "Google has 12,847 pages of your browsing history."
2. ANGER:      "They used this to sell $247 worth of ads targeting you."
3. RECLAIM:    "Download YOUR data in 2 minutes. It's your legal right."
4. REVEAL:     "Here's what your data actually says about you."
5. EMPOWER:    "Now let's use it to save you 6 hours/week."
6. SHARE:      "Show your friends what Big Tech knows about them."
```

Steps 1-3 are the viral hook. Steps 4-5 are the product. Step 6 is the growth loop.

## The "Data Receipt" -- The Shareable Artifact

Like Spotify Wrapped cards, we generate a **"Data Receipt"** -- a visual summary designed for sharing.

### What the Data Receipt Shows

```
╔══════════════════════════════════════════╗
║         YOUR DATA RECEIPT                ║
║         from Google, Meta & Apple        ║
╠══════════════════════════════════════════╣
║                                          ║
║  Google has tracked you for:   8.3 years ║
║  Browsing entries collected:    127,483  ║
║  Searches recorded:              41,209  ║
║  YouTube videos watched:         12,847  ║
║  Locations tracked:               8,934  ║
║                                          ║
║  ── YOUR DIGITAL LIFE ──                 ║
║                                          ║
║  Hours/week on email:              11.2  ║
║  Hours/week on social media:        8.7  ║
║  Most visited site:         Gmail (847x) ║
║  Most repeated search:  "usd to eur" 5x ║
║  Phone pickups/day:                  67  ║
║                                          ║
║  ── WHAT WE CAN FIX ──                  ║
║                                          ║
║  Automations found:                   7  ║
║  Estimated time saved:       6.2 hrs/wk  ║
║                                          ║
║  meldar.com/reclaim                      ║
╚══════════════════════════════════════════╝
```

### Why This Goes Viral

1. **The numbers are shocking.** "127,483 browsing entries?!" -- people genuinely don't know the scale.
2. **It's personal.** Every receipt is unique. Like Wrapped, it's about YOU.
3. **It triggers the reclamation instinct.** "I want to see MY receipt too."
4. **It's screenshot-native.** Designed for phone screens. Fits an Instagram story. Fits a TikTok.
5. **The flex is the reclaim.** "I took my data back from Google" = social currency among Gen Z.
6. **The "6 hours/week saved" is the hook into the product.** The receipt is marketing. The automations are the product.

## Technical Implications of the Viral Angle

### What Changes in the Pipeline

The viral framing doesn't change WHAT data we collect, but it changes HOW we present the analysis and WHAT metrics we prioritize.

**New priority: "shock stats" that quantify the data Big Tech has.**

From Google Takeout, we extract not just patterns but SCALE metrics:
- Total number of browsing history entries (the raw count is shocking)
- Date of first entry (how many years they've been tracked)
- Total unique domains visited
- Total search queries recorded
- Total YouTube videos watched
- If Location History is included: total location points, unique places

From Screen Time screenshots:
- Daily pickup count (people are shocked by this)
- Total weekly screen hours
- Social media hours vs. "productive" hours ratio

These "shock stats" cost us almost nothing extra to compute -- they're just counts and date ranges from data we're already parsing.

### The Onboarding Flow Reframed

The tutorials don't change, but the FRAMING around them changes entirely:

**Before (utility framing):**
> "Export your Chrome history so we can find automation opportunities."

**After (reclamation framing):**
> "Google has been tracking every website you've visited for years. It's YOUR data and you have a legal right to it. Let's download it and put it to work for YOU instead of their ad algorithms."

The same 7-step Takeout tutorial, but now it feels like an act of rebellion, not a chore.

### The Share Flow (Technical)

```
1. User completes data analysis
2. We generate a "Data Receipt" image (server-side, using canvas/SVG)
   - Personalized with their actual numbers
   - Branded, designed for social sharing
   - No sensitive data (no URLs, no search queries, just aggregate counts)
3. User taps "Share Your Receipt"
   - Native share sheet on mobile (Web Share API)
   - Download image on desktop
   - Direct share to Instagram Stories, TikTok, Twitter
4. Receipt includes "meldar.com/reclaim" link
5. Friend sees receipt -> wants their own -> visits link -> starts their own export
```

**The share artifact contains NO private data.** Just counts and category breakages. "127,483 browsing entries" is shareable. "127,483 specific URLs" is not. This is critical for virality -- the receipt must be safe to share without thinking.

### Build Cost for Viral Features

| Feature | Additional effort beyond base pipeline |
|---------|---------------------------------------|
| Shock stat extraction | ~1 day (just counts + date ranges) |
| Data Receipt image generation | ~2-3 days (templated SVG/canvas) |
| Web Share API integration | ~1 day |
| Social-optimized meta tags (OG image) | ~0.5 days |
| Referral tracking (who shared, who converted) | ~1-2 days |
| **Total additional** | **~1 week on top of base build** |

## The Dual Product: Viral Top + Utility Bottom

The product now has two layers:

```
┌─────────────────────────────────────────┐
│  VIRAL LAYER (acquisition + sharing)     │
│                                          │
│  "See what Big Tech knows about you"     │
│  Data Receipt, shock stats, share cards  │
│  Purpose: get users in, make them share  │
├─────────────────────────────────────────┤
│  UTILITY LAYER (retention + value)       │
│                                          │
│  "Now use your data to save time"        │
│  Automation suggestions, personal apps   │
│  Purpose: deliver real value, retain     │
└─────────────────────────────────────────┘
```

The viral layer gets people in the door. The utility layer keeps them. Both are built on the same data pipeline. The viral layer is just a different presentation of the same parsed data.

## Risk: The "Just a Gimmick" Trap

If the Data Receipt is viral but the automations are weak, we become a novelty -- used once, shared once, forgotten. The viral angle only works if the utility layer delivers. The shock stats are the hook. The "6 hours/week saved" is the product.

**Mitigation:** The Data Receipt should ALWAYS end with a concrete, actionable insight, not just numbers. "You search 'currency converter' 5x/week -- here's a shortcut that does it in 1 click" is better than "You made 41,209 searches."

## Final Architecture: Everything Together

```
User Journey:

1. LAND (viral)
   "See what Google knows about you" -- landing page / TikTok / shared receipt

2. RECLAIM (tutorial)
   "Download your data in 2 minutes" -- guided Takeout + Screen Time screenshot

3. REVEAL (shock + utility)
   Upload data -> instant analysis -> Data Receipt with shock stats
   + "We found 7 automations that could save you 6.2 hours/week"

4. SHARE (growth loop)
   "Share your Data Receipt" -> friend sees -> friend reclaims -> repeat

5. BUILD (product)
   "Let us build your personal automation app" -> the actual product
```

Data pipeline (unchanged from Addendum 2):
- Google Takeout ZIP -> client-side parse -> shock stats + workflow patterns
- Screen Time screenshot -> Vision AI -> app usage breakdown
- LLM interview -> intent clarification -> automation matching
- All three combined -> ranked automation suggestions + Data Receipt

## Additional Sources

- [Spotify Wrapped 2025 User Experience](https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/)
- [Spotify Wrapped Marketing Strategy Analysis (NoGood)](https://nogood.io/blog/spotify-wrapped-marketing-strategy/)
- [TikTok GDPR Fine and Data Privacy Backlash](https://thehackernews.com/2025/05/tiktok-slammed-with-530-million-gdpr.html)
- [Google Takeout: What Data Google Has on You](https://hackmag.com/security/google-takeout)
