# Landing Page Structure Review

**Date:** 2026-03-30
**Source:** All 9 sections in `src/components/landing/` + `src/app/page.tsx`
**Context:** Pre-launch landing page. Goal is email capture. No product exists yet.

---

## Current Section Order

| # | Section | Purpose | Approx scroll depth |
|---|---------|---------|-------------------|
| 1 | Hero | Hook + primary CTA | 0% (above fold) |
| 2 | Problem | Empathy, validate frustration | ~15% |
| 3 | Skills | Show concrete use cases | ~30% |
| 4 | HowItWorks | Explain the 3-step process | ~45% |
| 5 | Tiers | Show pricing/product tiers | ~55% |
| 6 | Comparison | Differentiate from competitors | ~65% |
| 7 | Trust | Privacy/data safety | ~75% |
| 8 | FAQ | Handle remaining objections | ~85% |
| 9 | FinalCTA | Close with email capture | ~95% |

---

## Question 1: Should Trust come BEFORE Tiers?

**Yes. Move Trust before Tiers.**

The current page asks visitors to evaluate a commitment (tiers, pricing) before addressing their deepest fear (data safety). The objection map (01-objection-map.md) flagged this explicitly: "TrustSection is section 7 of 9 on the page. A privacy-anxious visitor may have bounced long before reaching it."

The target audience has been burned by AI tools before. ProblemSection does an excellent job validating that pain. But then the page immediately pivots to "look what you can build" (Skills) and "here's how it works" (HowItWorks) without first answering: "But can I trust you?"

The psychological sequence that converts skeptical, non-technical visitors is:

1. **I feel seen** (Problem) -- "Yes, that's exactly what happened to me"
2. **I feel safe** (Trust) -- "Okay, they won't steal my data or scam me"
3. **I'm curious** (Skills, HowItWorks) -- "What could this actually do for me?"
4. **I'm convinced** (Tiers, Comparison) -- "This is real and affordable"
5. **I'm ready** (CTA) -- "Let me sign up"

Trust is a prerequisite for curiosity. Without it, the Skills and HowItWorks sections are read through a lens of skepticism ("this sounds too good to be true") rather than excitement.

---

## Question 2: Should the Comparison table be merged into another section?

**Yes. Merge Comparison into Tiers (or eliminate it).**

The Comparison section has 5 rows contrasting Meldar vs "Others" on: starting point, technical knowledge, discovery, building, and data ownership. The problem is threefold:

1. **"Others" is unnamed.** The visitor doesn't know who Meldar is being compared to. A comparison against a phantom competitor reads as self-serving rather than informative.
2. **The differentiators are already stated elsewhere.** "None required" (technical knowledge) is in Hero, Problem, FAQ, and HowItWorks. "Yours. Always." (data) is in Trust. "Yes, from your patterns" (discovery) is in Tiers/Explorer. The Comparison section restates what the page already says, adding length without adding information.
3. **At pre-launch, there's nothing to compare.** The visitor hasn't used Meldar or its competitors. The comparison carries no weight because it's all claims, not evidence.

**Recommendation:** Cut Comparison as a standalone section. If any rows add unique value, fold them into the Tiers section as a brief "Why Meldar?" subheader above the tier cards. The two strongest rows -- "Starting point: Your frustration" and "Builds the app for you: Yes, while you watch" -- could become a 1-2 line preamble to Tiers.

---

## Question 3: Are 9 sections too many? What can be cut?

**Yes. 9 sections is too many for a pre-launch email capture page.**

The page asks visitors to scroll through ~4000px of content before reaching the final CTA. For a non-technical, skeptical audience that doesn't know Meldar exists, the page needs to convert within 3-4 scroll depths, not 9.

**Industry context:** High-converting pre-launch pages (Superhuman, Linear, Arc Browser) typically have 4-6 sections. The sweet spot for a cold-traffic email capture page is:

