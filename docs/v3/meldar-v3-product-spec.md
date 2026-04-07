# Meldar v3 — Product Spec

**Last updated:** 2026-04-06
**Supersedes:** v1 (Build tier as service), v2 (guided workspace), angle-change MVP backlog
**Source:** Carson brainstorming session (SCAMPER + Role Storming + Game Economy design)

---

## One-Line Pitch

**Meldar is a live-preview AI development environment with a built-in learning layer, for people who don't code.**

Reference: Figma meets Codecademy meets Vercel, aimed at normies.

---

## Taglines

**Primary:**
> "Your data. Your AI. Learn to fish."

**Supporting:**
- "Build it. See it. Learn how you did it."
- "Stop googling AI. Start doing AI."
- "AI is moving. Are you?"

---

## Core Thesis

Non-technical people are getting left behind by AI. The tools exist, but there's no door in for someone who's never opened a terminal. Meldar is that door — and once they're through, they don't just learn AI, they build running apps from Day 1.

We don't teach. We don't tutor. We put a working app in their hands and give them a live preview window. They modify it by prompting. Every action has a 1-2 sentence explainer attached. They learn by doing, not by watching videos.

**The moat is not the interface.** Anyone can build a chat UI. The moat is:
1. The hidden execution layer (orchestration, model routing, kanban-driven build tasks)
2. The proprietary skills library (every project builds reusable recipes)
3. The learning layer (inline explanations, prompt anatomy, improvement widget)

---

## Product Pillars

### 1. Live preview, always visible
Split screen. Left: prompt/chat/controls + kanban. Right: your app running in an iframe, hosted on Vercel via Meldar's infrastructure. Every prompt produces a visible change.

### 2. Boilerplate-first building
Users start from a working starter repo. Charts pre-wired. Auth ready. Database templated. They modify by:
- **Drag-and-drop components** from a library (if it exists, instant deploy)
- **Typing what they want** into a prompt ("add a user profile page")
- If Meldar has a pre-tested component → instant deploy
- If not → task goes into the kanban queue → AI builds it from scratch

### 3. Learn by doing, 1-2 sentences at a time
No tutorials. No courses. No video lessons. Instead:
- Every prompt result has a small "what just happened" explainer
- Every component drag has "this is X, it does Y"
- Every deployment has "your app is now live at URL, this is how"
- Users learn prompt engineering, architecture, and AI concepts **inline, during work**

### 4. Visible roadmap, gated by milestones
Users see the entire learning journey from Day 1. Milestones like:
- **Ship #1** (first working app deployed)
- **Prompt Fluent** (mastered prompt anatomy)
- **Full Stack** (built a complete app with backend)
- **Multi-model** (learned to route between Sonnet/Opus/Haiku)
- **AI Certified Builder** (final milestone)

Only 2-3 steps actionable at a time. Full roadmap visible for aspiration + commitment.

### 5. Segmented onboarding (style, not content)
Upfront question: "How do you like to learn?" Two styles (same backend, different skin):
- **Recipe style** (for millennials) — "Copy this recipe → tweak it → remix it"
- **[TBD — zoomer style]** — not "quests," not "levels." Something native. Options: Drops, Runs, Builds, Shipments.

---

## The First 8 Steps (Example Roadmap)

Every user's Day-1 roadmap, shown as a visible map:

| Step | User does | Learning moment | Produces |
|---|---|---|---|
| 1 | Runs a pre-made prompt on sample data | First prompt, first output | Dopamine hit, "oh I get it" |
| 2 | Modifies the prompt, sees output change | Prompts respond to changes | Cause/effect intuition |
| 3 | Connects to Reddit via Meldar's abstraction | Apps can talk to real services | Real data on their screen |
| 4 | Scrapes a subreddit, sees results | APIs + prompts = power | Actionable list |
| 5 | Generates content in their own voice | Prompt engineering for tone | First "creative" AI output |
| 6 | Builds it into a real app (drag + prompt) | Everything connects | A working tool |
| 7 | Deploys it (one click) | From prototype to live URL | An asset they own |
| 8 | **"Ship #1" milestone unlocked** | Achievement moment | Shareable certificate / Data Receipt v2 |

**Every step produces something real. Nothing is throwaway homework. Every explanation is 1-2 sentences max.**

---

