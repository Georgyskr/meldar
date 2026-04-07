# Meldar v3 MVP Backlog

**Last updated:** 2026-04-07 (post cleanup wave)
**Replaces:** v2 angle-change MVP backlog
**Based on:** Carson brainstorming session + game economy design + 2026-04-07 multi-agent review + cleanup

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

## 2026-04-07 — Cleanup wave (what changed)

A multi-agent review + implementation wave ran on 2026-04-07. It closed
several P0s, ripped the legacy landing-page features entirely, and
migrated Neon to the v3-only schema. Read this section before reading
the rest of the backlog — many items below are now **DONE** or
**DELETED** as a result.

### Legacy code ripped (deleted, not just deferred)

- `/` landing page (replaced with a coming-soon page promoted from
  `app/coming-soon/`)
- `/quiz`, `/xray`, `/start`, `/discover`, `/thank-you`
- `api/subscribe`, `api/discovery/*`, `api/upload/screentime`,
  `api/auth/register`, `api/billing/webhook`, `api/cron/purge`
- `features/discovery-flow`, `features/discovery-quizzes`,
  `features/screenshot-upload`, `features/founding-program`,
  `features/focus-mode`, `features/billing`
- `widgets/landing`

### Neon is now v3-only

Legacy tables dropped: `audit_orders`, `discovery_sessions`,
`subscribers`, `xray_results`. The `users` table is preserved because
v3's `projects.user_id` references it. Applied migrations:

- `0000_meldar_v3_initial.sql` — v3 schema (projects, builds,
  build_files, project_files)
- `0001_projects_preview_url.sql` — preview URL cache columns +
  `idx_builds_project_streaming_created` partial index
- `0002_builds_unique_streaming.sql` — unique partial index
  `ux_builds_project_streaming` (fixes the double-submit race where
  two concurrent POSTs to the build route could both pass the
  `getActiveStreamingBuild` guard)

Plus: `pg_stat_statements` installed; `ALTER ROLE neondb_owner SET
statement_timeout='5s'` and `idle_in_transaction_session_timeout='30s'`
applied per runbook §3.

### Cloudflare Sandbox worker: deferred

The `@meldar/sandbox` package is the client contract + HMAC helpers.
The actual Cloudflare Worker that backs it is NOT yet deployed. In
production the orchestrator runs with `deps.sandbox === undefined` —
builds commit successfully to storage but the workspace iframe shows
the placeholder. The orchestrator code already handles this gracefully
and the `previewUrlUpdatedAt` staleness check means stale URLs are
never rendered. See §NEW-SANDBOX below.

### Items that became OBSOLETE from the rip

These items below are now deleted or need to be reframed from scratch:

- **§1** "Update landing page to v3 positioning" → landing page is now
  a coming-soon page. Reframe as "design the coming-soon page
  properly" or merge with §NEW-AUTH.
- **§4** "Free tier: Digital Footprint Scan" → scan code is gone.
  Revisit only if we want a fresh discovery flow.
- **§5** "Onboarding style selector" → no onboarding surface exists
  anymore.
- **§6** "Visible roadmap preview (free)" → no discovery → workspace
  handoff. Dead until a new entry funnel exists.
- **§21–23** Referral system → blocked on §NEW-AUTH. Keep as P1.
- **§24** "Stripe checkout for Builder tier" → billing code was in the
  rip. Reintroduce as part of §NEW-AUTH or after.
- **§31** "Landing Page + Booking" template → drop; reframe later.

### Items newly closed by the cleanup wave

- **§7 Split-screen workspace shell** → **DONE.** `WorkspaceShell`
  with top/bottom bars, preview pane with `previewUrlUpdatedAt`
  staleness handling, kanban placeholder, build panel, roadmap
  drawer with proper a11y (aria-modal, focus trap, scroll lock).
