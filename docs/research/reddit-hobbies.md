# Reddit Gaming & Hobby Tracking: Use-Case Research

Research into Reddit and adjacent gaming/hobby communities (ResetEra, BoardGameGeek, DakkaDakka, Discogs forums, Steam Community) for unmet tracking, automation, and notification needs.

---

## 1. Cross-Platform Game Library Unification

**Pain:** Gamers own titles scattered across Steam, Epic, GOG, PlayStation, Xbox, and Nintendo. They forget what they own and where, sometimes re-purchasing games on a different storefront. One user reported buying a game on Steam they already owned on GOG.

**Current solutions:** Playnite (open-source, PC-only), GOG Galaxy 2.0 (buggy sync, users give up), Keep Track of My Games (limited auto-sync).

**Gap:** No solution reliably auto-syncs all platforms including console (PSN, Xbox, Switch) AND tracks ownership, playtime, and achievements in one place. GOG Galaxy's integration plugins break frequently. Mobile access is nonexistent for most tools.

**Meldar angle:** An agent that monitors all connected platform APIs, detects new purchases, deduplicates across stores, and alerts on price drops for wishlisted titles across all storefronts simultaneously.

---

## 2. Gaming Backlog Management & Completion Tracking

**Pain:** The median adult gamer sits on 100-150 unplayed games and spends 8-10 hours/week playing, generating a guilt cycle of acquisition, guilt, attempted reform, and relapse. Backloggd hit 650K users by end of 2025 (doubled in one year), but tracking habits die fast -- users sign up enthusiastically, log games the first week, then gradually stop.

**Current solutions:** Backloggd (no mobile app -- most requested feature), GG/ggapp.io (only major tracker with native mobile), HowLongToBeat, Grouvee, Completionator.

**Gap:** Tracking is entirely manual. No tool auto-detects what you're playing, auto-logs session time, or nudges you toward finishing games based on your patterns. The "spreadsheet becomes another thing on the to-do list." No tracker bridges video games AND tabletop games -- users need two separate apps.

**Meldar angle:** An agent that auto-syncs playtime from platform APIs, detects when a game is started/abandoned, suggests next-up picks based on mood/available time, and sends weekly progress digests without requiring manual logging.

---

## 3. Game Price Drop & Sale Alerts

**Pain:** IsThereAnyDeal (ITAD) is the go-to price tracker but has recurring bugs: games synced from Steam wishlists don't inherit default notification settings, users get bombarded with duplicate emails (one user received 29 emails in 10 hours for one game), and the 2024 site redesign removed the popup for setting desired prices. Steam's own wishlist notifications are unreliable.

**Current solutions:** IsThereAnyDeal, Steam wishlist emails, Deku Deals (Nintendo), PS Deals.

**Gap:** No unified cross-store price watcher that reliably delivers notifications via modern channels (push, Discord, Telegram) rather than email-only. Setting per-game price thresholds is cumbersome. No tool intelligently learns your spending patterns to suggest optimal buy timing.

**Meldar angle:** An agent monitoring all major game stores with user-defined price thresholds, delivering instant alerts via preferred channel (push/Discord/SMS), with smart suggestions like "this game historically hits $10 during Summer Sale -- wait 3 weeks."

---

## 4. Miniature Painting "Pile of Shame" Tracking

**Pain:** Warhammer/miniature hobbyists accumulate boxes of unbuilt, unpainted models. The "pile of shame" is a universal meme in the community. Hobbyists want to track progress through stages (unassembled -> assembled -> primed -> painted -> based) but existing tools require tedious manual entry for every model.

**Current solutions:** Pile of Potential (web-only, no mobile app), Figure Case (iOS only), PileOfShame (indie side project), Brushrage (Android), PaintMyMinis. One developer built PileOfShame as a personal project to scratch their own itch.

**Gap:** No tool uses image recognition to auto-detect painting progress from photos. No integration with hobby retailer purchase history to auto-populate backlogs. No community accountability features (challenges, painting pledges). All solutions are fragmented across platforms with no cross-device sync.

**Meldar angle:** An agent that ingests purchase receipts/order confirmations from Games Workshop, Amazon, local game stores to auto-populate the backlog, tracks progress via photo uploads, and sends motivational nudges ("You painted 3 models this week -- 12% of your Grey Knights are done").

---

## 5. Anime/Manga Watch & Read Tracking

**Pain:** MyAnimeList has an outdated interface, frequent downtime, and slow updates. Manual episode/chapter tracking is tedious, especially across multiple streaming platforms and manga reader apps. Users want auto-detection of what they're watching/reading.

**Current solutions:** MyAnimeList, AniList, Kitsu, Simkl. MAL-Sync (browser extension) auto-tracks on Crunchyroll/Netflix/Hulu. Taiga auto-tracks downloaded episodes. Simkl syncs with streaming services.

