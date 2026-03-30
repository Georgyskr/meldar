# Self-Export Intelligence — Discovery Doc

**Date:** 2026-03-30
**Status:** Discovery (v3 — pivoted to self-export-first model)
**Core Idea:** Users export their OWN data using rights they already have (GDPR exports, platform tools, OS features). We never touch their accounts. They hand us a file, we find the patterns.

---

## The Model

```
User exports their own data (we tell them exactly how)
  -> Drags file into Meldar
  -> Client-side analysis (data never leaves their machine)
  -> "Here's what we found — want us to fix it?"
```

**Why this is powerful:**
- Zero OAuth, zero API keys, zero account access — we never see credentials
- Works today, no platform approval needed
- "Your data never leaves your computer" is architecturally true — there IS no server in V1
- GDPR gives every EU citizen the right to export — we're just the first tool that makes exports useful
- Strongest possible consent: user physically hands us a file they chose to export
- Cross-platform from day 1 — every major platform has a data export

---

## 1. Data Source Catalog — What Can Users Self-Export?

### Tier 1: Rich Data, Easy Export, High Insight Value

| Source | Export Method | Format | What's In It | Effort for User |
|--------|-------------|--------|-------------|-----------------|
| **Gmail** | Google Takeout → Mail | .mbox | Full headers: sender, recipient, date, subject, labels, read status, thread IDs, List-Unsubscribe, attachment metadata. Body also included but we parse headers only (stop at first blank line per RFC 2822). | 6 clicks, 90 sec setup, 1-24h wait for Google to prepare |
| **Google Chrome** | Google Takeout → Chrome | JSON | Browsing history (URL, title, timestamp, visit count, transition type), bookmarks, autofill data, search history | Same Takeout flow as Gmail — can be selected together |
| **Apple Screen Time** | Settings → Screen Time → screenshot | PNG/JPG | App usage by day/week, pickups, notifications per app, most used apps, category breakdown | 3 taps + screenshot, instant |
| **Android Digital Wellbeing** | Settings → Digital Wellbeing → screenshot | PNG/JPG | Same as Apple: app usage, screen time, unlocks, notifications | 3 taps + screenshot, instant |
| **Spotify** | Account → Privacy Settings → Download your data | JSON | Streaming history (track, artist, timestamp, ms_played), search queries, library, playlists, inferences Spotify made about you | 5 clicks, up to 30 days wait (!!!) |
| **Netflix** | Account → Download your personal information | CSV | Viewing history (title, date, duration), search history, ratings, profile info | 4 clicks, ready in ~24h |
| **Browser history** | Chrome: `chrome://history` → export; Firefox: places.sqlite; Safari: History.db | Various | URLs, titles, timestamps, visit counts | Varies by browser |

### Tier 2: Valuable Data, Moderate Effort

| Source | Export Method | Format | What's In It | Effort for User |
|--------|-------------|--------|-------------|-----------------|
| **Google Calendar** | Google Takeout → Calendar | .ics (iCal) | Events: title, time, duration, location, attendees, recurrence rules, reminders | Takeout flow |
| **Google Search** | Google Takeout → My Activity → Search | JSON/HTML | Every Google search query + timestamp | Takeout flow |
| **YouTube** | Google Takeout → YouTube | JSON | Watch history (video ID, title, timestamp), search history, subscriptions, comments | Takeout flow |
| **Meta (Facebook/Instagram)** | Settings → Your Information → Download | JSON/HTML | Posts, messages, friends list, ad interactions, login times, search history, off-Facebook activity (which sites sent your data to Meta) | 6 clicks, hours to days wait |
| **Twitter/X** | Settings → Your Account → Download an archive | ZIP (JSON) | Tweets, DMs, likes, follows, ad engagements, interests X inferred, login history, IP log | 4 clicks, up to 24h wait |
| **WhatsApp** | Settings → Chats → Export Chat (per chat) | .txt + media | Messages, timestamps, sender, media files (per conversation) | Per-chat, manual |
| **Amazon** | Account → Request My Data | CSV/JSON | Order history, search history, browsing history, Alexa voice history, Kindle highlights | 3 clicks, up to 30 days |
| **Apple Health** | Health app → Export All Health Data | XML/ZIP | Steps, heart rate, sleep, workouts, medications, all synced device data | 2 taps, instant-ish |
| **Outlook** | Microsoft Privacy Dashboard → Download | Various | Email headers, calendar, contacts, search history | Similar to Takeout |

