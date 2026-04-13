# 08 — Funnel Copy & Emotional Pacing Critique (Visual Storyteller)

Reviewed: `VariantB.tsx` — the full onboarding funnel from 4 Doors through Live preview.

Cross-referenced against: `07-onboarding-funnel.md` (funnel strategy), `03-visual-narrative.md` (emotional journey spec), brand voice rules, banned words list.

---

## Screen-by-Screen Copy Audit

### Screen 1 — The 4 Doors

**"Welcome to Meldar"**

- **Problem:** Generic. Every SaaS product in the world says "Welcome to [Product]." A hairdresser who clicked a link from a friend doesn't know what Meldar is yet. This headline tells her nothing — it's a wasted first impression.
- **Current:** `Welcome to Meldar`
- **Proposed:** `What do you need today?`
- **Why:** The user arrives with a problem. Meet them there. "What do you need today?" is action-oriented, skips the ceremony, and immediately frames Meldar as a tool that serves them — not a product that introduces itself. It also matches the funnel strategy doc: "qualify intent, don't assume."

**"Your AI. Your app. Nobody else's."**

- **Problem:** This tagline assumes the user already understands what Meldar does. "Your app" — what app? A hairdresser hasn't made anything yet. "AI" in the opening line can trigger the exact fear the brand voice doc identifies: "scared of AI complexity." This line works on a landing page after context has been established. Here, at the very first screen of onboarding, it's premature.
- **Current:** `Your AI. Your app. Nobody else's.`
- **Proposed:** `Tell us what you need. We'll handle the rest.`
- **Why:** Reassurance before ambition. The user needs to know this will be easy. "We'll handle the rest" is the promise that earns the next click. Save the ownership messaging ("nobody else's") for after they've seen their preview — that's when ownership actually means something (see Phase 5 in the visual narrative spec).

**Door A: "I need something for my business" / "Set up a booking page, client portal, or landing page in 30 seconds."**

- **Problem:** "Client portal" is not a term a hairdresser or yoga instructor uses. "Landing page" is marketing jargon — Irka doesn't know what a landing page is. The description lists technical product categories instead of outcomes.
- **Current:** `Set up a booking page, client portal, or landing page in 30 seconds.`
- **Proposed:** `Get a page where clients can find you and book — ready in 30 seconds.`
- **Why:** Outcomes over categories. "A page where clients can find you and book" describes what they GET, not what technical thing they're configuring. "Client portal" and "landing page" are developer/marketer vocabulary.

**Door B: "Show me what this can do" / "See real examples. No commitment. Pick one if you like it."**

- **Problem:** This is actually solid. Clear, low-pressure, inviting. One small issue: "Pick one if you like it" is slightly passive — it hedges. The user might read it as "these might not be relevant to you."
- **Current:** `See real examples. No commitment. Pick one if you like it.`
- **Proposed:** `See what others have made. Pick one and make it yours.`
- **Why:** "Make it yours" is more confident and forward-moving than "if you like it." It pre-frames the action: you WILL take one of these and own it. Removes the conditional.

**Door C: "I have an idea but I'm not sure where to start" / "Describe what you need and we'll figure it out together."**

- **Problem:** The door title is long. On mobile, "I have an idea but I'm not sure where to start" wraps to three lines. The description is warm ("figure it out together") but the title creates hesitation — "I'm not sure" reinforces the user's uncertainty rather than resolving it.
- **Current title:** `I have an idea but I'm not sure where to start`
- **Proposed title:** `I have something in mind`
- **Current description:** `Describe what you need and we'll figure it out together.`
- **Proposed description:** `Tell us what's on your mind. We'll turn it into a plan.`
- **Why:** "I have something in mind" is shorter, more confident, and doesn't dwell on the user's uncertainty. "Turn it into a plan" is more concrete than "figure it out" — it promises a visible output.

**Door D: "Let's find out" / "Not sure what you need? We'll look at how you spend your time and suggest what to fix."**

