# AI-Extractable Data Sources: The Screenshot & Paste Playbook

> What can we extract with AI from things users ALREADY HAVE on their phone/computer?
> No OAuth, no API integrations, no browser extensions. Screenshot, export, or paste only.
> Every source must be doable in under 2 minutes with zero installs.

---

## The Big Idea

Most "data discovery" products ask users to connect accounts (OAuth), install agents, or grant permissions. We skip all of that. Users already have screens full of data — they just need to screenshot or copy-paste it. Claude Vision can extract structured data from messy screenshots with near-perfect accuracy. The extraction cost per image is $0.002-0.01 (Claude Haiku/Sonnet). This is Meldar's unfair advantage: **zero-friction data ingestion via AI vision.**

---

## Tier 1: High Impact, Low Friction (Ship First)

These sources are easy for users, rich in discovery signal, and technically proven.

---

### 1. Screen Time (iOS) / Digital Wellbeing (Android)

**Status:** Already planned. Foundation of the effort escalation funnel.

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Settings > Screen Time > See All App & Website Activity (iOS). Screenshot Settings > Digital Wellbeing (Android). |
| **Time required** | 30 seconds |
| **What AI extracts** | App names, per-app time (hours:minutes), category breakdown (Social, Entertainment, Productivity), pickup count, notification count, "most used after pickup" list, daily/weekly totals |
| **Discovery insight** | "You spend 3h12m/day on Instagram but only 8 minutes on your actual to-do app. Want an automated daily summary instead of scrolling?" / "You check email 47 times a day but only reply to 3. Let's batch that." |
| **Technical feasibility** | **Proven.** Claude Vision extracts structured data from Screen Time screenshots with ~95%+ accuracy across iOS 16-18, light/dark mode, and multiple languages. The layout is consistent and highly structured. Android Digital Wellbeing has more variation across manufacturers (Samsung, Pixel, OnePlus each look different) but the core data — app name + time — is visually consistent. |
| **Privacy sensitivity** | **Low.** Users already see this data daily. It's their own usage stats. No messages, no content. |
| **Automation suggestions** | App-specific: social media time caps, email batching, notification silencing schedules, "doom scroll detector" that sends a nudge after 20 min |

---

### 2. Calendar Screenshot (Google Calendar / Apple Calendar / Outlook)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their calendar week view from any calendar app (phone or desktop). Multiple screenshots for different weeks if desired. |
| **Time required** | 15-30 seconds |
| **What AI extracts** | Event titles, start/end times, duration, color coding (work vs. personal), recurring patterns, free time gaps, back-to-back meeting blocks, meeting density per day, events with video call links (Zoom/Meet/Teams) |
| **Discovery insight** | "You had 27 meetings this week, 19 of them recurring. Only 3 had agendas. You have zero uninterrupted blocks longer than 45 minutes." / "Every Tuesday is fully booked 9am-6pm with no lunch. That's your bottleneck day." / "You have 6 recurring 1:1s — when's the last time you audited whether they're all still needed?" |
| **Technical feasibility** | **High.** Calendar UIs are highly structured — grid layouts with color blocks and text labels. Claude Vision handles this well across Google Calendar, Apple Calendar, and Outlook. Week view is densest and most informative. Day view works but less comparative. Month view is too sparse. Desktop screenshots give better resolution than mobile. |
| **Privacy sensitivity** | **Low-Medium.** Event titles may contain sensitive info (e.g., "Performance review with HR", "Therapy", "Interview at [Company]"). We should note that we only analyze time patterns, not event content, and offer to blur/redact titles. However, most Gen Z users have relatively benign calendar titles. |
| **Automation suggestions** | Auto-decline meetings without agendas, meeting prep bots, scheduling assistant for focus blocks, auto-move recurring meetings that consistently get rescheduled, weekly calendar audit reminder |

---

### 3. Notification Center Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Pull down notification shade (Android) or swipe to Notification Center (iOS). Screenshot the full list. May need 2-3 screenshots if many notifications. |
| **Time required** | 15 seconds |
| **What AI extracts** | App names with notification counts, grouped notification headers, notification preview text (first line), timestamps, which apps send most notifications, notification categories (social, shopping, news, work) |
| **Discovery insight** | "You have 47 unread notifications right now. 31 are from shopping apps you haven't opened in 2 weeks. Those are just noise." / "Slack sends you 22 notifications/day but you only tap 4. You need a notification filter." / "Your top 3 notification sources are Instagram, Gmail, and DoorDash — none of them are urgent. Let's set up a daily digest." |
| **Technical feasibility** | **High.** iOS groups notifications by app with clear headers and counts. Android varies more by manufacturer but the pattern of [App icon] [App name] [Preview text] [Time] is universal. Claude Vision can reliably extract app names and counts. The preview text extraction is noisier but still useful for categorization. |
| **Privacy sensitivity** | **Medium.** Notification previews can contain message content (WhatsApp messages, email subjects, private DMs). We should warn users to check for sensitive content before screenshotting, or we can focus extraction on app names + counts only, ignoring preview text. |
| **Automation suggestions** | Notification batching (DND schedule + digest), unsubscribe from shopping notifications, channel-level Slack mute suggestions, "nuclear" mode that silences everything except calls and select contacts |

---

