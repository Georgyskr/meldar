# Data Export Formats Research

> **Purpose:** Catalog every user-facing data export that Meldar could ingest through the Discovery Engine's effort-escalation funnel.
> **Date:** 2026-03-31

---

## Table of Contents

1. [ChatGPT](#1-chatgpt)
2. [Claude (Anthropic)](#2-claude-anthropic)
3. [Spotify](#3-spotify)
4. [Instagram](#4-instagram)
5. [TikTok](#5-tiktok)
6. [YouTube (Google Takeout)](#6-youtube-google-takeout)
7. [Google Search (Google Takeout)](#7-google-search-google-takeout)
8. [Twitter / X](#8-twitter--x)
9. [Reddit](#9-reddit)
10. [WhatsApp](#10-whatsapp)
11. [Telegram](#11-telegram)
12. [Discord](#12-discord)
13. [Netflix](#13-netflix)
14. [Apple Health](#14-apple-health)
15. [Google Calendar](#15-google-calendar)
16. [Gmail (Google Takeout)](#16-gmail-google-takeout)
17. [Notion](#17-notion)
18. [Browser Bookmarks](#18-browser-bookmarks)
19. [Voice Memo as Input](#19-voice-memo-as-input)
20. [Screen Recording as Input](#20-screen-recording-as-input)
21. [Summary Matrix](#21-summary-matrix)

---

## 1. ChatGPT

| Field | Detail |
|---|---|
| **How to export** | Settings > Data Controls > Export Data > Confirm. Email arrives within minutes with a download link. |
| **Export format** | ZIP containing `conversations.json`, `chat.html`, `message_feedback.json`, `model_comparisons.json`, `shared_conversations.json`, `user.json` |
| **What data is included** | **conversations.json**: array of conversation objects, each with `id`, `title`, `create_time` (unix timestamp), `update_time`, `mapping` (tree of message nodes). Each message node contains `id`, `author.role` (system/user/assistant/tool), `content.parts[]` (text or file references), `create_time`, `metadata` (model_slug, finish_details). Also includes `user.json` with account info (email, phone, name), `model_comparisons.json` with A/B test votes. |
| **Meldar insights** | What topics users ask AI about most, time-of-day patterns (when do they turn to AI?), conversation length as a proxy for problem complexity, repeated questions (unsolved problems they keep returning to), model usage distribution (GPT-4 vs GPT-3.5 = willingness to pay for quality). |
| **User effort** | ~30 seconds (4 clicks + wait for email) |
| **Wait time** | Minutes (email with download link) |
| **Privacy sensitivity** | **High** — contains full conversation text, potentially including personal details, code, medical questions, financial info |
| **Gen Z relevance** | **Very high** — ChatGPT is the most-used AI tool among 18-28 year olds |

---

## 2. Claude (Anthropic)

| Field | Detail |
|---|---|
| **How to export** | Settings > Privacy > "Export data" button (web app or Claude Desktop only, not available on iOS/Android). Download link arrives via email within 24 hours. Link expires after 24 hours. |
| **Export format** | JSON (not human-readable out of the box). Delivered as a downloadable archive. |
| **What data is included** | Full conversation history (all messages with timestamps, user and assistant turns), account information (email, plan type). For Team/Enterprise plans, only the Primary Owner can export organization-wide data from Organization Settings > Data and Privacy. |
| **Meldar insights** | Similar to ChatGPT — topic patterns, time-of-day usage, conversation complexity. Cross-referencing with ChatGPT export shows which AI a user prefers for which tasks. Memory export (separately available) reveals user preferences and patterns the AI has learned. |
| **User effort** | ~30 seconds (3 clicks + wait for email) |
| **Wait time** | Up to 24 hours (email with link, link valid 24h) |
| **Privacy sensitivity** | **High** — full conversation history with personal context |
| **Gen Z relevance** | **High** — growing rapidly, especially among technically-inclined users and students |

---

## 3. Spotify

| Field | Detail |
|---|---|
| **How to export** | Account > Privacy Settings > "Download your data". Two options: (1) **Account data** (ready in ~5 days), (2) **Extended streaming history** (up to 30 days, usually 1-5 days). Select "Extended streaming history" for the richest data. |
| **Export format** | ZIP containing multiple JSON files named `Streaming_History_Audio_YYYY-YYYY_N.json` plus a `ReadMeFirst.pdf` |
| **What data is included** | Each stream record contains: `ts` (timestamp ISO 8601), `platform` (Android/iOS/web/desktop), `ms_played` (milliseconds played), `conn_country`, `ip_addr` (IP address), `master_metadata_track_name`, `master_metadata_album_artist_name`, `master_metadata_album_album_name`, `spotify_track_uri`, `episode_name`, `episode_show_name`, `spotify_episode_uri`, `reason_start` (fwd_btn, trackdone, clickrow, appload, etc.), `reason_end` (fwd_btn, trackdone, endplay, logout, etc.), `shuffle` (boolean), `skipped` (boolean or null), `offline` (boolean), `offline_timestamp`, `incognito_mode` (boolean). Also includes library data, playlists, search queries, and payment history. |
| **Meldar insights** | **Extremely rich.** Listening patterns by hour/day/week, skip rate (content dissatisfaction proxy), shuffle vs intentional listening, podcast vs music ratio, platform switching patterns, offline usage (commute proxy), session duration, "dead air" gaps between sessions, genre evolution over time, incognito usage patterns. The `reason_start` and `reason_end` fields reveal whether users actively choose content or passively let it autoplay — a direct measure of intentional vs passive consumption. |
| **User effort** | ~60 seconds (navigate to privacy settings, check box, confirm) |
| **Wait time** | 1-30 days (usually 1-5 days for extended history) |
| **Privacy sensitivity** | **Medium** — listening habits are personal but not sensitive. IP addresses are included. |
| **Gen Z relevance** | **Very high** — Spotify is the dominant music platform for 18-28 year olds. "Spotify Wrapped" proves this age group already cares about consumption insights. |

---

## 4. Instagram

| Field | Detail |
|---|---|
| **How to export** | Profile > Settings & Privacy > Accounts Center > Your information and permissions > Download your information > Request a download. Choose JSON format. Can select "All data" or specific categories. |
| **Export format** | ZIP containing folders of JSON files + media files. Choose JSON (not HTML) for machine readability. |
| **What data is included** | **Connections**: `followers_1.json` through `followers_N.json`, `following.json`, `close_friends.json`, `pending_follow_requests.json`, `recently_unfollowed_profiles.json`, `restricted_profiles.json`. Each entry has `href` (profile URL), `value` (username), `timestamp`. **Activity**: likes, comments (`post_comments_1.json`), saved posts, story interactions, reels watched. **Messages**: DM conversations with timestamps. **Media**: all posted photos/videos/stories/reels with metadata (location, timestamp, caption). **Searches**: search history with timestamps. **Ads**: ads viewed, ads clicked, advertiser interactions. |
| **Meldar insights** | Follow/unfollow churn (social anxiety patterns), time spent on DMs vs feed, saved posts reveal aspirational interests (recipes saved but never cooked, workouts saved but never done), comment patterns show engagement depth, ad interaction reveals purchase intent, story viewing patterns, reel watch duration as attention metric. |
| **User effort** | ~90 seconds (navigate through Accounts Center, select format, confirm) |
| **Wait time** | Hours to days (download link valid for 4 days) |
| **Privacy sensitivity** | **High** — DMs, social graph, location data, behavioral patterns |
| **Gen Z relevance** | **Very high** — primary social platform for the 18-28 demographic |

---

## 5. TikTok

| Field | Detail |
|---|---|
| **How to export** | Settings > Account > Download your data (or visit https://www.tiktok.com/setting/download-your-data). Select "JSON - Machine-readable file" format. Tap "Request data", then check "Download data" tab when ready. |
| **Export format** | ZIP containing JSON file(s) organized by category |
| **What data is included** | **Browsing/Watch History**: `VideoList` array with `Date` (YYYY-MM-DD HH:MM:SS) and `VideoLink` (URL). **Activity**: comments written, likes, search history, shared videos. **Social**: followers list, following list, blocked users, chat history. **Favorites**: favorite effects, hashtags, sounds, videos. **Profile**: personal information, settings. **Ads**: ad interests, advertiser interactions. |
| **Meldar insights** | Watch history timestamps reveal binge patterns (3am scrolling sessions), content categories via video URLs (can cross-reference with TikTok's public API for video metadata), search history shows curiosity patterns, favorite sounds/effects reveal creative interests, chat frequency shows social engagement level. The timestamp + video link data is enough to detect "doom scrolling" sessions (many videos in rapid succession). |
| **User effort** | ~45 seconds (4-5 taps) |
| **Wait time** | Hours to a few days |
| **Privacy sensitivity** | **Medium-High** — watch history reveals interests, chat history is private |
| **Gen Z relevance** | **Extremely high** — TikTok is THE platform for Gen Z. Highest engagement hours per day. |

---

## 6. YouTube (Google Takeout)

| Field | Detail |
|---|---|
| **How to export** | Google Takeout (takeout.google.com) > Deselect all > Select "YouTube and YouTube Music" > Click "Multiple formats" > Set History format to JSON > Click "All YouTube data included" and select "history" > Create export. |
| **Export format** | ZIP containing `watch-history.json` in `Takeout/YouTube and YouTube Music/history/` |
| **What data is included** | Each watch entry contains: `header` ("YouTube"), `title` (video title), `titleUrl` (video URL), `subtitles` (channel name + channel URL), `time` (ISO 8601 timestamp), `products` (["YouTube"]). Also includes search history, comments, likes, subscriptions, and playlists if selected. |
| **Meldar insights** | Video consumption patterns by hour/day, channel loyalty (how many unique channels vs repeat watching), content category distribution (education vs entertainment vs music), binge-watching detection (sequential watches of same channel/playlist), search-to-watch conversion (cross-reference search and watch history), subscription-to-watch ratio (paying attention vs collecting). |
| **User effort** | ~2 minutes (Google Takeout requires several clicks to configure) |
| **Wait time** | Hours to days (Google emails when ready) |
| **Privacy sensitivity** | **Medium-High** — viewing habits are personal, may include sensitive topics |
| **Gen Z relevance** | **Very high** — YouTube is the most-used video platform across all Gen Z age groups |

---

## 7. Google Search (Google Takeout)

| Field | Detail |
|---|---|
| **How to export** | Google Takeout (takeout.google.com) > Deselect all > Select "My Activity" > Choose JSON format > Create export. Search history is part of "My Activity" data. |
| **Export format** | ZIP containing JSON files in `Takeout/My Activity/Search/` directory. Note: Google changes export formats without notice, so the parser must be lenient. |
| **What data is included** | Each search entry contains: `header`, `title` (the search query), `time` (ISO 8601), `products` (["Search"]), and potentially `titleUrl` (link to search results). Also includes Google Assistant queries, Maps searches, and other Google product activity. |
| **Meldar insights** | **Extremely valuable.** Raw search queries reveal: what users are trying to learn, health concerns, purchase research, travel planning, relationship questions, career exploration, "how to" patterns (skill gaps), comparison shopping behavior, time-of-day curiosity patterns. Repeated searches on the same topic = unsolved problems. Search refinement chains show decision-making processes. |
| **User effort** | ~2 minutes (same Google Takeout flow) |
| **Wait time** | Hours to days |
| **Privacy sensitivity** | **Very high** — search history is extremely intimate (health, financial, relationship queries) |
| **Gen Z relevance** | **High** — though Gen Z also searches on TikTok and YouTube, Google Search remains dominant for functional queries |

---

## 8. Twitter / X

| Field | Detail |
|---|---|
| **How to export** | Settings > Your Account > Download an archive of your data > Request archive. Requires password re-entry. |
| **Export format** | ZIP containing `.js` files (JSON data wrapped in JavaScript: `window.YTD.tweets.part0 = [...]`). Includes an `index.html` for browser viewing. |
| **What data is included** | **Tweets**: `id_str`, `created_at`, `full_text`, `retweet_count`, `favorite_count`, `entities` (hashtags, URLs, mentions, media). **DMs**: direct message conversations. **Likes**: all liked tweets. **Followers/Following**: social graph. **Profile**: account info, connected apps, sessions, IP login history. **Ads**: ad impressions, targeting data, advertiser lists. **Moments**: curated collections. |
| **Meldar insights** | Posting frequency and time patterns, engagement ratio (likes received vs given), topic interests via hashtag analysis, retweet-to-original ratio (content creator vs consumer), DM conversation patterns, ad targeting data reveals how advertisers categorize the user (income bracket, interests, demographics). |
| **User effort** | ~30 seconds (4 clicks) |
| **Wait time** | 24-48 hours (email notification when ready) |
| **Privacy sensitivity** | **High** — DMs, IP addresses, ad targeting profile |
| **Gen Z relevance** | **Medium** — X/Twitter usage is declining among Gen Z, but still significant for news/discourse-oriented users |

---

## 9. Reddit

| Field | Detail |
|---|---|
| **How to export** | Settings > scroll to bottom > "Request your data" (or use GDPR data request). Requires verified email and account age 30+ days. Reddit sends a PM from u/RedditDataRequests with download link. |
| **Export format** | ZIP containing CSV files |
| **What data is included** | `comments.csv` (all comments with subreddit, body, created_utc), `posts.csv` (submissions), `chat_history.csv` (private messages), `subscribed_subreddits.csv`, `saved_content.csv`, `upvoted_content.csv`, `downvoted_content.csv`, `ip_logs.csv`. Fields include subreddit, created_utc, body/title, score. |
| **Meldar insights** | Subreddit subscriptions reveal interest taxonomy, comment history shows expertise areas and time investment, saved posts = aspirational/reference content, upvote/downvote patterns reveal values and preferences, posting time patterns, subreddit-to-engagement ratio (lurking vs participating). Cross-referencing subreddit categories (r/personalfinance, r/fitness, r/productivity) directly maps to Meldar pain point categories. |
| **User effort** | ~60 seconds |
| **Wait time** | 1-3 days (PM with download link) |
| **Privacy sensitivity** | **Medium-High** — comments are public but the aggregate view (subreddits + saved + votes) is very revealing. Excludes DMs and mod actions from public export. |
| **Gen Z relevance** | **High** — Reddit is a primary research/community platform for Gen Z, especially for product reviews, advice, and niche interests |

---

## 10. WhatsApp

| Field | Detail |
|---|---|
| **How to export** | Open specific chat > Tap contact/group name > Scroll down > "Export chat" > Choose "Without Media" or "Include Media". Exports one chat at a time (no bulk export). |
| **Export format** | TXT file (plain text). Each line: `[DD/MM/YYYY, HH:MM:SS] Sender: Message text`. Media attachments exported as separate files if included. |
| **What data is included** | Timestamps, sender names, message text. Up to 40,000 messages without media, 10,000 with media per export. Does NOT include: reactions, reply threading, group metadata, read receipts, or deleted messages. |
| **Meldar insights** | Communication patterns by time of day, response latency (time between messages), conversation frequency per contact, message length distribution (quick replies vs long discussions), media sharing frequency, group vs 1:1 ratio. Limited by per-chat export — requires user to export multiple chats individually. |
| **User effort** | ~30 seconds per chat (but must be done per-chat, so high effort for multiple chats) |
| **Wait time** | Instant (generates immediately) |
| **Privacy sensitivity** | **Very high** — private messages, conversations with family/partners/friends |
| **Gen Z relevance** | **Very high globally** — WhatsApp is the dominant messaging platform outside the US. In Europe, Latin America, India, and Africa, it's the primary communication tool for Gen Z. Less relevant in the US (where iMessage/Discord dominate). |

---

## 11. Telegram

| Field | Detail |
|---|---|
| **How to export** | Telegram Desktop only: Settings > Advanced > Export Telegram data. Select data categories and format (JSON or HTML). |
| **Export format** | ZIP containing `result.json` (main file) + media folders with referenced files. Can also export as HTML. |
| **What data is included** | **Chats**: all messages with `id`, `type`, `date`, `from`, `text` (with entity annotations for hashtags, URLs, mentions), `reply_to_message_id`, `forwarded_from`, `forward_sender_name`, `media_document_id`. **Contacts**: name, phone number. **Profile**: account info, profile photos. **Groups/Channels**: messages, member lists. Preserves `forward_sender_name` and `media_document_id` for message provenance. |
| **Meldar insights** | Channel subscriptions reveal information diet, message frequency across chats, forwarding patterns (information spreading behavior), bot interactions (automation usage), group participation levels, media sharing patterns. Telegram's rich metadata (forwards, replies, entity annotations) enables deeper conversation analysis than WhatsApp. |
| **User effort** | ~60 seconds (desktop app required) |
| **Wait time** | Minutes to hours (depends on data volume, processes locally) |
| **Privacy sensitivity** | **Very high** — private messages, phone numbers, group memberships |
| **Gen Z relevance** | **Medium-High** — popular in Eastern Europe, Middle East, and crypto/tech communities. Growing among Gen Z for group chats and channels. |

---

## 12. Discord

| Field | Detail |
|---|---|
| **How to export** | User Settings > Privacy & Safety > "Request all of my Data". Discord emails a download link when ready. |
| **Export format** | ZIP containing JSON files organized in folders: `account/`, `activity/`, `messages/`, `servers/` |
| **What data is included** | **Account**: user ID, username, email, phone, connected accounts (Spotify, GitHub, etc.), payment history, active sessions with IP addresses, friend list, block list. **Activity**: analytics events (actions taken within Discord), engagement metrics. **Messages**: organized by channel, each with Guild ID, Channel ID, Channel Name, User IDs. For DMs: Channel ID + User IDs. **Servers**: current memberships with server IDs. **Support**: help center ticket history. |
| **Meldar insights** | Server memberships reveal community affiliations, message volume per server/channel shows where attention goes, connected accounts provide cross-platform identity, activity analytics show engagement patterns, DM vs server ratio reveals social style (1:1 vs community), payment history shows spending on Nitro/boosts. |
| **User effort** | ~30 seconds (4 clicks) |
| **Wait time** | 24-48 hours (email with download link) |
| **Privacy sensitivity** | **High** — messages, social graph, IP addresses, connected accounts, payment info |
| **Gen Z relevance** | **Very high** — Discord is a primary social platform for Gen Z, used for gaming, study groups, communities, and increasingly as a general communication tool |

---

## 13. Netflix

| Field | Detail |
|---|---|
| **How to export** | Two methods: (1) **Quick**: Account > Profile > Viewing Activity > "Download all" at bottom of page. (2) **Full GDPR**: Account > Privacy & Settings > Get my data (includes more fields). |
| **Export format** | CSV file (`NetflixViewingHistory.csv` for quick export, `ViewingActivity.csv` for full GDPR export) |
| **What data is included** | **Quick export**: `Title`, `Date`. **Full GDPR export**: `Profile Name`, `Start Time` (UTC), `Duration` (viewing session length), `Attributes` (interaction details), `Title`, `Supplemental Video Type`, `Device Type`, `Bookmark`, `Latest Bookmark`, `Country`. Note: CSV uses UTF-8 encoding (select this when opening in Excel/Calc to avoid garbled non-Latin titles). |
| **Meldar insights** | Binge-watching detection (multiple episodes in sequence), viewing time patterns (late-night watching), genre preferences, abandoned shows (started but never finished), re-watching behavior (comfort content), session duration, device switching patterns (TV vs phone vs laptop). The `Duration` field enables precise time-waste calculation. |
| **User effort** | ~30 seconds (quick export) / ~60 seconds (GDPR export) |
| **Wait time** | Instant (quick export) / Hours (GDPR export) |
| **Privacy sensitivity** | **Low-Medium** — viewing habits are personal but rarely sensitive |
| **Gen Z relevance** | **High** — Netflix remains a major streaming platform for Gen Z, though competing with YouTube and TikTok for attention |

---

## 14. Apple Health

| Field | Detail |
|---|---|
| **How to export** | iPhone Health app > Profile picture (top right) > "Export All Health Data". Generates and shares a ZIP file. |
| **Export format** | ZIP containing two XML files: `export.xml` (main data) and `export_cda.xml` (clinical data). **Warning: files can be very large (500MB+) for long-time users.** |
| **What data is included** | Root tag `<HealthData>` with child elements: `<ExportDate>`, `<Me>` (user profile), `<Record>` (data points), `<Workout>` (exercise sessions), `<ActivitySummary>` (daily summaries). Each `<Record>` has attributes: `type` (e.g., HKQuantityTypeIdentifierStepCount, HeartRate, ActiveEnergyBurned, BodyMass, SleepAnalysis), `sourceName` (device/app), `device` (hardware + iOS version), `startDate`, `endDate`, `value`, `unit`. Common record types: StepCount, DistanceWalkingRunning, FlightsClimbed, HeartRate, ActiveEnergyBurned, BasalEnergyBurned, BodyMass, Height, SleepAnalysis, AppleExerciseTime, AppleStandHour. |
| **Meldar insights** | **Extremely rich for lifestyle analysis.** Sleep patterns (duration, consistency, quality), step counts (activity level), heart rate patterns (stress proxy), exercise frequency and type, weight trends, stand hours (sedentary behavior), screen time correlation (Apple Health can integrate with Screen Time data). Can cross-reference sleep data with other app usage to show "you scrolled TikTok for 2 hours before sleeping and slept 45 minutes less than your average." |
| **User effort** | ~30 seconds (3 taps) |
| **Wait time** | Seconds to minutes (generates locally on device, can be slow for large datasets) |
| **Privacy sensitivity** | **Very high** — medical data, biometrics, location (via workout routes), body measurements |
| **Gen Z relevance** | **High** — Apple Watch and Health app usage is growing among Gen Z, especially for fitness tracking |

---

## 15. Google Calendar

| Field | Detail |
|---|---|
| **How to export** | Google Calendar > Settings (gear icon) > Import & Export > Export. Downloads a ZIP with `.ics` files (one per calendar). Can also export individual calendars from calendar settings. |
| **Export format** | ICS (iCalendar) text format — one `.ics` file per calendar, all bundled in a ZIP |
| **What data is included** | Each event wrapped in `BEGIN:VEVENT` / `END:VEVENT` blocks with fields: `SUMMARY` (title), `DTSTART` / `DTEND` (start/end times), `LOCATION`, `DESCRIPTION`, `RRULE` (recurrence rules), `STATUS`, `ORGANIZER`, `ATTENDEE` (for shared events), `CREATED`, `LAST-MODIFIED`, `UID` (unique ID). Recurring events use RRULE syntax (e.g., `FREQ=WEEKLY;BYDAY=MO,WE,FR`). |
| **Meldar insights** | Time allocation analysis (meeting hours vs free time), scheduling patterns, recurring commitment frequency, over-scheduling detection, meeting-free time blocks, work-life balance metrics (evening/weekend events), event density trends over time. Calendar data directly answers "where does my time go?" — one of Meldar's core questions. |
| **User effort** | ~30 seconds |
| **Wait time** | Instant (downloads immediately) |
| **Privacy sensitivity** | **Medium-High** — event titles, locations, and attendees reveal professional and personal schedule |
| **Gen Z relevance** | **Medium** — Google Calendar usage increases with professional life. University students use it moderately; working Gen Z uses it heavily. |

---

## 16. Gmail (Google Takeout)

| Field | Detail |
|---|---|
| **How to export** | Google Takeout (takeout.google.com) > Deselect all > Select "Mail" > Choose labels (All Mail or specific labels) > Choose file type (ZIP or TGZ) > Create export. |
| **Export format** | MBOX file(s) — standard email archive format. Each `.mbox` file contains email messages in sequence with headers and bodies. |
| **What data is included** | All email messages including: headers (From, To, CC, BCC, Subject, Date, Message-ID, In-Reply-To), body (plain text and/or HTML), attachments (inline), labels/folders (via Gmail label headers), read/unread status. Can export all mail or filter by specific Gmail labels. |
| **Meldar insights** | Newsletter subscriptions (signal of interests that aren't acted on), email volume by sender (who demands attention), unread email patterns, receipt/purchase history (automated parsing of order confirmations), subscription services detected from recurring billing emails, response time patterns, email-by-hour distribution. **Receipts alone are a goldmine** — automatic expense tracking from Amazon, Uber, food delivery, subscriptions. |
| **User effort** | ~2 minutes (Google Takeout configuration) |
| **Wait time** | Hours to days (Google emails when ready) |
| **Privacy sensitivity** | **Very high** — full email archive contains everything: personal, financial, medical, professional communications |
| **Gen Z relevance** | **Medium** — Gen Z uses email less for personal communication but heavily for: university, job applications, subscriptions, receipts, and notifications |

---

## 17. Notion

| Field | Detail |
|---|---|
| **How to export** | Settings > Workspace Settings > Export all workspace content. Choose format and select "Everything" to include media. Individual pages: ··· menu > Export > Choose format. |
| **Export format** | ZIP containing: **Markdown + CSV** (non-database pages as .md, databases as .csv, attachments as separate files) or **HTML** (preserves page hierarchy, includes `index.html` sitemap). Business/Enterprise plans also support PDF export. |
| **What data is included** | **Markdown/CSV**: page content, database rows (all properties), subpages, file attachments. Relation properties export as internal Notion IDs (not readable names). Callout blocks export as HTML even in Markdown mode. **HTML**: full page hierarchy with linked navigation. **Not included**: pages the exporter doesn't have access to (e.g., other users' private pages in shared workspaces). |
| **Meldar insights** | Task/project organization patterns, knowledge base structure (what do they track?), database schemas reveal personal systems (habit trackers, reading lists, job applications, budgets), page edit frequency shows active vs abandoned projects, content volume per workspace area. Notion data reveals how users try to organize their lives — and where those systems break down. |
| **User effort** | ~60 seconds |
| **Wait time** | Minutes to days (depends on workspace size) |
| **Privacy sensitivity** | **Medium-High** — personal notes, project details, potentially sensitive planning documents |
| **Gen Z relevance** | **High** — Notion is extremely popular among Gen Z for personal organization, university notes, and side projects |

---

## 18. Browser Bookmarks

| Field | Detail |
|---|---|
| **How to export** | **Chrome**: Bookmarks Manager (Ctrl+Shift+O) > ··· menu > "Export bookmarks". **Firefox**: Library > Import and Backup > "Export Bookmarks to HTML". **Edge/Safari/Brave**: similar flows via bookmark manager. |
| **Export format** | HTML file using Netscape Bookmark Format — universal standard supported by all browsers. Firefox also supports JSON export. |
| **What data is included** | Nested `<DL>` (definition list) / `<DT>` structure. Each bookmark: `<A>` tag with `HREF` (URL), `ADD_DATE` (unix timestamp), `LAST_VISIT` (unix timestamp, Chrome), `ICON` (favicon data URI). Folder hierarchy preserved via nested `<DL>` elements with `<H3>` folder names. |
| **Meldar insights** | Bookmark folder structure reveals organizational thinking, saved-but-never-visited bookmarks (aspirational vs actual behavior), bookmark age distribution (digital hoarding), category analysis (tools, articles, shopping, recipes, courses), bookmark count as digital clutter metric. Combined with browser history, shows "saved to read later but never read" patterns. |
| **User effort** | ~15 seconds (3 clicks) |
| **Wait time** | Instant |
| **Privacy sensitivity** | **Low-Medium** — URLs can reveal interests but bookmarks are curated (user chose to save them) |
| **Gen Z relevance** | **Medium** — Gen Z bookmarks less than older demographics (they use saved posts, TikTok favorites, etc. instead), but still relevant for desktop-heavy users |

---

## 19. Voice Memo as Input

| Field | Detail |
|---|---|
| **Can Claude API process audio directly?** | **No — not as of March 2026.** The Claude Messages API does not accept audio file inputs. Audio content is stripped/ignored if included in API requests. Claude's consumer apps (iOS, Android, web) have voice input via push-to-talk (launched May 2025), but this is a client-side feature that transcribes before sending to the API — not native audio understanding. |
| **Workaround for Meldar** | Use a speech-to-text service first, then send the transcript to Claude. Options: (1) **Whisper API** (OpenAI) — $0.006/minute, supports mp3/mp4/mpeg/mpga/m4a/wav/webm, up to 25MB per file. (2) **Deepgram** — $0.0043/minute (Nova-2 model). (3) **AssemblyAI** — $0.01/minute with speaker diarization. (4) **Browser Web Speech API** — free, client-side, no server cost, but lower accuracy. |
| **Supported audio formats (via transcription)** | MP3, M4A, WAV, WEBM, MP4, MPEG, MPGA, OGG, FLAC (via Whisper). Apple Voice Memos exports as M4A. |
| **Cost per minute** | Whisper: ~$0.006/min. Deepgram: ~$0.004/min. AssemblyAI: ~$0.01/min. Then add Claude API cost for processing the transcript (~100-500 tokens per minute of speech ≈ $0.0005-$0.0025/min on Haiku). **Total: ~$0.005-$0.015 per minute of voice input.** |
| **Meldar application** | User records a voice memo describing their day, frustrations, or goals. Meldar transcribes and analyzes for pain points, time-waste patterns, and automation opportunities. Lower friction than typing — especially for the "Pick Your Pain" quiz. Could enable a "voice journal" feature: daily 60-second check-in that builds a longitudinal picture of the user's pain points. |
| **Privacy sensitivity** | **High** — voice data is biometric; transcripts contain unfiltered personal thoughts |
| **Gen Z relevance** | **High** — voice memos are natural for Gen Z (used to sending voice messages on WhatsApp/Telegram/iMessage). Lower friction than typing for mobile-first users. |

---

## 20. Screen Recording as Input

| Field | Detail |
|---|---|
| **Can Claude API process MP4 video?** | **Yes — as of 2026.** Anthropic released a video API for Claude that supports video input processing. The API can handle MP4, MOV, and WebM formats. However, this is a recent addition and pricing/limits may still be evolving. For the Screen Time scrolling use case specifically, extracting frames and sending as images may be more cost-effective. |
| **Alternative: Frame extraction approach** | Extract key frames from the video using FFmpeg (`ffmpeg -i recording.mp4 -vf "fps=1" frame_%d.jpg`) and send frames as images to Claude Vision. This is well-supported — Claude Vision handles images excellently. A 30-second Screen Time scroll at 1 fps = ~30 images. |
| **Cost estimate** | **Video API**: pricing not yet fully documented. **Frame extraction**: ~30 images × ~1,500 tokens per image = ~45,000 input tokens. On Haiku: ~$0.045. On Sonnet: ~$0.135. Significantly cheaper than processing the full video. |
| **Practical UX** | A user could screen-record themselves scrolling through Settings > Screen Time on iPhone (showing per-app usage), then upload the recording. Meldar extracts frames and uses Vision to read the screen time data from each frame. This is **easier than screenshotting** (one continuous action vs multiple screenshots) but generates larger files. |
| **Meldar application** | Replaces the current "screenshot upload" step in the Discovery Engine with a smoother "just record your screen" flow. User opens Screen Time, hits record, scrolls through all categories, stops recording, uploads. Meldar processes every frame to extract complete app usage data. Could also work for: scrolling through notification settings, email inbox, app library, etc. |
| **Privacy sensitivity** | **Very high** — screen recording captures everything visible, potentially including notifications, messages, and personal content |
| **Gen Z relevance** | **Very high** — Gen Z is extremely comfortable with screen recording (used for TikTok tutorials, bug reports, sharing content). The gesture of "record and share" is natural. |

---

## 21. Summary Matrix

| Service | Format | Effort | Wait Time | Privacy | Gen Z | Meldar Value |
|---|---|---|---|---|---|---|
| ChatGPT | JSON (ZIP) | 30s | Minutes | High | Very High | High |
| Claude | JSON | 30s | Up to 24h | High | High | High |
| Spotify | JSON (ZIP) | 60s | 1-30 days | Medium | Very High | Very High |
| Instagram | JSON (ZIP) | 90s | Hours-days | High | Very High | High |
| TikTok | JSON (ZIP) | 45s | Hours-days | Med-High | Extremely High | High |
| YouTube | JSON (ZIP) | 2min | Hours-days | Med-High | Very High | High |
| Google Search | JSON (ZIP) | 2min | Hours-days | Very High | High | Very High |
| Twitter/X | JS/JSON (ZIP) | 30s | 24-48h | High | Medium | Medium |
| Reddit | CSV (ZIP) | 60s | 1-3 days | Med-High | High | High |
| WhatsApp | TXT | 30s/chat | Instant | Very High | Very High | Medium |
| Telegram | JSON (ZIP) | 60s | Minutes-hours | Very High | Med-High | Medium |
| Discord | JSON (ZIP) | 30s | 24-48h | High | Very High | Medium |
| Netflix | CSV | 30s | Instant | Low-Med | High | Medium |
| Apple Health | XML (ZIP) | 30s | Seconds | Very High | High | Very High |
| Google Calendar | ICS (ZIP) | 30s | Instant | Med-High | Medium | High |
| Gmail | MBOX (ZIP) | 2min | Hours-days | Very High | Medium | High |
| Notion | MD+CSV/HTML | 60s | Min-days | Med-High | High | Medium |
| Bookmarks | HTML | 15s | Instant | Low-Med | Medium | Low |

### Highest-Value Sources for Meldar (ranked)

1. **Spotify** — richest structured data, highest Gen Z relevance, "Wrapped" proves demand for insights
2. **Google Search** — raw queries are the most intimate view of what someone needs/wants
3. **Apple Health** — lifestyle data that connects physical patterns to digital behavior
4. **TikTok** — highest Gen Z engagement, watch history reveals attention patterns
5. **Instagram** — social behavior patterns, saved-but-unused content reveals aspiration gaps
6. **YouTube** — content consumption taxonomy, binge detection
7. **ChatGPT** — AI usage patterns reveal unsolved problems
8. **Google Calendar** — directly answers "where does my time go?"
9. **Reddit** — subreddit subscriptions map perfectly to Meldar's pain point categories
10. **Gmail** — receipt parsing alone justifies inclusion (automatic expense tracking)

### Recommended Funnel Placement

| Funnel Stage | Sources | Rationale |
|---|---|---|
| **Stage 1: Zero-data quiz** | None (quiz only) | No export needed |
| **Stage 2: Screenshot** | Screen Time screenshot, Screen recording | Lowest friction data input |
| **Stage 3: Quick exports** | Spotify, Netflix, Google Calendar, Bookmarks | Instant or fast, low-medium privacy |
| **Stage 4: Google Takeout** | YouTube, Google Search, Gmail | One export flow, multiple insights |
| **Stage 5: Social exports** | Instagram, TikTok, Reddit, Twitter/X, Discord | Medium effort, high insight |
| **Stage 6: Chat exports** | WhatsApp, Telegram, ChatGPT, Claude | High privacy, requires trust |
| **Stage 7: Health data** | Apple Health | Very high privacy, requires deep trust |
| **Stage 8: Voice journal** | Voice memos | Ongoing relationship, daily check-in |

### Key Technical Considerations

1. **Most exports are JSON** — build a unified JSON parser framework
2. **Google Takeout bundles multiple services** — one export = YouTube + Search + Gmail + Calendar
3. **WhatsApp is the outlier** — plain text, per-chat, no bulk export. Needs a custom parser.
4. **Twitter/X uses JS wrappers** — strip `window.YTD.*.part0 = ` prefix before JSON parsing
5. **Apple Health XML can be huge** — need streaming XML parser, not DOM-based
6. **All processing must happen client-side** — Meldar's core promise is "data never leaves your device"
7. **Format instability** — Google and Meta change export formats without notice. Build lenient parsers with fallbacks.
8. **Audio input requires transcription pipeline** — Whisper API is the best cost/quality tradeoff at $0.006/min
9. **Video input is now possible** — Claude's video API supports MP4, but frame extraction is cheaper for Screen Time parsing
