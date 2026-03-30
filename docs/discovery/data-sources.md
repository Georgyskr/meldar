# Data Sources Discovery

> Research date: 2026-03-30

This document catalogs every data source considered for the project, including exact data fields, formats, privacy constraints, and how easily a non-technical user can access each one.

---

## PRIMARY PATH: User Self-Export Model

> **Core principle:** The user exports their own data using GDPR/privacy rights they already have. They hand us a file. We find the patterns. We NEVER touch their accounts.

### Why This Wins

| | Self-Export Model | API/OAuth Model |
|---|---|---|
| **Trust** | "I downloaded my own data and chose to share it" | "I gave this app access to my Google account" |
| **Legal** | User exercises their own data rights; we just parse files | We store tokens, handle scopes, need privacy policy, DPA |
| **Engineering** | Parse ZIP/JSON/CSV/XML files | Build OAuth flows, handle token refresh, API rate limits |
| **Maintenance** | File formats change rarely | APIs break, scopes get restricted, verification requirements change |
| **Onboarding** | "Follow these 3 steps, upload" | "Click authorize, approve scopes, trust us" |

### Complete Export Catalog: Every Source, Exact Steps, Exact Format

---

### 1. Google Takeout (THE MOTHERLODE)

**What it covers:** Gmail, Calendar, Chrome, YouTube, Search, Fit, Maps, Drive, and ~45 more products. One export = years of digital life.

