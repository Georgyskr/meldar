# Pricing / Tier Messaging Review

**Source:** `src/components/landing/TiersSection.tsx`
**Current tiers:** Explorer (Free) | Builder (Pay as you go) | Studio (From $200)
**Stage:** Pre-launch landing page — goal is email signups, not purchases

---

## 1. "Pay as you go" — Ambiguity Problem

**Issue:** For a non-technical audience that's already hesitant, "Pay as you go" is anxiety-inducing. It implies unpredictable costs. Someone who doesn't know what a "token" is has no mental model for estimating what they'd actually spend. The description says "You pay only for what you use" — but *what* they use is undefined.

**Risk:** Visitors who are scared of commitment are *also* scared of open-ended billing. "Pay as you go" without a range is essentially "we'll charge you... something."

**Recommendation:** Since this is pre-launch and nobody is actually paying yet, sidestep the pricing question entirely. Replace "Pay as you go" with language that communicates affordability without requiring the visitor to do math. Something like "Starts at $0" or simply remove the price line and lead with the value. If a range must be shown later, anchor it: "Most users spend $5-20/month."

## 2. "From $200" — Premature Price Anchor

**Issue:** $200 is the first concrete number a visitor sees, and it's attached to the most premium tier. For someone who just arrived and doesn't understand the product yet, this creates two problems:

1. **Sticker shock** — $200 feels expensive when the visitor hasn't yet understood the value
2. **Anchoring bias** — the $200 contaminates perception of the other tiers. "If their expensive plan is $200, what will 'pay as you go' actually cost me?"

**Risk:** On a pre-launch page where no money changes hands, showing a hard number invites comparison shopping and objection-building before the visitor has any conviction about the product.

**Recommendation:** Replace with "Custom" or "Let's talk" for Studio. At pre-launch, the goal isn't to sell Studio — it's to capture interest. A "Contact us" or "Tell us what you need" CTA removes the price objection entirely and positions Studio as a white-glove service rather than a price point.

## 3. Tier Names — Explorer, Builder, Studio

**Issue:** These names lean developer/creative-tool. They work for someone who self-identifies as a "builder." But the target audience includes people who *don't* build things — they want AI to build things *for them*.

| Name | What it signals | Who identifies with it |
|------|----------------|----------------------|
| Explorer | I'm browsing, uncommitted | Broad — decent |
| Builder | I make things, I'm technical | Narrows to technical audience |
| Studio | Creative professional tool | Narrows further |

**Assessment:** "Explorer" is fine — low commitment, curiosity-framed. "Builder" excludes solopreneurs who see themselves as operators, not builders. "Studio" sounds like Adobe Creative Suite territory.

**Recommendation:** Consider names that map to the *outcome* rather than the *identity*:
- **Explorer** → keep (or "Discover" to match the product tier name)
- **Builder** → "Starter" or "Essentials" (signals getting going, not being technical)
- **Studio** → "Concierge" or "Full Service" (signals someone does it for you)

Alternative: align names with the three product tiers already defined in the CLAUDE.md — Discover, Setup, Auto-Build. These match the actual product journey.

## 4. "Preferred" Badge

**Issue:** The badge is a standard SaaS pattern, but for commitment-averse visitors it can feel manipulative — "they're trying to steer me." Combined with the fact that "Builder" is the most ambiguous tier (pay as you go = unknown cost), the badge pushes people toward the option with the *most* uncertainty.

**Assessment:** The visual treatment (scale(1.05), border highlight, gradient badge) is tasteful and not aggressive. The word "Preferred" is the problem. It's corporate language that doesn't say *why* it's preferred or *by whom*.

**Recommendation:** Replace "Preferred" with something that explains why:
- "Most popular" (social proof, but dishonest at pre-launch)
- "Best starting point" (honest, directive)
- "Recommended" (softer than Preferred)
- Or remove the badge entirely and let the visual prominence do the work. The scaled card, heavier border, and gradient CTA already draw the eye.

## 5. Feature Lists — Meaningful to Non-Technical Visitors?

**Current features by tier:**

