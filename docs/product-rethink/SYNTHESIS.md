# Product Rethink: Synthesis

**Date:** 2026-03-30
**Sources:** PM Analysis, Behavioral Nudge Analysis, Trend Research, Sprint Priorities
**Purpose:** This is the decision document. Act on this.

---

## 1. Where All Agents Agree

Every analysis independently reached the same conclusions on these points:

1. **The fake hour estimates must die immediately.** All four analyses identify the pre-baked `weeklyHours` numbers ("~12 hrs/week") as the single biggest trust-destroyer in the current funnel. The PM calls them "a horoscope in a funnel of medical scans." The Nudge analyst warns they "pre-contaminate the credibility of the entire discovery engine." The Sprint agent lists removing quiz CTAs as the #2 RICE-scored task. There is zero disagreement: showing fabricated personalized numbers to a BS-detecting Gen Z audience is actively harmful.

2. **The Time X-Ray (Screen Time screenshot analysis) is the real product.** Every agent converges on this: the X-Ray is Meldar's actual differentiator. It turns 30 seconds of user effort into genuinely personalized output. It is already built. The Trend research confirms no competitor does this. The Sprint agent's one-liner: "X-Ray is the product. Everything else is a distraction."

3. **The hero CTA should point to the X-Ray, not to email capture or the quiz.** The fastest path to personal value is uploading a screenshot and seeing real data. Every agent recommends making this the primary action on the landing page.

4. **Email capture should happen AFTER value delivery, not before.** All four analyses agree: asking for an email before the user has received anything personal is premature. Capture at peak interest -- right after they see their X-Ray results or a personalized preview.

5. **The effort escalation principle is correct.** The ladder from low-effort to high-effort data sharing (prompt/quiz -> screenshot -> Takeout -> extension) is sound. The problem was the first rung (quiz with fake results), not the ladder itself.

6. **Two user states exist at landing and both must be served.** "I know what bugs me" and "I don't know what I'd use this for" are distinct mental states. Forcing everyone through one path alienates half the audience.

7. **The shareable X-Ray card is the viral growth engine.** Trend research confirms Spotify Wrapped mechanics. The X-Ray card is identity content that Gen Z will share. Design it as a shareable artifact first, diagnostic tool second.

---

## 2. Where They Disagree (and Resolution)

### Disagreement 1: Kill the quiz entirely vs. keep it with honest results

- **PM Analysis:** Kill the quiz. Replace it with a text input ("What wastes your time?"). The quiz is "the wrong interaction pattern for this product and audience."
- **Nudge Analysis:** Keep the quiz tile selection (it works psychologically -- 85-90% completion, self-labeling, micro-commitment). Kill only the fake results. Replace them with a curiosity gap leading to the screenshot upload.
- **Sprint Priorities:** Hide the quiz, deprioritize it. Focus entirely on the X-Ray.

**Resolution: Keep the quiz selection UI, kill the fake results, demote the quiz to a secondary path.**

The Nudge analysis makes the strongest case here. The tap-to-select format is behaviorally sound -- recognition over recall, micro-commitment, self-labeling. These are real psychological mechanisms with research backing. The PM's text input proposal has merit but introduces higher friction (typing vs. tapping) and lower completion rates (50-65% vs. 85-90% per Nudge estimates).

However, the quiz should NOT be the primary entry path. The Sprint agent is right that the X-Ray is the product. The quiz becomes the "Help me figure it out" track for users who don't know what they want -- a bridge to the screenshot upload, not a destination.

**Concrete decision:**
- Remove quiz from main navigation and hero CTAs
- Keep the quiz route alive, rewrite the results page (no fake numbers, curiosity gap framing, CTA to screenshot upload)
- Add the quiz as the secondary path in a two-track entry on the landing page
- Pain library data stays -- repurpose as clickable example prompts on the hero

### Disagreement 2: Text input (prompt-first) vs. quiz tiles as the "I know what I want" path

- **PM Analysis:** A text input where users describe their frustration in a sentence, with AI-generated preview responses.
- **Nudge Analysis:** An open-ended input as an alternative alongside the quiz, not a replacement. Notes the risk: lower completion, bad AI responses.
- **Trend Research:** Points to vibe coding platforms (Lovable, Bolt) where the prompt box IS the product. Every winner leads with a text input.

**Resolution: Add the text input as the primary "I know what I want" path, but use template-matched responses for MVP -- not live AI.**

The trend evidence is overwhelming: prompt-first wins. But for a solo founder shipping this week, a live AI endpoint is risky (bad responses, latency, cost). The MVP approach: a text input with 3-4 clickable example frustrations that pre-fill it, and pattern-matched responses from the pain library data. This gets 80% of the prompt-first value at 20% of the engineering cost.

Phase 2 (next sprint): wire to a real LLM for genuinely personalized responses.

### Disagreement 3: How much to cut from the landing page