### 4. Email Inbox Screenshot (Gmail / Outlook / Apple Mail)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their inbox list view. Optionally screenshot the "Promotions" or "Social" tabs (Gmail), or their folder list with unread counts. |
| **Time required** | 30 seconds (1-3 screenshots) |
| **What AI extracts** | Unread count (total), email subjects, sender names, timestamps, email categories (Primary/Social/Promotions/Updates in Gmail), starred/flagged items, folder names + unread counts if folder list is captured |
| **Discovery insight** | "You have 4,293 unread emails. 3,800 of those are in Promotions. You're subscribed to ~60 newsletters you never read." / "Your last 20 emails are all from 3 senders: Jira, Slack notifications, and your manager. Everything else is noise." / "You have emails from 2 days ago still unread in Primary — are those falling through cracks?" |
| **Technical feasibility** | **High.** Email inbox UIs are extremely consistent across providers — list of rows with sender, subject, preview, timestamp. Claude Vision handles this easily. The Gmail tab bar (Primary/Social/Promotions/Updates) with unread counts is particularly useful. Desktop screenshots give more rows per screenshot than mobile. |
| **Privacy sensitivity** | **Medium-High.** Email subjects and sender names can reveal sensitive information (financial, medical, legal, personal relationships). We should: (1) be explicit about what we extract, (2) focus insight on patterns not content (volume, sender frequency, category distribution), (3) consider offering a "blur subjects" option. |
| **Automation suggestions** | Mass unsubscribe from newsletters, email triage rules (auto-label, auto-archive), VIP sender list for notifications, "inbox zero" workflow setup, daily email digest instead of constant checking |

---

### 5. Bank/Finance App Screenshot (Subscriptions View)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their bank app's "Recurring payments" or "Subscriptions" view if available. Alternatively, screenshot a month of transactions and let AI identify the recurring ones. Or screenshot Settings > Subscriptions on iPhone (which lists all App Store subscriptions). |
| **Time required** | 30-60 seconds |
| **What AI extracts** | Subscription names, amounts, billing frequency (monthly/annual), last charged date, total monthly subscription spend, free trial expiration dates (from iPhone Subscriptions view) |
| **Discovery insight** | "You're paying for 11 subscriptions totaling $127/month. You haven't opened 4 of them in the past 30 days (Headspace, Duolingo Plus, NYT Games, Strava). That's $34/month wasted." / "You have 3 streaming services — Netflix, Disney+, and HBO Max. You watched Netflix 14 times last month, Disney+ once, HBO Max zero." (cross-reference with Screen Time) |
| **Technical feasibility** | **High for iPhone Subscriptions** (Settings > Apple ID > Subscriptions) — very structured list. **Medium-High for bank app screenshots** — layouts vary by bank but the pattern of [merchant name] + [amount] + [date] is universal. Claude Vision handles both. **Medium for transaction lists** — need AI to identify which charges are recurring vs. one-time, which is a text analysis task Claude handles well. |
| **Privacy sensitivity** | **High.** Financial data is sensitive. However, subscription names and amounts are low-risk compared to full transaction history. iPhone Subscriptions view is the safest — it only shows app subscriptions, not bank data. |
| **Automation suggestions** | Cancel unused subscriptions (with direct links), subscription audit reminder (monthly), price tracking for alternatives, free tier downgrade suggestions, trial expiration reminders |

---

### 6. ChatGPT Conversation Export

**This might be the single highest-value discovery source after Screen Time.** Our target users (Gen Z, 18-28) use ChatGPT daily. Their conversation history is a direct map of unsolved problems.

| Dimension | Details |
|-----------|---------|
| **User action** | Go to ChatGPT Settings > Data controls > Export data. Receive email with download link (arrives in ~5 minutes). Download ZIP containing `conversations.json`. Upload to Meldar. Alternative quick path: screenshot the ChatGPT sidebar showing recent conversation titles. |
| **Time required** | 90 seconds (request export) + 5 min wait for email. Or 15 seconds for sidebar screenshot. |
| **What AI extracts** | **Tier A (Titles only — low friction, low privacy):** Conversation titles, creation timestamps, conversation count, topic clustering (how many chats about cooking vs. coding vs. homework vs. work), repeated topic patterns, time-of-day usage patterns. **Tier B (Full export — deep analysis):** All of Tier A plus: message counts per conversation, user message lengths (proxy for complexity), assistant response patterns, tool usage (code interpreter, DALL-E, browsing), conversation abandonment (started but never followed up), multi-turn depth (quick Q&A vs. long working sessions). |
| **Discovery insight** | "You've had 12 conversations about meal planning in the last 3 months but never built a solution. You keep asking the same question differently. Want a meal planner app that actually remembers your preferences?" / "You asked ChatGPT to write the same type of email 8 times. That's a template, not a conversation. Let's automate it." / "34% of your ChatGPT usage is 'how do I...' questions about Excel. You don't need ChatGPT — you need 5 Excel shortcuts." / "You start 40% of your conversations after 11pm. Late-night problem-solving is your pattern. Your most common late-night topics are: anxiety about work, recipe ideas, and gift suggestions." / "You've had 6 conversations about 'automating' things but never actually built any automation. Meldar can build those for you." |
| **Technical feasibility** | **Very High.** The `conversations.json` export is clean, structured JSON with well-defined fields: `title`, `create_time`, `update_time`, `mapping` (message tree with `author.role`, `content.parts`, `create_time`). No vision needed — pure text processing. Claude can analyze the full export in a single API call for most users (typical export is 1-20MB of JSON). For title-only analysis, even Haiku handles this trivially. For full conversation pattern analysis, Sonnet is ideal. |
| **Privacy sensitivity** | **Tier A (titles only): Low-Medium.** Conversation titles are user-generated summaries — usually generic ("Help me write an email", "Python debugging", "Dinner ideas"). Occasionally sensitive ("Am I being gaslit", "How to quit my job"). We analyze topic patterns, not individual titles. **Tier B (full export): High.** Full conversations can contain deeply personal content — health questions, relationship advice, financial details, work problems. Must be processed client-side. We extract patterns (topic frequency, complexity, timing) not content. Users must explicitly opt in to Tier B with clear explanation of what we analyze. |
| **Automation suggestions** | Recurring question automator (turn repeated ChatGPT conversations into persistent tools), email/message template library from repeated drafting sessions, knowledge base from research conversations, "you keep asking about X — here's a one-click solution", learning path based on skill-building conversations, meal planner / budget tracker / workout planner from repeated lifestyle conversations |