| Explorer | Builder | Studio |
|----------|---------|--------|
| Activity pattern analysis | Full guided setup | Real-time build progress |
| Daily automation suggestions | Your own AI account | Pick your design |
| Privacy-first — metadata only | Curated automation library | You own everything |

**Assessment:**
- **Explorer features** are the strongest. "Daily automation suggestions" is concrete and benefit-oriented. "Privacy-first — metadata only" may confuse non-technical users (what is metadata?) but the intent is good.
- **Builder features** mix outcome language ("Full guided setup") with jargon ("Your own AI account" — own account where? what does that mean?). "Curated automation library" is vague — library of what?
- **Studio features** are the weakest. "Real-time build progress" describes a UI feature, not a benefit. "Pick your design" is generic. "You own everything" is a legal reassurance buried in a feature list.

**Recommendation:** Rewrite features as outcomes a non-technical person can picture:

| Explorer | Builder (or Starter) | Studio (or Concierge) |
|----------|---------------------|----------------------|
| See where your time goes each day | We set up your AI tools for you | Tell us what you need — we build it |
| Get automation ideas you can act on | Pay only for what you use | Watch your project come together live |
| Your data stays private | Ready-made automations to start with | You own the code and design |

## 6. Should Pricing Even Appear on a Pre-Launch Page?

**This is the most important question.**

**Arguments for removing pricing:**
- Nobody can buy anything yet. Showing prices for a product that doesn't exist invites objections you can't overcome.
- "Pay as you go" and "$200" create anxiety without any compensating ability to purchase or trial.
- The page goal is email capture, not purchase conversion. Pricing adds friction to that goal.
- Competitors at this stage typically show tiers with "Join waitlist" across all of them.

**Arguments for keeping pricing:**
- Transparency builds trust, especially with a Finnish/European audience.
- Tiers signal that the product has a real business model (not vaporware).
- Pricing context helps visitors self-select which tier interests them.

**Recommendation:** Keep the three tiers for their signaling value (shows a real product with a progression), but **remove all pricing and replace every CTA with the same action: "Join the waitlist."** The tiers become a feature comparison, not a pricing table. This:
- Eliminates commitment anxiety entirely
- Still communicates product scope and progression
- Funnels everyone to the same conversion goal
- Avoids premature price anchoring

---

## Proposed Revised Tier Cards

### Tier 1: Discover (currently Explorer)
- **Price line:** "Free forever"
- **Description:** "Find out where your time actually goes. We watch your patterns and show you what to automate."
- **Features:**
  - See where your time goes each day
  - Get personalized automation ideas
  - Your data stays private
- **CTA:** "Join the waitlist"

### Tier 2: Starter (currently Builder)
- **Price line:** Remove entirely, or "Free to start"
- **Badge:** "Best starting point" (or remove badge)
- **Description:** "We set everything up for you. Working AI in 30 minutes. No technical skills needed."
- **Features:**
  - Guided setup — we walk you through it
  - Pay only for what you use
  - Ready-made automations to start with
- **CTA:** "Join the waitlist"

### Tier 3: Concierge (currently Studio)
- **Price line:** "Let's talk"
- **Description:** "Tell us what you need. Our team builds it while you watch."
- **Features:**
  - We build it, you watch it happen
  - Choose your design and features
  - You own everything we create
- **CTA:** "Join the waitlist"

---

## Summary of Changes

| Element | Current | Proposed | Why |
|---------|---------|----------|-----|
| Tier names | Explorer, Builder, Studio | Discover, Starter, Concierge | Match audience identity, not developer identity |
| Builder price | Pay as you go | Remove or "Free to start" | Eliminates open-ended cost anxiety |
| Studio price | From $200 | "Let's talk" | Removes premature sticker shock |
| Badge | "Preferred" | "Best starting point" or remove | Less pushy, more helpful |
| Features | Mix of jargon and benefits | All outcome-oriented | Non-technical audience needs outcomes, not features |
| CTAs | Three different labels | All "Join the waitlist" | Single conversion goal, zero commitment friction |
| Overall approach | Pricing table | Tier comparison (no prices) | Pre-launch = capture interest, not sell |