- **Problem 1:** The title "Let's find out" is vague. Find out what? Every other door title is self-explanatory. This one requires reading the description to understand.
- **Problem 2:** The "DATA-BASED ANALYSIS" badge is intimidating. It sounds clinical, corporate, technical. This is exactly the language that makes non-technical users feel like they've wandered into the wrong room. The brand voice doc explicitly says data analysis is "a nice cherry on top, not the main pitch" — yet this badge spotlights it.
- **Problem 3:** "We'll look at how you spend your time" — this sounds surveillance-y. A user who's already nervous about AI might read this as "we'll watch what you do."
- **Current title:** `Let's find out`
- **Proposed title:** `I'm not sure what I need`
- **Current description:** `Not sure what you need? We'll look at how you spend your time and suggest what to fix.`
- **Proposed description:** `Answer a few quick questions and we'll suggest where to start.`
- **Badge:** Remove `DATA-BASED ANALYSIS` entirely. Replace with `Takes 2 minutes` if a badge is needed at all.
- **Why:** "I'm not sure what I need" mirrors what the user is actually thinking — it validates their state rather than making a vague promise. The new description removes surveillance undertones and replaces "data analysis" framing with something conversational. Per the brand voice doc, data analysis is not A+ material.

**"847 pages created this week"**

- **Problem:** "Pages" is product jargon. A hairdresser doesn't think in "pages." Also, this number is currently fictional (pre-launch), which creates a trust risk if anyone investigates.
- **Current:** `847 pages created this week`
- **Proposed:** `847 businesses set up this week` (once real) or remove entirely for now.
- **Why:** "Businesses set up" connects to what the user cares about — people like them getting help. "Pages created" is what the system does internally; users don't identify with page creation. For pre-launch: consider `Join 800+ people who started this week` once you have real numbers. Until then, the social proof line is a liability.

---

### Door B Screen — Examples

**"Real pages made with Meldar"**

- **Problem:** "Pages" again. A hairdresser doesn't think "I need a page." She thinks "I need a way for clients to book me" or "I need something online for my salon." Also, "made with Meldar" positions Meldar as a maker tool — which edges into the banned "build" territory. It implies the user's job is to make things.
- **Current:** `Real pages made with Meldar`
- **Proposed:** `Here's what other businesses look like on Meldar`
- **Why:** This frames the examples as proof of what's possible for people like the user, not as technical artifacts that were "made" with a tool.

**"Tap one to make it yours. We'll swap in your details."**

- **Problem:** "Tap" is mobile-only language on what may be a desktop screen. "Swap in your details" is slightly technical — it describes the mechanism rather than the outcome.
- **Current:** `Tap one to make it yours. We'll swap in your details.`
- **Proposed:** `Pick one you like. We'll set it up with your info.`
- **Why:** "Pick" is device-neutral. "Set it up with your info" describes the outcome the user cares about, using the approved verb "set up."

**"Use this ->"**

- **Problem:** "Use this" is flat and functional. It doesn't convey what happens next. The user might wonder: "Use it how? Am I signing up for something?"
- **Current:** `Use this →`
- **Proposed:** `Start with this →`
- **Why:** "Start with" implies a beginning — it's more inviting and lower-commitment than "Use," which sounds like you're accepting a finished product.

**"I want something different"**

- **This works.** Clear escape hatch. No change needed.

---

### Door C Screen — Describe Your Idea

**"What's eating your time?"**

- **Verdict:** This is strong. Conversational, relatable, evocative. It frames the user's problem as something Meldar will solve, not something the user needs to define technically. Keep it.
- **One risk:** For users who came to Door C with a specific idea (not a pain point), this question is slightly misaligned. They have an idea, not necessarily a time problem. But the mismatch is minor — the textarea placeholder and examples redirect effectively.

**"Tell us in your own words. We'll figure out what to build."**

- **Problem:** "Build" is a banned word. Explicit violation of brand voice rules.
- **Current:** `Tell us in your own words. We'll figure out what to build.`
- **Proposed:** `Tell us in your own words. We'll figure out what you need.`
- **Why:** Direct banned-word fix. "What you need" keeps the promise without implying the user is entering a build process.

**Example quotes:**

- `"I'm a photographer and need a portfolio with booking"` — Good. Specific, relatable.
- `"My team wastes hours on scheduling"` — Good. Pain-point framing.
- `"I want clients to book without calling me"` — Good. Outcome-oriented.
- **Observation:** All three examples lean toward booking/scheduling. This creates a narrow impression of what Meldar can do. Consider swapping one for a non-booking example: `"I want a simple page to show my work and prices"` — this broadens the perceived scope.

**"Others have said:"**

- **Problem:** Slightly formal. "Others" is distant.
- **Current:** `Others have said:`
- **Proposed:** `People like you have typed:`
- **Why:** "People like you" creates identification. "Have typed" is more specific to the action — it shows the user exactly what to do with the text box.