- **Sprint Priorities:** Cut from 10 sections to 6. Remove Data Receipt, Early Adopter, Tiers, Skills sections.
- **PM Analysis:** Doesn't address landing page length directly. Focuses on funnel entry.
- **Nudge Analysis:** Doesn't address section count.

**Resolution: Cut to 7 sections this sprint, not 6.**

Keep: Hero (rewritten), Problem, How It Works (rewritten for X-Ray), Trust, Skills (social proof for what Meldar can do), FAQ, Final CTA.

Remove: Data Receipt (the real X-Ray is better), Early Adopter (premature without users), Tiers (decision paralysis, "Starter" is coming soon anyway -- show only Free X-Ray + paid Time Audit for now).

The Skills section earns its keep because it answers "what would Meldar actually build for me?" which is the question the text input prompt aims to answer. Removing it creates a gap.

---

## 3. The Recommended Funnel

Step by step, from stranger to paying customer:

```
STRANGER (lands on meldar.ai)
    |
    v
HERO: Two-track entry
    |
    +--[Track A: "I know what bugs me"]
    |       |
    |       v
    |   Text input: "What wastes your time?"
    |   + 3-4 clickable example frustrations
    |       |
    |       v
    |   Personalized preview (template-matched MVP, LLM Phase 2)
    |   "Here's what your personal app would do"
    |       |
    |       v
    |   Email capture: "Want this? Drop your email."
    |       |
    |       v
    |   CTA: "Want your real numbers? Upload Screen Time" --> /xray
    |
    +--[Track B: "Show me what I'm missing"]
            |
            v
        Option 1: "Upload Screen Time screenshot" --> /xray (direct, high-intent)
        Option 2: "Help me figure it out" --> Quiz (rewritten, no fake numbers)
                |
                v
            Quiz results: "You picked X things. Most people like you lose 8-14 hrs/week.
                          Want YOUR exact number?"
                |
                v
            CTA: Upload Screen Time screenshot --> /xray

    |
    v
/xray PAGE
    |
    v
Upload screenshot (platform-detected instructions, drag-and-drop)
    |
    v
Claude Vision analyzes --> Real Time X-Ray card
    |
    v
"Holy shit" moment (real data, shareable card)
    |
    v
Email capture (highest-intent moment)
    + "Share your X-Ray" (viral loop)
    + "Want us to fix your #1 time-waster?" (conversion)
    |
    v
WELCOME EMAIL
    - "Your results are saved"
    - First 50: Personal Time Audit offer (EUR 29)
    - Everyone: Weekly tip based on their data
    |
    v
FOLLOW-UP (manual for Founding 50)
    - "We built your first automation" (EUR 79)
    - Direct founder access
    |
    v
PAYING CUSTOMER
```

**Key principles embedded in this funnel:**
- Value before email. Always.
- Real data before conversion asks. Always.
- Two paths that converge at the X-Ray. Always.
- The X-Ray card is shareable. Every generated card is a potential acquisition channel.

---

## 4. Kill / Keep / Build

| Category | Item | Action | Rationale |
|----------|------|--------|-----------|
| **KILL** | Fake hour estimates in quiz results | Remove immediately | #1 trust destroyer, all agents agree |
| **KILL** | Quiz as primary funnel entry | Remove from nav, hero, all CTAs | Gates real value behind fake value |
| **KILL** | "Pick Your Pain" hero CTA | Remove | Don't send traffic to a dead end |
| **KILL** | Data Receipt section | Remove from landing page | Real X-Ray card is better than a preview of one |
| **KILL** | Early Adopter section | Remove from landing page | Premature; no users yet to create urgency |
| **KILL** | 3-tier pricing section | Remove from landing page | Decision paralysis; show Free + EUR 29 audit only |
| **KILL** | Stage cards (Invitation/Discovery/Foundation) | Remove from hero | Too abstract; replace with concrete value prop |
| **KEEP** | Quiz tile selection UI | Keep at secondary path | Behaviorally sound (micro-commitment, self-labeling) |
| **KEEP** | Pain library (12 use cases) | Repurpose as example prompts | Good data, wrong presentation |
| **KEEP** | ScreenTimeUpload component | Keep, wire to real API | Well-built, just needs Claude Vision backend |
| **KEEP** | Trust section | Keep as-is | Load-bearing for screenshot upload (privacy) |
| **KEEP** | Skills section | Keep (trim if needed) | Answers "what would Meldar build for me?" |
| **KEEP** | FAQ section | Keep | SEO value + addresses real objections |
| **KEEP** | Final CTA ("Google made $238...") | Keep | Strong emotional anchor |
| **KEEP** | Shareable X-Ray cards + OG images | Keep | This IS the viral loop |
| **KEEP** | Stripe checkout (EUR 29 audit, EUR 79 build) | Keep wired | Don't surface prominently, but keep functional |
| **KEEP** | Email capture component | Keep, reposition | Move to post-value-delivery moments |
| **KEEP** | "2,847 people surveyed" research card | Keep for now | Social proof is still useful |
| **BUILD** | Hero text input ("What wastes your time?") | Build this week | Primary Track A entry point |
| **BUILD** | Clickable example frustrations (3-4) | Build this week | Reduces blank-input anxiety |
| **BUILD** | Template-matched preview responses | Build this week | Shows personalized value from text input |
| **BUILD** | Quiz results rewrite (curiosity gap) | Build this week | Removes fake numbers, bridges to X-Ray |
| **BUILD** | Wire Screen Time API to Claude Vision | Build this week | THE highest-leverage engineering task |
| **BUILD** | /xray page with upload + results | Build this week | The product's front door |
| **BUILD** | Post-X-Ray email capture | Build this week | Capture at peak interest |
| **BUILD** | Drag-and-drop upload handler | Build this week | Users expect this; broken = broken product |
| **BUILD** | Platform detection for upload instructions | Build this week | iOS vs Android, reduces friction |
| **BUILD** | Two-track split on hero | Build this week | "I know what bugs me" vs. "Show me my data" |