## The 3 Launch Use Cases

### 1. Reddit Scanner + Social Voice Generator
**Target:** Daria (19, student / content creator / side hustler)
**What they build:** A tool that scrapes a subreddit for trending topics, then generates posts in their personal writing voice.
**Why it hooks:** Immediate social utility. They post the output on their own accounts. Tangible, visible, shareable.

### 2. Personal Landing Page + Booking System
**Target:** Katya (24, marketing coordinator / freelancer / creative)
**What they build:** A beautiful personal landing page with a working booking system (using irka website as the base).
**Why it hooks:** Visual result they can show friends. Real-world utility (freelance gigs, portfolio). Professional credibility.

### 3. [TBD — third use case]
**Target:** Jari (41, corporate professional) or Daria's second app
**Candidates:**
- **Meeting notes → action items automator** (corporate, high FOMO relief)
- **Study companion / exam prep tool** (students, ethically safer than essay generator)
- **Expense tracker with receipt OCR** (normies, universal pain point)
- **Email triage assistant** (professionals, highest pain from research)

**Recommendation:** Email triage. Biggest pain point from the 2,847-post research. Universal across all 4 personas. Visible, daily-use, immediate ROI.

---

## Tiers

| Tier | Price | What You Get | Role |
|---|---|---|---|
| **Free** | EUR 0 | Pain quiz + Digital Footprint Scan + recommendation + full roadmap preview. Zero API usage. | Discovery hook. Proves the concept without API cost. |
| **Builder** | EUR 19/mo (TBD after cost modeling) | Full guided workspace + 500 tokens/mo + 1 active project + referral earning + live preview | Main revenue. The "I'm doing this" tier. |
| **Pro Builder** (Phase 2) | EUR 39/mo | Everything in Builder + 1500 tokens/mo + unlimited projects + priority model routing | For grinders and power users. |
| **Done-for-me** (escape hatch) | EUR 79 one-time | User is stuck? Founder intervenes and finishes their project by hand. | The premium safety net. Not the main product — the "I tried and need help" upsell. |

**Old v2 model (Build EUR 79 + Bundle EUR 9.99) is deprecated.** The Build tier becomes the escape hatch, not the main funnel.

---

## Token Economy

### Monthly allowance (Builder tier)
- **500 tokens/month** base
- **+50 tokens/day earn cap** (use-it-or-lose-it, drives daily return)
- **+bonus from referrals** (launched Day 1)

### Referral mechanics (Day 1)
- Referrer: **200 tokens** per paying user referred
- Referee: **100 tokens** bonus on signup

### Token costs
| Action | Cost | Model |
|---|---|---|
| Standard prompt (builds, modifications) | 3 tokens | Sonnet |
| Light prompt (help, improve, brainstorm) | 1 token | Haiku |
| Heavy prompt (complex feature implementation) | 10-20 tokens | Opus |
| Prompt improvement suggestion | 1 token | Haiku |
| Feature brainstorm | 1 token | Haiku |
| Kanban task execution | 10-50 tokens | Sonnet or Opus (routed) |
| Deploy preview | 3 tokens | - |
| Skill library access | Free | - |

### Model routing logic (hidden from user)
- **Default prompts** → Sonnet
- **Prompt improvement widget** → Haiku (cheap, fast, good enough)
- **Feature brainstorming** → Haiku
- **Kanban task execution:** Sonnet triages → "easy" stays on Sonnet, "heavy" routes to Opus
- **Code generation** → Sonnet or Opus based on complexity score

### Hard cost ceiling
Any user's daily API spend cannot exceed **EUR 2**. Beyond that:
- Soft wall: "You've used today's compute. Come back tomorrow, or burn 20 tokens to continue."
- Protects margins from edge-case grinders.

### What's NOT in MVP token system
- Recipe contribution rewards (manual for first 50 users)
- Mentor tier / community help rewards
- Token earning via contribution

---

## Tech Architecture

### Frontend
- Next.js 16 (App Router, RSC-first) — existing stack
- Panda CSS + Park UI — existing stack
- Split-screen layout (chat + live preview iframe)
- Kanban board (existing backend-frontend)
- Live preview iframe (Vercel deployment widget)
- Prompt anatomy side panel
- Roadmap/milestone tracker