**"See what Meldar suggests ->"**

- **This works.** The CTA correctly positions Meldar as the one doing the work. Keep it.

---

### Door D Screen — Discovery

**"Let's see where your time goes"**

- **Problem:** "Where your time goes" implies the user will be revealing personal habits. For someone already nervous about AI and data, this is a friction point. It also over-indexes on the data-analysis angle that the brand voice doc says is "not A+ material."
- **Current:** `Let's see where your time goes`
- **Proposed:** `Let's figure out what would help you most`
- **Why:** Shifts focus from surveillance ("where your time goes") to value ("what would help you most"). Makes the screen about the user's benefit, not Meldar's data collection.

**"Pick a way to share your data. We'll analyze it and show you what to fix."**

- **Problem:** "Share your data" is a red flag phrase in 2026. Users have been trained by years of privacy scandals to flinch at this. "Analyze" sounds clinical. "Show you what to fix" implies something is broken.
- **Current:** `Pick a way to share your data. We'll analyze it and show you what to fix.`
- **Proposed:** `Choose how you'd like to get started. We'll take it from there.`
- **Why:** Removes the data/analyze/fix framing entirely. The individual options already explain what data is involved — the header doesn't need to repeat it in scary terms.

**"Upload Screen Time screenshot" / "Takes 15 seconds. We read your app usage."**

- **Problem:** "We read your app usage" sounds like surveillance. Technically accurate, but emotionally wrong.
- **Current:** `Takes 15 seconds. We read your app usage.`
- **Proposed:** `Takes 15 seconds. Shows us what tools you already use.`
- **Why:** "What tools you already use" is collaborative framing. "We read your app usage" is extraction framing.

**"Paste your website URL" / "We'll read your business info automatically."**

- **This works.** Clear, non-threatening, explains the benefit. Keep it.

**"Google Takeout export" / "Most complete. Takes a few minutes to set up."**

- **Problem:** "Most complete" is comparative jargon — complete compared to what? A non-technical user doesn't have a mental model of data completeness.
- **Current:** `Most complete. Takes a few minutes to set up.`
- **Proposed:** `Gives us the full picture. Takes a few minutes.`
- **Why:** "Full picture" is more intuitive than "most complete." "To set up" removed because the brand voice prefers hiding process complexity.

**"Your data stays yours" trust card**

- **This is excellent.** "Analyzed in your browser. Never stored on our servers. Delete anytime." — three short, concrete, verifiable promises. Perfect tone. Keep it exactly as is.

---

### Proposal Preview — Convergence Screen

**"Based on consulting"**

- **Problem:** This label is a placeholder that leaked into the design. "Based on consulting" is an internal data note, not user-facing copy. A hairdresser seeing "Based on consulting" would be confused.
- **Current:** `Based on consulting`
- **Proposed:** `Personalized for you` or `Based on what you told us`
- **Why:** The label should reassure the user that what they're seeing is tailored. "Based on what you told us" creates continuity with the conversation that just happened.

**"Here's what your page would look like"**

- **Problem:** "Would" is conditional tense. It undermines confidence. The visual narrative spec (Phase 2) says the user must feel "it's already working" — conditional tense says "it might work, maybe, if you proceed." Also, "page" is product jargon again.
- **Current:** `Here's what your page would look like`
- **Proposed:** `Here's what we've put together for you`
- **Why:** Present perfect tense. The work is done. It exists. The user is looking at something real, not a hypothetical. "For you" reinforces personalization.

**"We'll build this in about 30 seconds. Change anything first, or go."**

- **Problem:** "Build" is a banned word. "Go" is vague — go where? "Change anything first" is good intent but "or go" undermines the teaching moment. The visual narrative spec says the proposal preview is THE conversion point — the copy should make the user feel ownership, not rush them.
- **Current:** `We'll build this in about 30 seconds. Change anything first, or go.`
- **Proposed:** `Ready in about 30 seconds. Adjust anything here, or let's go.`
- **Why:** "Ready in" removes "build." "Adjust anything here" is more specific about where. "Let's go" is warmer than "go" — it's collaborative.

**"This looks right ->" (primary CTA)**