**Why this source is special for Meldar:**

1. **Direct problem signal.** Every ChatGPT conversation starts with a problem. The conversation history IS a list of unsolved problems. No other data source gives us this directly.
2. **Perfect audience fit.** Our target (Gen Z, 18-28) uses ChatGPT daily. This is THEIR data source. Their parents don't have 200 ChatGPT conversations — they do.
3. **Repetition = automation opportunity.** When someone asks ChatGPT the same type of question repeatedly, that's a workflow that should be automated. "You asked ChatGPT about meal planning 12 times" is a more compelling discovery than "you spent 3 hours on Instagram."
4. **Two-tier privacy model.** Title-only analysis is nearly as powerful as full-export analysis for discovery purposes, but far less privacy-invasive. We can offer both and let users choose their comfort level.
5. **Meta-narrative.** "You've been using AI to solve problems one at a time. Meldar turns those into permanent solutions." This positions us as the upgrade from ChatGPT — not a competitor, but the next step.

**Implementation notes:**
- The export JSON structure nests messages inside a `mapping` object with UUID keys. Each message has `author.role` (system/user/assistant/tool), `content.content_type` (text/code/image), and `content.parts` (the actual text).
- For Tier A, we only need `title` and `create_time` from each conversation object — trivial extraction.
- For Tier B, we can compute: messages per conversation, average user message length, conversation duration (first to last message timestamp), tool usage frequency, and topic clustering via embeddings or Claude classification.
- Client-side processing is essential for Tier B. The JSON can be parsed entirely in the browser. We send only the extracted pattern summary (topic clusters + frequency counts) to our analysis API.

---

## Tier 2: Strong Signal, Moderate Friction

These require slightly more effort or have more variable formats, but deliver unique insights.

---

### 7. Browser Tab Bar Screenshot (Chrome/Safari)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their browser tab switcher showing all open tabs. On mobile: tap the tab count icon to see the grid. On desktop: screenshot the tab bar or use Chrome's "Tab Search" feature which lists all tabs. |
| **Time required** | 15 seconds |
| **What AI extracts** | Number of open tabs, tab titles/favicons, groupings (if Chrome tab groups are used), duplicate tabs, tabs open from days/weeks ago (visible in some views) |
| **Discovery insight** | "You have 127 open tabs across 4 windows. 23 of them are Amazon product pages — you're comparing products but never deciding. Want a price comparison bot?" / "You have 8 tabs with the same Google Docs spreadsheet open. You keep losing it." / "47 of your tabs have been open for over a week. Those aren't tabs — they're a reading list you'll never get to." |
| **Technical feasibility** | **Medium-High.** Mobile tab grid views show page thumbnails + titles — Claude Vision extracts titles reliably. Desktop tab bars show truncated titles which may need the Tab Search view for full titles. Chrome's "Tab Search" (Ctrl+Shift+A) shows a searchable list of all tabs — a screenshot of this is the cleanest source. Safari's tab overview works well too. |
| **Privacy sensitivity** | **Medium.** Tab titles can reveal browsing interests (health searches, financial sites, dating apps). Less sensitive than full URLs but still personal. |
| **Automation suggestions** | Bookmark organizer, "read it later" workflow, auto-close tabs older than 7 days, tab group templates for common workflows, duplicate tab detector |

---

### 8. Notes/To-Do App Screenshot (Apple Notes / Google Keep / Notion / Todoist)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their notes list or to-do list. The note/task list view showing titles + dates. Optionally open one large note with multiple to-dos. |
| **Time required** | 30 seconds |
| **What AI extracts** | Note/task titles, creation dates, last modified dates, completion status (for to-dos), overdue items, note count, folder/tag organization (or lack thereof) |
| **Discovery insight** | "You have 47 unchecked to-do items, the oldest from 8 months ago. Those aren't to-dos — they're guilt. Let's triage: delete, delegate, or schedule." / "You have 3 different notes called 'grocery list' created on different dates. You keep making new ones instead of updating one. Want an automated grocery list?" / "You have 12 notes with 'ideas' in the title that haven't been touched in 6+ months." |
| **Technical feasibility** | **High.** Note/to-do list UIs are very structured — list of items with titles, dates, checkboxes. Claude Vision handles all major apps (Apple Notes, Google Keep, Notion, Todoist, Things, Reminders). The challenge is that notes can be in any language and format, but we're extracting list-level metadata, not content. |
| **Privacy sensitivity** | **Low-Medium.** Note titles are usually benign ("Grocery list", "Meeting notes", "Book recommendations"). Some may be personal ("Therapy thoughts", "Breakup letter draft"). We focus on patterns (count, age, completion rate) not content. |
| **Automation suggestions** | Weekly task review reminder, auto-archive completed tasks, grocery list app recommendation, note consolidation (merge duplicates), "stale task amnesty" — bulk close items older than 90 days |

---

