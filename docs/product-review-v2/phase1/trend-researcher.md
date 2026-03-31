# Trend Research Report — Phase 1

**Agent:** Trend Researcher
**Date:** 2026-03-31
**Scope:** Market intelligence on ChatGPT Export Analyzer, Subscription Autopsy, Actionable Screen Time, and ADHD Mode features

---

## 1. ChatGPT Export Analysis — Blue Ocean Assessment

### Does ANY product do this?

Yes, but the space is **nascent and fragmented**. No dominant player has emerged:

| Product | What It Does | Pricing | Differentiation |
|---------|-------------|---------|-----------------|
| **GPT Rewind** ([gpt-rewind.com](https://gpt-rewind.com)) | Spotify Wrapped-style analytics: AI personality type, "AI IQ Level," topic trends, curiosity index, tone analysis | Freemium (free = counts/charts, premium = deeper analytics) | Shareable cards for Instagram/X/TikTok/LinkedIn |
| **AI Wrapped** ([aiwrapped.app](https://www.aiwrapped.app)) | Multi-provider analysis (ChatGPT + Claude + Gemini), personality type, cognitive offload score, knowledge graph | Unknown | Client-side processing, multi-provider support |
| **GPT Wrapped (Hexus)** | Total conversations, questions asked, most active day | Unknown | Also covers Claude and Grok |
| **Quantified ChatGPT** ([github](https://github.com/markwk/quantified_chatgpt)) | Jupyter notebook: data viz + markdown export | Free (open source) | Developer-oriented, requires Python |
| **ChatKeeper** ([martiansoftware.com](https://www.martiansoftware.com/chatkeeper/)) | Local conversation organizer, directory structures, search | Unknown | Desktop app, privacy-focused |
| **Export Reader** ([exportreader.com](https://exportreader.com)) | Read & search ChatGPT + Claude exports | Free | Browser-based, no analysis |

### What OpenAI itself does

- **"Your Year with ChatGPT"** — Official annual recap feature launched December 22, 2025. Spotify Wrapped-style summaries.
- **PersonalContextAgentTool** — New in early 2026 for Plus/Pro subscribers: full chat history search reaching back to first conversation.
- **Enterprise/Edu Workspace Analytics** — Usage dashboards for organizational admins.

### Blue ocean verdict

**Partially blue ocean.** The "wrapped/recap" niche exists but is shallow — these tools show vanity metrics (conversation counts, personality types), not **actionable insights**. Nobody is doing what Meldar proposes: analyzing ChatGPT conversations to surface **unsolved problems the user keeps asking about** and turning those into buildable apps. That specific angle — "your ChatGPT history reveals what you actually need automated" — is genuinely novel.

### Market size context

- ChatGPT: **900 million weekly active users** (Feb 2026), up from 400M in Feb 2025
- **~1 billion monthly active users**, 50 million paying subscribers
- **2 billion+ daily queries** processed
- Export format: ZIP containing `conversations.json` + `chat.html`, available to all users

**The addressable market is enormous.** Even 0.1% of ChatGPT users trying a free analyzer = 1 million users.

---

## 2. Subscription Tracking Market — Competitive Landscape

### Key competitors

| Product | Model | Pricing | Key Feature | Users/Revenue |
|---------|-------|---------|-------------|---------------|
| **Rocket Money** (fka Truebill) | Bank-connected auto-detection | Free basic; Premium $6-12/mo | Bill negotiation (35-60% of savings) | 3.4M members, ~$80M revenue, acquired for $1.275B |
| **Monarch Money** | Bank-connected budgeting | $9.99/mo or $99.99/yr | Collaborative (couples/families) | Founded by ex-Mint employees |
| **Copilot Money** | Bank-connected, AI categorization | $9.99/mo or $69.99/yr | Apple-only, best-in-class UX | Growing fast post-Mint shutdown |
| **YNAB** | Manual zero-based budgeting | $14.99/mo or $99.99/yr | Philosophy-driven budgeting | Since 2004, loyal user base |
| **Bobby** | Manual entry | $2.99 one-time IAP | Clean minimalist design | iOS only, unmaintained Android |
| **LowerMySubs** | Manual entry, privacy-first | Free | No bank connection needed | Rated 9.5/10 by own blog |
| **Orbit Money** | Hybrid: bank + screenshot + CSV + email | In development | "Magic Import" from screenshots/PDFs/CSVs | Pre-launch |
| **PocketGuard** | Bank-connected | Freemium | "In My Pocket" spending summary | Established player |

### Subscription fatigue statistics (2025-2026)

- **41%** of consumers experience subscription fatigue
- Average consumer holds **5.6-8.2 active subscriptions**, spending **~$118/month ($1,416/year)**
- Critical insight: People **estimate** spending $86/month but **actually spend $219/month** — a **2.5x underestimation gap** (C+R Research)
- Average household trimmed subscriptions from 4.1 to 2.8 in one year (32% drop)
- **39%** plan to cancel at least one subscription in the next year

### How Meldar's screenshot approach differs

Most competitors require **bank account linking** (Plaid integration), which:
- Creates friction and trust barriers (sharing bank credentials)
- Excludes international users (Plaid coverage is US/UK-centric)
- Misses subscriptions paid via gift cards, crypto, or family plans

**Orbit Money** is the closest competitor to Meldar's screenshot approach — they're building "Magic Import" from screenshots, bank statements, CSVs, and PDFs. But they're pre-launch and positioning as a full subscription manager, not a discovery/waste-finding tool.

Meldar's angle: "Take a screenshot of your subscriptions page → we instantly show you what you're wasting" is **faster and more private** than bank linking. The 2.5x underestimation gap is a powerful marketing hook.

### Acquisition costs

Specific CAC data for subscription trackers is not publicly available, but:
- Rocket Money spent heavily on marketing in 2025 to boost subscribers
- The category competes for the same "personal finance" keywords, which have high CPC ($5-15 for "subscription tracker")
- Bobby's $2.99 one-time purchase suggests the LTV floor is very low for basic trackers

---

## 3. ADHD + Productivity Tools — Market Landscape

### Major ADHD-focused products

| Product | Category | Pricing | Key Stats |
|---------|----------|---------|-----------|
| **Tiimo** | Visual daily planner | Freemium ($5.99/mo premium) | 500K+ free users, 50K+ paying, **iPhone App of the Year 2025**, $4.8M raised |
| **Goblin Tools** | AI task breakdown | Free | Breaks complex tasks into steps, zero investment needed |
| **Focusmate** | Virtual body-doubling | Free (3 sessions/wk); Plus $6.99/mo | Based on body-doubling research |
| **Inflow** | CBT-based ADHD management | $13.99/mo or $69.99/yr | 100K+ downloads, $14M+ raised |
| **Habi** | Focus blocker + planner | Freemium | Distraction blocking + ADHD-specific planning |
| **Mutra** | ADHD planner for time blindness | Unknown | Niche: visual time representation |
| **Morgen** | Calendar + scheduling | Freemium | Not ADHD-specific but popular with ADHD users |

### Is "ADHD mode" a thing in other products?

**Not as a named toggle, no.** This is a gap. Current products either:
1. **Are built entirely for ADHD** (Tiimo, Inflow, Goblin Tools) — the whole app is "ADHD mode"
2. **Have no ADHD accommodations at all** (most mainstream productivity apps)

No mainstream productivity app offers a switchable "ADHD mode" that changes the UX. The closest precedent is:
- **Sensory-friendly design patterns** (reduced motion, simplified layouts, gentle notifications) — described by Tiimo as a design philosophy, not a toggle
- **Focus modes** in iOS/Android — system-level, not app-specific
- **Audio focus streams** — some apps offer ADHD-tuned ambient audio (Brain.fm, Endel)

**This means Meldar adding an "ADHD Mode" toggle would be genuinely novel** in the productivity/personal automation space.

### Market size indicators

- App-based CBT market: **$2.4B (2025) → $3.17B (2026) → projected $8.23B (2030)**
- Tiimo winning iPhone App of the Year 2025 signals strong Apple editorial support for neurodivergent tools
- Inflow's $14M in funding for ADHD-only CBT shows investor appetite

---

## 4. Stim Games as Focus Tools — Research

### Scientific evidence

| Study/Source | Finding |
|-------------|---------|
| **CHADD (Children and Adults with ADHD)** | Fidgeting enhances focus by channeling restless energy through subtle movement, keeping ADHD individuals engaged |
| **44-child ADHD study** | Children with ADHD performed better on cognitive tasks when allowed to move/fidget |
| **Focus Cat (CHI Play 2022)** | Therapeutic idle game designed for ADHD: idle game loops align well with therapeutic use cases — short, repeating cycles draw users in for brief sessions |
| **PMC brain teaser study** | Puzzle games enhance prefrontal cortex function, improving thinking, decision-making, concentration, and problem-solving |
| **Tetris EEG study** | Tetris reflects heightened cognitive engagement compared to other game types |
| **Cortisol study (PMC)** | After playing puzzle games, salivary cortisol and alpha-amylase significantly decreased — measurable stress reduction |

### Mechanism

The science supports a **dual-channel theory**: ADHD brains are understimulated by default. A low-level secondary stimulus (fidgeting, doodling, idle game) occupies the "boredom channel," freeing the primary attention channel to focus on the actual task.

### Practical examples

- **Tetris**: structured, immediate feedback, spatial reasoning — research suggests benefits for ADHD focus but "more research needed"
- **2048**: strategic tile manipulation, challenges working memory and planning
- **Cup Heroes / idle games**: minimal cognitive load, satisfying feedback loops
- **Doodling, coloring**: "mindless" activities that block distractions and increase productivity (ADDitude Magazine)

### Verdict for Meldar

There is **real scientific backing** for stim/fidget games as focus aids, but **no product has positioned idle/puzzle games specifically as an ADHD productivity tool**. Most ADHD apps focus on planning, blocking, or therapy — none say "here's a game to help you focus." This is a **differentiation opportunity** but needs careful framing (not "play games instead of working" but "activate your focus channel").

---

## 5. Gen Z + ADHD — Audience Sizing

### Key statistics

| Metric | Data | Source |
|--------|------|--------|
| Gen Z identifying as neurodivergent | **29%** | Kantar 2025 survey |
| Gen Z self-identifying as neurodivergent | **53%** | Deloitte 2023 Gen Z & Millennial Survey |
| Gen Z diagnosed with ADHD | **25%** (vs. 9% Millennials, 2% Boomers) | Understood.org survey |
| Clinical ADHD prevalence (all ages) | **10-15%** of global population | CDC/clinical estimates |
| Children 3-17 ever diagnosed with ADHD | **11.4%** | CDC 2022 data |

### Why the gap between self-ID and clinical diagnosis?

- **Barriers to formal diagnosis**: High psychiatry costs (US), long NHS wait times (UK), misdiagnosis of women
- **Social media awareness**: TikTok/Instagram ADHD content has normalized self-identification
- **Broader definition**: Many Gen Z include anxiety, sensory processing, and executive function challenges under "neurodivergent"

### Audience size calculation

Meldar's primary target: Gen Z (18-28), ~70 million people in the US alone.

- At 25% ADHD-diagnosed rate: **~17.5 million** in the US
- At 29% neurodivergent self-ID: **~20 million** in the US
- At 53% self-ID (Deloitte): **~37 million** in the US (likely inflated)

**Conservative estimate: 15-20 million Gen Z Americans who would resonate with "ADHD-friendly" or "neurodivergent-friendly" positioning.** Globally (Gen Z is ~2 billion), even at 10% awareness/relevance, this is a massive audience.

### Cultural context

- Tiimo winning iPhone App of the Year 2025 = Apple signaling this is a mainstream market, not niche
- "Neurodivergent" is an **identity label** for Gen Z, not just a medical category — they actively seek products that acknowledge it
- ADHD content is among the highest-engagement categories on TikTok

---

## Summary Table: Feature Viability

| Feature | Blue Ocean? | Market Size | Competition | Meldar Differentiation |
|---------|------------|-------------|-------------|----------------------|
| **ChatGPT Export Analyzer** | Mostly yes — vanity metrics exist, actionable problem-finding does not | 900M WAU ChatGPT users | GPT Rewind, AI Wrapped (shallow) | "Find your unsolved problems" vs. "see your personality type" |
| **Subscription Autopsy** | No — crowded market | $1,416/yr avg spending, 41% fatigue | Rocket Money ($1.275B acq), Monarch, Copilot | Screenshot-first (no bank linking), waste-focused framing |
| **Actionable Screen Time** | Partial — nobody gives specific fixes | Already in Meldar roadmap | Apple Screen Time, Digital Wellbeing | "Here's what to do about it" vs. "here's your data" |
| **ADHD Mode** | Yes — no product has a switchable ADHD mode | 15-20M Gen Z in US alone | Tiimo, Inflow (whole-app ADHD) | Toggle within a general product, stim games as focus tools |

---

## Questions for QA Agent

1. **ChatGPT export privacy**: If Meldar processes `conversations.json` files, how do we ensure we never store user conversations? AI Wrapped claims full client-side processing — should Meldar do the same, or is server-side processing acceptable with deletion guarantees?

2. **Subscription screenshot accuracy**: Orbit Money is building "Magic Import" from screenshots. What's the error rate for OCR/Vision extraction of subscription data from screenshots vs. bank-connected auto-detection? Is the accuracy good enough to build trust?

3. **"ADHD Mode" naming risk**: 29-53% of Gen Z self-identify as neurodivergent, but clinical prevalence is ~10-15%. Is calling it "ADHD Mode" medically appropriate, or should it be framed as "Focus Mode" / "Low-Stimulation Mode" to avoid implying medical claims?

4. **Stim game liability**: If Meldar includes idle/puzzle games as "focus tools," is there a risk of users spending MORE time on the games than on productive tasks? How do we frame this to avoid becoming a distraction tool?

5. **Competitive timing on ChatGPT analyzer**: OpenAI launched their own "Year with ChatGPT" recap in Dec 2025 and added PersonalContextAgentTool in early 2026. Is there a risk that OpenAI builds native "insights from your conversations" features that make a third-party analyzer redundant?
