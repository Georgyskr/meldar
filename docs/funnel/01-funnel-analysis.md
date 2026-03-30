# Conversion Funnel Analysis

**Date:** 2026-03-30
**Scope:** Full landing page at `/src/components/landing/` vs. UX spec at `docs/landing-page-ux.md`
**Goal:** Identify drop-off points, CTA positioning issues, and early-adopter hook strategy

---

## Critical Finding: The Funnel is Broken

Before section-by-section analysis, the most urgent issue: **there is no working email capture on the entire page.**

The `EmailCapture` component exists at `src/shared/ui/EmailCapture.tsx` and works correctly (inline form with email field + submit button + success state). But:

1. **HeroSection** imports `EmailCapture` but never renders it. Instead, it renders an anchor link `<a href="#early-access">Get early access</a>`.
2. **FinalCtaSection** has the same anchor link `<a href="#early-access">`.
3. **All tier card CTAs** link to `#early-access`.
4. **There is no element with `id="early-access"` anywhere on the page.** Every CTA on the page is a dead link.

**Impact:** Zero conversions are possible right now. Every visitor who clicks any CTA gets a no-op scroll. This must be fixed before any other optimization matters.

---

## Section Order: Spec vs. Implementation

The UX spec defines a deliberate psychological sequence. The implementation deviates:

| Position | Spec                   | Actual Implementation       | Issue                                     |
|----------|------------------------|-----------------------------|-------------------------------------------|
| 1        | Hero                   | Hero                        | OK (but missing email capture)            |
| 2        | Problem Validation     | Problem Validation          | OK                                        |
| 3        | Three Tiers            | **Skill Cards**             | Moved up from position 4                  |
| 4        | Skill Cards            | **How It Works**            | Moved up from position 5                  |
| 5        | How It Works           | **Three Tiers**             | Moved DOWN from position 3               |
| 6        | Trust & Privacy        | Comparison                  | Swapped with position 7                   |
| 7        | Competitive Positioning| **Trust & Privacy**         | Moved down from position 6               |
| 8        | FAQ                    | FAQ                         | OK                                        |
| 9        | Final CTA              | Final CTA                   | OK (but missing email capture)            |

**Key concern:** Moving Tiers to position 5 (after Skills and How It Works) breaks the spec's intended flow. The spec puts Tiers at position 3 because once the visitor's problem is validated, they need to see that there's an entry point for them *before* getting into specifics. With the current order, visitors see concrete automations and a 3-step process before they even know the product has tiers, including a free one. They may bounce thinking "this looks cool but probably costs money" before ever reaching the pricing section.

---

## Section-by-Section Funnel Analysis

### Section 1: Hero

**What works:**
- Headline is strong: "Stop trying to figure out AI. Let it figure out you." Good reframe.
- The gradient text treatment on "Let it figure out you" creates visual emphasis.
- Subheadline is concrete: "30 minutes. No coding. No confusion."
- Two CTAs (primary + secondary) give choice without overload.

**What fails:**
- **No email capture.** The spec explicitly says: "Email field is always visible above the fold on all devices. This is non-negotiable." The implementation has a button that links to `#early-access` which doesn't exist.
- The hero takes up `minHeight: 100vh` which means visitors have to scroll a full viewport to see any content. On desktop this is a LOT of empty space.
- No trust line beneath CTA ("Finnish company. GDPR-native. Your data stays yours.") as spec requires.
- No terminal animation or visual element. The hero is text-only, which makes it feel static compared to the energy the copy creates.

**Drop-off risk: HIGH.** Highest-intent visitors want to act immediately. They can't. They leave.

### Section 2: Problem Validation

**What works:**
- Three problems are well-written, conversational, and use second person effectively.
- The testimonial card is a good addition not in the original spec — adds social proof early.
- Two-column layout (problems left, testimonial right) is visually interesting.

**What fails:**
- The testimonial says "Meldar" — brand consistency aside, having a testimonial from an "Early beta user" on a product that hasn't launched looks fabricated. If this is real, it needs more specificity (name, role, photo). If it's not real, it should be removed.
- The spec explicitly says "No CTA in this section" — the implementation follows this, which is correct.