### Backend
- Execution orchestrator (routes prompts to Sonnet/Opus/Haiku based on triage)
- Starter repo template system (irka base + new templates)
- Per-user Vercel deployment management (preview URLs)
- Token accounting + cost capping (Redis)
- Kanban task queue (each task triggers AI execution)
- Project state storage (Neon PostgreSQL, Drizzle ORM)
- Referral tracking

### Hidden skills layer (the moat)
- Component library (drag-and-drop blocks: charts, auth, forms, tables)
- Prompt templates (Meldar's proprietary patterns)
- Task-to-template mapping (kanban card → execution recipe)
- Cost estimator (pre-runs task triage to decide Sonnet vs Opus)
- Deployment recipes (one-click deploy to user's own Vercel)

### Model routing abstraction
- Single internal API that accepts a task and returns output
- Routes based on triage: cost + complexity + quality requirements
- Caches common patterns (reduce redundant API calls)
- Logs every call for billing + cost analysis

---

## What Meldar Is Not (Anti-Positioning)

- **Not a CLI wrapper** (Rork trap, no defensible value)
- **Not a Claude Code alternative** (we never sit between user and core tools)
- **Not a developer tool** (if a developer would use it, we failed our audience)
- **Not a generic AI kanban** (kanban is infrastructure, not the product)
- **Not a learning platform** (videos/courses are not the product; doing is the product)
- **Not a desktop app** (browser only, always)
- **Not an MCP server** (still requires terminal; wrong audience)
- **Not a generic agent workspace** (guided, not autonomous)

---

## Narratives (Messaging)

### Primary narrative: Data reclamation
> "Big Tech profited from your data for a decade. Take it back. See what it means. Build with it."

### Secondary narrative: Career FOMO
> "AI is moving. The people who learn it now won't be replaced. Start here."

### Tertiary narrative: Learn fishing
> "Free learning materials + guided building. You own everything you make."

### Anti-narrative (never say)
- "Learn AI" (too homework-y)
- "Master AI" (too grand)
- "AI course" (kills conversion)
- "Tutorial" (triggers ugh-reflex)
- "No-code" (commoditized term, implies shallow)

---

## Audience (Locked)

**One audience, one wedge: genuinely non-technical people (18-45).**

- Browser-only
- Use ChatGPT in a tab, that's the extent of their AI
- Know AI matters, feel behind, scared to start
- Want results, not technical setup
- Willing to click through a guided product if it's simple

**Secondary emotional hook for corporate professionals:** same product, same audience profile, but FOMO-framing is job-survival instead of self-improvement. Served by the same product.

---

## Competitive Landscape (Updated)

| Competitor | What they do | Meldar's difference |
|---|---|---|
| ChatGPT / Claude | Answer questions | Meldar builds running apps live |
| Cursor / Lovable / Bolt | Build apps if you know what you want | Meldar discovers what to build AND guides the building |
| Zapier / Make | Automate workflows (steep curve) | Meldar requires zero technical knowledge AND teaches while building |
| Rork / wrappers | Commodity layer on Claude Code | Meldar adds value underneath, not on top |
| Duolingo | Gamified learning, no output | Meldar produces real apps at every step |
| Codecademy | Learn syntax, zero product | Meldar learn by modifying a running app |
| Figma | Visual design, no code | Meldar visual + code + AI + deployment |
| Vercel | Deployment for developers | Meldar deployment for normies + learning |

**Meldar's unique quadrant:** Discovery + guided execution + live preview + inline learning + code ownership, all for non-technical people.

---

## What We Still Need to Decide

See `meldar-v3-decisions-needed.md` for:
1. Zoomer onboarding style terminology
2. Final pricing number (needs cost modeling)
3. First milestone name
4. Corporate entry point (same quiz or separate /teams page?)
5. Third use case selection

---

## Phase Plan

### Phase 1 (MVP) — Prove the loop
- Free tier: quiz + scan + recommendation + roadmap preview
- Builder tier: full guided workspace with 1 use case (Reddit Scanner recommended first)
- Token economy + model routing
- Referral system
- Done-for-me escape hatch

### Phase 2 — Scale the library
- Add use cases 2 and 3
- Pro Builder tier
- Recipe contribution rewards
- Community help

### Phase 3 — Platform play
- Skills marketplace
- Third-party API bundle
- Mentor tier
- Multi-project workspace