- **§15 Execution orchestrator v1** → **DONE** (already was; the
  wave fixed atomicity — `sandbox_ready` + `setPreviewUrl` moved
  post-`commit()`, Zod URL validation at the boundary, N+1 sandbox
  writeFiles batched, N+1 `storage.readFile` parallelized, type-lie
  casts removed).
- **§17 Token accounting (cost ceiling)** → **DONE** (already was).
- Closed gap: "Sandbox preview URL displayed" → iframe + context +
  staleness check all wired. Modulo §NEW-SANDBOX for the worker.
- Closed gap: "Project creation flow" → `/api/workspace/projects`
  POST + create-project trigger with proper error surfacing + Zod
  response validation + 1-second cooldown.
- Closed gap: "Reap-stuck-builds" → runs synchronously on workspace
  page load via a single round-trip pattern (not `after()` anymore);
  a proper cron can come later.

### Security / quality fixes landed in the same wave

- iframe `sandbox` attribute dropped `allow-same-origin` (defense in
  depth vs `javascript:` URL XSS chain)
- `previewUrl` is Zod-validated as `http(s)`-only at both the
  orchestrator boundary and the render boundary
- `name` on `/api/workspace/projects` is trimmed, length-capped,
  regex-restricted — no more prompt-injection via project name into
  the Sonnet context
- Rate limiter fall-open fixed via shared `mustHaveRateLimit()`
  helper that throws at module init in production when Upstash env
  vars are missing (applied to both the new create-project route and
  the existing build route)
- All `as unknown as SandboxProvider` type lies replaced with a
  `satisfies SandboxProvider` test helper
- Clean-code pass trimmed ~160 lines of historical/defensive comments
  (zero behavior change, all tests green)

### New P0 items added by this wave

**§NEW-AUTH. Standalone auth flow for v3 — BLOCKER.** The legacy auth
(which piggy-backed on `/api/auth/register` + the quiz/billing flows)
is gone. The `users` table schema is still intact — `email`,
`password_hash`, `email_verified`, `verify_token`, `reset_token`,
`created_at`. What's needed:

- `/sign-up`, `/sign-in`, `/sign-out` routes
- Email verification flow via Resend (reuse the existing
  `RESEND_API_KEY` wiring)
- Password reset flow
- Route guard for `/workspace/*` that redirects to `/sign-in` when
  the `meldar-auth` cookie is absent (the workspace route group's
  layout should own this)
- A minimal sign-up surface on the coming-soon page (or a dedicated
  sign-up URL that the coming-soon page links to)

Without this, the workspace is literally unreachable for any real
user. This is the next task after the cleanup wave lands.

**§NEW-SANDBOX. Cloudflare Sandbox worker deployment — BLOCKER for
any real preview.** Needed:

- New `apps/sandbox-worker/` package with `wrangler.toml`
- The actual Worker code that implements the contract in
  `packages/sandbox/src/provider.ts` (`prewarm`, `start`,
  `writeFiles`, `getPreviewUrl`, `stop`)
- Deploy to the Cloudflare account
- Set `CF_SANDBOX_WORKER_URL` + `CF_SANDBOX_HMAC_SECRET` in Vercel
  for Production and Preview
- End-to-end smoke: create a project, submit a build, watch
  `sandbox_ready` fire in the SSE stream, iframe renders the live
  preview

This can ship after §NEW-AUTH — the workspace works without it
(builds commit fine, just no live preview), but the MVP demo story
requires it.

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

### What is NOT yet wired (gaps to be aware of, post 2026-04-07 cleanup)

- **Standalone auth flow** — §NEW-AUTH above. The workspace route guard
  exists and checks `meldar-auth` cookie, but there is no sign-up /
  sign-in / email-verification UI. **This is the next blocker.**
- **Cloudflare Sandbox worker** — §NEW-SANDBOX above. The client
  contract is complete; the Worker itself is not deployed, so
  production builds commit successfully but never render a live
  preview (the workspace shows the placeholder indefinitely).