**Drop-off risk: LOW.** This section does its job. It's empathetic, it builds recognition, and it correctly doesn't push for a sale.

### Section 3 (actual): Skill Cards — Moved up from spec position 4

**What works:**
- Cards are concrete and relatable: Meal planner, Grade checker, Price watcher.
- Headline "Things people build in their first week" implies social proof and achievability.

**What fails:**
- **The skills are completely different from the spec.** The spec lists developer-oriented skills (Organize Downloads, Git Commit Summaries, Meeting Notes to Tasks, Jira to Git Branch). The implementation has consumer-oriented skills (Meal planner, Grade checker, Price watcher). This is a major audience mismatch with the target personas (developers, solopreneurs, power users).
- **No time-saved badges.** The spec includes "~X hrs/week saved" on each card, which is the concrete proof that makes this section convert. Without them, the cards are just descriptions.
- **No "Set up this skill" links on each card.** Each card should be a mini-CTA.
- 2-column grid on mobile for these cards may make them too narrow to read comfortably.

**Drop-off risk: MEDIUM.** The section is interesting but doesn't do its conversion job without time-saved numbers or card-level CTAs.

### Section 4 (actual): How It Works — Moved up from spec position 5

**What works:**
- Three steps, clean layout. "Tell us what bugs you" / "Watch it come together" / "It just works. Forever." is a good progression.
- Step descriptions are conversational and low-jargon.

**What fails:**
- **No CTA after the steps.** The spec says there should be a CTA: "Start now -- it's free to try." This is a natural conversion point — the visitor just learned the process is simple and is primed to act. Instead, they scroll into... pricing tiers. Momentum lost.
- No visual connecting elements (arrows, progress line) between steps as spec suggests.
- Numbers "01", "02", "03" are overstyled at `fontSize: 6xl` with `color: primary/10` (10% opacity) — they're barely visible. The visual hierarchy suggests the numbers don't matter.

**Drop-off risk: MEDIUM-HIGH.** Missing CTA after a simplicity-proving section is a wasted conversion moment.

### Section 5 (actual): Three Tiers — Moved down from spec position 3

**What works:**
- Three tiers with the highlighted "Builder" card is well-executed.
- "Preferred" badge on Builder card uses the default effect correctly.
- Visual scaling (`transform: scale(1.05)`) draws the eye to the recommended tier.

**What fails:**
- **Position is wrong.** By the time visitors reach this at section 5, they've already scrolled through Skills and How It Works. The spec puts Tiers at position 3 because the visitor needs to see the entry points immediately after problem validation. Here, it feels like an afterthought.
- **All three CTAs go to `#early-access` which doesn't exist.** Even the "Start building" CTA (which the spec says should go to the guided tutorial) is a dead link.
- No trust lines under each tier card (spec requires: "We see what apps you use, not what you type in them", "You own your code. Cancel anytime.", "You own everything we build.").
- The "From $200" price on Studio tier is less anchoring than the spec's "$200 -- $10,000" range.

**Drop-off risk: MEDIUM.** The section is well-designed visually but poorly positioned and has broken CTAs.

### Section 6 (actual): Comparison — Moved up from spec position 7

**What works:**
- Clean comparison table format with three columns (feature / Meldar / others).
- Hover states on rows are a nice touch.
- "Others" column is deliberately vague, avoiding naming competitors.

**What fails:**
- **The spec recommends a narrative comparison table ("If you've tried... / What happened / AgentGate instead"), not a feature matrix.** The spec explicitly warns: "Do NOT use a checkmark feature comparison matrix." The current implementation is closer to a feature matrix than the narrative the spec wants.
- No CTA below the comparison ("Ready to skip the hard way?" -> scrolls to email capture).
- "Others" as a column header is too generic. The narrative format would be more empathetic.

**Drop-off risk: LOW-MEDIUM.** The section works but doesn't leverage the recognition-over-recall psychology the spec intended.

### Section 7 (actual): Trust & Privacy — Moved down from spec position 6

**What works:**
- Shield icon, calm tone, center alignment. Feels authoritative.
- "Our privacy promise" link to `/privacy-policy` is good.
- Decorative gradient blur orb adds visual interest without distraction.