### 9. Photo Library Stats Screenshot (iPhone Storage / Google Photos)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Settings > General > iPhone Storage > Photos (shows storage breakdown). Or screenshot Google Photos' storage usage view. Or simply screenshot the Photos app grid showing recent photos (we can analyze content patterns). |
| **Time required** | 15-30 seconds |
| **What AI extracts** | Total photo/video count, storage used, screenshot count (iOS separates these in albums), selfie count, video vs. photo ratio, recent photo patterns (lots of screenshots = saving info from apps instead of using proper tools) |
| **Discovery insight** | "You have 2,847 screenshots in your Camera Roll. That's 4.2 GB of storage. Most screenshots are saved-for-later information you never looked at again. Want an automated clipper that organizes these?" / "You have 12,000 photos but haven't exported or backed them up properly. They're taking 38 GB. Want an auto-backup workflow?" / "87% of your recent photos are screenshots of recipes, products, and conversations — you're using your camera roll as a to-do list." |
| **Technical feasibility** | **High for storage views.** iPhone Storage screen and Google Photos storage are structured and easy to parse. **Medium for photo grid analysis** — Claude Vision can identify that photos are screenshots vs. real photos vs. selfies from the grid thumbnails, but accuracy drops with small thumbnails. The iPhone Screenshots album count is the easiest signal. |
| **Privacy sensitivity** | **Low** for storage/count data. **High** for actual photo content analysis. Recommend sticking to storage stats and album counts, not analyzing photo content. |
| **Automation suggestions** | Screenshot organizer (OCR + categorize + delete originals), photo backup automation, duplicate photo cleaner, "screenshot to note" converter, storage cleanup workflow |

---

### 10. Spotify/YouTube Music "Now Playing" History

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Spotify's "Recently Played" list, or YouTube Music's history. Or screenshot Spotify Wrapped if it's that time of year. Or paste their Spotify "Your Library" stats. |
| **Time required** | 30 seconds |
| **What AI extracts** | Recently played songs/podcasts, playlist names, listening frequency, genre distribution (from artist names), podcast vs. music ratio, "on repeat" indicators |
| **Discovery insight** | "You listen to the same 3 playlists on rotation. You spend 2 hours/day on podcasts — mostly during commute (cross-reference with calendar commute blocks). Want automated episode summaries for the ones you only half-listen to?" / "You listen to lo-fi beats 4 hours/day during work. That's your focus cue. Want to automate a 'focus mode' that starts when your lo-fi playlist plays?" |
| **Technical feasibility** | **High.** Spotify and YouTube Music recently-played views are clean, structured lists with album art, track name, and artist. Claude Vision extracts these easily. Spotify Wrapped screenshots are also highly structured with clear statistics. |
| **Privacy sensitivity** | **Low.** Music taste is generally not sensitive. Podcast choices can reveal interests (politics, health, therapy, true crime) but are low-risk. |
| **Automation suggestions** | Focus mode triggers based on music context, podcast episode summary generator, playlist curation bot, "new music discovery" based on listening patterns, commute podcast queue builder |

---

### 11. WhatsApp / Telegram / iMessage Chat List Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their main chat list (not individual conversations). Shows contact names, last message preview, timestamps, unread badges, pinned chats. |
| **Time required** | 15 seconds |
| **What AI extracts** | Number of active chats, unread message counts per chat, last activity timestamps, pinned chats (priorities), group chat names and member counts, time since last message in each chat |
| **Discovery insight** | "You have 14 unread group chats. 9 of them are groups you haven't actively messaged in over a month — they're just noise. Mute or leave?" / "Your top 5 chats are all work-related groups. You're using WhatsApp as a work tool — want a dedicated workspace?" / "You have 43 chats with messages from today alone. That's communication overload." |
| **Technical feasibility** | **High.** Chat list UIs are extremely consistent across WhatsApp, Telegram, and iMessage — list of rows with avatar, name, preview, time, unread badge. Claude Vision handles this perfectly. Group names and unread counts are the primary signals. |
| **Privacy sensitivity** | **Medium-High.** Message previews can contain personal content. Contact names reveal social graph. We should focus on metadata: chat count, unread counts, group names, activity recency — NOT message content. Warn users to check previews before screenshotting. |
| **Automation suggestions** | Group chat digest (daily summary of key messages), auto-mute inactive groups, message templates for common responses, "communication audit" — which chats are essential vs. noise, move work chats to proper tools (Slack/Teams) |

---

## Tier 3: Niche but Valuable (Phase 2+)

These serve specific user segments or require more effort, but deliver unique insights.

---

### 12. LinkedIn Feed / Profile Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their LinkedIn feed, or their LinkedIn profile activity page (posts, reactions, comments). |
| **Time required** | 30 seconds |
| **What AI extracts** | Post types in feed (job postings, thought leadership, company updates, engagement bait), user's own activity (posts, comments, reactions), connection request count, notification types, job alert presence |
| **Discovery insight** | "You scroll LinkedIn 25 min/day (from Screen Time) but haven't posted in 3 months and haven't applied to any jobs. Are you networking or doom-scrolling?" / "Your feed is 60% engagement bait posts. Unfollow those accounts and replace with industry-specific content." |
| **Technical feasibility** | **Medium.** LinkedIn's feed is less structured than other UIs — variable post lengths, mixed media, sponsored content. Claude Vision can extract post types and user activity but with more noise than structured list views. Profile activity pages are cleaner. |
| **Privacy sensitivity** | **Medium.** LinkedIn is semi-public but feed content reveals professional interests and job-seeking behavior. |
| **Automation suggestions** | LinkedIn post scheduler, job alert filter refinement, network engagement reminders, content curation for industry relevance |

---