### Tier 3: Niche but Interesting

| Source | Export Method | Format | What's In It |
|--------|-------------|--------|-------------|
| **Uber/Lyft** | GDPR request or in-app | CSV | Ride history, routes, spend, wait times |
| **LinkedIn** | Settings → Get a copy of your data | CSV | Connections, messages, job applications, profile views, skills endorsements |
| **Todoist/Notion/Trello** | Built-in export | CSV/JSON | Tasks, projects, completion dates, time tracking |
| **Banking (EU)** | PSD2 / open banking / CSV export | CSV/OFX | Transactions, categories, amounts, merchant names |
| **Strava** | Settings → Download or Delete Your Account → Request Your Archive | ZIP | Activities, routes, times, heart rate, segments |
| **Reddit** | Settings → Privacy & Security → Data Request | ZIP | Posts, comments, votes, subscriptions, messages |

### The Google Takeout Jackpot

Google Takeout is the single biggest win because one export can include ALL of:
- Gmail (email patterns)
- Chrome (browsing patterns)
- Calendar (time patterns)
- Search (interest patterns)
- YouTube (content consumption)
- Location History (movement patterns)
- Drive (file organization)
- Fit (health data)

**One export. One upload. Eight data sources analyzed.** This is the unfair shortcut.

---

## 2. Email: Detectable Patterns (Deep Dive)

Email remains the richest single source because MBOX files contain structured metadata. Here's what we can extract from headers alone.

### 2.1 Newsletter & Marketing Overload

**Signals:** Sender contains "noreply@", "newsletter@", "updates@"; List-Unsubscribe header present; arrives on predictable schedule; user never opens (unread > 7 days); no reply ever sent.

**What we can say:**
- "You receive 47 newsletters/week. You opened 3 in the last 30 days."
- "These 12 senders have sent you 200+ emails. You've never opened one."
- "You're subscribed to 8 daily digests that arrive between 6-7am. You read 1."

**Automation:** One-click bulk unsubscribe. Group by "keep / unsubscribe / digest" categories. Offer to auto-archive future messages from senders with <5% open rate.

### 2.2 Response Priority Scoring

**Signals:** Per-sender response time distribution. Response rate (% of emails from X that get a reply). Time-to-first-open.

**What we can say:**
- "You respond to [boss@company.com] in median 4 minutes. [vendor@acme.com] waits 3.8 days."
- "These 5 senders always get same-day replies. These 20 never get replies."
- "Your response time to [client@bigco.com] has increased from 2h to 18h over the past month."

**Automation:** Priority inbox resorting. "Respond now" vs "batch later" buckets.

### 2.3 Email Volume & Timing Patterns

**Signals:** Message count by hour/day/week. Sent mail timestamps. Peak inbound vs peak response windows.

**What we can say:**
- "You get 62% of your email between 9am-12pm but do 70% of your replying between 2-5pm."
- "Monday is your heaviest inbox day (avg 48 emails). Saturday is lightest (avg 3)."
- "End-of-month spike: you receive 2.3x more emails in the last 3 days of each month."

**Automation:** Suggest email batching windows. Schedule send-later for optimal times.

### 2.4 Thread Depth & Conversation Bloat

**Signals:** Thread message count. Number of participants. Thread duration.

**What we can say:**
- "You have 14 threads with 20+ messages this month."
- "Threads with [team-alias@company.com] average 11 messages. You participate in 2."

