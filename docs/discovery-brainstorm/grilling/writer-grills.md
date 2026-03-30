# Technical Writer Grills the Discovery Brainstorm

Cross-review of: `ai-data-sources.md`, `rapid-prototypes.md`, `discovery-engine.md`, `architecture.md`, `email-discovery.md`, `SYNTHESIS.md`

---

## 1. Explainability Test

Can I explain each feature to a 19-year-old in one sentence? If not, the feature is too complex to ship -- or at least too complex to name and market as currently described.

### PASS -- explainable in one sentence

| Feature | One-sentence explanation |
|---------|------------------------|
| Screen Time X-Ray | "Screenshot your screen time, we tell you what to do about it." |
| Subscription Autopsy | "Screenshot your subscriptions, we show you which ones you're paying for but never use." |
| Decision Fatigue Calculator | "Answer 8 questions, find out how many hours you waste choosing stuff that doesn't matter." |
| Sleep Procrastination Score | "Find out how much sleep you trade for late-night scrolling." |
| Doomscroll Meter | "See how many times you unlock your phone just to stare at it for 30 seconds." |
| Notification Flood Score | "Find out how many times your phone interrupts you for stuff you never read." |

These six are clean. A 19-year-old gets it immediately. No jargon, no multi-step explanation needed.

### FAIL -- needs work

| Feature | Problem | Why it fails the bar |
|---------|---------|---------------------|
| **Cross-Source Fusion / Activity Timeline** (`discovery-engine.md`) | A 19-year-old does not think in "data sources" or "cross-referencing." The Activity Timeline schema (`ActivityEvent { timestamp, source, category, domain... }`) is pure engineering. | The CONCEPT is great -- "we combine your phone data with your calendar to tell you things neither one can see alone." But the document talks about it as an architecture, not an experience. The user-facing explanation should be: "Give us two screenshots instead of one. We'll find things neither one could show you alone." That's it. The rest is implementation. |
| **Progressive Discovery Levels 1-5** (`discovery-engine.md`) | The 5-level escalation model reads like a product management doc, not a user journey. "Level 3: + Calendar or Email Metadata (2 minutes)" -- nobody talks like this. | Rename: don't call them levels. Don't number them. The user experience should feel like "want to see more? add this." Not "you are now on Level 3." Gamification via numbered levels works for Duolingo, not for a tool analyzing your life. It feels like a medical test with escalating invasiveness. |
| **Copy-Paste Detective** (`rapid-prototypes.md`) | "Paste any block of text from your clipboard -- we'll tell you what you were trying to do." This is clever for engineers. For a 19-year-old: "...what? Why would I paste my clipboard into a random website?" The mental model is too abstract. | The concept of detecting friction from clipboard content is interesting but the UX is invisible. Nobody thinks about their clipboard as a data source. This needs a completely different framing -- maybe "paste something you copy-pasted today and we'll tell you why you shouldn't have to" -- but even that is a stretch. I'd cut this from the first launch entirely. |
| **Content Creation vs Consumption Ratio** (`rapid-prototypes.md`) | The "68:1 ratio" is a great viral number. But the premise assumes the user WANTS to create more content. Many Gen Z users are happy consuming. The feature implicitly judges passive consumption as bad. | Reframe: don't position this as "you should create more." Position it as: "you spend X hours watching other people's lives. Here's what you could do with that time." The ratio is the hook, but the judgment angle will alienate most of the audience. Not everyone aspires to be a creator. |
| **Meeting Tax Calculator** (`rapid-prototypes.md`) | Students don't have meetings. Entry-level Gen Z workers have few meetings. This is a secondary-audience feature (corporate professionals) dressed up as a primary-audience feature. | Move this to a separate "for teams" or "for workers" track. It dilutes the Gen Z positioning if it shows up alongside Doomscroll Meter and Sleep Procrastination Score. |
| **Email Avalanche Audit** (`rapid-prototypes.md`) | Gen Z (18-28) does not use email as a primary communication tool. They use Instagram DMs, WhatsApp, Discord, TikTok comments. Email is for school submissions and password resets. | This is a strong feature for 30+ professionals, weak for primary audience. Ship it, but don't put it in the first discovery flow for Gen Z users. Surface it for users who self-identify as workers, not students. |
| **Shopping Spiral Tracker** (`rapid-prototypes.md`) | "Screenshot your browser tabs or Amazon order history." Tabs is interesting but niche. Amazon order history is a Gen X/Millennial behavior. Gen Z shops on Instagram, TikTok Shop, and Shein -- none of which have clean order history views. | The "tab hoarding" angle is relatable and universal. The "Amazon" angle dates the feature. Reframe entirely around tab hoarding and indecision, drop the Amazon shopping angle. |

