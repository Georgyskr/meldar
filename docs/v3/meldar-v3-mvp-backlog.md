# Meldar v3 MVP Backlog

**Last updated:** 2026-04-07
**Replaces:** v2 angle-change MVP backlog
**Based on:** Carson brainstorming session + game economy design

---

## MVP Goal

Validate that a non-technical user can go from:
1. Landing page → discovery → recommendation → guided workspace → **first working deployed app** → **token-based retention**

...in a single session, and come back the next day to continue.

**Success metric:** 3 out of 10 founding members complete at least 5 of the 8 steps of the Reddit Scanner use case, deploy it, and return for Day 2.

---

## Phasing

- **P0** — Blocks MVP launch. Must ship.
- **P1** — Needed soon after launch. Don't ship without a plan for these.
- **P2** — Post-launch. Deferred.

---

## Engineering Infrastructure (current state, 2026-04-07)

The repo is a **pnpm + Turborepo monorepo**. All planning items below assume this layout — when a task says "the orchestrator," it means `packages/orchestrator/`, not a folder under `apps/web/src/server/`.

### Workspace layout

```
apps/
  web/                  @meldar/web              Next.js 16 app (Park UI + Panda CSS, FSD layered)
  sandbox-worker/       @meldar/sandbox-worker   Cloudflare Worker spike that boots `next dev` inside a Sandbox container

packages/
  tooling-config/       @meldar/tooling-config   Shared tsconfig presets (base / nextjs / node-lib)
  test-utils/           @meldar/test-utils       Vitest mock factories (Anthropic, Upstash Redis, fetch, NextRequest)
  db/                   @meldar/db               Drizzle schema + Neon client + SQL migrations
  tokens/               @meldar/tokens           TokenLedger + MODELS + token→cents pricing
  sandbox/              @meldar/sandbox          SandboxProvider contract + Cloudflare implementation
  storage/              @meldar/storage          ProjectStorage + BlobStorage (Postgres + R2 + in-memory)
  orchestrator/         @meldar/orchestrator    Build engine, prompts, SSE encoder, types
```

### Dependency graph

```
@meldar/tokens     ──┐
@meldar/sandbox    ──┤
@meldar/db         ──┴── @meldar/storage ──┐
                                             ├── @meldar/orchestrator ──┐
@meldar/test-utils                          │                            │
                                             │                            ├── @meldar/web
@meldar/db ──────────────────────────────────┘                            │
@meldar/sandbox, @meldar/tokens, @meldar/storage ────────────────────────┘
```

`@meldar/tooling-config` is a devDep of every package and apps/web — it ships only tsconfig JSON, no runtime code.

### Tooling decisions

- **Just-in-Time packages** — every `@meldar/*` package exposes raw `.ts` source via its `exports` field. No build step. Next.js compiles them via `transpilePackages` in `apps/web/next.config.ts`. Vitest resolves them through Vite's source loader. This was a deliberate choice over compiled packages: no `dist/` to keep in sync, no double-compilation, and `pnpm install` is the only "build" needed.
- **No TypeScript Project References.** Each package has a standalone `tsconfig.json` extending `@meldar/tooling-config/tsconfig/{base,nextjs,node-lib}.json`. Project References would add ~200ms to every cold typecheck for no caching gain on a JIT graph this small.
- **Strict turbo `envMode: "strict"`** — every env var the tasks read is enumerated in `turbo.json`'s `globalEnv`. Anything not on the list will not be passed to the task.
- **Root-level Biome.** Single `biome.json` at the repo root with monorepo globs (`apps/*/src/**`, `packages/*/src/**`, etc.). Run via the `//#format-and-lint` root task in `turbo.json` — Turborepo's recommended pattern for tools that benefit from seeing all files at once.
- **Vitest per-package**, not Vitest Projects mode. Vitest's docs explicitly warn that Projects mode causes turbo cache misses across packages.

### Turbo task graph