---

## 5. Top 3 Actions for This Week

### Action 1: Make the X-Ray the front door (8 hours)

**What:** Rewrite the hero section with a two-track entry. Track A: text input with example frustrations and template-matched responses. Track B: "See your Time X-Ray" button linking directly to /xray. Remove the quiz from navigation and all CTAs. Create the /xray page hosting the ScreenTimeUpload component with email capture after results.

**Why:** Every agent agrees the X-Ray is the product. Right now it is buried behind a 10-section landing page and a quiz that gives fake numbers. This single change puts real value one click away.

**Specific tasks:**
- Rewrite hero: two-track CTA, text input + "See your X-Ray" button (~3h)
- Create /xray page with ScreenTimeUpload + post-result email capture (~2h)
- Remove quiz from nav, header, internal links (~1h)
- Rewrite quiz results page: remove fake numbers, add curiosity gap copy, CTA to /xray (~2h)

### Action 2: Wire the Screen Time API to Claude Vision (4 hours)

**What:** Replace the mock `api/analyze-screenshot/route.ts` with a real Claude Vision call that extracts app names, durations, and categories from iOS/Android Screen Time screenshots. Test with 5 real screenshots.

**Why:** This is the single highest-leverage engineering task. Without it, the entire X-Ray funnel is a dead end. With it, Meldar delivers genuinely personalized value from 30 seconds of user effort. No competitor does this.

**Specific tasks:**
- Implement Claude Vision API call in route handler (~2h)
- Test with 5 real iOS/Android screenshots, document what breaks (~1h)
- Fix drag-and-drop handler on upload zone (~0.5h)
- Add platform detection for upload instructions (~0.5h)

### Action 3: Simplify the landing page and validate with 3-5 real users (5 hours)

**What:** Cut landing page from 10 sections to 7 (remove Data Receipt, Early Adopter, Tiers). Simplify pricing to "X-Ray: Free / Time Audit: EUR 29." Then show the live site to 3-5 potential users (Gen Z, 18-28) and watch them use the X-Ray.

**Why:** The landing page is currently 10 sections of arguments for a product the user hasn't tried yet. Cut the noise. Then validate the core hypothesis: will a real person upload their Screen Time screenshot and find the result valuable?

**Specific tasks:**
- Remove 3 landing page sections (~2h)
- Simplify pricing display (~0.5h)
- Find and conduct 3-5 user tests with real screenshots (~2.5h)

**Total estimated time: 17 hours of engineering + testing. Fits within one solo-founder sprint.**

---

## 6. The One-Sentence Product Thesis

**Meldar turns 30 seconds of your real data into a shareable Time X-Ray that shows exactly where your week goes -- then builds a personal app to fix the biggest time-waster it finds.**

---

## Decision Summary

The quiz was the wrong first step. The X-Ray is the right first step. Everything this week is about removing the distance between the user and the X-Ray.

The quiz is not worthless -- its tile selection UI is behaviorally sound -- but it belongs as a secondary discovery path for uncertain users, not as the front door. The front door is a two-track hero: "tell us what bugs you" (text input) or "show us your data" (screenshot upload). Both tracks converge at the X-Ray. Both deliver real, personal value before asking for an email.

The landing page is too long. Cut from 10 sections to 7. The three removed sections (Data Receipt, Early Adopter, Tiers) are either premature (no users to create urgency) or redundant (the real X-Ray replaces the preview).

The one metric that matters for the next two weeks: **X-Ray completion rate** (successful cards generated / visitors to /xray). Target: 40%+. If this number is high, Meldar has product-market fit for the discovery engine. If it is low, nothing else matters.

Ship the X-Ray as the front door. Get real screenshots through the live flow. Watch 5 people use it. Learn. Iterate.
