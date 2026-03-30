# Discovery Engine — Final Synthesis

**13 agents. 13 reports. One architecture.**

---

## The Product in One Sentence

"Take back your data from Big Tech. See where your time actually goes. We build a personal app that fixes it."

## The Three-Act Flow

### Act 1: RECLAIM
"Google/Apple/Meta have been collecting your data for a decade. They used it to sell you ads. Download it. It's your legal right."

### Act 2: REVEAL
"Upload it to Meldar. In 15 seconds, see your Time X-Ray — where your hours actually go. The numbers will surprise you."

### Act 3: RECLAIM (your time)
"Pick the biggest time-waster. We build a personal app that handles it. Done."

---

## Discovery Mechanism: The Effort Escalation Funnel

Every step proves value BEFORE asking for the next.

### Level 0: Zero Data (everyone, 15 seconds)
**"Pick Your Pain" quiz**
- Tap 3-5 tiles from a visual grid of researched pain points
- Instant: matched automation suggestions based on archetype
- Build time: 3-5 days
- Completion rate: 80-90%
- This IS the landing page. No signup gate.

### Level 1: One Image (30 seconds)
**Screen Time screenshot**
- User takes a screenshot of their iPhone/Android Screen Time
- Upload it. Vision AI (Claude Haiku, $0.002/parse) extracts: apps, hours, pickups, categories
- Instant: "You spend 47 min/day in Gmail and check Zillow 8 times. Want alerts instead?"
- Build time: 1-2 days
- THE unfair hack. Zero install, zero permissions, real data.

### Level 2: One Upload (3 minutes + 5-15 min wait)
**Google Takeout ZIP**
- Step-by-step tutorial embedded in our app
- User downloads their data from takeout.google.com
- Uploads the ZIP. **Parsed client-side in the browser — data never leaves their device.**
- Contains: Chrome history, Search history, YouTube, Calendar, Maps, Fit
- While waiting for export: run the chat questionnaire + Screen Time screenshot
- Build time: 1-2 weeks
- Goldmine. Years of behavioral data from one file.

### Level 3: One Install (ongoing, trust earned)
**Chrome extension**
- One "Add to Chrome" click
- Manifest V3: `history` + `tabs` permissions (same as ad blockers)
- 90-day history backfill on install
- Live tracking: URL sequences, tab switches, time per site
- Silent Google OAuth via `chrome.identity` — Calendar + Gmail metadata for free
- Build time: 2 weeks
- The foundation for ongoing discovery.

### Level 4: Deep Dive (power users, month 2+)
- Apple Health XML upload (sleep, activity)
- Meta/Instagram data download (social media time estimation)
- macOS Screen Time SQLite database (direct read, ~50 lines of code, includes iOS data via iCloud)
- Email MBOX upload (parsed client-side, zero server)

---

## The Hacks That Save Months

| Hack | What it replaces | Effort saved |
|------|-----------------|:---:|
| Google Takeout upload | 4 separate OAuth integrations | ~3 weeks |
| Screen Time screenshot + Vision AI | Screen Time API (locked down by Apple) | weeks of native app dev |
| Client-side ZIP parsing | Server-side data processing + storage | entire backend |
| macOS knowledgeC.db | Screen Time API | weeks |
| Chrome extension silent OAuth | Separate Google OAuth flow | ~1 week |
| Single Claude Sonnet call for analysis | Custom ML pipeline | months |
| "Data never leaves your device" | GDPR data controller compliance | legal complexity |

---

## The Viral Hook

**"Spotify Wrapped for productivity"**

The Time X-Ray report is designed to be screenshotted and shared:
- "I wasted 847 hours on Instagram last year"
- "I Googled 'easy dinner recipes' 23 times this month"
- "I check my email 47 times a day but only respond to 3"

The gap between self-perception and reality is the viral moment. People think they waste time on X. The data shows it's actually Y. That surprise is what gets shared on TikTok.

**The movement framing:**
"Big Tech owned your data for a decade. They used it. Abused it. Now take it back and use it for yourself."

---

## Naming

| Internal | User-facing |
|----------|------------|
| Discovery engine | **Time X-Ray** |
| Pattern analysis | "Your report" / "Your numbers" |
| Automation suggestion | "Your fix" |
| The CTA | "See your Time X-Ray" / "Find my 2 hours" |

**Competitive positioning:**
- Lovable: "Tell us what to build"
- Zapier: "Connect these two apps"
- Meldar: "We show you what's eating your week — then fix it"

**Best analogy:** "Shazam for wasted time" — it listens, identifies, gives you the answer.

---

## MVP Build Plan (4 weeks)

### Week 1: Instant Value
- Pick Your Pain quiz (landing page, no signup needed)
- Screen Time screenshot parser (Vision AI)
- Chat questionnaire (5 questions, LLM-powered)
- Combined report: estimated + real data
- Email capture happens AFTER they see value

### Week 2: Deep Data
- Google Takeout upload wizard with step-by-step screenshots
- Client-side ZIP parser (Chrome history, Search, Calendar, YouTube)
- "Chat while you wait" flow during Takeout export delay
- Full Time X-Ray report with real numbers

### Week 3: Ongoing Discovery
- Chrome extension (Manifest V3)
- 90-day history backfill
- Live URL sequence detection
- Weekly report: "Here's what changed this week"

### Week 4: Polish
- GDPR endpoints (export, delete)
- Apple Health XML parser
- Meta/Instagram data download parser
- Error handling, edge cases, mobile optimization

### Cost per user discovery: ~$0.05
At 1,000 beta users = $50 total.

---

## What Changes on the Landing Page

The hero and How It Works sections need to reflect this new flow:

**Hero:** "We find what's eating your hours. Then we fix it for you."
→ Keep this. It's accurate.

**How It Works should become:**
1. "Take a screenshot of your Screen Time" (or pick your pain points)
2. "See your Time X-Ray" (the reveal — your real numbers)
3. "Pick a fix. We build it." (the payoff)

**The Tiers should become:**
- **X-Ray (Free):** See where your time goes. Quiz + screenshot + report.
- **Starter:** Connect more data. Get deeper insights. We walk you through everything.
- **Concierge:** We build the fix for you while you watch.

**New section needed:** "What your Time X-Ray shows you" — example reports, before/after numbers, the "aha" moments.

---

## Open Questions

1. Can we do client-side Takeout ZIP parsing for files up to 100MB in the browser? (WebAssembly + streaming)
2. Chrome Web Store review timeline for Manifest V3 with history+tabs permissions?
3. Google Takeout export delay — is it always 5-15 min or can it take hours?
4. Screen Time screenshot OCR accuracy across iOS versions, languages, dark/light mode?
5. Can the macOS knowledgeC.db hack work without elevated permissions?
6. How do we handle users who don't use Google (Apple-only, Firefox-only)?

---

*13 reports in `/docs/discovery/`. This synthesis is the decision document.*