- Hook (hero)
- Problem/empathy
- Solution (how it works + proof)
- Trust signal
- CTA

### What to cut

| Section | Verdict | Reasoning |
|---------|---------|-----------|
| Hero | KEEP | Non-negotiable. Above-fold hook. |
| Problem | KEEP | Strongest section on the page. Validates the audience. |
| Skills | KEEP | Concrete use cases are the #1 way to make an abstract product tangible. |
| HowItWorks | KEEP | Answers "how" after Skills answers "what." Essential for a product that doesn't exist yet. |
| Tiers | KEEP (modified) | Signals a real product with a business model, but strip pricing per 02-pricing-review.md. |
| Comparison | CUT | Redundant. Merge strongest points into Tiers preamble. |
| Trust | KEEP (move earlier) | Critical for the audience. Must appear before commitment ask. |
| FAQ | KEEP (compress) | Handles edge-case objections. But reduce from 6 to 4 Qs (cut the two already answered elsewhere). |
| FinalCTA | KEEP | Closing conversion point. |

**Result: 7 sections** (down from 9). The Comparison cut removes an entire scroll depth. Compressing FAQ removes another half-scroll.

---

## Question 4: Should Skills come before or after HowItWorks?

**Skills should come BEFORE HowItWorks. Keep the current order.**

The reasoning follows the visitor's mental journey:

1. **"What can this do?"** (Skills) -- The visitor needs to see themselves in a use case before caring about process. If HowItWorks comes first, they're reading about a 3-step process for a product they can't yet picture.
2. **"Okay, but how?"** (HowItWorks) -- Once they've seen a use case that resonates (meal planner, expense sorter), the natural next question is "how does that actually happen?"

This is the "Show, then Tell" pattern. Skills shows the output (personal apps). HowItWorks tells the process (frustration -> build -> done). Reversing this makes the page lecture-first, example-second, which loses non-technical visitors.

The current order is correct.

---

## Question 5: Where should the early adopter offer appear?

**After HowItWorks. Introduce it at the moment of peak conviction, before the commitment ask.**

The visitor's emotional arc at each section:

| Section | Emotional state |
|---------|----------------|
| Hero | Intrigued |
| Problem | Seen, validated |
| Trust | Safe |
| Skills | Excited, "this could work for me" |
| HowItWorks | Convinced, "this is real" |
| **-> Early Adopter Offer** | **"I want in. What do I get?"** |
| Tiers | Evaluating options |
| FAQ | Handling last objections |
| FinalCTA | Converting |

The early adopter offer (from 01-early-adopter-value.md: "Founding 50" with Time Audit + Weekly Email + Shape the Product + Founding Pricing) should be a distinct section that appears AFTER HowItWorks and BEFORE Tiers. This is where the visitor has maximum desire and minimum friction. They now understand what the product does and how it works -- they just need a reason to act now rather than later.

**Important:** This is NOT the same as the FinalCTA. The early adopter offer is an urgency/scarcity section ("23 of 50 spots remaining") with specific benefits. FinalCTA is the closing conversion point for visitors who scrolled past everything.

Placing it after HowItWorks also means it appears roughly at the 50% scroll mark -- the last chance to capture visitors who won't scroll the full page.

---

## Question 6: Does the page need a "Who is this for?" section?

**No. Not as a standalone section.**

The reasoning:

1. **Audience targeting is already embedded throughout.** ProblemSection describes the non-technical person who tried AI and failed. SkillCardsSection shows use cases across students (grade watcher), freelancers (social poster), everyone (meal planner, expenses). The visitor self-selects through the use cases they recognize.

2. **Explicit audience lists create exclusion.** "Who is this for: Students, Parents, Freelancers" makes a marketer think "I'm not on the list." A photographer sees none of those labels and bounces. The skill cards handle audience coverage without exclusion.

3. **The page is already long.** Adding another section to a page that already has too many sections would increase bounce rate, not conversion.