| Task | Depends on | Outputs | Cached |
|---|---|---|---|
| `build` | `^build` | `.next/**` (excl. cache), `dist/**` | yes |
| `typecheck` | `^typecheck` | none | yes |
| `test` | `^typecheck` | none | yes |
| `dev` | none | none | no (persistent) |
| `start` | `build` | none | no (persistent) |
| `//#format-and-lint` | none (root task) | none | yes |
| `//#format-and-lint:fix` | none (root task) | none | no |

Run from the repo root: `pnpm format-and-lint`, `pnpm turbo run typecheck test build`.

### Test baseline (verified 2026-04-07)

| Package | Test files | Tests passing | Notes |
|---|---|---|---|
| `@meldar/web` | 27 | 432 | + 1 file / 3 tests skipped (legacy integration) |
| `@meldar/storage` | 4 | 74 | InMemory + Postgres provider contract + R2 blob |
| `@meldar/sandbox` | 2 | 80 | Safety helpers + Cloudflare provider HMAC |
| `@meldar/tokens` | 2 | 37 | Pricing math + ledger atomic Lua debit |
| `@meldar/orchestrator` | 2 | 33 | Engine streaming + SSE round-trip |
| `@meldar/test-utils` | 4 | 12 | Mock factory smoke tests |
| **Total** | **41** | **668** | All green; warm `turbo` runs report **FULL TURBO** in <50ms |

### What's wired end-to-end (build flow)

1. `apps/web/src/app/api/workspace/[projectId]/build/route.ts` — auth check → `buildOrchestratorDeps()` → `orchestrateBuild()` async generator → `sseStreamFromGenerator()` → SSE response
2. `packages/orchestrator/src/engine.ts` — Anthropic Sonnet tool-calling loop with `write_file` tool, debits via `TokenLedger`, persists via `ProjectStorage`, mirrors to `SandboxProvider` (optional)
3. `packages/storage/src/postgres-provider.ts` — atomic `beginBuild → recordFile → finalizeBuild` against `projects`, `builds`, `build_files`, `project_files` (deferrable FK constraints, content-addressed via `blob_sha256`)
4. `packages/storage/src/r2-blob.ts` — content-addressed PUT/GET via aws4fetch (no AWS SDK on serverless)
5. `apps/web/src/features/workspace-build/BuildPanel.tsx` — client consumer, `consumeSseStream` from `@meldar/orchestrator/sse`, AbortController cancellation

### What is NOT yet wired (gaps to be aware of)