### VERDICT: 6 features pass the explainability bar. 7 need reframing or audience-gating. The temptation to ship all 10 rapid prototypes in 3 days is understandable but will dilute the brand with features that don't land for the primary audience.

---

## 2. Naming Problems

### Names that work

| Name | Why it works |
|------|-------------|
| **Time X-Ray** | Medical precision + personal + implies hidden things revealed. Already proven in positioning docs. Keep it. |
| **Subscription Autopsy** | Dark humor, implies something is dead (the app you never use). Memorable. |
| **Doomscroll Meter** | Uses existing internet vocabulary ("doomscrolling"). Instantly understood. |
| **Sleep Procrastination Score** | "Revenge bedtime procrastination" is a named phenomenon Gen Z already knows. The score makes it measurable. |

### Names that don't work

| Name | Problem | Suggested fix |
|------|---------|--------------|
| **Decision Fatigue Calculator** | "Decision fatigue" is a psychology term. A 19-year-old says "I can never decide what to eat," not "I have decision fatigue." And "Calculator" sounds like a math app. | **"The Overthink Report"** or **"How Much Time Do You Waste Choosing?"** -- lead with the behavior, not the diagnosis. |
| **Notification Flood Score** | "Flood" is generic. "Score" is generic. Together they sound like a cybersecurity dashboard. | **"The Ping Audit"** (from messaging.md) is better but "Audit" is still corporate. Try: **"How Loud Is Your Phone?"** or **"Interruption Report"** |
| **Email Avalanche Audit** | Double problem: "Avalanche" is a cliche and "Audit" is corporate. This name would make a 19-year-old's eyes glaze over. | **"Inbox Reality Check"** or simply **"Your Inbox Report"** |
| **Content Creation vs Consumption Ratio** | Way too many words. Sounds like a marketing analytics report. | **"The Scroll Score"** -- shorter, internet-native, implies the judgment without spelling it out. |
| **Copy-Paste Detective** | "Detective" implies investigation/surveillance, which conflicts with Meldar's "we don't watch you" positioning. Also, "Copy-Paste" is a technical term. | Cut this feature from launch. If it must ship, try: **"What's On Your Clipboard?"** -- at least it's a question that creates curiosity. |
| **Meeting Tax Calculator** | "Tax" is clever for adults. Gen Z does not think about meetings as having a "tax." They think "ugh, another meeting." | **"Meeting Damage Report"** -- more visceral, less financial. |
| **Shopping Spiral Tracker** | "Spiral" implies mental health crisis. "Tracker" implies surveillance. Both are wrong tones. | **"The Tab Hoarder Report"** -- leans into the relatable tab behavior, not the shopping psychology. |
| **Phone Reality Check** (from messaging.md) | This one is okay but generic. Every wellness app promises a "reality check." | Keep it as a fallback but **"Time X-Ray"** is stronger for the core Screen Time feature. |
| **The Ping Audit** (from messaging.md) | "Audit" is corporate. In a brainstorm doc it's fine but on a landing page a 19-year-old would skip it. | **"The Ping Report"** -- same energy, less corporate. |
| **Inbox Autopsy** (from messaging.md) | Love the dark humor but "autopsy" might be too morbid for some users. Risk of being off-putting, not clever. | Keep it but test. The humor lands with some Gen Z segments (the ones who say "I'm dead" about everything) but not all. Have a safe fallback: **"Your Inbox Report"** |
| **The Ghost Hour Hunt** (from messaging.md) | "Ghost hours" is a new concept that needs explaining. "Hunt" implies effort. The name asks the user to do work. | **"Where Did Your Free Time Go?"** -- a question, not a hunt. But honestly, the calendar feature should just be called **"Your Calendar Report"** inside the product and use the fun name only in marketing. |

