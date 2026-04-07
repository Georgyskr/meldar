# Meldar v3 — Open Decisions

**Last updated:** 2026-04-06

Five questions that need answers before full MVP implementation begins. Each has a recommendation and the trade-offs.

---

## Decision 1: Zoomer onboarding style terminology

**Question:** The onboarding splits users into two styles. "Recipes" works for millennials (familiar from cooking, TikTok, Pinterest). What's the zoomer equivalent?

**Criteria:**
- Must not feel cringe when zoomers say it
- Must not be "quest," "level," or any Duolingo/gamification cliche
- Must work in copy: "Start your next [term]"
- Must feel native to how they already talk

**Options:**

| Term | Vibe | Risk |
|---|---|---|
| **Drop** | Streetwear / music release culture | Too niche? |
| **Run** | Gaming speedrun culture, productivity sprints | Might feel too gaming |
| **Build** | Maker culture, already in Meldar's vocab | Might confuse with "building an app" |
| **Ship** | Startup / dev culture | Slightly dev-coded |
| **Shot** | "Taking a shot at it" | Casual but unclear |
| **Move** | Chess / strategy feel | Ambiguous |
| **Round** | Boxing / games | Clear but generic |
| **Beat** | Music, rhythm | Unusual, memorable |

**Recommendation:** **"Drop"** — unique, culturally zoomer-native, implies release/completion, and pairs well with copy like "Your next drop is ready" or "You just shipped your first drop."

**Trade-off:** "Drop" could confuse users who don't know streetwear/music culture. Mitigation: the term is contextualized by the UI — users see a roadmap with "Drop 1, Drop 2, Drop 3..." and figure it out instantly.

**Your call needed:** Approve "Drop" or pick another.

---

## Decision 2: Final pricing number (Builder tier)

**Question:** Is EUR 19/mo correct? We need actual API cost modeling against expected usage.

**Factors to model:**
- Average prompts per active user per month
- Distribution across Sonnet (most) / Opus (some) / Haiku (cheap)
- Cache hit rate (how often we reuse results)
- Referral-driven token inflation (free tokens earned by referrers)

**Quick math (needs validation):**

Assuming an active user runs 200 prompts/month at average complexity:
- 150 Sonnet prompts at ~$0.05 each (rough estimate) = $7.50
- 40 Haiku prompts at ~$0.005 each = $0.20
- 10 Opus prompts at ~$0.15 each = $1.50
- Vercel deployment cost per user (estimate) = $0.50
- Stripe fees at EUR 19/mo = EUR 0.85

**Estimated monthly cost per active user: ~EUR 10**
**Estimated margin at EUR 19/mo: ~EUR 9 per user**

If grinders run 500+ prompts/month, margin can drop to EUR 0 or negative. That's what the EUR 2/day cost ceiling prevents.

**Options:**

| Price | Margin | Risk |
|---|---|---|
| **EUR 14/mo** | ~EUR 4/user | Too low — grinders break it, no room for error |
| **EUR 19/mo** | ~EUR 9/user | Sweet spot. Recommended. |
| **EUR 29/mo** | ~EUR 19/user | Safer margin but higher conversion barrier |
| **EUR 9/mo + usage-based overage** | Variable | Complex billing, confusing for normies |

**Recommendation:** **EUR 19/mo** with strict cost ceiling enforcement (EUR 2/day hard cap). Validate with real usage data in first 30 days, adjust if needed.

**Trade-off:** EUR 19 is higher than Duolingo Super (EUR 6.99) but lower than a Notion Plus (EUR 9) plus API costs. Within normie comfort zone for a "this will change my career" product, not impulse-purchase territory.

**Your call needed:** Approve EUR 19/mo or pick another starting point.

---

## Decision 3: First milestone name

**Question:** What do we call the first major milestone when a user completes their first deployed app?

**Criteria:**
- Must be earned, not given
- Must be shareable with pride
- Must feel like an achievement
- Must not be cringe

**Options:**

| Name | Vibe | Risk |
|---|---|---|
| **Ship #1** | Startup culture, founder energy | Dev-coded |
| **AI Literate** | Competence signal | Too corporate |
| **First Blood** | Gaming, edgy | Too violent for some |
| **Graduated** | School | Exactly what we said we'd never say |
| **Meldar Certified Level 1** | Official sounding | Boring |
| **Day 1 Builder** | Fresh, time-based | Confusing ("but it's Day 8") |
| **Launched** | Clear action | Bland |
| **On the Map** | Recognition, presence | Vague |