- **Sandbox preview URL** is not displayed in the workspace UI yet — `SandboxProvider` returns it but the frontend doesn't render the iframe
- **Project creation flow** — there's no UI to create a new project (the workspace route assumes a `projectId` already exists)
- **Kanban UI** — the orchestrator accepts a `kanbanCardId` field but no UI surface produces or consumes them
- **Build history / rollback UI** — the storage layer supports `rollbackToBuild()` but no UI invokes it
- **Reap-stuck-builds cron** — `builds.status = 'streaming'` rows can be orphaned by a Worker crash; needs a cron sweeper
- **Drizzle-Kit migration runner** — schema is hand-crafted SQL applied via `psql`; no `drizzle-kit migrate` integration
- **Upstash cache layer** — `@upstash/redis` is a dep but only used for the token ledger; no Workers KV / Upstash response cache yet
- **Model routing logic** (#16 below) — orchestrator currently always uses Sonnet (`request.model ?? MODELS.SONNET`); no automatic Haiku/Opus routing by `task_type`

---

## P0 — Positioning & Narrative

### 1. Update landing page to v3 positioning
- New hero copy reflecting "live preview + learn by building" angle
- Update tiers section: Free / Builder EUR 19/mo / Done-for-me EUR 79 escape
- Kill old "Build tier as main product" framing
- Update FAQ for new model
- Update all JSON-LD schema with new pricing

**Dependency:** Requires v3 landing copy rewrite (separate deliverable needed)

### 2. Rename and rebrand learning moments
- No more "lessons," "courses," "modules," "tutorials"
- Replace with: "steps," "builds," "ships," "milestones"
- Consistent across UI, emails, and marketing

### 3. Craft the first milestone vocabulary
- "Ship #1," "Prompt Fluent," "Full Stack," "AI Certified Builder"
- Each milestone has: visual badge, unlock conditions, shareable certificate

---

## P0 — Gateway (Discovery Flow)

### 4. Free tier: Digital Footprint Scan + recommendation — **DONE** for the scan, **NOT DONE** for the v3 roadmap-preview CTA
- **Exists already** in the codebase (agentgate)
- Wire it to produce one clear recommendation → specific use case → roadmap preview
- CTA from recommendation: "See the full roadmap" → login wall → upgrade flow

**What's actually shipped:** `/quiz`, `/start`, `/start/[id]`, `/xray`, `/xray/[id]` pages plus `apps/web/src/app/api/discovery/{session,upload,analyze,adaptive}` routes. Quiz → Screen Time screenshot upload → Haiku OCR → recommendations → shareable Time X-Ray card. Founding-member email capture wired (`apps/web/src/features/founding-program/`). **What's missing:** the v3-specific "see the full roadmap → login → upgrade" CTA from the recommendation page into the workspace; the discovery output doesn't yet hand off into a workspace project.

### 5. Onboarding style selector
- One-question upfront: "How do you like to learn?"
- Options: "Recipe style (I like following and tweaking)" / "[Zoomer style — TBD]"
- Stored in user profile, affects UI copy tone across platform

### 6. Visible roadmap preview (free)
- Show the full 8-step roadmap with milestone markers
- First 2 steps clickable (free preview)
- Steps 3-8 grayed with "Unlock to continue building" CTA
- This is the upgrade trigger

---

## P0 — Guided Workspace (the heart of the MVP)

### 7. Split-screen workspace shell
- Left panel: chat / prompt interface + kanban + controls
- Right panel: live preview iframe (Vercel embed)
- Top: project name, current step, progress indicator
- Bottom: token balance, roadmap button

**Requirements:**
- Responsive (tablet OK, mobile P2)
- Always-visible live preview (no hiding, no tabs)
- Smooth updates when preview refreshes

### 8. Step state machine
Each of the 8 roadmap steps has states:
- `locked` — grayed, not yet reachable
- `available` — user can start
- `in_progress` — user is actively working on it
- `needs_input` — waiting for user approval
- `completed` — done, moves to next
- `failed` — error state with retry

### 9. First runnable workflow: Reddit Scanner + Voice Generator
The ONE workflow that must work end-to-end for MVP. Steps:

1. **Run sample prompt on dummy subreddit data** (pre-canned, no API cost)
2. **Modify the prompt** (user tweaks 1-2 words, sees output change)
3. **Connect to real Reddit** (Meldar handles OAuth, user clicks "Connect")
4. **Scrape a subreddit** (Meldar executes, shows live results in preview)
5. **Generate posts in user voice** (user pastes 2-3 sample posts for style, AI generates)
6. **Build into a standalone app** (kanban task queue activates, Sonnet + Opus build)
7. **Deploy to preview URL** (one click, Vercel pushes)
8. **Unlock "Ship #1" milestone** (shareable certificate + Data Receipt v2)

**Each step requires:**
- Pre-written prompt template
- Expected output structure
- 1-2 sentence inline explainer
- "Approve and continue" button
- Token cost displayed upfront

### 10. Inline learning layer (1-2 sentence explainers)
Every action on the platform has a small companion text:
- "This prompt uses 'chain of thought' — it asks the AI to think step by step"
- "Your app just got a new route. This is a page users can visit."
- "We just stored your API key. It never leaves Meldar's server."

Stored as data, not hardcoded — so we can A/B test explanations later.

### 11. Approval checkpoints
Before any destructive or expensive action, require user approval:
- Before running paid prompts
- Before deploying
- Before connecting external services
- Before spending > 10 tokens

---

## P0 — Prompt Anatomy & Learning

### 12. Prompt anatomy side panel
When user opens the prompt builder, a side panel shows:
- **Role**: "You are a..." (explains what this does)
- **Context**: "Given that..." (why context matters)
- **Task**: "Do X..." (the actual ask)
- **Constraints**: "But don't..." (guardrails)
- **Format**: "Respond as..." (output shape)

For any prompt the user writes, Meldar parses it and highlights what's there and what's missing.

### 13. Prompt improvement widget
User clicks "Improve my prompt" button:
- Costs 1 token
- Routes to Haiku
- Returns: suggested rewrite + 2-3 sentence explanation of what changed and why
- User can accept, reject, or modify further

### 14. "What just happened?" micro-explainer
After every AI action, a small popup/card shows:
- What the AI did
- Why it chose that approach
- What principle they just used
- Link to more (optional, hidden by default)

Max 2 sentences. No walls of text.

---

## P0 — Backend Execution & Orchestration

### 15. Execution orchestrator v1 — **DONE** (`packages/orchestrator/src/engine.ts`)
Backend service that:
- Accepts a task (`prompt`, `task_type`, `user_id`, `project_id`)
- Triages the task (cost + complexity)
- Routes to Sonnet / Opus / Haiku
- Logs API cost
- Returns output
- Updates token balance

**What's actually shipped:** `orchestrateBuild()` async generator runs an Anthropic tool-calling loop with the `write_file` tool, debits the `TokenLedger` per turn, persists via `ProjectStorage`, optionally mirrors to a `SandboxProvider`, and yields a typed `OrchestratorEvent` stream that the build route turns into SSE. **Gaps vs. spec:** task triage / cost logging table / per-step `task_type` field are not implemented — see #16.

### 16. Model routing logic — **PARTIAL**
Decision tree:
- `task_type: 'help' | 'improve' | 'brainstorm'` → **Haiku**
- `task_type: 'standard_build' | 'modify'` → **Sonnet**
- `task_type: 'heavy_feature'` → triage by Sonnet first: if "easy" → stay on Sonnet, if "heavy" → route to Opus
- Always log which model was used and actual cost

**What's actually shipped:** `MODELS` constant lives in `packages/tokens/src/models.ts` and the orchestrator accepts a per-request `model` field (`request.model ?? MODELS.SONNET`). Discovery flows already pick Haiku directly in `apps/web/src/server/discovery/*`. **What's missing:** the automatic `task_type` → model decision tree, the cost-logging table (model + actual tokens + cents), and the Sonnet-triages-Opus escalation path.

### 17. Token accounting system — **DONE** for cost ceiling, **NOT DONE** for game economy (`packages/tokens/`)
Track per-user:
- Monthly allowance (500 base + referral bonuses)
- Daily earn cap (50/day, resets at midnight UTC)
- Current balance
- Transaction history
- Cost ceiling enforcement (EUR 2/day soft wall)

**What's actually shipped:** `UpstashTokenLedger` enforces a per-user daily EUR-cents ceiling (default EUR 2/day) via an atomic Lua script that combines `INCRBY` + `EXPIRE` + the ceiling check in one round-trip. Key shape: `meldar:tokens:{userId}:{YYYY-MM-DD}`. Fail-closed on Redis errors (cannot debit if we don't know current spend). The orchestrator pre-debits a worst-case estimate before each Anthropic call. **What's missing:** the *game economy* layer — monthly allowances, daily earn cap, token transactions, balance UI, referral bonuses. The current ledger is a hard *cost* ceiling, not a token *balance*.