### Meta-observation on naming

The documents oscillate between two naming philosophies:
1. **Fun/edgy names** (Autopsy, Ghost Hunt, Ping Audit) -- great for social media, confusing in-product
2. **Clean/descriptive names** (Your Phone Report, Your Inbox Report) -- boring for marketing, clear in-product

**Recommendation:** Use BOTH. Fun names in ads, landing page, and social content. Clean "Your ___ Report" names inside the product UI. The messaging.md document already suggested this split, and it's the right call. Lock it in and stop debating names for individual features -- the system is: fun name externally, clean name internally.

---

## 3. The "Why Should I Care" Test

For each discovery insight, would Gen Z actually care? Or is it only interesting to productivity nerds and LinkedIn influencers?

### GEN Z ACTUALLY CARES

| Insight | Why they care |
|---------|--------------|
| "You pick up your phone 89 times a day" | Every Gen Z person has heard a parent or teacher say "you're on your phone too much." But they've never had THEIR number. The specificity is what makes it hit. They want to know if they're normal or extreme. Social comparison is the driver. |
| "You pay $47/month for subscriptions you don't use" | Money. Gen Z is financially stressed. Student loans, rent, inflation. Telling them they're leaking $564/year on apps they forgot about -- that's rent money. This is the #1 most shareable insight because dollars are universal. |
| "You sacrifice 620 hours of sleep to late-night scrolling" | Revenge bedtime procrastination is a lived experience for this generation. They know they do it. They've never seen the ANNUAL number. 620 hours = 26 full days. That number will get screenshotted. |
| "Your social media ratio is 68:1" | This only works for the subset of Gen Z who WANT to create content (significant, but not all). For creators and aspiring creators, this number is a wake-up call. For pure consumers, it's shaming. Use with caution. |
| "You searched 'easy dinner recipes' 23 times" | Relatable and funny. The specificity makes it feel personal, not preachy. It's the kind of thing you'd post on your story with a laughing emoji. |
| "Instagram is your gravity app -- you open it 23 times before anything else" | Social media habits are a constant topic of conversation among Gen Z. Knowing your "gravity app" is a new piece of self-knowledge, like knowing your Enneagram type. Shareable as identity signal. |

### PRODUCTIVITY NERDS ONLY -- Gen Z won't care

| Insight | Why they won't care |
|---------|-------------------|
| "Your longest uninterrupted focus block is 47 minutes" | "Focus blocks" is productivity jargon. A 19-year-old studying for exams doesn't think in "deep work" vs. "shallow work." They think "I can't concentrate" and blame themselves or TikTok. The concept needs translation: "You can't focus for more than 47 minutes because your phone interrupts you X times during study." Make the phone the villain, not the user's focus capacity. |
| "Context switching costs you 23 minutes each time" | This is a frequently-cited research stat that has been in every productivity blog since 2010. Gen Z has heard it. They've tuned it out. It's background noise. The EMAIL document uses this stat heavily -- it needs to stop. |
| "Your calendar is optimized for appearing busy, not getting things done" | "Productivity theater" is a Twitter/LinkedIn concept. A 19-year-old's calendar is classes and shifts, not strategy meetings. This insight is for the secondary audience (corporate professionals). Mislabeling it as primary-audience content is a positioning mistake. |
| "Each notification costs 23 seconds of context-switch time" | Same problem as above. The MATH is correct. The FRAMING is wrong. Don't cite research papers at 19-year-olds. Say: "Telegram buzzed you 178 times today. You looked at it for 11 minutes total. Your phone is a slot machine and Telegram is pulling the lever." That's the same insight, reframed for the audience. |
| "Meetings generated 34 follow-up emails" | Students don't have meeting-related email chains. This is corporate life. Audience mismatch. |

