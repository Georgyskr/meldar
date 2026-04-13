# Funnel Conversion Critique — UX Researcher

Analysis of the 4-door onboarding funnel (VariantB) from a conversion and drop-off perspective. Based on behavioral research principles, the P0 findings from `01-ux-research-findings.md`, the funnel strategy in `07-onboarding-funnel.md`, and the actual component implementation.

---

## Top 3 Conversion Risks

### Risk 1: Four Doors Triggers Choice Paralysis (Severity: HIGH)

**The problem.** The strategy doc designed 3 doors. The implementation has 4. This matters more than it sounds.

Hick's Law states that decision time increases logarithmically with the number of options. But the real conversion killer is not slowness — it is *evaluation anxiety*. When a first-time user sees 4 cards on their first interaction with an unknown product, they must:

1. Read and understand all 4 options before choosing (sequential evaluation)
2. Self-categorize into one of 4 buckets ("Am I a business owner? An explorer? Someone with an idea? Someone who needs data analysis?")
3. Worry about picking wrong (loss aversion — "what if the other door was better?")

Research from Iyengar & Lepper (2000) on choice overload shows that offering fewer options increases conversion. But the issue here is not just quantity — it is **category confusion**. Doors A, B, and C map to clear intent levels: "I know what I want" / "Show me" / "I'm vague." Door D ("Let's find out") breaks this clean spectrum by introducing an entirely different *product* (data analysis) masquerading as an onboarding path.

**Specific sub-problems in the implementation:**

- On mobile, 4 tall door cards (each ~80px+ with emoji, title, subtitle) require scrolling. Door D is likely below the fold on most phones. Irka, the primary persona who lives on her phone, may never see it.
- Door D has a "DATA-BASED ANALYSIS" badge that introduces a visual hierarchy inconsistency — it signals "premium/different" which makes the other doors feel incomplete by comparison.
- The door titles are inconsistent in length: "I need something for my business" (7 words) vs. "Let's find out" (3 words). The short one feels underdeveloped next to the verbose ones.

**Expected impact.** 15-25% higher bounce rate on Screen 1 compared to a 3-door version. Users who scroll past Door C to see Door D may re-evaluate their initial choice, creating a decision loop.

**Recommendation.** Remove Door D from onboarding. The Discovery Engine (Screen Time analysis, Google Takeout, etc.) is a separate product feature, not an onboarding path. It belongs post-onboarding as a "Get personalized recommendations" feature in the dashboard. The original 3-door design was correct.

---

### Risk 2: AI-Generated Prices in the Proposal Preview Destroy Trust at the Critical Conversion Point (Severity: HIGH)

**The problem.** Screen A2 (the Proposal Preview) is identified in the strategy doc as "THE conversion point." It shows specific prices: "Strategy call - 60 min - EUR 120", "Workshop - 180 min - EUR 350", "Quick check-in - 30 min - EUR 50." These are AI-generated defaults based on vertical selection.

This is the single most dangerous element in the entire funnel for three reasons:

1. **Wrong prices feel presumptuous.** If the user charges EUR 80 for a strategy call, seeing EUR 120 does not feel like a helpful default — it feels like the system does not understand their business. The reaction is not "I'll just change it" but "this isn't for me."

2. **Price sensitivity varies wildly by vertical and geography.** A Helsinki consultant charges differently from a Tallinn consultant. A solo coach charges differently from a firm. Generic vertical-based pricing will be wrong for the majority of users.

3. **"This looks right" becomes a loaded question.** The primary CTA asks the user to affirm that the prices, services, durations, AND hours are all correct in one tap. But "This looks right" is semantically vague — does it mean "the layout looks right" or "every data point is accurate"? A user who likes the layout but knows the prices are wrong faces a dilemma: tap "This looks right" and get wrong prices, or tap "Change things" and enter an editing flow they did not expect.

Research on anchoring effects (Tversky & Kahneman, 1974) shows that initial numbers disproportionately influence final decisions. Users who see EUR 120 for a strategy call may anchor to that number even if it does not match their market. This could lead to satisfaction issues downstream.

**Expected impact.** 20-40% of users who reach the Proposal Preview will hesitate or abandon because the prices do not match their reality. The conversion rate from Proposal Preview to Build will be significantly lower than the strategy doc's optimistic "90% tap This looks right" estimate.

**Recommendation.** Two options:

- **Option A (preferred):** Show the page layout preview WITHOUT specific prices. Display service names and durations as editable defaults, but show prices as "you'll set these" or use a range ("EUR 50-150 typical for consulting"). This preserves the "see your page" moment without the trust-breaking specificity.
- **Option B:** Keep prices but change the CTA from "This looks right" to "Build this — I'll adjust details after." This reframes the action as low-commitment and explicitly signals editability.