- **Problem:** "Looks right" is tepid. It asks the user to confirm correctness rather than express excitement. The emotional target at this moment (per the visual narrative spec) is the transition from "viewing a proposal" to "watching my thing get created." The CTA should carry forward momentum, not cautious approval.
- **Current:** `This looks right →`
- **Proposed:** `Let's go →`
- **Why:** Short, energetic, confident. "Let's go" is a commitment wrapped in enthusiasm. It matches the editorial brand voice: warm, direct, zero jargon.

**"Change things" (secondary CTA)**

- **Problem:** Vague. "Things" is the least specific noun in English. What things? Where? How?
- **Current:** `Change things`
- **Proposed:** `I want to adjust this`
- **Why:** First person ("I want") mirrors the door-selection pattern. "Adjust" is more precise than "change things." Alternatively, keep it simple: `Edit details`.

---

### Building Screen

**"Setting up your page"**

- **This is correct.** Uses approved verb "setting up," speaks in the user's language. Keep it.

**"Using your 3 services and weekday hours."**

- **Problem:** "Services" is business consulting jargon. A hairdresser thinks "haircuts, coloring, extensions" — not "services." "Weekday hours" is slightly ambiguous — whose weekday hours?
- **Current:** `Using your 3 services and weekday hours.`
- **Proposed:** `Adding your 3 offerings and your Monday–Friday hours.`
- **Why:** "Offerings" is warmer than "services" and covers both products and services. "Your Monday–Friday hours" is concrete and possessive — it shows real data, not a category label. Even better if the actual day range is dynamic: "your Monday–Friday hours" vs. "your Tuesday–Saturday hours."

**Build step labels:**

- `Setting up your page layout` — Good.
- `Adding Strategy call` — Good. Uses real service name (personalization density).
- `Adding Workshop and Quick check-in` — Good.
- `Setting up booking calendar` — Good.
- `Adding contact and about section` — Minor: "about section" is web jargon. Consider `Adding your contact info and intro` instead.

---

### Live Screen

**"Your page is live. Point at anything to change it."**

- **Problem:** "Point at anything" assumes cursor interaction. On mobile, you don't "point" — you tap. On desktop, non-technical users may not understand "point at" as "hover your mouse over." The visual narrative spec uses "point at" consistently, but for the actual UI copy, this needs to be device-aware or use more universal language.
- **Current:** `Your page is live. Point at anything to change it.`
- **Proposed (desktop):** `Your page is live. Hover over anything to change it.`
- **Proposed (universal):** `Your page is live. Pick anything you want to change.`
- **Why:** "Pick anything you want to change" works on all devices, is action-oriented, and positions the user as the one making choices (agency). If you can detect device type, "Tap anything to change it" for mobile and "Hover over anything to change it" for desktop would be ideal.

**Suggestion chips: "Add a photo", "Change colors", "Add a description"**

- **These are good.** Concrete, action-oriented, non-technical. They serve as teaching cues for what's possible. Keep them.

**Input placeholder: `e.g. "make the header bigger" or "add a price list"`**

- **Problem:** "Header" is web developer terminology. A hairdresser doesn't know what a header is. She knows "the top part" or "the title."
- **Current:** `e.g. "make the header bigger" or "add a price list"`
- **Proposed:** `e.g. "make the title bigger" or "add a price list"`
- **Why:** "Title" is universally understood. "Header" is not.

---

## Emotional Pacing Issues

### 1. The opening is ceremonial when it should be functional

The journey starts with a welcome message and tagline — two pieces of copy that are about Meldar, not about the user. The visual narrative spec says anxiety should be immediately replaced by relief ("It knows what I need"). Instead, the first screen says "Welcome to Meldar" — which is about Meldar introducing itself. The emotional pacing should start with the user's need, not the product's name.

**Fix:** Lead with the user's intent. "What do you need today?" puts the user's problem at the center immediately.

### 2. Door D creates an anxiety spike in an otherwise calm flow

Doors A, B, and C are progressively warmer and lower-pressure. Then Door D introduces "DATA-BASED ANALYSIS" in a highlighted badge, mentions looking at "how you spend your time," and asks users to "share your data." This is a sharp anxiety spike in what should be a reassuring sequence. The emotional temperature map in the visual narrative spec shows anxiety should be DECREASING at this point, not spiking.

**Fix:** Soften Door D's language. Remove the badge. Frame the discovery as Meldar helping, not Meldar analyzing.

### 3. The proposal preview doesn't celebrate — it hedges

