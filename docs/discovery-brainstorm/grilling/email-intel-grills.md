# Privacy & Data Handling Grill — Cross-Review

**Reviewer:** Email Intelligence Engineer
**Date:** 2026-03-30
**Scope:** All discovery brainstorm documents — ai-data-sources.md, rapid-prototypes.md, discovery-engine.md, architecture.md, SYNTHESIS.md, email-discovery.md, messaging.md

---

## 1. Privacy Landmines — Data Sources That Reveal Sensitive Information

### CRITICAL: Screenshot Content Is Uncontrollable

Every document treats screenshots as "low friction, low risk." This understates the problem. **The user controls what app they screenshot, but they do NOT control what content appears in that screenshot.** A screenshot is a raw pixel dump of whatever is on screen at that moment.

#### Landmine 1: Notification Center Screenshots Expose Private Messages

**Source:** ai-data-sources.md (Source #3), email-discovery.md (Section 2)

Both documents propose analyzing notification center screenshots. They acknowledge "notification previews can contain message content" but then pivot to "we should focus extraction on app names + counts only, ignoring preview text."

**The problem:** We send the screenshot to Claude Vision API. Claude sees EVERYTHING in the image — private WhatsApp messages, Tinder match notifications, Signal messages, banking alerts ("You spent $847 at..."), health app alerts ("Time to take your medication"), pregnancy tracker notifications. **Even if our prompt says "extract only app names," the image content has already been transmitted to and processed by Anthropic's API.**

**Severity: HIGH.** This is not a UI design problem. It is an architectural privacy problem. The data has left the user's device the moment the screenshot is uploaded.

**Recommendation:**
- Notification count from Screen Time > Notifications is the safe alternative (already proposed). It shows counts, not content. ALWAYS prefer this over raw notification center screenshots.
- If we ever accept notification center screenshots, we must: (a) warn users to clear sensitive notifications first, (b) explicitly state in the privacy policy that screenshot content is processed by a third-party AI service, (c) consider client-side blurring of message previews before upload.

#### Landmine 2: Email Inbox Screenshots Expose Subject Lines

**Source:** ai-data-sources.md (Source #4), email-discovery.md (Section 1)

Email subject lines are classified as medium-high privacy sensitivity in ai-data-sources.md. My own email-discovery.md extracts sender names, subject lines, timestamps, and label names. But email subjects routinely contain:
- Medical: "Your lab results are ready", "Appointment reminder: Dr. [Name], Psychiatry"
- Financial: "Your credit card statement: $4,293.41", "Loan application approved"
- Legal: "Re: Custody agreement draft", "Your court date has been scheduled"
- Employment: "Offer letter from [Company]", "Your termination paperwork"
- Relationship: "I think we need to talk", emails from dating services

**Severity: HIGH.** A single inbox screenshot might contain subject lines that reveal medical conditions, financial status, legal proceedings, or relationship status. The user might not even notice these before uploading.

**Recommendation:**
- The unread count + sender frequency analysis from email-discovery.md is MUCH safer than subject-line analysis. We should default to pattern analysis (count, sender domains, time distribution) and explicitly warn users that subject lines will be visible.
- Consider a "preview before upload" step that shows the user their screenshot with subject lines highlighted, asking "Are you comfortable sharing this?"

#### Landmine 3: ChatGPT Export Contains the User's Deepest Problems

**Source:** ai-data-sources.md (Source #6)

This is described as "might be the single highest-value discovery source." It is also potentially the most sensitive data source in the entire system. ChatGPT conversations regularly contain:
- Mental health discussions ("Am I depressed?", therapy-adjacent conversations)
- Medical self-diagnosis ("What does this symptom mean?")
- Financial confessions ("I'm $30k in debt, how do I...")
- Relationship trauma ("My partner said X, is this gaslighting?")
- Career secrets ("How to negotiate a raise without my boss knowing")
- Academic dishonesty ("Write this essay for me")

The Tier A (titles only) approach mitigates this somewhat, but even conversation titles can be revealing: "Am I being gaslit" is explicitly acknowledged as an example. The Tier B (full export) approach sends ALL of this to our analysis pipeline.

**Severity: CRITICAL.** This data is more intimate than browsing history, financial records, or health data. It is a record of every problem the user couldn't solve themselves. Processing this data — even "client-side" — creates a massive liability if anything leaks.

**Recommendation:**
- Tier A (title analysis) should be the MAXIMUM for V1. Do not offer Tier B until the product has established deep trust.
- Even for Tier A, implement client-side title categorization (regex patterns for sensitive keywords) that flags and optionally redacts sensitive titles BEFORE any data leaves the device.
- The privacy policy MUST explicitly list ChatGPT data as a processed source with details on what is analyzed.

#### Landmine 4: Bank Statement Screenshots Show Complete Financial Life

**Source:** ai-data-sources.md (Source #5), email-discovery.md (Section 4b), discovery-engine.md (Level 4)

Bank statements reveal:
- Income (salary deposits with employer name)
- Spending habits (gambling sites, adult entertainment, alcohol, cannabis dispensaries)
- Financial distress (overdraft fees, payday loan payments)
- Location data (merchant locations)
- Relationship status (joint accounts, transfers to individuals)

The SYNTHESIS.md correctly ranks bank statements as Privacy Risk 1/5 (highest risk). Yet discovery-engine.md still includes it at Level 4 of the trust escalation funnel, and rapid-prototypes.md's "Subscription Autopsy" cross-references bank data.

**Severity: CRITICAL.** Financial data is the most heavily regulated data category in the EU (PSD2, GDPR Article 9 by extension if it reveals health/political data). Processing bank screenshots through AI is a legal minefield.

**Recommendation:**
- Phase 3+ is correct timing, but even then: use ONLY the App Store/Play Store subscription view (not bank statements) for subscription discovery. This gives 80% of the insight with 5% of the legal risk.
- If bank statements are ever processed, it must be 100% client-side with no data transmission. The user must see a processed summary (merchant names + amounts only) and explicitly approve what gets analyzed.
- Consider whether bank statement analysis requires a formal DPA or financial data processing authorization under Finnish law.

#### Landmine 5: Home Screen Screenshots Reveal Installed Apps

**Source:** ai-data-sources.md (Source #20)

Home screen layout analysis is rated "Low" privacy sensitivity. This is wrong. Installed apps can reveal:
- Dating app usage (Grindr, Tinder, Hinge — potentially outing someone)
- Mental health apps (BetterHelp, Calm, Headspace)
- Religious apps (prayer apps, religious community apps)
- Political affiliation (partisan news apps, campaign apps)
- Health conditions (diabetes trackers, fertility apps, HIV management apps)
- Financial status (buy-now-pay-later apps, payday loan apps)

**Severity: MEDIUM.** App presence alone is less damaging than content, but for certain populations (closeted individuals, people in restrictive environments), this can be genuinely dangerous.

**Recommendation:**
- Home screen analysis should not call out specific sensitive app categories. "You have 127 apps" is fine. "You have Grindr on your home screen" is not.
- Implement a sensitive app list (dating, health, religious, political) and exclude these from any named output. Count them as "Personal" category without specifics.

---

## 2. GDPR Issues — What Needs Additional Legal Work

### Issue 1: Screenshot Processing via Claude API = Data Processor Transfer

**Affected docs:** ALL (every Vision-based feature)

Every screenshot sent to Claude Vision API constitutes a transfer of personal data to Anthropic (a US company). Under GDPR:
- Meldar is the **data controller** (we decide to process the screenshot)
- Anthropic is the **data processor** (they process it on our behalf)
- This requires a **Data Processing Agreement (DPA)** between ClickTheRoadFi Oy and Anthropic
- Post-Schrems II, this likely requires **Standard Contractual Clauses (SCCs)** for the EU-US data transfer
- The privacy policy must disclose the transfer to a US-based AI service

**Current state:** The CLAUDE.md mentions the privacy policy page exists (`/privacy-policy`), but none of the brainstorm documents discuss the DPA requirement with Anthropic.

**Action required:**
1. Check if Anthropic offers a standard DPA for API customers (most AI providers do)
2. Execute the DPA before launching any Vision-based features
3. Update privacy policy to name Anthropic as a sub-processor
4. Mention the EU-US transfer mechanism (likely SCCs or EU-US Data Privacy Framework)

### Issue 2: "Client-Side Processing" Claim Is Only Partially True

**Affected docs:** discovery-engine.md, architecture.md, SYNTHESIS.md

Multiple documents claim "data never leaves your computer" and "client-side processing." This is true for Google Takeout parsing (browser-based ZIP extraction). But it is FALSE for:
- Screen Time screenshots → sent to Claude Vision API
- Notification screenshots → sent to Claude Vision API
- Calendar screenshots → sent to Claude Vision API
- Email inbox screenshots → sent to Claude Vision API
- Subscription screenshots → sent to Claude Vision API
- Any screenshot-based feature → the image is transmitted to a server, then to Anthropic

The architecture.md even specifies the API route: `POST /api/upload/analyze`. This is server-side processing.

**Severity: HIGH (legal/trust).** Claiming "your data never leaves your device" while sending screenshots to a US-based AI API is not just inaccurate — it could constitute a deceptive practice under EU consumer protection law. It would also destroy trust if discovered.

**Recommendation:**
- Be honest. The messaging should be: "Your raw files (Google Takeout, bank exports) are processed entirely in your browser. Screenshots are analyzed by our AI partner (Anthropic) to extract patterns, then immediately discarded. We never store your screenshots."
- The privacy policy must clearly distinguish between client-side processing (Takeout) and server-side processing (screenshots).
- Implement screenshot auto-deletion: after Vision API extraction, delete the uploaded image immediately. Do not store it. Log only the extracted structured data.

### Issue 3: Consent Scope Ambiguity

**Affected docs:** discovery-engine.md (retroactive enrichment), architecture.md (unified pipeline)

The discovery engine's "retroactive enrichment" feature (adding Source N reprocesses Sources 1 through N-1) means that data provided for one purpose gets reprocessed in a new context. Under GDPR Article 6(1)(a), consent must be specific. If a user consented to "analyze my Screen Time," does that consent cover reprocessing their Screen Time data in light of their bank statement?

**Severity: MEDIUM.** Arguably, the user's overall consent to "discover my time patterns" covers cross-referencing. But a strict interpretation could argue that each new data source combination requires renewed consent.

**Recommendation:**
- Frame consent broadly at first signup: "Meldar combines your uploaded data to find patterns across sources. Each new upload enriches your full profile."
- On each new source upload, show a brief note: "This will be combined with your previous uploads for deeper insights."
- Store a consent log per source upload.

### Issue 4: Data Retention and Right to Deletion

**Affected docs:** architecture.md (database schema)

The `discovery_sessions` and `discovery_sources` tables store extracted signals and metadata indefinitely. GDPR Article 17 gives users the right to erasure.

**Current state:** No deletion mechanism is described. No retention period is specified.

**Action required:**
1. Implement a "Delete my data" endpoint that cascades through `discovery_sessions` → `discovery_sources`
2. Define a retention period (suggest: 90 days for inactive sessions, then auto-delete)
3. Ensure Claude API requests don't retain data (check Anthropic's data retention policy for API usage — as of 2025, Anthropic states they don't train on API data and don't retain it beyond 30 days for abuse monitoring)
4. Document this in the privacy policy

---

## 3. Data Users Will NEVER Share — Theory vs. Reality

### The Effort-Sensitivity Matrix

Not every screenshot a user CAN take is a screenshot they WILL take. Here's my honest assessment of what Gen Z will and won't share:

| Data Source | Will They Share? | Why / Why Not |
|-------------|:---:|---|
| Screen Time (app usage) | YES | They already screenshot this for TikTok/Instagram stories. It's normalized. |
| Notification count | YES | It's just numbers. "232 notifications/day" is a flex, not a confession. |
| Calendar | PROBABLY | Low sensitivity for Gen Z (fewer work meetings). Students might share class schedules. |
| App Store subscriptions | PROBABLY | Dollar amounts sting but aren't secret. The "waste" angle motivates sharing. |
| Alarm clock | YES | Utterly non-sensitive. Serial snoozer = relatable content. |
| Battery usage | YES | Technical data, no personal exposure. |
| Email inbox | MAYBE | Depends on what's visible. Unread count = yes. Subject lines = hesitation. |
| Notification center (raw) | MAYBE | Risk of exposing private messages. Users will self-censor but some won't notice. |
| Home screen | MAYBE | Dating/health apps visible = won't share. Generic home screen = yes. |
| Chat list (WhatsApp/Telegram) | UNLIKELY | Contact names visible. "Who they talk to" is very personal for Gen Z. |
| Browser tabs | UNLIKELY | 127 tabs includes that embarrassing search and the 3am Wikipedia rabbit hole. |
| Google Search history | UNLIKELY | Way too personal. "How to tell if you're pregnant" in the search history = instant nope. |
| Bank statement | NO | Gen Z is broke and knows it. Financial data feels shameful, not shareable. |
| ChatGPT full export | NO | This is their diary. Even title-only analysis feels invasive for many. |
| Clipboard history | NO | Passwords, copied messages, 2FA codes. Too risky. |

### The Critical Insight: Viral Shareability Requires Non-Sensitivity

The viral hook ("share your X-Ray") only works if people are COMFORTABLE sharing. Screen Time and notification counts work because they're humble-brag-adjacent: "Look how addicted I am" is a flex for Gen Z, not a confession. Bank statements and search history will NEVER be viral because the shame outweighs the curiosity.

**Recommendation for the SYNTHESIS priority list:**
- The top 5 sources (Screen Time, Notifications, Calendar, Subscriptions, Email) are correctly ordered by shareability.
- Bank statements (ranked Phase 3) should be moved to Phase 4 or later. The SYNTHESIS ranks it Privacy Risk 1/5 — this should be a bigger red flag for prioritization.
- ChatGPT export should be repositioned as a "power user" feature, not a mass-market discovery tool. Most users will not share their ChatGPT conversations.
- Google Search history (Phase 2 in SYNTHESIS) should be reconsidered. The insight density is high but user willingness to share is low. Consider offering the text-paste approach (user pastes a few searches) rather than a full screenshot.

---

## 4. Screenshot Content Risks — What Unexpected Content Appears

### Risk 1: Passwords and Authentication Data

**Where it appears:**
- Password managers showing passwords in plaintext (if user has the app open)
- Browser autofill showing saved passwords
- 2FA codes in notification center
- "Your verification code is 482931" in SMS notifications
- Banking OTPs visible in notification previews
- Email subjects containing password reset links

**Scenario:** User screenshots their notification center. A 2FA code for their bank is visible. We send this to Claude API. Even if we don't extract it, the image containing the code has been transmitted to and processed by a third party.

**Mitigation:** Pre-upload warning screen: "Check your screenshot for passwords, verification codes, or sensitive messages before uploading." But users won't read warnings. Better: client-side image pre-processing that detects and blurs common code patterns (6-digit numbers in notification previews) before upload.

### Risk 2: Private Messages in Preview Text

**Where it appears:**
- iMessage/WhatsApp/Telegram notification previews
- Email previews showing message body
- Social media DM previews

**Scenario:** User screenshots their inbox. A visible email preview reads: "Hi [Name], your HIV test results are attached." This is now in our processing pipeline and, briefly, in Anthropic's.

**Mitigation:** For email analysis, explicitly recommend screenshotting the FOLDER LIST with unread counts (sidebar view) rather than the message list view. The sidebar shows folder names and counts, not message content.

### Risk 3: NSFW Content in Notifications

**Where it appears:**
- Dating app notifications with profile photos
- Social media with explicit content
- Adult content app notifications

**Scenario:** User screenshots notification center. A dating app notification includes a profile photo that is suggestive or explicit. This image goes to Claude API. Anthropic's content policy may flag or reject the request. At minimum, we are now processing NSFW content of a third party without their consent.

**Mitigation:** This is a real-world scenario we cannot fully prevent. The best defense is: (a) prefer Screen Time > Notifications over raw notification center, (b) in the upload flow, show a checklist of "things to check before uploading" with specific examples.

### Risk 4: Other People's Data in Screenshots

**Where it appears:**
- Contact names in chat lists
- Sender names in email
- Attendee names in calendar events
- Shared group chat names
- "You and [Name] have a meeting at 3pm"

**GDPR concern:** Processing other people's names constitutes processing their personal data. If a user uploads a WhatsApp chat list screenshot showing 30 contact names, we are processing personal data of 30 people who never consented.

**Severity: MEDIUM.** Under GDPR's "household exemption" (Article 2(2)(c)), processing for purely personal/household activities is exempt. But Meldar is a commercial service processing this data, so the exemption may not apply to US.

**Mitigation:** Extract patterns (count of chats, unread count) rather than storing or displaying other people's names. If we extract contact names, do not persist them — use them only for in-session analysis, then discard.

---

## 5. The Trust Threshold — Where Gen Z Says "Too Creepy"

### The Creepiness Gradient

Based on research synthesis and Gen Z behavioral patterns, here is where trust breaks:

```
COMFORTABLE ────────────────────────────────────── CREEPY
     |                    |                    |
  "That's cool"     "Hmm okay"          "Nope, delete"
     |                    |                    |
Screen Time          Email inbox          Bank statements
Notifications        Calendar             Search history
Alarm clock          Chat list            ChatGPT export
Battery usage        Browser tabs         Clipboard
Subscriptions        Home screen          Location history
```

### The Trust Tipping Point: "It Knows Too Much"

Gen Z has a specific trust architecture:
1. **They share performance data freely** (Screen Time, notifications, alarms — "look at my stats")
2. **They share consumption data cautiously** (what apps they use, what they subscribe to — "this is about my money/time")
3. **They refuse to share content data** (what they said, searched, wrote, spent money on — "this is about who I am")

The line is: **metadata about behavior = okay. Content of that behavior = not okay.**

"You use Instagram 3 hours/day" = metadata. Fine.
"You searched for 'how to tell if your partner is cheating'" = content. Not fine.
"You have 232 notifications/day" = metadata. Fine.
"Your WhatsApp notification says 'are we still together?'" = content. Not fine.

### Where Each Document Crosses the Line

| Document | Where It Crosses | Severity |
|----------|-----------------|----------|
| **ai-data-sources.md** | ChatGPT full export (Tier B), Google Search history, clipboard history | HIGH — these are content-level data sources being proposed for Phase 2-3 |
| **rapid-prototypes.md** | Copy-Paste Detective asks users to share clipboard contents | MEDIUM — novel and fun, but clipboard = passwords + private messages |
| **discovery-engine.md** | "Intent-Action Gaps" insight requires knowing WHAT they searched for | MEDIUM — the example ("you searched 'home workout routine'") seems benign but the engine would need the actual search content |
| **architecture.md** | `raw_input JSONB` stores original extracted data | MEDIUM — even if normalized signals are safe, storing raw extraction data preserves sensitive content |
| **email-discovery.md** | Subject line analysis, sender name extraction | MEDIUM — my own doc needs this correction: default to counts/patterns, not content |
| **SYNTHESIS.md** | Ranks Google Search History as "Next week" priority | HIGH — this should be Phase 3+ given privacy friction |

### The "Creepy Threshold" Test

Before building any feature, apply this test:

> "If a user told their friend what this feature does, would the friend say 'that's cool' or 'that's creepy'?"

- "It tells you how many notifications you get per day" → Cool
- "It reads your email subjects to find patterns" → Borderline
- "It analyzes your ChatGPT conversations" → Creepy
- "It looks at your bank statement" → Creepy
- "It reads what you copied to your clipboard" → Very creepy

### The Trust Recovery Problem

If a user feels creeped out once, they don't just close the feature — they leave the product and tell others. Gen Z's privacy instinct is hair-trigger because they grew up watching Facebook scandals. One viral tweet saying "Meldar reads your DMs" (even if technically inaccurate) would be catastrophic at the early-adopter stage.

**Recommendation:** Launch ONLY with "cool" and "borderline" features. Bank statements, search history, ChatGPT exports, and clipboard analysis should be gated behind a significant trust-building period (not Phase 2, but Phase 4+). The "boring" metadata sources (Screen Time, notifications, subscriptions, alarms) are more than enough to build a compelling product.

---

## Summary: Required Actions Before Launch

### Must Do (Legal/Compliance)

1. Execute DPA with Anthropic for Claude API usage
2. Update privacy policy to disclose:
   - Screenshot processing via third-party AI (Anthropic)
   - EU-US data transfer mechanism
   - What data is extracted vs. discarded
   - Data retention period
   - Right to erasure process
3. Implement screenshot auto-deletion after Vision extraction
4. Implement "Delete my data" endpoint
5. Stop claiming "data never leaves your device" for screenshot-based features

### Must Do (Product/Trust)

6. Add pre-upload preview screen for all screenshot features ("Check for sensitive content")
7. Default to metadata analysis (counts, patterns, ratios) over content analysis (subjects, messages, names)
8. Implement sensitive app category exclusion for home screen analysis
9. Do not store other people's names from chat lists or email — extract patterns only

### Should Reconsider (Prioritization)

10. Move bank statement analysis from Phase 3 to Phase 4+
11. Move Google Search history from "Next week" to Phase 3+
12. Reposition ChatGPT export as power-user feature, not mass-market
13. Drop clipboard analysis (Copy-Paste Detective) from rapid prototypes or make it text-paste only with explicit password warning
14. Prefer Screen Time > Notifications over raw notification center screenshots in all docs

### Architecture Change

15. Add a `data_retention_policy` field or auto-expiry to `discovery_sessions` (90-day TTL for inactive sessions)
16. Do NOT store `raw_input` JSONB beyond the session. Extract signals, persist signals, delete raw input. The raw extraction contains the sensitive data; the normalized signals do not.
17. Implement consent logging: record what the user consented to analyze, when, and at what scope