**Automation:** Flag runaway threads. Detect CC-spam (threads where user is CC'd but never replies).

### 2.5 Recurring Email Patterns

**Signals:** Same sender + similar subject pattern + predictable cadence.

**What we can say:**
- "Every Friday at 3pm you get 'Weekly Sales Report' from [reports@company.com]."
- "You receive 'Invoice #XXXX' from 6 vendors on the 1st of each month."
- "Your bank sends 'Transaction Alert' an average of 4.2 times per day."

**Automation:** Group recurring emails into a single digest. Auto-label and archive predictable transactional emails.

### 2.6 Attachment Patterns

**Signals:** Attachment MIME type, size, frequency per sender.

**What we can say:**
- "You receive 2.3 GB of attachments per month. 80% are PDFs from 3 senders."
- "[accounting@company.com] sends you Excel files every Monday."

**Automation:** Auto-save attachments to cloud storage by sender/type.

### 2.7 Neglected Email (Triage Gaps)

**Signals:** Unread age. Emails from known-important senders sitting unread.

**What we can say:**
- "Your inbox has 1,847 unread messages. 94% are from senders you never engage with."
- "3 emails with attachments from [boss@company.com] are unread for 5+ days."

**Automation:** "Archive the 1,740 messages from senders you never open?" Surface the actually-important unread messages.

### 2.8 Social Graph & Communication Network

**Signals:** Frequency matrix between sender-recipient pairs. CC/BCC patterns.

**What we can say:**
- "Your top 10 contacts account for 60% of your email volume."
- "3 people always CC you on everything. You never engage."

**Automation:** Suggest removing self from CC-heavy threads.

---

## 3. Cross-Source Intelligence (When Multiple Exports Combine)

The real magic happens when we overlay data from multiple exports. Each source alone is interesting. Combined, they're transformative.

### 3.1 Email + Calendar

**Pattern:** "You have 3 meetings every day with [team@company.com] AND exchange 15 emails/day with them."
**Insight:** "You're spending 4 hours/day communicating with one team. 60% of those emails could be covered in the meetings."
**Automation:** "Batch email exchanges with this team into meeting agendas."

### 3.2 Email + Browser History

**Pattern:** "Every time you get an email from [jira@company.com], you visit Jira within 5 minutes and spend 20 minutes there."
**Insight:** "Jira notification emails trigger a 20-minute context switch 8 times per day."
**Automation:** "Batch Jira notifications into a twice-daily digest."

### 3.3 Screen Time + Browser History

**Pattern:** "You spend 2.3 hours/day on social media (Screen Time) and 45 minutes of that is Reddit (browser history)."
**Insight:** "Your Reddit usage peaks at 2-4pm — right when your email shows you're least productive."
**Automation:** "Block Reddit between 1-5pm? Or redirect to a focused reading list?"

### 3.4 Email + Spending (Bank Export)

**Pattern:** "You get subscription renewal emails from 14 services. Your bank shows charges from 19."
**Insight:** "5 subscriptions are charging you but not even emailing you. You might have forgotten about them."
**Automation:** "Here are the 5 mystery subscriptions. Want to investigate or cancel?"

### 3.5 Calendar + Screen Time

**Pattern:** "On days with 5+ meetings, your screen time jumps by 90 minutes."
**Insight:** "Heavy meeting days push your real work into evenings."
**Automation:** "Block 2 hours of focus time on high-meeting days?"

### 3.6 YouTube + Spotify + Netflix

**Pattern:** "You watch YouTube tutorials for 6 hours/week, 80% are about cooking."
**Insight:** "You're clearly trying to learn to cook. But you never search for recipes (Chrome history)."
**Automation:** "Want me to build a recipe collector that captures what you watch and creates a personal cookbook?"

---

## 4. Automation Suggestions (User-Facing Copy)

These are the actual prompts Meldar would surface in the product:

### Email Quick Wins

| Insight | Suggested Action |
|---------|-----------------|
| "You get 12 newsletters/week and open 2." | "Unsubscribe from the other 10?" |
| "94% of your unread emails are from senders you never engage with." | "Archive all 1,740?" |
| "You're CC'd on 8 threads/week you never participate in." | "Auto-archive CC-only threads?" |
| "[bank@example.com] sends 4 alerts/day." | "Consolidate into one daily summary?" |

### Cross-Source Insights

| Sources | Insight | Suggested Action |
|---------|---------|-----------------|
| Email + Calendar | "You email [team] 15x/day AND meet 3x. Double communication." | "Use meeting agendas instead of email threads?" |
| Screen Time + Email | "You check email 47 times/day but only get 12 that matter." | "Switch to 3x/day email batching?" |
| Email + Bank | "5 subscriptions charge you that you may have forgotten about." | "Review and cancel the dead ones?" |
| Browser + Email | "Jira emails trigger 20-min context switches 8x/day." | "Batch Jira into a 2x/day digest?" |
| YouTube + Chrome | "You watch 6h/week of cooking tutorials but don't collect recipes." | "Want a personal cookbook app that captures what you learn?" |

---

## 5. Privacy Design (Self-Export Model)

### Why Self-Export is Privacy by Architecture

The traditional approach: "Give us your credentials and trust our promise."
The self-export approach: "You pull your own data, hand us the file, we analyze it locally."

This is not just a better privacy story — it's a fundamentally different trust architecture:

| Dimension | OAuth / API Access | Self-Export + Local Analysis |
|-----------|-------------------|------------------------------|
| Account access | We have it | We never have it |
| Can we access more data later? | Yes (token stays valid) | No (we got one file, one time) |
| Can we access data without user knowing? | Theoretically yes | Impossible — user initiates every export |
| Data residency | Our servers | User's browser (IndexedDB) |
| "Delete my data" | Trust us to honor it | Close the browser tab |
| Attack surface | Our database is a target | Nothing to hack — no central data store |
| Regulatory burden | DPIA required, processor agreements | Minimal — we're a tool, not a data processor |

### Trust-Building UI

**1. The "What We Analyze" Screen (Before Upload)**

```
Drop your Google Takeout file here.

Here's what we'll look at:
  [checkmark] Email: who emailed you, when, how often (headers only)
  [checkmark] Calendar: meeting times, durations, participants
  [checkmark] Browser: sites visited, time spent, patterns
  [checkmark] YouTube: watch history, time patterns

Here's what STAYS on your computer:
  [lock] Your data is processed in your browser
  [lock] Nothing is uploaded to any server
  [lock] Close this tab = data is gone

  [How does this work? →]
```

**2. Live Processing Indicator**

While parsing, show real-time proof that it's local:

```
Processing your data...

[progress bar] 4,231 / 12,847 emails parsed

Network activity: NONE (check your browser dev tools)
Data location: Your browser's local storage
Server calls: 0
```

Inviting the user to verify via dev tools is the ultimate transparency move. It transforms skeptics into advocates.

**3. The "What We See" Dashboard**

After analysis, show a sample of raw data exactly as we parsed it:

```
Here's what one email looks like to us:

From: john.smith@company.com
To: you@gmail.com
Date: Mar 28, 2026, 2:14 PM
Subject: Weekly sync notes
Status: Read
Labels: Work, Important
Thread: 4 messages over 3 days
Attachments: 1 PDF (245 KB)

We stopped reading here. Everything below this line
in the actual file — the email body — was skipped.
```

**4. Subject Lines — The Gray Area**

Subject lines are technically metadata but feel like content. "RE: Your appointment with Dr. X" is revealing.

For the self-export model, this tension is softer because:
- The user chose to give us the file (not a persistent connection)
- Processing is local (we don't store or transmit subjects)
- But we should still be explicit: "We analyze subject lines to detect patterns like recurring reports. Subject content stays in your browser and is never sent anywhere."

### GDPR Position

With the self-export model, our GDPR obligations are dramatically reduced:

- **No data controller responsibilities** for the core analysis (data never leaves the user's device)
- **No data processing agreements needed** with Google/Microsoft/etc.
- **No breach notification obligations** for locally-processed data (nothing to breach)
- **DPIA scope is minimal** — we're a tool that processes files locally, like a calculator
- **If we add server-side features later** (accounts, cloud sync), GDPR applies to THAT, not to the file analysis

---

## 6. Step-by-Step Export Tutorials (The UX Bridge)

The biggest risk of self-export is friction. We solve this with hyper-specific tutorials.

### Google Takeout (Covers Email + Chrome + Calendar + YouTube + Search)

```
Get Your Google Data (takes 90 seconds to set up)

1. Open takeout.google.com
   [screenshot: Takeout homepage]

2. Click "Deselect all" at the top
   [screenshot: the deselect button, highlighted]

3. Scroll down and check these boxes:
   [checkmark] Mail
   [checkmark] Chrome
   [checkmark] Calendar
   [checkmark] YouTube and YouTube Music
   [checkmark] My Activity
   [screenshot: the checked boxes]

4. Scroll to bottom, click "Next step"
   [screenshot: next step button]

5. Choose:
   - Delivery method: "Send download link via email"
   - Frequency: "Export once"
   - File type: .zip
   - File size: 2 GB (default is fine)
   [screenshot: export settings]

6. Click "Create export"
   [screenshot: create button]

7. Wait for Google's email (usually 10 min - 24 hours)
   We'll remind you! Enter your email: [____________]

8. When it arrives, download the .zip and drop it here.
   [drop zone]
```

### Apple Screen Time (Instant, No Wait)

```
Get Your Screen Time Data (takes 15 seconds)

iPhone:
1. Open Settings → Screen Time
2. Tap "See All App & Website Activity"
3. Change to "Last 4 Weeks" at the top
4. Screenshot each page (apps list, pickups, notifications)
5. Drop screenshots here

Mac:
1. Open System Settings → Screen Time
2. Click "App Usage"
3. Screenshot the chart + app list
4. Drop screenshots here
```

**For screenshots, we use OCR (client-side via Tesseract.js) to extract the data.** No server needed. User can verify by checking our parsed output against what they see on screen.

### Browser History Export (Instant)

```
Get Your Browser History

Chrome:
1. Type chrome://history in your address bar
2. Click the three dots (⋮) → "Export browsing data"
3. Choose date range → Export
4. Drop the file here

Firefox:
1. Your history is stored at:
   Mac: ~/Library/Application Support/Firefox/Profiles/[xxx].default/places.sqlite
   [Copy path button]
2. Drop the places.sqlite file here

Safari:
1. Your history is at:
   ~/Library/Safari/History.db
   [Copy path button]
2. Drop the file here
```

### Design Principles for Tutorials

1. **Every step has a screenshot.** No guessing.
2. **Every step has a "I'm stuck" fallback.** Links to video walkthrough.
3. **Estimate the time.** "This takes 90 seconds of your time. Google needs 10 min - 24h to prepare."
4. **Show what they'll get.** "Once you upload, you'll see [preview of insights dashboard]."
5. **Minimize decisions.** "Check these 5 boxes" not "choose what you want."

---

## 7. MVP Scope — One-Week Build

### Goal

Upload a Google Takeout .zip, see your digital life X-rayed in 60 seconds. Entirely client-side.

### What Ships

**Day 1-2: File Parsers (Client-Side)**
- Drag-and-drop .zip upload + client-side extraction (JSZip)
- **MBOX parser** (email): Streaming via Web Streams API, headers-only extraction, stop at first blank line per RFC 2822
- **JSON parser** (Chrome history, YouTube, Search): Standard JSON.parse on extracted files
- **ICS parser** (Calendar): Parse iCal format for events, attendees, recurrence
- Store all parsed metadata in IndexedDB
- Progress bar per data source: "Email: 4,231 / 12,847 parsed"

**Day 3-4: Analysis Engine (Client-Side, Web Workers)**
- **Email analyzer:** Newsletter detection, response time calculation, volume patterns, priority scoring, thread analysis
- **Browser analyzer:** Top domains by visit count and time, usage patterns by hour/day, category detection (social, news, work, shopping)
- **Calendar analyzer:** Meeting load, back-to-back detection, meeting-free time calculation, recurring meeting audit
- **Cross-source correlator:** Email-triggers-browsing detection, meeting-density vs screen-time correlation, content consumption patterns
- All computation in Web Workers — doesn't block UI

**Day 5: Insights Dashboard + Tutorials**
- **"Your Digital Life"** — summary card: total emails, hours of screen time, meetings per week, top sites
- **"Email Report Card"** — newsletters (open rate + unsubscribe links), VIPs (response time), timing heatmap, quick wins
- **"Time Patterns"** — when you're in email vs browser vs meetings, overlaid on a 24h timeline
- **"Cross-Source Discoveries"** — the surprising correlations (email triggers, double-communication, forgotten subscriptions)
- **"Quick Wins"** — 5 personalized action items ranked by estimated time saved
- **Export tutorials** — step-by-step guides with screenshots for Google Takeout (primary) and Screen Time (secondary)
- **Shareable report** — downloadable PDF of findings

**Day 6-7: Screen Time OCR + Polish**
- Screenshot upload for Apple Screen Time / Android Digital Wellbeing
- Client-side OCR via Tesseract.js WASM build (no server)
- Extract app names, usage times, pickup counts from screenshot
- Integrate Screen Time data into the dashboard alongside Takeout data
- Error handling, empty states, "no data found" fallbacks
- Demo mode: pre-loaded sample data so users can see what they'll get before exporting

### What Doesn't Ship (but is designed for)

| Feature | Timeline | Why Deferred |
|---------|----------|-------------|
| Chrome extension (live email monitoring) | Week 2 | Takeout gives history; extension adds live feed later |
| Meta/Facebook data parsing | Week 2 | Different export format; lower priority than Google |
| Spotify/Netflix parsers | Week 3 | Long export wait times make these poor for first-run experience |
| Server-side accounts + cloud sync | Week 3-4 | Only needed when users want multi-device or sharing |
| Automated actions (unsubscribe, filters) | Week 2-3 | MVP shows insights; actions require account access |
| Bank/spending data analysis | Week 4+ | Requires PSD2 or manual CSV upload; regulatory complexity |

### Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| File processing | Entirely client-side (browser) | Privacy architecture: no server = no data to breach |
| ZIP extraction | JSZip (browser) | Handles Google Takeout .zip format, streams large files |
| MBOX parsing | Custom streaming parser (Web Streams API) | No library needed; RFC 2822 header parsing is simple |
| OCR | Tesseract.js (WASM) | Runs in browser, no server round-trip for screenshots |
| Storage | IndexedDB | Handles GBs of parsed metadata, persists across sessions |
| Analysis | Web Workers | Off-main-thread computation, no UI jank |
| Shareable report | Client-side PDF generation (jsPDF) | User can share insights without us having them |
| Framework | Next.js (static export) | Existing stack; can be deployed as static site initially |

### Performance Budget

| Operation | Data Size | Expected Time | Method |
|-----------|----------|--------------|--------|
| Extract Takeout .zip | 2 GB typical | 10-30 sec | JSZip streaming |
| Parse MBOX headers (10K emails) | ~500 MB raw, ~5 MB headers | 15-30 sec | Web Streams, stop at blank line |
| Parse Chrome history JSON | ~5 MB | <1 sec | JSON.parse |
| Parse Calendar ICS | ~1 MB | <1 sec | Custom parser |
| Analysis (all sources) | 5-50 MB parsed metadata | 2-5 sec | Web Workers |
| OCR one screenshot | ~2 MB PNG | 3-5 sec | Tesseract.js WASM |
| **Total: upload → insights** | — | **30-60 seconds** | — |

---

## 8. Meldar Fit

### How This Connects to the Product

Self-export intelligence is the **Discover tier** — it answers "what should I automate?" without the user giving us account access. This maps directly to Meldar's value prop:

```
User exports their own data (we guide them step by step)
  -> Drops file into Meldar (client-side analysis)
  -> Sees "You waste 4.2 hours/month on newsletters you never read" (insight)
  -> Sees "Your Jira emails trigger 8 context switches/day" (cross-source discovery)
  -> "Want me to fix this?" (guided setup → Tier 2)
  -> Meldar builds custom automations (auto-build → Tier 3)
```

The self-export model is the **trust bridge**: users see value before granting any access. Once they trust Meldar's insights, they're far more willing to connect accounts for live automation (Tier 2-3).

### Why Self-Export First

1. **Zero-trust entry point.** No permissions, no credentials, no "connect your account" anxiety.
2. **Architecturally private.** Not a promise — a technical fact. No server, no data to breach.
3. **Universal.** Works for Gmail, Outlook, ProtonMail, Fastmail — any MBOX export. Works for any browser, any calendar app.
4. **GDPR as a feature.** "Use your right to data portability for the first time ever." We're the tool that makes GDPR Art. 20 actually useful to regular people.
5. **Instant gratification.** Upload → 60 seconds → comprehensive digital life analysis.
6. **Proves the model.** If self-export analysis delivers value, users trust us with more (live connections, account access).
7. **Differentiator.** No competitor does this. SaneBox, Clean Email, Unroll.me all require account access. We don't.

### Competitive Position

| Competitor | Their Model | Our Model |
|-----------|------------|-----------|
| SaneBox, Clean Email | "Give us your email credentials" | "Export your own data, we analyze locally" |
| Unroll.me | OAuth + reads all email (sold data to Uber) | Client-side only, data never leaves browser |
| Gmail filters | Manual setup, one source | Auto-discovered, cross-source |
| Superhuman, Hey | Replace your email client | Layer on top of everything |
| Screen Time (Apple) | Shows you numbers | Tells you what to DO about the numbers |
| RescueTime | Always-on tracking agent | One-time export analysis (no surveillance) |

---

## 9. Risks & Open Questions

| Risk | Mitigation |
|------|-----------|
| Google Takeout export wait is too long (hours) | Show demo insights while waiting; Screen Time screenshots as instant alternative; email reminder when ready |
| Users don't know about Google Takeout | Tutorial with screenshots; position as "Use your right to your own data" |
| MBOX files are huge (multi-GB) | Stream-parse headers only; never load full file into memory |
| Screen Time OCR is inaccurate | Show parsed results for user to verify/correct; fallback to manual entry |
| Users want live/ongoing analysis, not one-time | Chrome extension (Week 2) adds live feed; position V1 as "your digital checkup" |
| Google changes Takeout format | MBOX is RFC standard; JSON formats are simple; low risk |
| Users don't complete the export flow | "We'll email you a reminder"; demo mode shows what they'll get; gamify: "Your data is being prepared..." |
| Client-side performance on low-end devices | Web Workers prevent UI blocking; progressive parsing; can skip sources |

### Open Questions

1. **Should email be the hero or should we lead with "your full digital life"?** Email is richest but the cross-source story is more unique and differentiated.
2. **Do we charge for the analysis or use it purely as a lead-gen tool?** The analysis itself could be a free tool that drives signups for live automation features.
3. **Can we parse Screen Time screenshots reliably enough?** OCR on structured UI screenshots should be high-accuracy, but needs testing across iOS/Android versions and languages.
4. **Should we open-source the parsers?** This would build trust ("inspect the code yourself") and create a community of contributors adding new data sources.
5. **How do we handle re-analysis?** User exports again 3 months later — do we show a diff? "Your email volume dropped 30% since you unsubscribed from those newsletters."