- **Project creation flow** — ~~there's no UI to create a new project~~
  **CLOSED** by the 2026-04-07 cleanup wave. `/api/workspace/projects`
  POST exists with rate-limit + Zod validation + prompt-injection
  hardening, triggered from the workspace create-project button with
  proper error surfacing.
- **Sandbox preview URL displayed in workspace** — ~~not displayed~~
  **CLOSED in the UI layer** (`PreviewPane` + `WorkspaceBuildProvider`
  context + `previewUrlUpdatedAt` 2-minute staleness check); waiting
  on §NEW-SANDBOX for the actual worker.
- **Kanban UI** — the orchestrator accepts a `kanbanCardId` field but
  no UI surface produces or consumes them
- **Build history / rollback UI** — the storage layer supports
  `rollbackToBuild()` but no UI invokes it
- **Reap-stuck-builds** — ~~needs a cron sweeper~~ **CLOSED inline**:
  runs synchronously on workspace page load, single round trip, no
  race with `getActiveStreamingBuild`. A proper cron can come later.
- **Drizzle-Kit migration runner** — schema is hand-crafted SQL applied
  via `psql`; no `drizzle-kit migrate` integration. This is the
  deliberate choice per runbook §1 — keep it.
- **Upstash cache layer** — `@upstash/redis` is a dep, now used for
  both the token ledger AND rate-limiting (create-project + build
  routes). No response cache yet.
- **Model routing logic** (#16 below) — orchestrator currently always
  uses Sonnet (`request.model ?? MODELS.SONNET`); no automatic
  Haiku/Opus routing by `task_type`
- **Billing re-integration** — Stripe checkout was in the rip.
  Founding-member launch can happen without a paywall; revisit when
  the v3 billing model is locked.

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

## Launch Readiness Checklist (post 2026-04-07 cleanup wave)

MVP is ready to show first founding members when:

- [x] ~~Landing page reflects v3 positioning~~ — legacy landing page
  ripped; coming-soon page is the public surface
- [ ] Coming-soon page has a working email capture (tied to §NEW-AUTH)
- [ ] §NEW-AUTH — sign-up, sign-in, sign-out, email verification work
  end-to-end
- [ ] §NEW-SANDBOX — Cloudflare Sandbox worker deployed, `sandbox_ready`
  events fire, iframe renders a live preview
- [ ] User can reach `/workspace/:id` after sign-up without hitting
  any legacy auth redirects
- [x] Split-screen workspace renders (live preview blocked on
  §NEW-SANDBOX)
- [ ] First user actually signs up, creates a project, and sees a
  streaming build commit
- [ ] Reddit Scanner use case has all 8 steps working
- [x] Token cost ceiling enforcement works (no user can exceed
  EUR 2/day) — delivered by `packages/tokens/`
- [ ] Token accounting *game economy* layer (monthly allowances,
  daily earn cap, referral bonuses) — §17
- [ ] Billing re-added (was in the rip) — gated on whether we launch
  with or without a paywall
- [ ] Referral system generates and tracks links (§21–23)
- [ ] Done-for-me button sends founder an email (§25)
- [ ] Model routing correctly picks Sonnet / Opus / Haiku (§16)
- [ ] Prompt anatomy side panel renders for every prompt (§12)
- [ ] Improve-my-prompt widget works and charges 1 token (§13)
- [ ] All inline explainers written and reviewed (§29)
- [ ] Analytics firing for all P0 events (§27)
- [ ] Founder can see real-time cost dashboard (§26)
- [ ] Email sequence welcomes new users (§35)
- [ ] First user deploys a working Reddit Scanner via Meldar

---

## What's NOT Done Until It's Done

The old v2 backlog is deprecated. The old landing page copy is outdated. The old "Build tier as service" model is replaced.

**Before starting implementation:** the landing page needs a v3 rewrite. The copy in `docs/deliverables/landing-copy-v2.md` reflects v2, not v3. That's the first blocker to clear.