**Better approach:** If audience targeting is needed for SEO or ad landing page variants, create separate pages (e.g., `/for/students`, `/for/freelancers`) with tailored hero copy and skill card order. The main landing page should stay universal.

One exception: a brief inline qualifier in the Hero subheadline or Problem section could work. Example: "Whether you're a student drowning in deadlines or a freelancer juggling invoices..." -- 1 line, not a section.

---

## Question 7: Should there be a "What you get when you sign up" section?

**Yes, but it IS the early adopter offer section (Question 5). They're the same thing.**

Right now the page has a critical gap (flagged as P0 in the objection map): there is no value exchange stated for the email. "Get early access" means nothing to a visitor of a product that doesn't exist. The page asks for an email and gives nothing back.

The "What you get when you sign up" content should be:

> **Join the Founding 50**
>
> The first 50 people get:
> - A free Personal Time Audit -- we analyze your work and tell you exactly what to automate
> - Weekly automation playbooks -- one thing you can automate right now, delivered to your inbox
> - Shape what we build -- tell us your biggest frustration, vote on what gets built first
> - Founding member pricing -- locked in forever
>
> [23 of 50 spots remaining]

This replaces the generic "Get early access" with a tangible, urgent, scarce offer. It doesn't need its own section if the early adopter section already exists -- but the same content should also appear as microcopy near every CTA button and near the email capture form.

---

## Proposed Section Order

### Before (9 sections)

```
Hero -> Problem -> Skills -> HowItWorks -> Tiers -> Comparison -> Trust -> FAQ -> FinalCTA
```

### After (7 sections)

```
Hero -> Problem -> Trust -> Skills -> HowItWorks -> EarlyAdopter -> Tiers -> FAQ -> FinalCTA
```

Wait -- that's 8 with FAQ. Let me reconsider.

### Final recommendation (7 sections)

```
Hero -> Problem -> Trust -> Skills -> HowItWorks -> EarlyAdopter -> FAQ -> FinalCTA
```

**What happened to Tiers?** Merge Tiers into the EarlyAdopter section or move Tiers below FAQ. At pre-launch, the tiers are informational, not transactional. The early adopter offer is the actual conversion mechanism. Tiers can appear as a brief "What's coming" preview within or after the FAQ.

Alternatively, if Tiers is kept:

```
Hero -> Problem -> Trust -> Skills -> HowItWorks -> EarlyAdopter -> Tiers -> FAQ -> FinalCTA
```

This is 8 sections, which is acceptable if Comparison is cut and FAQ is compressed.

### Detailed reasoning for each position

| # | Section | Why here |
|---|---------|----------|
| 1 | **Hero** | Hook. Promise. Primary CTA anchor link. No change needed. |
| 2 | **Problem** | Immediately validate the visitor's experience. "You tried AI, it sucked, you're not alone." Builds emotional connection before any selling. |
| 3 | **Trust** | Address the fear before showing the product. After Problem says "you've been burned before," Trust says "we won't burn you." Data safety, GDPR, European company, founder identity. Without this, everything after is read through a skepticism filter. |
| 4 | **Skills** | Now that they feel safe, show them what's possible. Concrete use cases they can picture themselves using. This is where desire builds. |
| 5 | **HowItWorks** | They've seen what it does. Now show how. Three simple steps. Answers the "is this real?" question with a clear, believable process. |
| 6 | **EarlyAdopter** (NEW) | Peak conviction moment. "I want this. What do I get for signing up NOW?" Founding 50 offer with scarcity counter. This is the primary conversion section. Email capture form lives here. |
| 7 | **Tiers** (optional) | For visitors who want to understand the full product vision. Shows the progression from free discovery to full-service builds. Signals a real business. No prices -- just "Join the waitlist" across all three. |
| 8 | **FAQ** | Compressed to 4 questions. Handles remaining objections for visitors who scrolled this far. Cut the 2 FAQs already answered by earlier sections ("Is my data safe?" now covered by Trust; "Do I need to know how to code?" covered by Problem + HowItWorks). |
| 9 | **FinalCTA** | Closing conversion. Short, punchy. Repeats the early adopter offer in compressed form. Catches visitors who scrolled past everything. |