### 13. App Store / Google Play Purchase History

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot App Store > Account > Purchase History (iOS) or Google Play > Payments & subscriptions > Budget & history (Android). |
| **Time required** | 30 seconds |
| **What AI extracts** | App names, purchase/download dates, prices paid, in-app purchase amounts, re-downloaded apps (indicates uninstall/reinstall cycles) |
| **Discovery insight** | "You've purchased 34 productivity apps totaling $89 but your most-used app is still the free Notes app. You're buying tools hoping they'll fix your workflow, but the problem isn't the tool." / "You've re-downloaded Duolingo 4 times this year. You keep trying and quitting. Want an accountability bot?" |
| **Technical feasibility** | **High.** Both App Store and Google Play purchase history views are clean lists with app name, date, and price. Claude Vision extracts these reliably. |
| **Privacy sensitivity** | **Low-Medium.** App purchases are mildly personal (dating apps, health apps) but generally low-risk. Prices are sensitive to some users. |
| **Automation suggestions** | Subscription audit, unused app cleanup reminders, "shelfware" detection (bought but never used), app category rebalancing (too many games, not enough tools) |

---

### 14. Google Search History (via Paste from My Activity)

| Dimension | Details |
|-----------|---------|
| **User action** | Visit myactivity.google.com on phone/desktop browser, filter to "Search", screenshot the list. Or copy-paste the visible search history text. |
| **Time required** | 60 seconds |
| **What AI extracts** | Search queries, timestamps, frequency patterns, repeated searches, question vs. navigation searches, category distribution (recipes, shopping, health, how-to, work-related) |
| **Discovery insight** | "You searched 'easy dinner recipes' 23 times this month. Each time you scroll, pick something, and forget it by next week. Want a meal planner that remembers what you liked?" / "You googled 'how to convert PDF to Word' 8 times this year. You need one tool, not 8 searches." / "67% of your searches are 'how to...' questions. You're learning by googling. Want a personal knowledge base that saves your answers?" |
| **Technical feasibility** | **High.** Google My Activity has a very clean, structured list view — search query + timestamp per row. Claude Vision extracts this perfectly. Copy-paste as text works even better (skip vision entirely, use text analysis). This is arguably the single most insight-dense screenshot a user can take. |
| **Privacy sensitivity** | **High.** Search history is deeply personal — health queries, relationship questions, financial searches. We must be very explicit about what we analyze (patterns, categories, frequency) vs. what we ignore (sensitive individual queries). Consider auto-redacting medical/financial/legal searches. |
| **Automation suggestions** | Recurring search automator (auto-bookmark results for repeated queries), "answered questions" knowledge base, recipe saver + meal planner, price tracker for comparison-shopped products, skill learning path from how-to query patterns |

---

### 15. Browser Bookmarks Screenshot / Export

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot their browser bookmarks bar or bookmarks manager. Or export bookmarks as HTML (Chrome: Bookmarks > Bookmark Manager > Export, 3 clicks). |
| **Time required** | 30 seconds (screenshot) / 45 seconds (export) |
| **What AI extracts** | Bookmark titles, folder names, folder sizes, organizational structure (or lack thereof), bookmark age (from HTML export), dead/broken bookmark indicators |
| **Discovery insight** | "You have 847 bookmarks. 12 are in folders. 835 are in 'Other Bookmarks' — a digital junk drawer. You save things to feel productive but never return to them." / "Your bookmark folders are: 'Read Later' (234 items), 'Recipes' (67), 'Work' (45), 'Job Search' (23 — dated 2024). Time to clean up?" |
| **Technical feasibility** | **High for HTML export** — it's structured HTML with URLs, titles, and timestamps, trivially parseable with text processing (no vision needed). **Medium for screenshots** — bookmarks bar shows truncated titles, bookmark manager shows full titles but may need scrolling. |
| **Privacy sensitivity** | **Medium.** Bookmark titles and URLs can reveal interests, but users consciously saved these — they're "intentional" data. Less sensitive than search or browsing history. |
| **Automation suggestions** | Bookmark organizer (auto-categorize into folders), dead link cleaner, "read it later" queue with reminders, recipe bookmark to meal planner pipeline, bookmark search tool (faster than scrolling through 800 bookmarks) |

---

### 16. Settings > Battery Usage Screenshot (iOS/Android)

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Settings > Battery (iOS) or Settings > Battery > Battery Usage (Android). Shows app-level battery consumption for last 24h/10 days. |
| **Time required** | 15 seconds |
| **What AI extracts** | App names ranked by battery drain, percentage per app, "background activity" vs. "on screen" time (iOS splits this), time on screen per app (iOS shows this alongside battery %) |
| **Discovery insight** | Cross-references beautifully with Screen Time: "Instagram uses 23% of your battery and 3 hours of screen time daily. Facebook uses 18% of battery but only 20 minutes of screen — it's burning battery in the background doing tracking. Revoke its background refresh." / "Your email client uses 12% of battery from background refresh every 5 minutes. Switch to 30-minute refresh and save battery." |
| **Technical feasibility** | **High.** Battery usage screens are highly structured — ranked list of apps with percentages and time bars. Very similar to Screen Time in layout. Claude Vision handles this easily. |
| **Privacy sensitivity** | **Low.** Battery usage data is about app behavior, not user behavior. Very non-sensitive. |
| **Automation suggestions** | Background refresh optimization settings, battery-draining app alternatives, "aggressive background activity" alerts, location tracking audit (apps using GPS in background) |

---

### 17. Clipboard History / Copied Text Paste