### THE GRAY ZONE -- depends on framing

| Insight | The framing problem |
|---------|-------------------|
| "You have 4,293 unread emails" | Gen Z wears unread email counts as a badge of honor. "I have 47,000 unread emails lol" is a meme, not a crisis. The SHAME framing won't work. Reframe: "60 companies send you emails you never read. Want to nuke them all in one click?" Make it an action, not a diagnosis. |
| "You're in 23 Telegram groups but active in 3" | This lands IF the user is in messaging-heavy communities (crypto, gaming, university). It won't land for users who primarily use iMessage/Instagram DMs with small friend groups. Audience-gate: only surface this for users whose Screen Time shows high Telegram/Discord usage. |
| "Facebook uses 18% of your battery but you only spend 20 minutes in it" | Interesting but most Gen Z users don't use Facebook. This is a Millennial insight. Replace "Facebook" with "Instagram" or "TikTok" in all examples. The battery/background tracking angle is interesting for privacy-aware users but Gen Z is less privacy-motivated than older demographics. |

### VERDICT: About half the insights genuinely land for Gen Z. The other half are repackaged productivity-blog content that speaks to 30+ knowledge workers. The documents need an audience filter: before shipping any insight, ask "would a 19-year-old screenshot this and send it to their group chat?" If the answer is no, it's a secondary-audience feature.

---

## 4. Viral Potential

Which "holy shit" moments would someone actually screenshot and share?

### TIER 1: Will get screenshotted and shared (high confidence)

| Moment | Why it goes viral |
|--------|-----------------|
| **"I'm wasting $47/month on apps I forgot I had"** | Dollar amounts are the #1 sharing trigger. Everyone's friends will want to check their own number. It's a dare format: "check yours." |
| **"I lose 6.2 hours/week to decisions that don't matter"** | The annual conversion (13.4 full days/year choosing what to eat and watch) is the shareable stat. It's shocking enough to be a conversation starter. The comparison to Breaking Bad watch time is genuinely funny. |
| **"I sacrifice 620 hours of sleep to revenge scrolling"** | 26 full days. That's the viral number. "I traded 26 days of sleep for TikTok this year" is a post that writes itself. |
| **"My gravity app is Instagram. I open it 23 times before anything else."** | Identity-based sharing. "What's YOUR gravity app?" becomes a question people ask each other. Same mechanic as "what's your Spotify top artist." |
| **"I searched 'easy dinner recipes' 23 times this month"** | Funny, relatable, specific. The "23 times" precision is what makes it shareable -- it's too specific to be made up. |

### TIER 2: Might get shared with the right visual design

| Moment | What it needs |
|--------|-------------|
| **"Telegram interrupted me 178 times for 11 minutes of actual use"** | Needs a visual: the number 178 in huge font, "11 minutes" in small font below. The contrast IS the design. Without strong visual treatment, this is just a stat. |
| **"My social media ratio is 68:1"** | The number is meme-ready but the concept needs explaining. "I consume 68x more than I create" is shareable. "My consumption-to-creation ratio is 68:1" is not. |
| **"I have 127 open tabs. 47 have been open for over a week."** | Tab hoarding is a meme that already exists. Meldar didn't invent this -- it's quantifying a known joke. This is shareable as "confirmation" (I knew I was bad, but HERE'S my number). |

### TIER 3: Interesting but not shareable

| Moment | Why it won't get shared |
|--------|----------------------|
| "Your longest focus block is 47 minutes" | Nobody brags about being bad at focus. This is a PRIVATE insight that prompts behavior change, not a PUBLIC insight that prompts sharing. |
| "You had 3 free hours but spent them on Instagram" | Too close to self-criticism for public sharing. People share embarrassing-but-funny stats, not embarrassing-and-sad ones. |
| "Your email inbox has 4,293 unread" | As discussed, Gen Z wears this as a badge. It's not a discovery -- it's a known fact they joke about. No new information = no viral moment. |
| "Facebook uses 18% battery in background" | Privacy concern, not a fun share. This makes people anxious, not excited. Anxiety doesn't get screenshotted (unless you're in a specific infosec community). |