**Recommendation:** **"Ship #1"** — it's the founder/startup vocabulary but explicable ("you shipped your first thing"), reusable ("Ship #2, Ship #3..."), and shareable. The rest of the milestones can follow the pattern: Ship #5 = "Prompt Fluent," Ship #10 = "Full Stack," etc.

**Alternative if "Ship" feels too dev-coded:** **"Launched"** — more normie-friendly, same meaning.

**Your call needed:** Approve "Ship #1" or pick another.

---

## Decision 4: Corporate entry point

**Question:** Does Jari (41, corporate operations manager) enter through the same flow as Katya (24, marketing coordinator), or does he need a separate landing page?

**Arguments for same flow:**
- Simpler to build and maintain
- The Digital Footprint Scan works for anyone with a phone
- Same product, same outcome — just different messaging emphasis
- Reduces fragmentation

**Arguments for separate flow (`/teams` or `/professional`):**
- Jari's emotional hook is different (career FOMO, not self-improvement)
- He needs different proof points (team productivity, ROI)
- He may not feel comfortable uploading personal Screen Time data
- He's coming from LinkedIn, not Reddit — different traffic source, different expectations

**Options:**

| Option | Description |
|---|---|
| **A: Same flow, UTM-based messaging swap** | One landing page, different hero text based on source (LinkedIn → corporate hero, Reddit → Gen Z hero) |
| **B: Separate /teams landing page** | Full B2B-flavored page with different hero, proof, testimonials, but same product underneath |
| **C: Both entry points converge at the scan** | Separate marketing pages, same discovery experience once they click |

**Recommendation:** **Option C** — Ship a `/teams` landing page post-MVP (P1, not P0). For MVP, use Option A with UTM-based hero text swap. This is the lowest-effort way to test if corporate conversion works at all before investing in dedicated infrastructure.

**Trade-off:** Option A is a compromise. Jari might bounce from a page that's 80% about Daria. But it's better than building two landing pages before validating the product works at all.

**Your call needed:** Approve Option A for MVP (with plan to revisit).

---

## Decision 5: Third use case

**Question:** We have Reddit Scanner + Voice Generator (Daria) and Landing Page + Booking (Katya). What's the third?

**Candidates:**

| Use case | Target user | Pain point | Difficulty |
|---|---|---|---|
| **Email triage assistant** | Universal (normies + corporate) | Highest-frequency pain from 2,847-post research | Medium (needs email integration) |
| **Meeting notes → action items** | Jari (corporate) | Meeting overload (corporate FOMO) | Medium (needs audio/transcript) |
| **Expense tracker with receipt OCR** | Normies | Money management | Medium (existing OCR + categorization) |
| **Study companion / quiz maker** | Daria (student) | School abuse angle | Easy (pure LLM use case) |
| **Personal CRM for freelancers** | Katya / side hustlers | Managing contacts, follow-ups | Hard (needs real database, CRUD) |

**Recommendation:** **Email triage assistant.** Reasons:
1. Highest-frequency pain point from the research (4 hrs/week wasted)
2. Works for all 4 personas — Daria's school emails, Katya's freelance inquiries, Jari's corporate overload, power users' side hustle
3. Daily-use retention anchor (they come back every morning)
4. Clear before/after: "Your inbox: 47 unread → 3 important"
5. Technically feasible with existing starter repos

**Trade-offs:**
- Requires email service integration (Gmail, Outlook) — OAuth complexity
- Privacy-sensitive (user's real email) — needs trust-building
- Not as shareable as the Reddit Scanner (people don't screenshot their inbox)

**Alternative if email integration is too heavy for MVP:** **Study companion / quiz maker** — simpler to build, doesn't need email OAuth, and hits Daria's core motivation.

**Your call needed:** Pick one of the three recommendations or propose another.

---

## Summary: Recommended Defaults

If you approve all recommendations, the v3 MVP launches with:

| Decision | Recommendation |
|---|---|
| Zoomer term | **"Drop"** |
| Builder tier price | **EUR 19/mo** with EUR 2/day cost ceiling |
| First milestone | **"Ship #1"** |
| Corporate entry | **Same flow, UTM-swapped hero** for MVP |
| Third use case | **Email triage assistant** (or Study companion as safer alternative) |

If you want to move fast: approve all defaults, start building.

If you want to stress-test: let's walk through each one.

---

**Your move.**