The convergence screen is supposed to be the emotional peak before creation (the "endowment effect" moment from the funnel strategy doc). But the copy hedges: "would look like," "build this," "or go." The user should feel "this is already mine" — instead they feel "this is a maybe." The emotional pacing needs the proposal to land with quiet confidence, not conditional uncertainty.

**Fix:** Present tense. Remove conditionals. Make the CTA enthusiastic, not cautious.

### 4. The transition from Building to Live lacks a moment of arrival

Building screen flows directly into Live screen with no emotional punctuation. The visual narrative spec describes the "It's live" moment as needing "editorial calm" — a clean card, a URL, quiet confidence. Instead, the current flow goes from progress steps directly into a live preview with a suggestion bar. The user never gets the moment to breathe and realize "wait — this is actually real and online."

**Fix:** Add a brief "arrival" state between Building and Live — even if it's just 2 seconds of "Your page is live" with the URL displayed prominently before the editing interface appears.

---

## Brand Voice Violations

| Location | Violation | Severity |
|---|---|---|
| Door C description | "We'll figure out what to **build**" | **Critical** — "build" is the #1 banned word |
| Proposal Preview body | "We'll **build** this in about 30 seconds" | **Critical** — banned word in a CTA context |
| Door A description | "client portal, or landing page" | Medium — developer/marketer jargon |
| Door D badge | "DATA-BASED ANALYSIS" | Medium — clinical/technical, contradicts brand warmth |
| Door D description | "share your data" | Medium — privacy-anxiety trigger |
| Discovery description | "We'll analyze it" | Medium — clinical language |
| Building screen | "3 services" | Low — "services" is business jargon, not universal |
| Live screen placeholder | "make the header bigger" | Low — "header" is developer vocabulary |
| Social proof | "847 pages created" | Low — "pages" is product jargon |

---

## Top 5 Copy Changes — Highest Impact

These five changes would most improve conversion and emotional coherence:

### 1. Kill "Welcome to Meldar" — lead with user intent

`Welcome to Meldar` → `What do you need today?`

**Impact:** First impression shifts from product-centered to user-centered. Reduces the "what is this?" anxiety. Aligns with the funnel strategy principle: "qualify intent, not introduce product."

### 2. Fix both "build" violations

- `We'll figure out what to build.` → `We'll figure out what you need.`
- `We'll build this in about 30 seconds.` → `Ready in about 30 seconds.`

**Impact:** Removes the two most explicit violations of the #1 brand voice rule. "Build" makes users feel like they're entering a developer tool. Removing it keeps the promise without the intimidation.

### 3. Rewrite the proposal preview headline — kill conditional tense

`Here's what your page would look like` → `Here's what we've put together for you`

**Impact:** This is the single most important conversion screen in the entire funnel (per the strategy doc). Conditional tense ("would") undermines the endowment effect. Present tense creates ownership before the user has even committed. This one word change ("would" → "we've") could meaningfully affect whether users click "Let's go" or abandon.

### 4. Remove the "DATA-BASED ANALYSIS" badge from Door D

Delete the badge entirely. If needed, replace with `Takes 2 minutes`.

**Impact:** The badge is the single most intimidating element in the entire funnel. It reads like a medical test result, not a friendly onboarding option. Removing it lets Door D feel as warm as Doors A-C. Per the brand voice rules, data analysis is "not A+ material" — it shouldn't be badged and highlighted.

### 5. Rewrite the primary CTA on the proposal preview

`This looks right →` → `Let's go →`

**Impact:** The proposal CTA is the highest-stakes button in the funnel — it triggers creation. "This looks right" asks for correctness validation. "Let's go" asks for enthusiasm. The difference is between a user thinking "I guess this is acceptable" and "yes, make this happen." Emotional momentum at this point directly determines whether the user stays through the building phase or drops off.

---

## Summary

The funnel's structure is sound — four doors converging to a single proposal is smart architecture. The emotional pacing mostly follows the right arc. But the copy has three systematic problems:

1. **Product-centered opening** where the user's need should be front and center
2. **Banned words and technical jargon** that leak developer vocabulary into what should be a warm, non-technical experience
3. **Conditional, hedging language** at the exact moment the user needs confidence and momentum

The five changes above address all three. They don't require structural changes — just sharper, braver copy that trusts the user's intelligence while respecting their unfamiliarity with technical concepts.