### DESIGN REQUIREMENT: The shareable card

Every "holy shit" moment needs a pre-designed, screenshot-ready card. The documents mention this but don't emphasize it enough. The card design is as important as the insight. Requirements:
- Brand-colored background (not white -- white gets lost in stories/feed)
- ONE big number, massive font
- ONE sentence of context below
- Meldar logo + "Get yours at meldar.ai" at the bottom
- Optimized for Instagram Stories dimensions (9:16)
- Must look good as a screenshot (no UI chrome, no browser bar)

Without this card, even the best insights won't get shared. The CARD is the viral mechanic, not the insight.

---

## 5. Feature Fatigue

Are we proposing too many discovery tools? Should we launch with 1-2 and nail them?

### The count across all documents

| Document | Features proposed |
|----------|-----------------|
| `ai-data-sources.md` | 18 screenshot/paste data sources |
| `rapid-prototypes.md` | 10 rapid discovery tools |
| `discovery-engine.md` | 10 pattern detectors + 5 cross-source fusion types |
| `email-discovery.md` | 6 communication patterns + 4 subscription discovery methods |
| `SYNTHESIS.md` | 5 "build this week" items + 4 "next week" + 6+ "later" |
| `messaging.md` | 6 named features (Phone Reality Check, Ping Audit, etc.) |

**Total unique concepts across all docs: approximately 35-40.**

That is way too many for a product that hasn't validated whether users will screenshot even ONE thing.

### The fundamental problem

The documents read like a team that fell in love with the IDEA of discovery and kept going. Every screenshot a user could possibly take has been analyzed, named, architectured, and prioritized. It's thorough. It's also a recipe for shipping nothing well.

**Meldar's current state:** Collecting signups. The product is a landing page with an email capture. There is no discovery engine live. There is no Time X-Ray live. The gap between "40 proposed features" and "zero features live" is the real risk.

### What I'd actually ship

**Launch with exactly 2 features. Not 4. Not 6. Two.**

1. **Screen Time X-Ray** (already planned, the anchor)
2. **Subscription Autopsy** (strongest viral trigger because dollars)

Why only 2:
- **Testing the mechanic, not the breadth.** The question isn't "can we build 10 screenshot analyzers?" It's "will a user screenshot their Screen Time, upload it, see a result, and share it?" If that loop doesn't work, adding 9 more sources won't fix it.
- **Polish over quantity.** Two features with beautiful shareable cards, smooth upload UX, and genuinely surprising insights will convert better than 10 features with rough edges.
- **Support burden.** Each Vision-based feature has edge cases: dark mode vs. light mode, different iOS versions, Android fragmentation, non-English phones, accessibility settings that change the layout. Two features = manageable edge cases. Ten features = whack-a-mole.
- **Narrative clarity.** "Screenshot your screen time and your subscriptions. See where your time AND money go." That's one story. Adding notification analysis, calendar analysis, email analysis, and 5 questionnaires makes the story "upload everything and we'll analyze it all" -- which is overwhelming and unclear.

### Add the questionnaire tools as a second wave

The questionnaire-based tools (Decision Fatigue, Sleep Procrastination, Doomscroll Meter) are zero-API-cost, fast to build, and standalone. Ship them 1-2 weeks after launch as individual viral tools. Each one gets its own social push. Each one funnels into the main product. This is the BuzzFeed quiz playbook and it works.

### The progressive trust model is right but the PACE is wrong