| Dimension | Details |
|-----------|---------|
| **User action** | On Android: long-press text field > Clipboard (shows last ~20 copied items). On Mac: use built-in clipboard manager or paste from clipboard. On Windows: Win+V shows clipboard history. User screenshots or pastes. |
| **Time required** | 15 seconds |
| **What AI extracts** | Types of copied content (URLs, addresses, phone numbers, passwords, code snippets, text snippets), frequency patterns, work vs. personal content ratio |
| **Discovery insight** | "Your clipboard history is full of addresses and phone numbers you manually copy between apps. You need a contact manager that auto-syncs." / "You copy-paste the same 3 email templates repeatedly. Let's turn those into one-tap shortcuts." / "You've copied 7 different tracking numbers this week — want an automated package tracker?" |
| **Technical feasibility** | **Medium.** Android clipboard history is structured and easy to extract. macOS/Windows clipboard history requires third-party apps or system features that not all users have enabled. Copy-paste as text works perfectly for text content. Screenshots of clipboard managers work well with Claude Vision. |
| **Privacy sensitivity** | **Very High.** Clipboard can contain passwords, credit card numbers, private messages, authentication codes. We MUST warn users to review before sharing, and auto-detect and redact sensitive patterns (credit card formats, password-like strings, 2FA codes). |
| **Automation suggestions** | Text expander for repeated pastes, address book auto-builder, tracking number auto-tracker, template library for repeated email/message content |

---

### 18. Wi-Fi / Data Usage Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Settings > Cellular/Mobile Data (iOS) or Settings > Network & Internet > Data usage (Android). Shows per-app data consumption. |
| **Time required** | 15 seconds |
| **What AI extracts** | App names ranked by data usage, GB/MB consumed per app, Wi-Fi vs. cellular breakdown, current billing period totals |
| **Discovery insight** | "YouTube consumed 12 GB this month on cellular data. At your carrier rate, that's ~$8 in data just for YouTube. Want to auto-download videos on Wi-Fi before your commute?" / "TikTok used 8 GB while Instagram used 6 GB. Together that's 72% of your monthly data — all short-form video." |
| **Technical feasibility** | **High.** Data usage screens are very similar in structure to battery and Screen Time views — ranked lists with app names and data amounts. Claude Vision handles these easily. |
| **Privacy sensitivity** | **Low.** Data consumption tells us which apps are used heavily but reveals nothing about content. |
| **Automation suggestions** | Auto-download content on Wi-Fi (YouTube, Spotify, podcasts), data usage alerts, app-specific data limits, Wi-Fi auto-connect for known locations, cellular data budget tracker |

---

## Tier 4: Creative / Unconventional Sources

These are less obvious but could produce surprising "aha" moments.

---

### 19. Alarm Clock / Sleep Schedule Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot the Clock app's Alarms tab showing all set alarms. Or screenshot the Bedtime/Sleep Focus settings. |
| **Time required** | 10 seconds |
| **What AI extracts** | Alarm times, which alarms are active vs. disabled, number of alarms set, alarm labels, snooze patterns (multiple alarms 5 min apart = serial snoozer), weekday vs. weekend alarm differences |
| **Discovery insight** | "You have 7 alarms set between 6:30am and 7:15am. You're a serial snoozer — you're getting 45 minutes of fragmented, low-quality sleep. Want a smart alarm that wakes you at optimal sleep cycle timing?" / "Your weekday alarm is 6:30am but your weekend alarm is 11:00am. That's a 4.5-hour social jet lag gap. This mismatch is linked to Monday fatigue." |
| **Technical feasibility** | **High.** Alarm lists are dead simple — time, label, on/off toggle, repeat days. Claude Vision extracts with near-perfect accuracy. |
| **Privacy sensitivity** | **Very Low.** Alarm times are perhaps the least sensitive data imaginable. |
| **Automation suggestions** | Smart alarm based on sleep cycle, gradual wake-up routine automation (lights, coffee maker, news briefing), sleep consistency tracker, weekend alarm adjustment recommendations |

---

### 20. Home Screen Layout Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot each page of their phone's home screen. |
| **Time required** | 15-30 seconds (2-5 screenshots) |
| **What AI extracts** | App icons and names, folder names and contents, number of home screen pages, widget usage, app placement patterns (most-used apps tend to be thumb-reach zone on bottom rows), dock apps (the 4-5 most used) |
| **Discovery insight** | "Your home screen has 6 pages and 127 apps. The average person uses 9 apps daily. You have decision fatigue every time you unlock your phone." / "Your dock has Instagram, TikTok, YouTube, and Safari. Three of four are entertainment apps. Your productivity apps are buried on page 4." / "You have 3 folders called 'Utilities', 'Other', and 'Stuff'. That's 47 apps you can't find when you need them." |
| **Technical feasibility** | **High.** Claude Vision can identify most popular app icons by their visual design (Instagram, TikTok, Gmail, etc.) and read app name labels. Home screen layouts are very structured grids. Custom/obscure apps may need the text label for identification. |
| **Privacy sensitivity** | **Low.** Installed apps are mildly revealing (dating apps, health apps, banking apps) but it's surface-level metadata. |
| **Automation suggestions** | Home screen reorganization suggestions, Shortcuts/widget recommendations, app usage audit (cross-reference with Screen Time — why is an app on your home screen if you use it 2 min/month?), digital minimalism suggestions |

---

### 21. Reminders / Overdue Tasks Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Apple Reminders, Google Tasks, or any task manager showing overdue/scheduled items. |
| **Time required** | 15 seconds |
| **What AI extracts** | Task titles, due dates, overdue status, list/category names, completion rate (completed vs. pending), recurring tasks |
| **Discovery insight** | "You have 23 overdue reminders. The oldest is from 9 months ago: 'Call dentist.' If it's been 9 months, either do it now or delete it — it's not helping you sitting here." / "You create an average of 8 reminders per week but complete 3. You're over-committing by 60%. Let's prioritize ruthlessly." |
| **Technical feasibility** | **High.** Task/reminder list UIs are extremely clean — checkbox + title + date. Among the easiest UIs for Claude Vision to parse. |
| **Privacy sensitivity** | **Low.** Task titles are usually mundane ("Buy milk", "Submit report", "Call mom"). |
| **Automation suggestions** | Weekly task review automation, overdue task auto-escalation, recurring task templates, "task bankruptcy" — archive everything older than 30 days and start fresh |