**What fails:**
- **Massively simplified from spec.** The spec has a two-column layout with: (1) "We see / We never see" with green-check/red-X icons, and (2) trust signals (Finnish company, no lock-in, open business model). The implementation collapses all of this into a single paragraph. The "We see / We never see" format is specifically called out in the spec as "critical" — it proactively answers the question readers are thinking.
- No Finnish flag or company registration badge.
- No mention of GDPR, Finnish Data Protection Authority, or EU data centers.
- "European privacy law" is vague compared to the spec's specific GDPR references.

**Drop-off risk: MEDIUM.** Privacy-sensitive visitors (the target audience includes developers who are hyper-aware of privacy) need more concrete reassurance than a paragraph and a link.

### Section 8: FAQ

**What works:**
- Accordion format with expand/collapse is correct per spec.
- Questions are written in natural, conversational language.
- The questions map well to common objections.

**What fails:**
- Minor: chevron icon (`expand_more`) doesn't rotate when expanded — a small polish issue.
- The `maxWidth="breakpoint-sm"` makes this section very narrow on desktop. The spec says "Full-width accordion."

**Drop-off risk: LOW.** This section does its job.

### Section 9: Final CTA

**What works:**
- Headline "Ready to build your own AI app?" is a good closing question.
- Gradient text treatment matches hero for consistency.
- `boxShadow: 2xl` on the CTA button makes it pop.

**What fails:**
- **No email capture form.** Just a button linking to `#early-access`. The spec says this should have the same inline email field + submit button as the hero. This is the section where ~50% of conversions are expected to happen (per spec estimates), and it has no mechanism to convert.
- No subheadline: "Sign up for early access. We'll send you the guided setup tutorial..."
- No micro-copy: "No credit card required. Unsubscribe anytime."
- No trust element below CTA: "Built in Helsinki, Finland. Privacy by design, not by accident."

**Drop-off risk: CRITICAL.** This is the bottom of the funnel. Visitors who made it here are high-intent. Without a capture form, they leave unconverted.

---

## Overall Funnel Assessment

### The Primary Conversion Path is Broken

The page has ZERO working email capture points. The `EmailCapture` component exists but is never rendered. All CTAs link to a non-existent `#early-access` anchor. This is not a funnel optimization issue — it's a funnel existence issue.

### Section Ordering Hurts the Psychological Sequence

The spec designed a deliberate psychological flow: Recognition > Credibility > Clarity > Concreteness > Simplicity > Safety > Comparison > Urgency. The reordering breaks the Clarity step (Tiers) by pushing it after Concreteness (Skills) and Simplicity (How It Works). The visitor sees specific automations before understanding the product structure, which can create confusion: "How do I get access to these?" without an immediate answer.

### Email Capture Frequency

Per the spec's conversion flow estimates:
- Hero CTA: 30% of conversions (currently: broken)
- Tier card CTAs: 20% of conversions (currently: broken)
- Final CTA: 50% of conversions (currently: broken)

The page asks for email three times (hero, tiers, final CTA) which is appropriate for a landing page of this length. The issue is that none of them work.

### Page Length Assessment

The page is 9 sections. The spec defines 10 sections (including footer). This is appropriate for the audience and conversion goal. The page is NOT too long — each section has a clear job in the funnel. However, if A/B testing later reveals that Sections 6-7 (Comparison + Trust) don't improve conversion over skipping them, they could be merged.

### Sections That Don't Earn Their Place

Every section has a job, but two are underperforming:

1. **ComparisonSection** — The feature-matrix format is weaker than the narrative comparison the spec designed. If this section can't be rewritten to the narrative format, it adds less value than its scroll cost.

2. **TrustSection** — Currently too thin (one paragraph) to resolve privacy objections. Either expand it to match the spec's two-column "We see / We never see" format, or merge it into the FAQ. A single paragraph of trust doesn't earn a full section.

---

## Early Adopter Hook Strategy

### The Problem

The product isn't built yet. We need people to give us their email address in exchange for... what, exactly? "Early access" to a product that doesn't exist is a weak offer. The signup page needs to deliver immediate value or create genuine anticipation.

### What We Can Actually Offer Today

**Tier 1: Immediate value (deliver on signup)**