---

## Changes Summary

| Change | Type | Impact |
|--------|------|--------|
| Move Trust from position 7 to position 3 | REORDER | High -- addresses data safety fear before any commitment ask |
| Cut Comparison section entirely | REMOVE | Medium -- reduces page length, eliminates redundancy |
| Add EarlyAdopter section at position 6 | ADD | Critical -- solves the P0 "no value exchange" gap |
| Compress FAQ from 6 to 4 items | REDUCE | Low -- removes redundant Qs already answered above |
| Move Tiers from position 5 to position 7 | REORDER | Medium -- tiers become informational, not the conversion point |
| Enhance Trust with founder identity | ENHANCE | Medium -- addresses "who is behind this?" objection |

### What does NOT need a section

| Idea | Verdict | Reasoning |
|------|---------|-----------|
| "Who is this for?" audience targeting | No section needed | Skill cards already handle audience coverage implicitly |
| "What you get when you sign up" | Same as EarlyAdopter | Not a separate section -- it IS the early adopter offer |
| Video/demo section | Not yet | Recommended in objection map, but this is a structure review, not a content production plan |

---

## Visual Flow Diagram

```
ABOVE FOLD
+---------------------------------------------------------+
| HERO                                                     |
| "You know what annoys you. We make it disappear."        |
| [Get early access]  [See how it works]                   |
+---------------------------------------------------------+

SCROLL 1 — Build empathy
+---------------------------------------------------------+
| PROBLEM                                                  |
| "Sound familiar?" — 3 pain points + testimonial          |
+---------------------------------------------------------+

SCROLL 2 — Earn trust
+---------------------------------------------------------+
| TRUST                                                    |
| "Your stuff stays your stuff" + GDPR + founder line      |
+---------------------------------------------------------+

SCROLL 3 — Spark desire
+---------------------------------------------------------+
| SKILLS                                                   |
| 6 concrete use cases in a grid                           |
+---------------------------------------------------------+

SCROLL 4 — Show the path
+---------------------------------------------------------+
| HOW IT WORKS                                             |
| 3 steps: frustration -> build -> done                    |
+---------------------------------------------------------+

SCROLL 5 — Convert (PRIMARY)
+---------------------------------------------------------+
| EARLY ADOPTER OFFER                                      |
| "Join the Founding 50" + benefits + scarcity counter     |
| [Email capture form]                                     |
+---------------------------------------------------------+

SCROLL 6 — Inform (optional)
+---------------------------------------------------------+
| TIERS                                                    |
| Discover / Starter / Concierge — no prices, all waitlist |
+---------------------------------------------------------+

SCROLL 7 — Handle objections
+---------------------------------------------------------+
| FAQ (4 items)                                            |
+---------------------------------------------------------+

SCROLL 8 — Close
+---------------------------------------------------------+
| FINAL CTA                                                |
| "Ready to build your own AI app?" + [Get early access]   |
+---------------------------------------------------------+
```

---

## Implementation Priority

1. **Create EarlyAdopter section** -- This is the P0 gap. No other change matters if visitors have no reason to give their email.
2. **Move Trust before Skills** -- Reorder in `page.tsx`. No code changes to TrustSection itself beyond adding a founder identity line.
3. **Remove ComparisonSection** -- Delete import and component from `page.tsx`. Optionally fold 1-2 strongest differentiators into a Tiers preamble.
4. **Compress FAQ** -- Remove "Is my data safe?" and "Do I need to know how to code?" (both answered by earlier sections now). Keep: cost, portability, differentiation, what it can build.
5. **Move Tiers after EarlyAdopter** -- Reorder in `page.tsx`.