---

### 22. Storage Usage Breakdown Screenshot

| Dimension | Details |
|-----------|---------|
| **User action** | Screenshot Settings > General > iPhone Storage (iOS) or Settings > Storage (Android). Shows per-app storage usage ranked by size. |
| **Time required** | 15 seconds |
| **What AI extracts** | App names ranked by storage, GB per app, system vs. app vs. media breakdown, "offload" recommendations, total used/available storage |
| **Discovery insight** | "WhatsApp is using 8.3 GB — that's mostly cached videos from group chats you never rewatch. Clear the cache and save 7 GB." / "You have 3 games taking up 12 GB combined. Screen Time says you haven't opened any of them in 60+ days." / "Your phone is 94% full. That's why it's slow. Here's a 5-minute cleanup plan." |
| **Technical feasibility** | **High.** Storage screens are ranked lists with clear app names and sizes. Very structured. Claude Vision handles perfectly. |
| **Privacy sensitivity** | **Low.** Storage sizes reveal nothing about content. |
| **Automation suggestions** | Monthly storage cleanup reminder, auto-offload unused apps, cache clearing schedule, cloud backup for large media, photo/video compression workflow |

---

## Combo Plays: Cross-Source Insights

The real magic happens when we combine multiple screenshots. Each screenshot is a single data point. Together they tell a story.

| Combo | Insight |
|-------|---------|
| **Screen Time + Calendar** | "You have 3 hours of meetings and 3 hours of Instagram daily. On meeting-heavy days, your Instagram usage spikes — it's your coping mechanism." |
| **Screen Time + Battery** | "Facebook uses 18% battery but only 20 min screen time. It's running in the background constantly — tracking your location and activity." |
| **Screen Time + Notifications** | "Instagram sends you 31 notifications/day. You open it 22 times. 14 of those opens come from notifications, not intent. Notifications are driving 64% of your Instagram usage." |
| **Email Inbox + Screen Time** | "You spend 47 min/day in Gmail but have 4,293 unread emails. You're spending time in email but not being effective. The problem isn't time — it's triage." |
| **Calendar + Alarms** | "Your first meeting is at 10am but you set 4 alarms starting at 6:30am. You have 3 unstructured hours every morning. Want a morning routine automation?" |
| **Search History + Subscriptions** | "You searched 'cancel [service]' 3 times but still pay for it. Want us to handle the cancellation?" |
| **Notes + Reminders** | "You have to-do items in Notes, Reminders, AND a to-do app. Three systems = nothing gets done. Consolidate." |
| **Home Screen + Screen Time** | "Your most-used app (Instagram, 3h/day) is in your dock. Your second-most-opened app (Slack) is on page 3. Your home screen layout doesn't match your actual usage." |
| **Notifications + Chat List** | "You get 22 Slack notifications/day and have 14 unread WhatsApp chats. Communication is split across 4 apps. You need a unified inbox or strict boundaries." |
| **ChatGPT Export + Screen Time** | "You spend 45 min/day in ChatGPT. Your top topics are meal planning, email drafting, and Excel help. Those 3 problems alone could be solved with permanent tools instead of daily conversations." |
| **ChatGPT Export + Search History** | "You googled 'how to make a budget spreadsheet' 5 times AND asked ChatGPT about budgeting 8 times. You've spent more time asking about budgeting than actually budgeting. Want a budget tracker that just works?" |
| **ChatGPT Export + Notes** | "You have 12 ChatGPT conversations about meal planning and 3 notes titled 'meal ideas'. The knowledge exists in 4 different places. Let's consolidate into one working tool." |

---

## Implementation Priority Matrix

| Source | User Effort | AI Accuracy | Discovery Value | Privacy Risk | Ship Priority |
|--------|:-----------:|:-----------:|:---------------:|:------------:|:-------------:|
| Screen Time / Digital Wellbeing | 30s | Very High | Very High | Low | **P0 — already planned** |
| ChatGPT Export (titles) | 90s | Very High | Very High | Low-Med | **P0 — highest discovery signal** |
| Calendar | 15s | Very High | High | Low-Med | **P0** |
| Notification Center | 15s | High | High | Med | **P0** |
| ChatGPT Export (full) | 90s | Very High | Very High | High | **P1** (opt-in, client-side only) |
| Email Inbox | 30s | High | High | Med-High | **P1** |
| iPhone Subscriptions | 30s | Very High | High | Med | **P1** |
| Battery Usage | 15s | Very High | Medium | Low | **P1** (great for combos) |
| Search History (My Activity) | 60s | Very High | Very High | High | **P1** |
| Chat List (WhatsApp/Telegram) | 15s | High | Medium | Med-High | **P2** |
| Notes/To-Do List | 30s | High | Medium | Low-Med | **P2** |
| Home Screen | 15s | High | Medium | Low | **P2** |
| Alarms | 10s | Very High | Low-Med | Very Low | **P2** (fun, viral) |
| Browser Tabs | 15s | Med-High | Medium | Med | **P2** |
| Photo Library Stats | 15s | High | Low-Med | Low | **P2** |
| Storage Usage | 15s | Very High | Low-Med | Low | **P3** |
| Spotify/Music | 30s | High | Low-Med | Low | **P3** |
| Data Usage | 15s | High | Low | Low | **P3** |
| Bookmarks | 30s | High | Low-Med | Med | **P3** |
| App Purchase History | 30s | High | Medium | Low-Med | **P3** |
| LinkedIn Feed | 30s | Medium | Low-Med | Med | **P3** |
| Clipboard History | 15s | Medium | Medium | Very High | **P3** (privacy concern) |
| Overdue Reminders | 15s | Very High | Medium | Low | **P2** |