### 18. Per-user Vercel deployment management
- Meldar holds a Vercel API key
- Each user project gets a Vercel project under Meldar's team account
- Preview URLs auto-generated
- User can export/transfer ownership when they're ready
- Cleanup cron for abandoned projects

### 19. Starter repo template system
- Hidden template library (starts with 2-3 templates)
- Template for Reddit Scanner use case
- Template for Landing Page + Booking (use irka as base)
- Template includes: pre-wired charts, forms, auth, database schema, deployment config
- User sees only their own project, not the template source

### 20. Kanban task execution engine
- Each "build a feature" request becomes a kanban card
- Card has: title, description, task_type, complexity_estimate, token_cost_estimate
- User approves card → orchestrator picks it up → routes to correct model → executes → updates card status
- User sees kanban progress in workspace

---

## P0 — Referral System (Day 1)

### 21. Referral link generation
- Each user gets a unique referral URL
- Shareable from workspace + email signature
- Clicks tracked, signups attributed

### 22. Referral reward payout
- New user signs up via referral → referee gets 100 tokens on signup
- New user converts to paying Builder → referrer gets 200 tokens
- Tokens added to balance immediately
- Notification: "X just joined from your link, 200 tokens added"

### 23. Referral dashboard
- Small section in workspace: "Your referrals"
- Shows: total referred, paying referrals, tokens earned
- Share buttons (copy link, tweet, etc.)