**User steps (3 minutes):**
1. Go to [takeout.google.com](https://takeout.google.com)
2. Click "Deselect all"
3. Check: **Chrome**, **Google Calendar**, **Fit**, **My Activity**, **YouTube and YouTube Music**, **Location History**, **Mail** (optional)
4. Scroll down, click **"Next step"**
5. Choose: Export once > .zip > 2GB split
6. Click **"Create export"**
7. Wait for email (minutes to hours), click download link
8. Upload ZIP to our app

**Format:** ZIP containing per-product folders. Download link valid for 7 days.

**What we parse from the ZIP:**

| Folder/File | Format | Key fields | Insight |
|---|---|---|---|
| `Chrome/BrowserHistory.json` | JSON | `url`, `title`, `time_usec`, `page_transition` | Browsing habits, site categories, time patterns |
| `YouTube and YouTube Music/history/watch-history.json` | JSON | `title`, `titleUrl`, `time`, `subtitles[].name` (channel) | Entertainment vs. learning time, binge patterns |
| `YouTube and YouTube Music/history/search-history.json` | JSON | `title` (query), `time` | Interest patterns, curiosity topics |
| `Google Calendar/` | ICS (`.ics`) | `SUMMARY`, `DTSTART`, `DTEND`, `ATTENDEE`, `RRULE` | Meeting load, work-life balance |
| `Fit/Daily activity metrics/` | CSV | `Date`, `Steps`, `Distance`, `Calories`, `Heart Points`, `Active minutes` | Activity trends |
| `Fit/All Sessions/` | CSV | `Activity`, `Start time`, `End time`, `Calories` | Workout patterns |
| `My Activity/Search/MyActivity.json` | JSON | `title` (query), `time` | What you google and when |
| `My Activity/` (various) | JSON/HTML | `title`, `time`, `products[]` | Cross-product activity timeline |
| `Location History/` | JSON | `latitudeE7`, `longitudeE7`, `timestamp`, `placeVisit` | Commute, time at locations |
| `Mail/` | MBOX | Headers (From, To, Date, Subject), labels | Email volume, top contacts, response patterns |

**Typical size:** 500 MB - 50 GB (mostly photos/Drive if included; with our recommended selection: 50-500 MB).

---

### 2. Apple Health Export

**What it covers:** Sleep, steps, heart rate, workouts, weight, mindfulness, nutrition — everything from Apple Watch + iPhone sensors.

**User steps (30 seconds):**
1. Open **Health** app on iPhone
2. Tap your **profile picture** (top right)
3. Scroll down, tap **"Export All Health Data"**
4. Tap **"Export"** (confirm the warning)
5. Share via AirDrop/Files/Mail/etc.
6. Upload ZIP to our app

**Format:** ZIP containing `export.xml` (main data) + `export_cda.xml` (clinical, if any).

**What we parse:**

| XML Element | Key attributes | Insight |
|---|---|---|
| `Record type="HKCategoryTypeIdentifierSleepAnalysis"` | `value` (InBed/AsleepCore/AsleepDeep/AsleepREM/Awake), `startDate`, `endDate` | Sleep duration, quality, consistency |
| `Record type="HKQuantityTypeIdentifierStepCount"` | `value`, `startDate`, `endDate`, `sourceName` | Daily activity |
| `Record type="HKQuantityTypeIdentifierHeartRate"` | `value` (bpm), `startDate`, motion context | Resting HR trends, stress proxy |
| `Record type="HKQuantityTypeIdentifierActiveEnergyBurned"` | `value`, `unit`, `startDate` | Calorie expenditure |
| `Record type="HKQuantityTypeIdentifierBodyMass"` | `value`, `unit`, `startDate` | Weight trends |
| `Workout` element | `workoutActivityType`, `duration`, `totalDistance`, `totalEnergyBurned` | Exercise habits |

**Typical size:** 100 MB - 2 GB for several years of Apple Watch data.

---

### 3. Instagram Data Download

**What it covers:** Viewing activity, interactions, messages, search history, ad interactions, login activity.

**User steps (1 minute + wait):**
1. Open **Instagram** app
2. Go to **Settings & privacy**
3. Tap **Accounts Center** > **Your information and permissions**
4. Tap **"Download your information"**
5. Tap **"Download or transfer information"**
6. Select your Instagram account
7. Choose **"Some of your information"** — select: **Activity across Meta**, **Logged information**, **Your topics**
8. Choose **"Download to device"**
9. Select format: **JSON**, Date range: **All time**
10. Tap **"Create files"**
11. Wait for email notification (15 min - 48 hours)
12. Download ZIP, upload to our app

**What we parse:**

| File path in ZIP | Format | Key fields | Insight |
|---|---|---|---|
| `your_instagram_activity/content/posts_viewed.json` | JSON | `string_map_data.Author.value`, `string_map_data.Time.timestamp` | Content consumption volume by hour |
| `your_instagram_activity/content/videos_watched.json` | JSON | `string_map_data.Author.value`, `string_map_data.Time.timestamp` | Video/Reels consumption patterns |
| `your_instagram_activity/content/ads_viewed.json` | JSON | `string_map_data.Author.value`, `string_map_data.Time.timestamp` | Ad exposure |
| `logged_information/search_history.json` | JSON | `string_map_data.Search.value`, `timestamp` | Interest patterns |
| `logged_information/login_activity.json` | JSON | `timestamp`, `ip_address`, `user_agent` | Usage sessions |
| `your_topics/your_topics.json` | JSON | topic strings | What Instagram thinks you like |

**Trick for estimating screen time:** Count posts/videos viewed per hour bracket. 40 items between 10-11pm = heavy usage that hour. Not exact, but a strong proxy.

---

### 4. TikTok Data Download

**What it covers:** Full watch history (every video URL), search history, likes, comments, DMs, login activity.

**User steps (1 minute + wait):**
1. Open **TikTok** app
2. Tap **Profile** > **Menu (☰)** > **Settings and privacy**
3. Tap **Account** > **Download your data**
4. Select **"Request data"** tab
5. Choose **JSON** format
6. Select **"Request data"**
7. Wait for notification (minutes to days)
8. Go back to **"Download data"** tab, tap **Download**
9. Upload to our app

**Alternative (web):** Visit `tiktok.com/setting/download-your-data`

**What we parse:**

| File | Format | Key fields | Insight |
|---|---|---|---|
| `Activity/Video Browsing History.json` | JSON | `VideoLink`, `Date` | Every video watched + timestamp |
| `Activity/Search History.json` | JSON | `SearchTerm`, `Date` | What you search for |
| `Activity/Like List.json` | JSON | `VideoLink`, `Date` | Content preferences |
| `Activity/Login History.json` | JSON | `Date`, `IP`, `DeviceModel`, `DeviceSystem` | Session frequency |

**Same screen-time estimation trick:** Videos-per-hour = usage intensity. Average TikTok video = 15-60 seconds, so 40 videos ~ 10-40 minutes of that hour.

---

### 5. Spotify Extended Streaming History

**What it covers:** Every song/podcast played, how long you listened, when, from what device.

**User steps (2 minutes + 30 day wait):**
1. Go to [spotify.com/account/privacy](https://www.spotify.com/account/privacy)
2. Scroll to **"Download your data"**
3. Untick **"Account data"**, tick **"Extended streaming history"**
4. Click **"Request data"**
5. Confirm via email link
6. Wait up to **30 days** (this is the slowest export)
7. Download ZIP when email arrives
8. Upload to our app

**Note:** There's also a quick "Account data" export with the last year of history, available in ~5 days.

**What we parse:**

| File | Format | Key fields | Insight |
|---|---|---|---|
| `StreamingHistory_music_*.json` | JSON | `ts` (timestamp), `master_metadata_track_name`, `master_metadata_album_artist_name`, `ms_played`, `platform`, `reason_start`, `reason_end` | Listening patterns, mood proxy, focus music vs. casual |
| `StreamingHistory_podcast_*.json` | JSON | `ts`, `episode_name`, `episode_show_name`, `ms_played` | Podcast habits, learning vs. entertainment |

**Key insight:** `ms_played` tells us exactly how long each track was played. Tracks skipped after 5 seconds vs. played to completion = engagement signal.

---

### 6. Netflix Viewing History

**What it covers:** Every title watched with date.

**User steps (30 seconds):**
1. Go to [netflix.com/viewingactivity](https://www.netflix.com/viewingactivity) (or Account > Profile > Viewing Activity)
2. Scroll to bottom, click **"Download All"**
3. CSV downloads immediately
4. Upload to our app

**Format:** CSV file (`NetflixViewingHistory.csv`)

**Fields:** `Title`, `Date`

**Limitation:** No duration data (no "watched 45 minutes of this 2-hour movie"). But title + date is enough for pattern analysis.

**What we derive:** Binge sessions (multiple episodes same day), genre preferences (by matching titles), late-night watching patterns.

---

### 7. X (Twitter) Archive

**What it covers:** All tweets, likes, DMs, engagement, ad interactions, profile data.

**User steps (2 minutes + wait):**
1. Go to [x.com](https://x.com) > **More** > **Settings and privacy**
2. Tap **Your account** > **Download an archive of your data**
3. Verify identity (password + confirmation code)
4. Click **"Request archive"**
5. Wait for email (24-48 hours)
6. Download ZIP
7. Upload to our app

**Format:** ZIP with HTML index + JSON data files.

**Key files:** Tweets, likes, DMs, ad engagements, followers/following, login history.

---

### 8. Facebook/Meta Data Download

**What it covers:** Posts, messages, ad interactions, search history, login activity, off-Facebook activity.

**User steps (2 minutes + wait):**
1. Go to **Facebook** > **Settings & privacy** > **Settings**
2. Click **"Download your information"** (under "Your Facebook information")
3. Select format: **JSON**
4. Select date range and categories
5. Click **"Request a download"**
6. Wait for notification (minutes to hours)
7. Download ZIP
8. Upload to our app

**Key data:** Off-Facebook activity (which other apps/sites report your activity to Facebook), ad interests, search history, login/session data.

---

### 9. Browser History (Direct SQLite — Power User Path)

**What it covers:** Complete browsing history with URLs, titles, visit counts, timestamps, visit duration.

**User steps (macOS — 1 minute):**

**Chrome:**
1. Quit Chrome
2. Copy `~/Library/Application Support/Google/Chrome/Default/History` to Desktop
3. Upload to our app

**Safari:**
1. Quit Safari
2. Copy `~/Library/Safari/History.db` to Desktop
3. Upload to our app

**Firefox:**
1. Quit Firefox
2. Copy `~/.mozilla/firefox/[PROFILE]/places.sqlite` to Desktop
3. Upload to our app

**Alternative (much easier):** Use Google Takeout for Chrome history — already covered above.

---

### 10. Apple Screen Time — Screenshot Path

**What it covers:** Per-app usage duration, pickups, notifications, category breakdown.

**Why screenshots?** Apple provides no export. The Screen Time API is locked to on-device native apps. But the data IS visible in Settings.

**User steps (1 minute):**
1. Go to **Settings** > **Screen Time** > **See All App & Website Activity**
2. Tap **"Week"** at top
3. Screenshot the **total time + category bar chart**
4. Scroll down, screenshot the **app list with times**
5. Tap **"Day"**, swipe through each day, screenshot each
6. Upload screenshots to our app

**What we can extract (via OCR/vision model):**
- Total daily/weekly screen time
- Per-app time (app name + hours:minutes)
- Category breakdown (Social, Entertainment, Productivity, etc.)
- Pickup count
- Notification count per app
- Most used after pickup

**This is scrappy but effective.** An LLM with vision (Claude, GPT-4V) can parse a Screen Time screenshot with near-perfect accuracy. No API needed.

---

### 11. macOS Screen Time — SQLite Database (Bonus)

**What it covers:** Per-app usage on Mac, and synced iOS data if iCloud Screen Time is enabled.

**User steps (30 seconds on Mac):**
1. Open Finder, press Cmd+Shift+G
2. Paste: `~/Library/Application Support/Knowledge/`
3. Copy `knowledgeC.db` to Desktop
4. Upload to our app

**Format:** SQLite. No special permissions needed — it's in your home folder.

**What we parse:**

| Query filter | Data |
|---|---|
| `ZSTREAMNAME = '/app/usage'` | App bundle ID + start/end time per session |
| `ZSTREAMNAME = '/app/inFocus'` | Which app was in foreground |
| `ZSTREAMNAME = '/device/isLocked'` | Device lock/unlock events |

**This is gold.** Every app, every session, exact timestamps, on-device. And if the user has iCloud Screen Time sync enabled, it includes iPhone/iPad data too.

---

### 12. Apple App Privacy Report (Bonus)

**What it covers:** Which apps accessed your location, camera, microphone, contacts, and which domains they contacted.

**User steps (1 minute):**
1. Go to **Settings** > **Privacy & Security** > **App Privacy Report**
2. (If not enabled: tap "Turn On App Privacy Report", wait a week for data to accumulate)
3. Tap **"Save App Activity"** at the bottom — exports a `.ndjson` file
4. Share/upload the file

**Format:** NDJSON (newline-delimited JSON). Each line is one access event.

**Fields:** App name, resource accessed (location/camera/mic/contacts/photos), timestamp, domain contacted, network context.

**Insight:** "Instagram accessed your location 47 times this week" or "This app contacts 12 tracking domains."

---

### Summary: The Self-Export Stack

| Source | User effort | Wait time | Format | File size | Insight richness |
|---|---|---|---|---|---|
| **Google Takeout** | 3 min | Min-hours | ZIP (JSON/ICS/CSV) | 50-500 MB | **Very High** — browsing, YouTube, calendar, search, fitness, location |
| **Apple Health** | 30 sec | Instant | ZIP (XML) | 100 MB-2 GB | **High** — sleep, activity, heart, weight |
| **Instagram** | 1 min | 15 min-48 hr | ZIP (JSON) | 50-500 MB | **Medium** — viewing patterns, search, sessions |
| **TikTok** | 1 min | Min-days | ZIP (JSON) | 10-100 MB | **Medium** — watch history, search, sessions |
| **Netflix** | 30 sec | Instant | CSV | < 1 MB | **Low-Medium** — titles + dates |
| **Spotify** | 2 min | Up to 30 days | ZIP (JSON) | 10-50 MB | **High** — exact ms per track, full history |
| **X (Twitter)** | 2 min | 24-48 hr | ZIP (JSON/HTML) | 10-500 MB | **Medium** — posts, likes, DMs, ad data |
| **Facebook** | 2 min | Min-hours | ZIP (JSON) | 100 MB-10 GB | **Medium-High** — off-FB activity, ads, search |
| **Screen Time (screenshot)** | 1 min | Instant | PNG images | < 5 MB | **High** — per-app usage, pickups, notifications |
| **macOS knowledgeC.db** | 30 sec | Instant | SQLite | 50-200 MB | **Very High** — per-app per-session usage |
| **Browser history (direct)** | 1 min | Instant | SQLite | 10-100 MB | **High** — every URL, visit time, duration |
| **Apple Privacy Report** | 1 min | Instant | NDJSON | 1-10 MB | **Medium** — app permissions, tracking domains |

### Recommended MVP: Start with Three

1. **Google Takeout** — single upload covers browsing + YouTube + calendar + search + fitness + location
2. **Apple Health** — sleep + activity + heart rate (the wellness foundation)
3. **Screen Time screenshots** — per-app usage via OCR (the most viral insight: "you spent 4 hours on Instagram today")

These three cover the broadest range of insights with the least user effort and zero API integrations.

---

## HACK PLAYBOOK: Maximum Value, Minimum Effort

> The laziest, cleverest shortcuts to get 80% of the insight from 20% of the effort.

### The One-Two Punch (covers ~80% of all insights)

| Step | What user does | Time | What we get |
|---|---|---|---|
| **1. Install our Chrome extension** | One click from Chrome Web Store | 10 sec | Real-time browsing, active tab tracking, idle detection, Google OAuth for Calendar/Gmail — ALL from one install |
| **2. Upload a Google Takeout ZIP** | Visit takeout.google.com, check boxes, download, drag-and-drop into our app | 3 min | YouTube history, Search history, Chrome history (backfill), Calendar events, Fit/health data, Maps location history — years of data in one shot |

That's it. Two actions. No native app. No App Store. No API keys. No OAuth consent screens for the user.

### Why a Chrome Extension is the Ultimate Cheat Code

A single Chrome extension with these Manifest V3 permissions gives us:

| Permission | What it unlocks | User-facing warning |
|---|---|---|
| `history` | Full browsing history: URLs, titles, visit counts, timestamps | "Read your browsing history" |
| `idle` | Detect idle/active/locked state — know when user is actually at the computer | None |
| `tabs` | Real-time active tab URL + title — live screen-time tracking | "Read your browsing history" (same as history) |
| `storage` | Local data persistence for tracking sessions | None |
| `identity` | **Free Google OAuth** — `chrome.identity.getAuthToken()` silently gets a Google token for the already-signed-in Chrome user. No popup, no redirect, no consent screen (if scopes are pre-approved). | "Know your email address" |
| `alarms` | Periodic background wake-ups for aggregation | None |

**The identity permission is the unfair advantage.** Because Chrome users are already signed into Google, we can call `chrome.identity.getAuthToken({ interactive: false })` and silently get an OAuth token with scopes for:
- `calendar.readonly` — all calendar events, no extra login
- `gmail.metadata` — email metadata (sender, subject, timestamp, labels), no email body
- `fitness.activity.read` / `fitness.sleep.read` — Google Fit data

The user installs one extension and we get: browser history + real-time tab tracking + idle detection + Google Calendar + Gmail metadata + Google Fit. **Seven data sources from one install.**

### macOS Screen Time: The Secret Database Hack

On macOS, Screen Time data is stored in a plain SQLite database that requires NO special permissions to read:

```
~/Library/Application Support/Knowledge/knowledgeC.db
```

**Key table:** `ZOBJECT` where `ZSTREAMNAME = '/app/usage'`

| Field | What it contains |
|---|---|
| `ZVALUESTRING` | App bundle ID (e.g., `com.apple.Safari`) |
| `ZSTARTDATE` | Session start (Mac epoch: seconds since 2001-01-01) |
| `ZENDDATE` | Session end |
| Duration (computed) | `ZENDDATE - ZSTARTDATE` = usage in seconds |

**The hack:** A lightweight CLI tool or Electron wrapper that runs `sqlite3` on this file can extract per-app usage for every app on the Mac — without Apple's Screen Time API, without entitlements, without App Store approval. This also includes Screen Time data synced from iPhone/iPad if iCloud sync is enabled.

**Limitation:** This only works on macOS. iOS requires jailbreak or the locked-down Screen Time API.

**Effort:** ~50 lines of Python/Node to parse. Could ship as a one-click "Scan my Mac" button in the web app that invokes a tiny downloadable script.

### Google Takeout: The Treasure Chest

Instead of building OAuth flows for 10 Google APIs, just ask users to upload their Takeout ZIP. One upload gives us:

| Takeout Product | File format | Key insight |
|---|---|---|
| Chrome History | JSON | Browsing patterns (backfill — extension covers real-time) |
| YouTube Watch History | JSON | Entertainment/learning time, video categories |
| YouTube Search History | JSON | Interest patterns |
| Google Calendar | ICS | Meeting load, work-life balance, time allocation |
| Google Fit | CSV/JSON | Sleep, steps, heart rate, activity |
| Maps Location History | JSON/GeoJSON | Commute patterns, time at office vs. home |
| Search History | JSON | What you're curious about, when |
| My Activity | JSON/HTML | Cross-product activity timeline |
| Gmail (MBOX) | MBOX | Email volume, top senders — heavier to parse but possible |

**The user does one drag-and-drop. We parse everything server-side (or client-side for privacy). No API integrations needed.**

### Apple Health: One Tap, One Upload

User flow: Settings > Health > Export All Health Data > Share ZIP > Upload to our app.

Gives us: sleep stages (deep/REM/light/awake), steps, heart rate, workouts, weight — everything needed for the "you slept 5 hours and wonder why you're unproductive" insight.

Format is XML but well-structured. Plenty of open-source parsers exist.

### Instagram/TikTok: Ask Users to Upload Their Data Download

Both platforms have in-app "Download Your Data" flows (Settings > Privacy > Download). JSON format preferred.

| Platform | Key data for us | What's missing |
|---|---|---|
| Instagram | Posts viewed (author + timestamp), videos watched, search history, login activity | Aggregate screen time (not in export) |
| TikTok | Full watch history (video URLs + timestamps), search history | Aggregate usage time, engagement time per video |

**The trick:** We can estimate time spent by counting videos watched per hour. 50 TikToks watched between 10pm-11pm = that hour was spent on TikTok. Not perfect, but 80% accurate and zero integration cost.

### Shortcut Priority Matrix

| Shortcut | Effort | Data richness | User friction | Ship in |
|---|---|---|---|---|
| **Chrome extension** (history + tabs + idle + Google OAuth) | Medium | Very High | One click install | MVP |
| **Google Takeout upload** (parse ZIP) | Low | Very High | 3-min export + drag-drop | MVP |
| **Apple Health upload** (parse XML) | Low | High (sleep/activity) | 2 taps + upload | MVP |
| **macOS knowledgeC.db reader** | Low | High (all app usage) | Download tiny script, run | V1.1 |
| **Instagram/TikTok upload** (parse JSON) | Low | Medium | In-app download + upload | V1.1 |
| **Gmail API via extension OAuth** | Medium | Medium | Already covered by extension | V1.1 |
| **Native iOS app** (Screen Time API) | Very High | High | App Store install | V2+ |

### What we DON'T need to build

- **No backend OAuth flows** — Chrome extension handles Google auth silently
- **No Apple Screen Time API integration** — just read the SQLite db on macOS
- **No Instagram/TikTok API** — user uploads their data download
- **No browser history scraping** — extension reads it natively via `chrome.history` API
- **No Google Fit API integration** — Takeout CSV covers it
- **No separate Calendar integration initially** — Takeout ICS covers backfill, extension OAuth covers real-time

---

## Detailed Source Catalog

> The sections below provide complete technical details for each data source.

---

## 1. Apple Screen Time

### Is there an API?

Yes. Apple introduced the **Screen Time API** (iOS 15 / macOS Monterey, expanded in iOS 16+) comprising three frameworks:

| Framework | Purpose |
|---|---|
| **FamilyControls** | Authorization & family sharing |
| **ManagedSettings** | App/website blocking, shield configurations |
| **DeviceActivity** | Usage monitoring, thresholds, custom reports |

### What can a third-party app read?

- **App-level usage duration** (e.g., "Safari — 10 min at 11:00 AM")
- **Category-level usage** (Social, Entertainment, etc.)
- **Device pickups** — NOT directly via API; only viewable in the native Screen Time UI
- **Threshold callbacks** — get notified when a usage threshold is hit
- **Custom reports** (iOS 16+) — DeviceActivityReport lets apps build SwiftUI views from on-device usage data

### What it CANNOT do

- **No raw data export** — usage data never leaves the device; the API only provides opaque tokens and on-device rendering
- **No notification count** — not exposed
- **No pickup count** — not exposed via API
- Third-party apps cannot read another app's content, only that it was used and for how long

### Data fields (via DeviceActivityReport)

| Field | Type | Notes |
|---|---|---|
| Application token | Opaque | Identifies app without revealing bundle ID to server |
| Category token | Opaque | Identifies category |
| Usage duration | TimeInterval | Per-app, per-category |
| Timing window | DateInterval | Start/end of monitoring period |

### Privacy scope

- Data stays on-device; privacy-by-design
- Requires `com.apple.developer.family-controls` entitlement (must be approved by Apple)
- User must explicitly authorize the app

### Ease of access for non-technical user

**Hard.** There is no way to export Screen Time data without building a native iOS/macOS app or using a third-party app from the App Store that uses this API. The native Screen Time UI shows data but has no export button. **Rating: 4/5 difficulty.**

---

## 2. Google Takeout

### What is it?

A Google service (takeout.google.com) that lets users export data from ~54 Google products as a downloadable ZIP archive.

### Key products & data included

| Product | Format | Key data |
|---|---|---|
| **Gmail** | MBOX | All emails, labels, attachments |
| **Google Drive** | Native formats / ZIP | Documents, spreadsheets, presentations, folder structure |
| **Google Photos** | JPEG/PNG/MP4 + JSON metadata | Photos, videos, albums, timestamps, GPS |
| **Google Calendar** | ICS / JSON | Events, reminders, settings |
| **Chrome** | JSON | Bookmarks, history, search queries, autofill |
| **YouTube** | JSON / HTML | Watch history, search history, subscriptions, comments, playlists, liked videos |
| **Google Maps** | JSON / GeoJSON | Location history, timeline, saved places, reviews |
| **Google Fit** | CSV / JSON | Steps, heart rate, sleep, activity sessions, daily summaries |
| **Google Play** | JSON | Install history, purchases, reviews, library |
| **Contacts** | vCard | All contacts and metadata |
| **Keep** | JSON / HTML | Notes, lists, labels |
| **Search** | JSON | Search history, ad clicks |
| **My Activity** | JSON / HTML | Cross-product activity log with timestamps |
| **Access Log Activity** | JSON | Account access logs, IP addresses, devices |
| **Hangouts / Chat** | JSON | Message history |
| **Tasks** | CSV | Task lists |
| Others | Various | Blogger, Groups, News, Pay, Classroom, Arts & Culture, etc. |

### Typical export size

- Light user: 1–5 GB
- Heavy user (lots of photos/Drive): 50–200+ GB
- Gmail-heavy user: 10–30 GB

### Privacy scope

- User must authenticate with their Google account
- All data belongs to the user; no third-party access needed
- No API — this is a manual download process (or can be automated via Google Takeout API with OAuth)

### Ease of access for non-technical user

**Very easy.** Visit takeout.google.com, check boxes, click "Export." Download link arrives via email in minutes to hours. **Rating: 1/5 difficulty.**

---

## 3. Gmail API (Read-Only Metadata)

### Relevant scopes

| Scope | Access level | Sensitivity |
|---|---|---|
| `gmail.metadata` | Message ID, labels, headers only | **Restricted** (requires Google verification) |
| `gmail.readonly` | Full message content + metadata | **Restricted** |

### What `gmail.metadata` provides (no email body)

| Field | Description |
|---|---|
| `id` | Immutable message ID |
| `threadId` | Conversation thread ID |
| `labelIds` | Applied labels (INBOX, SENT, CATEGORY_SOCIAL, custom labels, etc.) |
| `internalDate` | Epoch ms timestamp (when Google accepted the message) |
| `snippet` | Short preview text (~100 chars) — **technically part of metadata scope** |
| Headers (via `metadataHeaders` param): | |
| — `From` | Sender email + display name |
| — `To` | Recipient(s) |
| — `Cc`, `Bcc` | Copy recipients |
| — `Subject` | Email subject line |
| — `Date` | RFC 2822 date |
| — `Message-ID` | Unique message identifier |
| — `In-Reply-To` | Threading reference |
| — `List-Unsubscribe` | Mailing list indicator |

### Key limitations

- **No search with `gmail.metadata`** — the `q` parameter does not work; you must paginate through all messages and filter client-side
- **Bug when combining scopes** — using both `gmail.metadata` and `gmail.readonly` on the same token can break query functionality
- Requires OAuth consent + Google Cloud project + verification for restricted scopes

### What you can derive WITHOUT reading content

- Email volume over time (sent/received per day/week)
- Top contacts (most frequent senders/recipients)
- Label distribution (how much is spam, promotions, primary, etc.)
- Response time patterns (timestamp of received vs. reply)
- Newsletter/subscription inventory (via List-Unsubscribe header)
- Active hours (when emails are sent)

### Ease of access for non-technical user

**Hard.** Requires setting up a Google Cloud project, OAuth consent screen, and handling tokens. Not feasible in under 2 minutes without a pre-built app. **Rating: 5/5 difficulty** (without a wrapper app).

---

## 4. Google Calendar API

### Scope

`https://www.googleapis.com/auth/calendar.readonly` — read-only access to all calendars.

### Event resource fields

| Field | Type | Description |
|---|---|---|
| `summary` | string | Event title |
| `description` | string | Event description/notes |
| `location` | string | Location text |
| `start.dateTime` / `start.date` | datetime/date | Start time (timed) or date (all-day) |
| `end.dateTime` / `end.date` | datetime/date | End time |
| `timeZone` | string | IANA timezone |
| `recurrence` | string[] | RRULE/RDATE/EXDATE (RFC 5545) |
| `attendees[]` | array | Each: `email`, `displayName`, `responseStatus`, `organizer`, `self`, `optional` |
| `organizer` | object | `email`, `displayName` |
| `creator` | object | `email`, `displayName` |
| `status` | string | confirmed / tentative / cancelled |
| `transparency` | string | `opaque` (busy) or `transparent` (free) |
| `visibility` | string | default / public / private / confidential |
| `colorId` | string | Color category |
| `reminders` | object | Override or default reminders |
| `conferenceData` | object | Google Meet / Hangouts link |
| `created` | datetime | When event was created |
| `updated` | datetime | Last modified |
| `htmlLink` | string | Link to event in Google Calendar |

### FreeBusy API

Separate endpoint: `freebusy.query` — returns busy intervals for given calendars without exposing event details. Useful for time-audit without reading private event content.

### What you can derive

- **Time audit**: hours/week in meetings, focus time, categories of events
- **Meeting patterns**: average meeting duration, recurring vs. one-off ratio
- **Attendee patterns**: who you meet with most
- **Scheduling habits**: when meetings cluster, free time distribution
- **Work-life balance**: events outside working hours

### Ease of access for non-technical user

**Medium.** Google Calendar has a native ICS export (Settings > Export), which gives you everything in a standard format any calendar app can read. For API access, same difficulty as Gmail API. **Rating: 2/5 difficulty** (via ICS export) or **5/5** (via API).

---

## 5. Apple Health / Google Fit

### Apple Health Export

**How to export:** Settings > Health > Export All Health Data (on iPhone).

**Format:** ZIP containing `export.xml` (all data) and `export_cda.xml` (clinical data if available).

**Key data types:**

| Category | Types | Fields |
|---|---|---|
| **Activity** | Steps, Distance, Flights Climbed, Active Energy | `startDate`, `endDate`, `value`, `unit`, `sourceName`, `device` |
| **Sleep** | SleepAnalysis | `value` (InBed, Asleep, Awake, Core, Deep, REM), `startDate`, `endDate` |
| **Heart** | Heart Rate, Resting HR, HRV, Walking HR | `value`, `unit`, `startDate`, `motion context` |
| **Body** | Weight, Height, BMI, Body Fat % | `value`, `unit`, `date` |
| **Mindfulness** | Mindful Minutes | `startDate`, `endDate`, `duration` |
| **Nutrition** | Calories, Water, Caffeine, Macros | `value`, `unit`, `date` |
| **Workouts** | Type, Duration, Distance, Energy | `workoutActivityType`, `duration`, `totalDistance`, `totalEnergyBurned` |

**Size:** Typically 100 MB – 2 GB for several years of Apple Watch data.

### Google Fit Export (via Takeout)

**How to export:** Google Takeout > select Fit.

**Format:** CSV and JSON files.

**Key data types:**

| Type | Fields |
|---|---|
| Steps | timestamp, value, source |
| Heart Rate | timestamp, bpm, source |
| Sleep | session start/end, sleep stages (awake, light, deep, REM) |
| Activity Sessions | type (walking, running, cycling, etc.), start, end, calories |
| Daily Summaries | date, steps, distance, calories, active minutes, heart points |
| Weight / Body | timestamp, value |

### What you can derive (the "you sleep 5 hours" insight)

- **Sleep duration trends** — average, variance, worst nights
- **Sleep quality** — time in deep vs. REM vs. light
- **Activity correlation** — steps/exercise on days with good vs. bad sleep
- **Recovery patterns** — resting heart rate trends
- **Consistency** — bedtime/wake time regularity

### Ease of access for non-technical user

- **Apple Health:** Easy — tap export on iPhone, get a ZIP. But the XML is not human-readable without a tool. **Rating: 2/5 difficulty** (export) + needs a parser.
- **Google Fit:** Easy via Takeout — CSV files are directly openable in Excel. **Rating: 1/5 difficulty.**

---

## 6. Browser History

### Chrome

| Property | Value |
|---|---|
| **File** | `History` (no extension) |
| **Format** | SQLite3 |
| **macOS path** | `~/Library/Application Support/Google/Chrome/Default/History` |
| **Windows path** | `C:\Users\[Name]\AppData\Local\Google\Chrome\User Data\Default\History` |
| **Linux path** | `~/.config/google-chrome/Default/History` |

**Key tables & fields:**

| Table | Fields |
|---|---|
| `urls` | `id`, `url`, `title`, `visit_count`, `typed_count`, `last_visit_time` |
| `visits` | `id`, `url` (FK), `visit_time`, `from_visit`, `transition`, `visit_duration` |
| `segments` | `id`, `name`, `url_id` |

**Timestamps:** WebKit epoch (microseconds since 1601-01-01).

### Safari

| Property | Value |
|---|---|
| **File** | `History.db` |
| **Format** | SQLite3 |
| **macOS path** | `~/Library/Safari/History.db` |

**Key tables & fields:**

| Table | Fields |
|---|---|
| `history_items` | `id`, `url`, `domain_expansion`, `visit_count`, `daily_visit_counts` |
| `history_visits` | `id`, `history_item` (FK), `visit_time`, `title`, `redirect_source`, `redirect_destination` |

**Timestamps:** Mac epoch (seconds since 2001-01-01).

### Firefox

| Property | Value |
|---|---|
| **File** | `places.sqlite` |
| **Format** | SQLite3 |
| **Path** | `~/.mozilla/firefox/[PROFILE]/places.sqlite` (Linux/Mac) |

**Key tables & fields:**

| Table | Fields |
|---|---|
| `moz_places` | `id`, `url`, `title`, `visit_count`, `frecency`, `last_visit_date` |
| `moz_historyvisits` | `id`, `place_id` (FK), `visit_date`, `visit_type`, `from_visit` |

**Timestamps:** Unix epoch in microseconds.

**Note:** Firefox must be closed before reading `places.sqlite` (database lock).

### What you can derive from browser history

- **Time spent on categories** — social media, news, work tools, entertainment
- **Productivity patterns** — when you're on work sites vs. distraction sites
- **Most visited sites** — frequency and recency
- **Browse sessions** — cluster visits by time gaps to identify sessions
- **URL patterns** — e.g., time on docs vs. Slack vs. Reddit

### Ease of access for non-technical user

**Medium-Hard.** No browser has a native "export history" button. Users must either:
1. Copy the SQLite file and use a tool like DB Browser for SQLite
2. Use a browser extension
3. Use Google Takeout for Chrome history (easiest path — **Rating: 1/5** via Takeout)
4. Direct SQLite access: **Rating: 4/5 difficulty**

---

## 7. Instagram / TikTok Usage Data

### Instagram Data Download

**How to request:** Settings > Accounts Center > Your Information and Permissions > Download Your Information.

**Format:** ZIP file containing JSON or HTML (user's choice).

**What's included:**

| Category | Data |
|---|---|
| **Profile** | Username, bio, email, phone, linked accounts, profile photo |
| **Posts** | Photos, videos, captions, timestamps, location tags |
| **Stories** | Media, timestamps |
| **Messages** | Full DM history (text, media, reactions) |
| **Activity** | Likes, comments, saves, searches |
| **Followers/Following** | Full lists with timestamps |
| **Posts Viewed** | Author + timestamp of viewing |
| **Videos Watched** | Author + timestamp of viewing |
| **Ads** | Ads clicked, ad interests, advertisers who uploaded your info |
| **Login Activity** | IP addresses, timestamps, devices |
| **Settings** | Privacy preferences, connected apps |

**What's NOT included:**
- **Aggregate screen time / usage duration** — Instagram does NOT export the "time spent" metric you see in the app
- **Algorithm signals** — no feed ranking data

**Processing time:** 15 minutes to 48 hours.

### TikTok Data Download

**How to request:** Settings > Privacy > Download Your Data.

**Format:** TXT or JSON (user's choice).

**What's included:**

| Category | Data |
|---|---|
| **Profile** | Username, bio, photo, email, phone, birthdate |
| **Videos** | Your posted videos metadata |
| **Favorites** | Saved/bookmarked videos |
| **Likes** | Liked video history |
| **Comments** | Your comment history |
| **Chat History** | DM conversations |
| **Watch History** | URLs of every video watched + timestamps |
| **Search History** | All search queries + timestamps |
| **Login History** | Devices, IPs, timestamps |
| **App Settings** | Privacy, notification, language settings |

**What's NOT included:**
- **Aggregate usage time** — the "Digital Wellbeing" screen time stat is not in the export
- **Algorithm/recommendation signals** — not provided
- **Engagement time per video** — not provided (just that you watched it)

**Processing time:** Minutes to hours.

### What you can derive

- **Content consumption patterns** — what times you browse, volume of content viewed
- **Social interaction patterns** — DM frequency, comment activity
- **Search interests** — what you're curious about
- **Approximate usage** — count of videos watched / posts viewed per day as a proxy for time

### Ease of access for non-technical user

**Easy.** Both platforms have in-app "Download Your Data" flows. **Rating: 1/5 difficulty.** But interpreting the JSON files requires some effort (**Rating: 3/5** to actually analyze).

---

## Summary Comparison

| Source | Key Insight Potential | Data Richness | Export Ease | API Available? | Privacy Sensitivity |
|---|---|---|---|---|---|
| **Apple Screen Time** | App usage duration | Medium (no raw export) | Hard | Yes (on-device only) | Low (stays on device) |
| **Google Takeout** | Everything Google | Very High | Very Easy | Limited | High |
| **Gmail API** | Communication patterns | High | Hard (needs app) | Yes | Very High |
| **Google Calendar API** | Time allocation | High | Easy (ICS) / Hard (API) | Yes | Medium |
| **Apple Health** | Sleep, activity, wellness | High | Easy (export button) | HealthKit (on-device) | High |
| **Google Fit** | Sleep, activity, wellness | Medium-High | Very Easy (Takeout) | Yes | High |
| **Browser History** | Attention & productivity | High | Medium | No | High |
| **Instagram** | Social media consumption | Medium | Easy | No | Medium |
| **TikTok** | Content consumption | Medium | Easy | Data Portability API | Medium |

### Recommended Priority for MVP

1. **Google Takeout** — single export covers Calendar, Chrome history, Fit, YouTube, Search. Massive insight surface with minimal friction.
2. **Apple Health export** — sleep + activity is the foundation for "you slept 5 hours" type insights.
3. **Browser History (via Takeout or SQLite)** — attention/productivity patterns.
4. **Instagram/TikTok data download** — social media consumption quantification.
5. **Google Calendar API** — rich time-audit data (or use Takeout's ICS export).
6. **Gmail API metadata** — powerful but high implementation cost and OAuth verification overhead.
7. **Apple Screen Time** — most valuable data, hardest to access programmatically. Consider as a V2 feature requiring a native companion app.