1. **"The Automation Audit" — a free, personalized report.** After signup, send the user a short questionnaire (5-7 questions): What apps do you use daily? What task do you repeat most? Where do you feel like you waste time? Then use AI to generate a personalized "automation audit" — a 1-page PDF or email showing their top 3 time-wasters and exactly what an AI agent could do about each one. This is the "Discover" tier's value proposition delivered manually/semi-manually before the product exists. It's high-effort per user but creates word-of-mouth.

2. **"30-Minute Setup Guide" — a concrete deliverable.** The spec's post-submission flow already mentions sending a setup guide. Actually write this guide. Make it a beautifully formatted, step-by-step walkthrough of setting up Claude Code from scratch, with screenshots and verify steps. This has standalone value — people will share it. It also positions Meldar as the entity that made AI accessible, building goodwill for the paid product.

3. **"First Automation Template Pack" — 5 ready-to-use scripts.** Bundle the skill cards from the landing page into actual, downloadable automation scripts. "Here are 5 automations you can run today." This proves the product concept and gives the user an immediate win.

**Tier 2: Exclusivity + anticipation (create FOMO)**

4. **Numbered waitlist position.** "You're #247 on the waitlist." Show the number, let people share their position. Social proof builds as the number grows. Offer "jump the line" by referring a friend.

5. **Founding member pricing.** "The first 500 signups lock in a 0% convenience fee for life" (or reduced fee). This creates genuine urgency with a concrete, credible cap. The cap must be real.

6. **Weekly "what we're building" email.** Not a generic newsletter. Show actual screenshots, actual code, actual decisions being made. Build the relationship during the wait. This is what Basecamp, Linear, and Arc did successfully. People stay subscribed when they feel like insiders.

**Tier 3: Engagement (make them invested)**

7. **"Tell us your #1 frustration" form on the thank-you screen.** After email capture, don't just say "check your inbox." Ask them one question: "What's the one thing on your computer that wastes the most of your time?" This data is gold for product development AND it makes the user feel heard. If you then reply personally (or with AI-assisted personalization) within 24 hours with "Here's how an AI agent could fix that for you," you've created a memorable experience.

### Recommended Hook Combination

For maximum conversion, combine:

- **On signup:** Deliver the 30-Minute Setup Guide immediately (automated, already planned per spec).
- **On signup page:** Show numbered waitlist position with referral-to-jump-the-line mechanic.
- **Post-signup form:** "What's your #1 time-waster?" question.
- **Within 48 hours:** Send a personalized "Automation Audit" email based on their answer (can be AI-generated with human review initially, then fully automated as volume grows).
- **Weekly:** Build-in-public email showing progress.

This gives the user: immediate value (guide), social proof (waitlist number), investment (they shared their frustration), and ongoing relationship (weekly updates + personalized audit).

### CTA Copy Recommendation

Change "Get early access" to something that promises the immediate deliverable:

- "Get your free setup guide" (concrete, immediate)
- "Get your automation audit" (personalized, high-value)
- "Join 247 people already on the list" (social proof, dynamic number)

"Get early access" is generic — every pre-launch page says this. The CTA should promise what they GET today, not what they might get someday.

---

## Top 5 Priorities

1. **Fix the email capture.** Render the `EmailCapture` component in HeroSection and FinalCtaSection. Add `id="early-access"` to the hero form. This is priority zero — nothing else matters until the page can actually capture emails.

2. **Restore spec section order.** Move TiersSection back to position 3 (after ProblemSection), move SkillCardsSection to position 4, move HowItWorksSection to position 5. The spec's psychological sequence is well-designed and the reordering weakens it.

3. **Add a concrete early-adopter hook.** "Get early access" is not enough. Offer the setup guide immediately on signup, show waitlist position, and ask "What's your #1 frustration?" post-signup. The landing page needs to promise something tangible today.

4. **Expand TrustSection to match spec.** The current single-paragraph version doesn't resolve privacy objections for an activity-monitoring product. Implement the "We see / We never see" two-column format with specific GDPR references.

5. **Add missing CTAs.** HowItWorksSection needs a CTA after the steps. ComparisonSection needs a CTA below the table. These are natural conversion moments that currently let momentum dissipate into the next section.