---

## P0 — Monetization & Billing

### 24. Stripe checkout for Builder tier (EUR 19/mo) — **DONE** for the plumbing, **NOT DONE** for trial + entitlement gating
- Existing Stripe integration in codebase — extend
- Subscription, not one-time
- Trial: consider 3-day free trial with token allowance
- Webhook handling for signup, upgrade, cancel

**What's actually shipped:** `apps/web/src/app/api/billing/checkout/route.ts` accepts `product: 'builder'` and creates a `mode: 'subscription'` Stripe Checkout session via `getStripePriceId('builder')` (env var `STRIPE_PRICE_BUILDER`). Webhook handler in `apps/web/src/app/api/billing/webhook/route.ts` listens for `checkout.session.completed`, `customer.subscription.created`, and `customer.subscription.deleted` and logs them. **What's missing:** the 3-day free trial config on the Stripe price; the user-facing entitlement check that gates workspace features behind subscription status (`subscribers.tier` column exists in the schema but no route reads it yet); the billing-portal link in the workspace UI for cancel/upgrade.

### 25. Done-for-me escape hatch (EUR 79 one-time)
- Button visible from workspace when user is stuck
- "Need help? Let us finish this for you — EUR 79"
- Triggers email to founder
- Founder manually takes over, delivers completed project
- Acts as both safety net AND premium upsell

### 26. Cost monitoring dashboard (internal)
- Real-time view of: API spend, active users, token usage, conversion rate
- Daily email digest to founder
- Alert when any user exceeds EUR 2/day

---

## P0 — Analytics (Beyond GA4)

### 27. Product analytics events
Track:
- `onboarding_style_selected` (persona)
- `roadmap_previewed`
- `workspace_entered`
- `step_started` (per step, per use case)
- `step_completed`
- `prompt_run` (with token cost)
- `prompt_improved` (Haiku calls)
- `preview_deployed`
- `milestone_unlocked`
- `referral_shared`
- `done_for_me_requested`

### 28. Friction tracking
- Drop-off per step
- Time spent per step
- Number of prompt attempts per step
- "Improve my prompt" usage frequency
- Failed prompt rate
- Abandoned sessions (workspace entered, no completion)

---

## P0 — Learning Content (Minimum Viable)

### 29. Write the 1-2 sentence explainers for every action
This is actual copywriting work, not code. Need explainers for:
- Every step in the Reddit Scanner use case (estimated 20-30 unique moments)
- Every prompt component in the anatomy panel
- Every "what just happened" micro-explainer
- Every error state
- Every milestone unlock

**This is the learning product.** Cannot ship without it.