---

### Risk 3: The Door B to Proposal Preview Transition Is a Jarring Context Switch (Severity: MEDIUM-HIGH)

**The problem.** Door B shows polished example pages ("Studio Mia — Hair salon", "FitLab PT — Personal training"). The user taps "Use this" on an example they find aspirational. Then they land on Screen A2 — a Proposal Preview that shows *their* business name with generic vertical-based services and prices.

The psychological contract is broken. The user selected a specific, beautiful example. They expected to get *that*. Instead, they get a generic preview with their name slapped on a template. The gap between the aspirational example (polished, real-feeling) and the proposal preview (generic, placeholder-feeling) creates a "bait and switch" sensation.

This is compounded by the current implementation:

- The Examples Screen (Door B) shows styled cards with colored emoji backgrounds and curated names ("Studio Mia", "FitLab PT", "Anna Strategy"). These feel premium and real.
- The Proposal Preview shows a functional but plain card with "My Consulting Business" as the header. The visual quality drops noticeably.
- There is no transition copy explaining "We'll use Studio Mia's style with your business details." The jump is unexplained.

**Expected impact.** Users entering through Door B will have a 30-50% lower conversion rate on the Proposal Preview than users entering through Door A, because their expectations were set by a polished example and met with a generic preview.

**Recommendation.** When a user selects an example in Door B, the Proposal Preview should visually inherit the style of the selected example (colors, layout feel, card design). The copy should say something like "Here's your page, inspired by Studio Mia" to acknowledge the user's choice and explain the transformation. The preview must feel like a personalized version of what they chose, not a downgrade.

---

## Top 3 Things That Work Well (Keep These)

### 1. The Convergence Architecture Is Sound

All doors leading to the same Proposal Preview (Screen A2) is structurally excellent. It means there is one conversion point to optimize, one "aha moment" to perfect. This is far better than having separate build flows per door. The strategy doc correctly identifies this as the key insight. Keep the convergence — just improve what users see when they converge.

### 2. Door C (Free Text Description) Is the Strongest Door

"What's eating your time?" with a free-text input and example prompts is the most psychologically safe option. It requires no self-categorization, no vertical knowledge, no prior understanding of the product. The example quotes ("I'm a photographer and need a portfolio with booking") do heavy lifting by showing that vague, natural-language input is acceptable. The left-border styling on examples is visually distinct without being overwhelming. This door best serves the primary personas (Irka, the CEO, the sent-in employee) because it meets them where they are: confused, with a vague sense of their problem.

### 3. The Building Screen Creates Investment

Showing real service names in the build progress ("Adding Strategy call", "Setting up booking calendar") is a strong psychological move. It transforms waiting time into an investment-reinforcement moment. The user sees that their specific input is being used, which triggers the IKEA effect (valuing things more when you participated in creating them). The progress bar with contextual steps is more effective than a generic spinner.

---

## Specific Proposed Changes

### Change 1: Reduce to 3 Doors, Reorder by Cognitive Load

**Current:** 4 doors — Business / Show Me / Idea / Discovery
**Proposed:** 3 doors — Show Me / Idea / Business

Rationale: Order by ascending cognitive load and commitment. Door B (visual browsing) requires the least effort and is the safest first option. Door C (describe your idea) is moderately engaging. Door A (I know my business) is for the highest-intent users who self-select. This matches the natural distribution of a first-time visitor population: most are browsing, some are curious, few arrive with clear intent.

### Change 2: Replace Static Social Proof with Contextual Proof

**Current:** "847 pages created this week" — a static number at the bottom of Screen 1.
**Problem:** This number is either fabricated (the product has no real users yet per CLAUDE.md) or will be obviously small in early days. Savvy users (especially the Gen Z target) are trained to distrust round-ish vanity metrics. It also measures volume, not quality — 847 pages says nothing about whether those pages were useful.
**Proposed:** Remove the vanity metric entirely for now. Replace with a confidence statement: "Takes about 30 seconds. No account needed." This addresses the two real objections a first-time visitor has: "How long will this take?" and "Do I have to sign up?" When the product has real users, replace with specific testimonials or "Join 200+ Finnish businesses" with a verifiable claim.

### Change 3: Strengthen the Proposal Preview CTA

**Current:** "This looks right" (primary) and "Change things" (secondary).
**Problem:** "This looks right" is a passive confirmation that asks the user to validate AI-generated content they may not fully agree with. "Change things" is vague about what happens next.
**Proposed:** Primary CTA: "Build my page" — active, ownership-creating, forward-moving. Secondary: "Let me adjust first" — clear about what the action does (inline editing) and implies that building will happen after adjustment, not instead of it. The word "first" is key — it signals a brief detour, not an abandonment of the build flow.