The discovery-engine.md document correctly identifies that users won't hand over all their data on day one. But it then proposes 5 levels of data escalation as a DAY ONE architecture. That's over-engineering.

Build the architecture to support multiple sources (the `SourceProcessor` registry from architecture.md is correct). But only implement 2 processors at launch. The architecture supports adding more later. You don't need to build them all now to prove the architecture works.

### The cross-source insights are the moat -- but they're also the SECOND product, not the first

"Screen Time + Subscriptions = Zombie Subscription Detector" is brilliant. But it requires the user to upload TWO things. First, prove that uploading ONE thing is worth their time. Cross-source fusion is the upgrade, not the hook.

Ship single-source insights first. Cross-source is the "want to see more?" upsell.

### Specific cuts

| Proposed feature | Verdict | Reason |
|-----------------|---------|--------|
| Screen Time X-Ray | **SHIP** | Core product. Non-negotiable. |
| Subscription Autopsy | **SHIP** | Strongest viral trigger. Dollar amounts sell. |
| Decision Fatigue Calculator | **WEEK 2** | Zero cost, standalone viral tool, great funnel entry. |
| Sleep Procrastination Score | **WEEK 2** | Same as above. |
| Notification Count source | **WEEK 3** | Only valuable when cross-referenced with Screen Time. |
| Doomscroll Meter | **WEEK 3** | Extension of Screen Time, not standalone. |
| Content Creation Ratio | **WEEK 3** | Niche audience (aspiring creators). |
| Calendar Screenshot | **MONTH 2** | Good insight but audience-dependent (workers > students). |
| Email Inbox Screenshot | **MONTH 2** | Weak for primary audience (Gen Z). |
| Copy-Paste Detective | **CUT** | Too abstract. Nobody understands the value proposition without a demo. |
| Meeting Tax Calculator | **CUT from Gen Z track** | Corporate feature. Build it when targeting the secondary audience. |
| Shopping Spiral Tracker | **DEPRIORITIZE** | Fun but niche. Browser tab angle is better than Amazon angle. |
| Email Avalanche Audit | **DEPRIORITIZE** | Wrong audience. |
| Google Takeout pipeline | **MONTH 3+** | High effort, high friction, high value -- but only after the core loop is validated. |

---

## Summary

### What's strong across the documents

1. **The "holy shit" moment design** is excellent. Leading with a personal number, not advice, is the right approach.
2. **The privacy story** ("we never touch your accounts, you show us a screenshot") is genuinely differentiated and should be the trust anchor in every conversation.
3. **The architecture** (SourceProcessor registry, computed profiles, rule-based-first) is clean and extensible. Build it for 2 sources now, use it for 20 later.
4. **"What's eating your week?"** is the right hero line. Ship it.
5. **Dollar amounts as viral triggers** -- the subscription angle is the strongest sharing mechanic proposed. Ship this first alongside Screen Time.

### What needs fixing

1. **Cut the feature count by 75%.** Ship 2, not 10. Validate the core loop before expanding.
2. **Audience-gate everything.** Every insight needs a "would a 19-year-old share this?" filter. If it fails, move it to a corporate/professional track.
3. **Stop citing research at users.** "23 minutes context-switch cost (UC Irvine)" is for pitch decks, not for Gen Z. Translate every stat into "your phone did X to you" language.
4. **Design the shareable card first.** The card is the viral mechanic. If the card doesn't exist, the insight doesn't spread. Block design resources for this before building more features.
5. **Use fun names in marketing, clean names in-product.** Stop debating individual names. The system is decided. Apply it consistently.
6. **Kill the numbered levels.** Progressive trust is right. Numbered levels are gamification that feels clinical. "Want to see more? Add this" is the UX, not "Level 3 unlocked."
7. **The rapid prototypes are good but not all for the same audience.** Decision Fatigue and Sleep Procrastination are Gen Z. Meeting Tax and Email Avalanche are corporate. Don't mix them in the same launch sprint.