---

## The "Screenshot Stack" — Recommended First-Time User Flow

For the best balance of insight density vs. user effort, guide new users through this specific sequence:

**Step 1: Screen Time** (30 sec) — The hook. Immediate, shareable, visceral.
**Step 2: Calendar** (15 sec) — "Where does your structured time go?"
**Step 3: Notification Center** (15 sec) — "What's interrupting you?"

Total time: ~1 minute. Three screenshots. This gives us:
- How they spend unstructured time (Screen Time)
- How they spend structured time (Calendar)
- What interrupts both (Notifications)

That's enough for a compelling Time X-Ray without any exports, uploads, or signups.

**Step 4 (optional): ChatGPT sidebar screenshot** (15 sec) — "What problems do you keep solving?"
**Step 5 (optional): Email Inbox** — "What's piling up?"
**Step 6 (optional): Subscriptions** — "What are you paying for?"

Step 4 is particularly powerful for our Gen Z audience — most have 50+ ChatGPT conversations, and the sidebar screenshot alone reveals their recurring unsolved problems. If they want deeper analysis, they can export the full `conversations.json` later.

These deepen the insight but aren't needed for the initial "wow" moment.

---

## Technical Architecture Notes

### Vision API Costs Per Screenshot

| Model | Cost per image | Accuracy | Speed | Recommendation |
|-------|:-----------:|:---------:|:-----:|:-----------|
| Claude Haiku | ~$0.002 | 90-95% | <1s | **Default for structured screens** (Screen Time, Calendar, Battery) |
| Claude Sonnet | ~$0.008 | 95-98% | 1-2s | Fallback when Haiku confidence is low, or for messy UIs (LinkedIn, browser tabs) |
| Claude Opus | ~$0.03 | 98-99% | 2-4s | Overkill for extraction. Save for cross-source analysis/insight generation |

### Recommended Processing Pipeline

1. **Client-side image upload** — resize to 1568px max dimension (Claude Vision sweet spot), compress to ~200KB
2. **Send to Claude Haiku** with a schema-enforcing prompt: "Extract the following structured data from this screenshot..."
3. **Validate output** against expected schema (Zod on the server)
4. **If low confidence** (missing fields, uncertain values) — re-run with Claude Sonnet
5. **Store extracted data** client-side in localStorage or IndexedDB — data never hits our server in raw form
6. **Cross-source analysis** — once 2+ screenshots are processed, run a Claude Sonnet/Opus call to generate combined insights

### Prompt Engineering for Vision Extraction

Key patterns that improve extraction accuracy:
- **Provide the expected schema** in the prompt (JSON schema of what to extract)
- **Specify the source** ("This is an iOS Screen Time screenshot") — helps the model find the right visual patterns
- **Handle edge cases** in the prompt: dark mode, non-English, truncated text, partially visible rows
- **Request confidence scores** per field — lets us decide when to escalate to Sonnet
- **Multi-screenshot stitching** — when users scroll and take multiple screenshots of the same screen, detect overlap via matching rows and merge

### JSON Export Processing (ChatGPT & Similar)

Not all sources are screenshots. JSON file exports (ChatGPT, Spotify, etc.) use a different pipeline:
1. **Client-side file read** — user uploads `.json` or `.zip` in browser, parsed with `FileReader` + `JSON.parse`
2. **Client-side extraction** — JavaScript extracts the structured fields we need (titles, timestamps, counts). No AI call needed for basic extraction.
3. **AI analysis call** — Send only the extracted summary (e.g., "200 conversation titles with timestamps") to Claude Sonnet for pattern analysis, topic clustering, and insight generation. Cost: ~$0.01-0.05 per analysis depending on volume.
4. **Privacy advantage** — Raw conversation content never leaves the browser. The AI only sees aggregated metadata (topic clusters, frequency counts, timing patterns).

For ChatGPT specifically, the sidebar screenshot path (Tier A) uses the vision pipeline above. The full export path (Tier B) uses this JSON pipeline. Both produce discovery insights; the JSON path is deeper but requires the 5-minute email wait.

### Client-Side Processing Advantage

All screenshot analysis can happen without sending image data to our servers:
- User uploads screenshot in browser
- Browser sends to Claude API directly (via our proxy that adds API key, but never stores the image)
- Extracted structured data (JSON) stays in browser localStorage
- Only anonymized, aggregated insights are sent to our server (for pattern analysis improvement)
- This is the GDPR-friendliest architecture possible: "Your screenshots never leave your device. We only see the patterns."

---

## Viral Potential by Source

| Source | Shareability | Example Viral Stat |
|--------|:-----------:|-----------|
| Screen Time | **Very High** | "I spent 847 hours on Instagram last year" |
| ChatGPT Export | **Very High** | "I asked ChatGPT about meal planning 12 times and never actually made a meal planner" |
| Calendar | **High** | "I had 1,247 meetings this year and 80% were recurring" |
| Search History | **Very High** | "I googled 'easy dinner ideas' 23 times this month" |
| Notifications | **High** | "I got 31,000 notifications last month. 89% were noise." |
| Subscriptions | **High** | "I pay $127/month for 11 subscriptions. I use 4." |
| Email | **Medium** | "I have 4,293 unread emails" |
| Alarms | **High** | "I set 7 alarms every morning. I'm a serial snoozer." |
| Tabs | **High** | "I have 127 open tabs. Time for a digital intervention." |
| Photos | **Medium** | "87% of my camera roll is screenshots" |

The ideal Time X-Ray report combines 3-5 of these into a single shareable card — a Spotify Wrapped-style summary that makes people go "I need to see mine."