### 30. Prompt templates for the Reddit Scanner use case
Every step has a starting prompt the user modifies. Need:
- Sample prompts for each step
- Expected outputs
- Common variations
- Cost estimates per template

---

## P1 — Experience Upgrades

### 31. Second use case: Landing Page + Booking
Repeat steps 9, 29, 30 for the second use case.

### 32. Polish the live preview
- Faster refresh cycle
- Graceful handling of build failures
- Visual diff between before/after

### 33. Zoomer onboarding style (TBD)
Determine the second onboarding style and implement.

### 34. Skills Receipt v2
- Shareable card showing user's progress
- "7 days on Meldar: built 1 app, ran 40 prompts, learned prompt anatomy"
- Social share buttons
- OG image for Twitter/LinkedIn/Instagram

### 35. Email touchpoints
- Welcome email (Day 0)
- Day 1 nudge: "Come back for Step 3"
- Day 7 celebration: "You're on a streak"
- Abandoned session recovery: "Your app is waiting for you"

---

## P1 — Moat Building

### 36. Expand starter template library
- Add 3-5 more templates
- Based on most-requested features from first users

### 37. Component library for drag-and-drop
- Pre-built components: charts, tables, auth, forms, layouts
- Each component has: description, preview, example prompts to modify it, token cost to integrate

### 38. Cache common prompt patterns
- Identify repeated prompts across users
- Cache results for same input → reduce API cost
- Keeps margins healthy as volume grows

---

## P2 — Scale Path

### 39. Recipe contribution rewards
- Users can submit their successful patterns as "recipes"
- Meldar reviews, cleans up, adds to library
- Contributing user earns tokens

### 40. Third use case (Email Triage or other)
- Determine after first 50 users' feedback

### 41. Pro Builder tier (EUR 39/mo)
- Higher token allowance
- Multiple concurrent projects
- Priority model routing

### 42. Community / mentor layer
- Power users help newcomers
- Reputation system
- Optional, not mandatory for MVP

### 43. Third-party API bundle (original v2 idea)
- Leonardo, ElevenLabs, Runway, Perplexity
- One key, one bill, Meldar earns margin

### 44. Advanced analytics
- Cohort analysis
- Per-step funnel health
- LTV prediction

---

## NOT in MVP (explicit NOs)

- Desktop app
- MCP server
- CLI tools
- Mobile app (responsive web OK)
- Video tutorials or course content
- User-generated templates
- Public marketplace
- Team features / multi-user projects
- Multi-language support
- Complex auth (just email + magic link)
- Discord / community features
- API for external developers

---

## Launch Readiness Checklist

MVP is ready to show first founding members when:

- [ ] Landing page reflects v3 positioning
- [ ] Free tier scan works end-to-end
- [ ] User can sign up for Builder tier and pay
- [ ] Split-screen workspace renders with live preview
- [ ] Reddit Scanner use case has all 8 steps working
- [ ] Token accounting works (no negative balances, no runaway costs)
- [ ] Referral system generates and tracks links
- [ ] Done-for-me button sends founder an email
- [ ] Cost ceiling enforcement is bulletproof (no user can exceed EUR 2/day)
- [ ] Model routing correctly picks Sonnet / Opus / Haiku
- [ ] Prompt anatomy side panel renders for every prompt
- [ ] Improve-my-prompt widget works and charges 1 token
- [ ] All inline explainers written and reviewed
- [ ] Analytics firing for all P0 events
- [ ] Founder can see real-time cost dashboard
- [ ] Email sequence welcomes new users
- [ ] First user deploys a working Reddit Scanner via Meldar

---

## What's NOT Done Until It's Done

The old v2 backlog is deprecated. The old landing page copy is outdated. The old "Build tier as service" model is replaced.

**Before starting implementation:** the landing page needs a v3 rewrite. The copy in `docs/deliverables/landing-copy-v2.md` reflects v2, not v3. That's the first blocker to clear.