### Change 4: Add a Micro-Personalization Step Before the Proposal

**Current:** Door A goes directly from vertical selection + business name to the full Proposal Preview with AI-generated services and prices.
**Proposed:** Insert a 5-second micro-step after vertical selection: "What do you offer? Pick 2-3 or type your own." Show 4-5 common services for the selected vertical as tappable chips, plus a "Type your own" option. This gives the user ownership over the service names that appear in the Proposal Preview WITHOUT requiring them to configure prices, durations, or hours. The proposal then shows THEIR service names with suggested durations and a note "We'll suggest prices — you can always change them."

This micro-step addresses Risk 2 (wrong prices) by separating what the user controls (service names) from what the system suggests (prices/durations), making the proposal feel co-created rather than imposed.

### Change 5: Visual Continuity from Door B Examples to Proposal

**Current:** Door B examples have distinct visual identities (colored backgrounds, styled names). The Proposal Preview has a generic look.
**Proposed:** When a user enters via Door B and selects an example, carry the example's color palette and visual treatment into the Proposal Preview. The header should read "Your page, inspired by [example name]" and the card should use the same accent color. This creates visual continuity and fulfills the implicit promise of "I want this."

---

## A/B Test Hypotheses

### Test 1: 3 Doors vs. 4 Doors (Highest Priority)

**Hypothesis:** Removing Door D (Discovery/data analysis) and showing only 3 doors will increase the percentage of users who select a door (Screen 1 completion rate) by at least 15%.

**Control:** Current 4-door layout.
**Variant:** 3 doors (Show Me / Idea / Business), reordered by ascending cognitive load.
**Primary metric:** Screen 1 completion rate (percentage of visitors who tap any door).
**Secondary metrics:** Time to first tap, distribution across doors (to check if Door C absorbs Door D's users or if they bounce).
**Minimum sample:** 200 visitors per variant for directional signal, 1,000 for statistical significance.

### Test 2: Prices Visible vs. Prices Hidden in Proposal Preview

**Hypothesis:** Showing service names and durations WITHOUT specific prices in the Proposal Preview will increase the Proposal-to-Build conversion rate by at least 20%.

**Control:** Current proposal with specific EUR prices per service.
**Variant:** Proposal shows service names, durations, and hours but replaces prices with "You'll set your prices" or "Suggested range: EUR X-Y."
**Primary metric:** Proposal Preview to Build click-through rate.
**Secondary metrics:** Time spent on Proposal Preview, "Change things" click rate (expect lower in variant since there is less to "correct"), post-build price-editing frequency.

### Test 3: CTA Wording on Proposal Preview

**Hypothesis:** Changing "This looks right" to "Build my page" will increase click-through by at least 10% because it shifts from passive validation to active ownership.

**Control:** "This looks right" (primary) / "Change things" (secondary).
**Variant:** "Build my page" (primary) / "Let me adjust first" (secondary).
**Primary metric:** Primary CTA click rate.
**Secondary metric:** Secondary CTA click rate (hypothesis: "Let me adjust first" will have higher clicks than "Change things" because it is more descriptive, but total conversion — primary + secondary — will be higher in the variant).

### Test 4: Door B Visual Continuity

**Hypothesis:** Carrying the selected example's visual style into the Proposal Preview will increase the Door-B-to-Build conversion rate by at least 25%.

**Control:** Generic Proposal Preview after Door B selection.
**Variant:** Proposal Preview inherits example's color palette, with copy "Your page, inspired by [name]."
**Primary metric:** Build conversion rate for Door B users only.
**Secondary metric:** "Change things" click rate (expect lower in variant).
**Note:** This test requires segmenting by entry door, so it needs higher overall traffic to reach significance for the Door B subset.

---

## Summary of Severity Ratings

| Risk | Severity | Expected Drop-off Impact | Fix Difficulty |
|------|----------|-------------------------|----------------|
| 4 doors = choice paralysis | HIGH | 15-25% bounce increase on Screen 1 | Low (remove Door D) |
| AI prices destroy trust | HIGH | 20-40% abandon at Proposal Preview | Medium (restructure what preview shows) |
| Door B to Proposal jarring switch | MEDIUM-HIGH | 30-50% lower conversion for Door B users | Medium (visual continuity + copy) |
| "This looks right" passive CTA | MEDIUM | 10-15% lower click-through vs. active CTA | Low (copy change) |
| "847 pages" unverifiable social proof | LOW-MEDIUM | Subtle trust erosion, hard to quantify | Low (replace with confidence statement) |