**Gap:** Auto-tracking only works on desktop browsers via extensions. No mobile auto-tracking. No unified solution that works across ALL streaming services AND manga readers AND downloaded content. Manga tracking is especially manual -- readers on different apps (Mihon/Tachiyomi forks) have inconsistent sync.

**Meldar angle:** An agent that monitors streaming service watch history APIs + manga reader progress, auto-updates lists across MAL/AniList/Kitsu, detects new episodes/chapters and sends alerts, and provides "what to watch next" recommendations based on completion patterns.

---

## 6. Vinyl Record Collection & Discogs Price Monitoring

**Pain:** Discogs is the de facto collection tracker and marketplace, but its notification system is broken: watchlist alerts end up in spam, there are no push notifications despite promises, and the mobile app lacks alert features. Users resort to third-party tools like Distill (web page change monitor) to watch for listings.

**Current solutions:** Discogs (dominant but frustrating), VinylWorth (price tracking), WaxScan (AI-powered scanner), Distill.io (generic web monitor hack).

**Gap:** No real-time alerts when a specific pressing appears at a target price. No automated "want list" that scans multiple marketplaces (Discogs, eBay, local record store sites). Collection value tracking exists but doesn't alert on significant value changes. 23% of purchases have grading accuracy issues -- no tool helps verify seller reliability.

**Meldar angle:** An agent that monitors Discogs + eBay + other marketplaces for want-list items at target prices, sends instant alerts via push/Discord, tracks collection value over time with alerts on significant changes, and flags sellers with poor grading histories.

---

## 7. TCG (Trading Card Game) Collection & Price Tracking

**Pain:** Pokemon, Magic: The Gathering, and Yu-Gi-Oh collectors need to track thousands of cards across binders, decks, and storage. Prices fluctuate wildly based on tournament results and reprints. Manual cataloging is extremely time-consuming.

**Current solutions:** Collectr, EchoMTG, TCGPlayer Collection, CardCastle (has physical card-scanning machine), Archidekt, Deckbox, MTGNexus.

**Gap:** Card scanning via phone camera exists but is slow and error-prone for bulk scanning. No tool auto-tracks price changes on your specific collection and alerts on significant moves (e.g., "your Charizard VMAX gained $15 today"). No integration between collection trackers and tournament/deck-building tools. Cross-TCG tracking (Pokemon + MTG + Yu-Gi-Oh in one app) is nonexistent.

**Meldar angle:** An agent that monitors market prices for your entire collection, sends alerts on significant value changes, tracks tournament meta shifts that affect card prices, and auto-updates collection when you log purchases or trade confirmations.

---

## 8. Reading List / Watch List Cross-Platform Management

**Pain:** Readers are abandoning Goodreads en masse due to its outdated interface, poor rating system, and lack of innovation. Users tracking books, movies, TV shows, and podcasts across multiple platforms (Goodreads, Letterboxd, Trakt, Spotify) have no unified view. A Dazed article captured the growing backlash: hobby-tracking apps make people choose based on deadlines rather than interest, turning fun into obligation.

**Current solutions:** Goodreads (declining), Bookum, StoryGraph, Literal (books); Letterboxd (films); Trakt, Simkl (TV/movies). No cross-media solution.

**Gap:** No single tool tracks books + movies + TV + podcasts + games with a unified "cultural consumption" dashboard. No tool helps manage the overwhelm -- intelligently surfacing what to consume next based on mood, available time, and past preferences rather than adding to guilt. Reading speed analysis, mood tracking, and progress visualization are increasingly requested but poorly implemented.

**Meldar angle:** An agent that unifies reading/watching/listening/playing into one dashboard, auto-syncs from Kindle, Audible, Netflix, Spotify, Steam etc., provides smart "what next" suggestions calibrated to available time and mood, and sends gentle digests rather than guilt-inducing reminders.

---

## Summary of Patterns

| Pattern | Frequency | Meldar Fit |
|---------|-----------|------------|
| Manual tracking fatigue / abandonment | Very High | Strong -- automation reduces friction |
| Cross-platform fragmentation | Very High | Strong -- unified monitoring agent |
| Notification systems broken or email-only | High | Strong -- multi-channel smart alerts |
| No mobile-first experience | High | Moderate -- agent layer can be mobile-friendly |
| No intelligent recommendations | Medium | Strong -- AI-powered suggestion engine |
| Price/value monitoring across marketplaces | Medium | Strong -- multi-source monitoring agent |
| Community/accountability features missing | Medium | Moderate -- social layer on top of tracking |

**Key insight:** The universal complaint across all hobbies is that tracking starts enthusiastic and dies within weeks because it requires manual effort. Any solution that auto-tracks and reduces friction to near-zero has a massive advantage. The second universal complaint is platform fragmentation -- data lives in 3-5 different services with no unified view.

---

*Research date: 2026-03-30*
*Sources: Reddit, ResetEra, BoardGameGeek, DakkaDakka, Discogs Forums, Steam Community, Wargamer, Two Average Gamers State of Game Tracking 2026 Report*
