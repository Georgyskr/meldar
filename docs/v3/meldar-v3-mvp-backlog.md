# Meldar v3 MVP Backlog

**Last updated:** 2026-04-09 (post editorial architecture rewrite + §JARVIS 3D galaxy plan)
**Replaces:** v2 angle-change MVP backlog
**Based on:** Full 2026-04-07/08/09 sessions: auth/sandbox → email flows → Build Plan engine → 6-feature wave → payment architecture audit → UX overhaul → editorial architecture rewrite → 3D workspace prototype (§JARVIS)

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

**§NEW-AUTH. Standalone auth flow for v3 — DONE (with caveats).** Shipped
in the 2026-04-07 evening wave (commit `fbab6cc`). The `users` table
schema is still intact — `email`, `password_hash`, `email_verified`,
`verify_token`, `reset_token`, `created_at`.

**What shipped:**

- `/sign-in`, `/sign-up`, `/sign-out` routes (`app/(authed)/`)
- `meldar-auth` JWT httpOnly cookie (HS256-pinned)
- Workspace route guard via `app/(authed)/workspace/layout.tsx`
  (redirects to `/sign-in?next=<path>`)
- `?next=` deep-link preservation through the sign-in flow with
  open-redirect guards (`src/shared/lib/sanitize-next-param.ts`)
- Upstash rate limits on all auth endpoints: `loginLimit`,
  `registerLimit` (5/15min), `meLimit` (120/min), all hard-fail in
  production via `mustHaveRateLimit()`
- `useRef<boolean>` in-flight gates on SignIn/SignUp/SignOut/NewProject
  forms (prevents duplicate-submit races)
- Workspace dashboard with empty state + project list + route guards
- Authorization SQL for `listUserProjects` directly tested at
  `src/server/projects/__tests__/list-user-projects.test.ts` (SQL
  shape + bound `userId` params)
- Route group split: `app/(marketing)/` owns header/footer/cookie
  consent/GA + SEO metadata; `app/(authed)/` is `noindex` with no
  marketing chrome
- `apps/web`: 539 tests passing (from 432 baseline), typecheck clean,
  biome clean

**Previously missing (all now DONE as of 2026-04-08):**

- ~~**Email verification flow via Resend**~~ — **DONE.** Non-gating nag
  banner, `emailVerified` in JWT claims.
- ~~**Password reset flow**~~ — **DONE.** Forgot + reset UI wired.
- ~~**Minimal sign-up surface on the coming-soon page**~~ — **DONE.** Landing
  page (no longer coming-soon) has email capture in EarlyAdopter section
  + all CTAs link to `/sign-up`.
- ~~**Next.js middleware for `next-url`**~~ — still a gap on hard navigations
  but low priority since most navigations are soft RSC.
- **Google OAuth** — **DONE.** CSRF state, verified_email, authProvider
  tracking, session invalidation.

**§NEW-SANDBOX. Cloudflare Sandbox worker — CODE DONE, DEPLOY PENDING.**
Code landed in the 2026-04-07 evening wave (commit `fbab6cc`). Deploy
is blocked on Cloudflare Containers Beta enrollment (requires Workers
Paid, which is blocked on Claude payments resolving).

**What shipped (`apps/sandbox-worker/`):**

- Full production worker implementing the contract in
  `packages/sandbox/src/cloudflare-provider.ts`
- 5 endpoints: `POST /api/v1/{prewarm,start,write,status,stop}` + `GET /healthz`
- HMAC-SHA256 request auth: `${timestamp}.${rawBody}` signature,
  constant-time hex compare, 5-min replay window, strict
  `/^\d{10,16}$/` timestamp regex, fail-closed on missing secret/
  headers (`src/hmac.ts`)
- Per-project Durable Object isolation via `project-${projectId}`
  with strict `/^[a-zA-Z0-9_-]{1,64}$/` projectId validation
  (prevents DO-namespace injection)
- Structured JSON error envelopes (401/400/404/409/503/500) mapped
  to orchestrator error classes; never HTML
- SDK error-message pinning tests (`mapSandboxError`) so a
  `@cloudflare/sandbox` version bump will fail CI loud instead of
  silently reclassifying errors
- Digest-pinned base image (`cloudflare/sandbox:0.8.4@sha256:12471f71...`)
- Deterministic pnpm install in Dockerfile (pinned to monorepo's
  `pnpm@10.18.3` via `npm install -g` since base image lacks corepack)
- Production `wrangler.jsonc`: `max_instances: 50`, no `assets` block,
  compat date `2026-04-01`, HMAC_SECRET secret binding
- `DEPLOY.md` runbook, `SECRETS.md` reference, `PRODUCTION-READINESS.md`
  punch-list, `scripts/verify-deployment.sh` (bash 3.2 compatible,
  contract verifier)
- 44 tests passing covering HMAC failure modes (missing/stale/future/
  tampered/non-numeric/trailing-garbage), per-project isolation,
  contract endpoint shapes, error envelope correctness

**What's still pending (out-of-session blockers):**

- **Cloudflare Containers Beta enrollment** — the worker script
  upload succeeded (4 deployed versions in history at
  `meldar-sandbox-worker.gosha-skryuchenkov.workers.dev`) but the
  container image push failed with `GET /containers/me → 401
  Unauthorized`. Resolution: Cloudflare Paid plan is active, but
  Containers Beta requires explicit enrollment via dashboard
  (Workers & Pages → Containers Beta → Get Started). Currently
  blocked on Claude payments so the user can actually upgrade /
  enroll.
- **Enable workers.dev subdomain for the worker** — dashboard shows
  "workers.dev Disabled" + "No URLs enabled". One toggle in Settings
  → Domains & Routes.
- **Push HMAC secret end-to-end** — `wrangler secret put HMAC_SECRET`
  was done on a stub worker; needs a re-run after the real deploy
  lands so the secret is bound to the versioned worker.
- **Vercel env vars** — `CF_SANDBOX_WORKER_URL` + `CF_SANDBOX_HMAC_SECRET`
  need to be set in both Production and Preview scopes, then Vercel
  redeployed. Until then, `createSandboxProviderFromEnv()` returns
  `null` and builds commit DB-only without live preview.
- **End-to-end smoke test** — create a project, submit a build, watch
  `sandbox_ready` fire in the SSE stream, iframe renders the live
  preview. Run `./scripts/verify-deployment.sh` first.

**Graceful degradation in place:** production builds currently commit
fine with no live preview. The orchestrator detects missing env vars
and runs with `deps.sandbox === undefined`; the workspace UI shows
the placeholder iframe. The `previewUrlUpdatedAt` staleness check
means stale cached URLs are never rendered.

---

## 2026-04-07 (afternoon) — §NEW-AUTH + §NEW-SANDBOX wave (what shipped)

Committed as `fbab6cc feat: deliver auth` (pushed to `main`).

### Wave structure

Four sub-waves executed with subagent-driven review between each:

| Wave | Scope | Reviewers | Outcome |
|---|---|---|---|
| **A** | §NEW-AUTH implementation (sign-in/sign-up/sign-out, workspace dashboard, route guards, rate limits) + route group split (marketing vs authed) | Frontend + Senior (+ standalone re-review after team-mode confabulations) | READY-WITH-CAVEATS, 5 P1s surfaced |
| **B** | 5 P1 fixes in `apps/web/`: sanitizer tests, `:` false-positive, `list-user-projects` params assertion, consolidate two sanitizer policies, `robots.ts` trailing slash | Frontend spec | READY-TO-COMMIT |
| **C** | 5 sandbox-worker polish fixes: Dockerfile pnpm switch (later patched for corepack absence), `mapSandboxError` pinning tests, `proxyToSandbox` guard, stricter timestamp regex, tightened exception test | Self-review (small diff) | READY-TO-COMMIT |
| **D** | 9 follow-up cleanup items from all prior reviews (NewProjectButton race, `?next=` pass-through on already-authed redirects, dead `isFinite` check, `list-user-projects` lifted to `src/server/projects/`, rename/move `format-relative.test.ts`, delete dead `public/index.html`, SignOutButton arrow wrapper, rate-limit comment, D-3 async waterfall verified as load-bearing sequential) | Frontend + Senior | READY-TO-COMMIT |

### Also rewritten in this wave

- **`apps/sandbox-worker/`** — rewrite from spike to production worker
  (pre-C). See §NEW-SANDBOX above for the full list.
- **Route group split** — `apps/web/src/app/` reorganized into
  `(marketing)/` (9 dirs renamed, owns chrome + SEO metadata) and
  `(authed)/` (3 dirs, `noindex`, no marketing chrome). Root layout
  collapsed to html/body passthrough with fonts only.
- **`format-relative.ts`** lifted from `widgets/workspace/lib/` to
  `shared/lib/` (FSD layering fix).
- **`list-user-projects.ts`** lifted from `app/(authed)/workspace/`
  to `src/server/projects/` (removes cross-route-group import smell).

### Security findings closed by this wave

- HMAC byte-perfect against client: senior reviewer walked the
  `${timestamp}.${rawBody}` signing formula byte-by-byte against
  `packages/sandbox/src/cloudflare-provider.ts:221`. Both sides use
  raw body (not parsed+restringified), hex SHA-256, constant-time
  compare, symmetric 5-min window.
- Authorization SQL for `listUserProjects` now has direct test
  coverage that asserts both the SQL shape AND the bound `userId`
  param (prevents a refactor that swapped `eq(projects.userId, userId)`
  for `eq(projects.userId, "literal")`).
- Open-redirect vectors on `?next=` tested: `//evil`, `http://`,
  `javascript:`, `\\evil`, percent-encoded `%2F%2F`, and paths with
  `:` in the path segment all get rejected or normalized to
  `/workspace`. Same-origin URLs with `:` in the query string
  (`/workspace?x=http://anything`) correctly pass through.
- Per-project Durable Object isolation via strict `/^[a-zA-Z0-9_-]{1,64}$/`
  projectId validation prevents DO-namespace injection.
- Rate limit hard-fail in production via `mustHaveRateLimit()` — if
  Upstash env vars are missing at module init in production, the
  route throws and returns 500 (rather than silently fall-open).

### Known follow-ups from this wave (not blocking commit)

Filed as wave-E candidates:

- **Email verification flow via Resend** (§NEW-AUTH gap — high priority)
- **Password reset flow** (§NEW-AUTH gap — high priority)
- **Coming-soon → /sign-up link wiring**
- **Next.js middleware** for `next-url` on hard navigations
- **`mapSandboxError` typed SDK errors** (pinning tests are sufficient for now)
- **`entities/` vs `server/` convention** clarification: `src/server/projects/list-user-projects.ts` exports both a row type AND a query function. Establish rule: `entities/` owns pure types/Zod, `server/` owns data access.
- **Lift sibling query modules out of route groups**:
  `apps/web/src/app/(marketing)/xray/[id]/get-xray.ts` and
  `apps/web/src/app/(marketing)/start/[id]/get-session.ts` (same
  anti-pattern D-6 fixed for `list-user-projects`).
- **Add `since: Date` to `StorageProvider.getActiveStreamingBuild`** —
  would let the `[projectId]/page.tsx` reaper+reader pair parallelize
  via `Promise.all` instead of sequencing. Contract-test fallout in
  `packages/storage/src/__tests__/provider-contract.ts:837`.
- **HMAC regex tightening** (`/^\d{10,16}$/` → `/^\d{13}$/` for
  ms-precision Unix time) — expresses intent, not exploitable today.
- **Delete justification comments** on `meLimit`, `analyzeLimit`,
  `adaptiveLimit` in `src/server/lib/rate-limit.ts` as a batch if
  the zero-comment bar tightens.
- **`LastBuildRelativeTime` widget** has no direct test (was
  previously hidden behind the `format-relative` test file that we
  renamed+moved). If the widget has logic beyond calling
  `formatRelative`, it needs its own test.

### Cloudflare deploy state (out-of-session blockers)

- ✅ `wrangler login` (Gosha.skryuchenkov@gmail.com account `91b1226f4a34498da8e2c543b0aa0088`)
- ✅ HMAC secret generated + stored in 1Password (43-char base64url)
- ✅ `wrangler secret put HMAC_SECRET` uploaded to stub worker
- ✅ Worker script deploy (4 versions in history: `fa825c9d`, `2c27f5fb`, `26daac74`, `221f820b`)
- ✅ Docker image builds cleanly locally (verified via `docker build --platform linux/amd64`)
- ⏸ **Cloudflare Containers Beta enrollment** — blocked on Claude payments → Cloudflare upgrade
- ⏸ **workers.dev subdomain enable** — toggle in worker Settings → Domains & Routes
- ⏸ `wrangler deploy` end-to-end (will succeed once Containers Beta is enrolled)
- ⏸ `./scripts/verify-deployment.sh` against deployed URL
- ⏸ Vercel env vars: `CF_SANDBOX_WORKER_URL` + `CF_SANDBOX_HMAC_SECRET` (prod + preview)
- ⏸ Browser smoke test: create project → submit build → watch iframe render

---

## 2026-04-07 (late evening) — Tech debt sweep (17 items)

Dispatched 4 parallel agents (DB optimizer, backend architect, frontend
developer, senior developer) to close all review-surfaced tech debt.

### Database (migration `0005_token_indexes.sql`)
- Partial indexes on `users.verify_token` and `users.reset_token`
  (`WHERE NOT NULL`) — previously sequential scans
- Dropped redundant `idx_users_email` (UNIQUE constraint already creates
  an index)
- Dropped redundant `idx_kanban_cards_project` (prefix of composite
  `idx_kanban_cards_project_parent_position`)

### Auth
- `emailVerified` encoded in JWT claims — eliminates a DB query per
  workspace page load. Legacy tokens without the claim default to
  `false` via `?? false`. Login reads `emailVerified` from DB row;
  verify-email refreshes the JWT cookie on success.

### API hardening
- `componentType` validated against `COMPONENT_VOCABULARY` enum (was
  accepting any string from Haiku)
- `ask-question` response validated with fallback questions on failure
- All Haiku calls get `request.signal` for abort + explicit timeout
  (30s for questions, 60s for plan generation)
- `verify-email` endpoint rate-limited (reuses `resetLimit`, 3/hr/IP)
- `verify-email` redirect changed from `/` to `/workspace`

### Build Plan
- Multi-card sequential build queue — BuildButton now processes ALL
  ready subtasks in dependency order (was single-card only). Stops
  on first failure. Shared AbortController across the queue.

### Frontend
- `EmailVerificationBanner` setTimeout cleanup via `useRef` + `useEffect`
- `PlanReviewPrompt` buttons get `type="button"` (prevent form submit)
- `WhatJustHappenedSlot` imports from barrel (FSD compliance)
- `OnboardingChat` gets `aria-live="polite"` for screen readers
- `.env.example` created documenting all 17 env vars

### Confirmed safe (no fix needed)
- `createKanbanCards` batch positions start at 0 — confirmed zero
  callers outside the storage layer itself; the generate-plan route
  uses its own insert logic with proper position offset.

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

### Test baseline (verified 2026-04-08, post UX overhaul + 2-round validation)

| Package | Test files | Tests passing | Notes |
|---|---|---|---|
| `@meldar/web` | 59 | 730 | + 1 file / 3 tests skipped; was 699 post-payment, 432 pre-auth |
| `@meldar/sandbox-worker` | 1 | 44 | HMAC failure modes + contract endpoints + SDK error-message pinning |
| `@meldar/storage` | 4 | 93 | InMemory + Postgres provider contract + R2 blob + kanban CRUD |
| `@meldar/sandbox` | 2 | 80 | Safety helpers + Cloudflare provider HMAC |
| `@meldar/tokens` | 3 | 48 | Pricing + ledger Lua + game economy (CTE atomic debit/credit) |
| `@meldar/orchestrator` | 4 | 507 | Engine + SSE + model routing + template plans (9 templates, 252+ tests) |
| `@meldar/test-utils` | 4 | 12 | Mock factory smoke tests |
| **Total** | **77** | **1,514** | All green; 2-round validation passed post-UX-overhaul |

### What's wired end-to-end (build flow)

1. `apps/web/src/app/api/workspace/[projectId]/build/route.ts` — auth check → `buildOrchestratorDeps()` → `orchestrateBuild()` async generator → `sseStreamFromGenerator()` → SSE response
2. `packages/orchestrator/src/engine.ts` — Anthropic Sonnet tool-calling loop with `write_file` tool, debits via `TokenLedger`, persists via `ProjectStorage`, mirrors to `SandboxProvider` (optional)
3. `packages/storage/src/postgres-provider.ts` — atomic `beginBuild → recordFile → finalizeBuild` against `projects`, `builds`, `build_files`, `project_files` (deferrable FK constraints, content-addressed via `blob_sha256`)
4. `packages/storage/src/r2-blob.ts` — content-addressed PUT/GET via aws4fetch (no AWS SDK on serverless)
5. `apps/web/src/features/workspace-build/BuildPanel.tsx` — client consumer, `consumeSseStream` from `@meldar/orchestrator/sse`, AbortController cancellation

### What is NOT yet wired (gaps to be aware of, post §NEW-AUTH + §NEW-SANDBOX wave)

- **Email verification + password reset** — §NEW-AUTH caveat. Sign-up
  auto-verifies (no email gate); password reset has no flow. **HIGH
  priority for founding-member launch.**
- **Cloudflare Sandbox worker deploy** — §NEW-SANDBOX caveat. Code +
  tests + runbook all landed, but `wrangler deploy` is blocked on
  Containers Beta enrollment (blocked on Claude payments → Cloudflare
  Paid upgrade). Production builds commit successfully and fall
  through to placeholder iframe via graceful degradation.
- **Project creation flow** — ~~there's no UI to create a new project~~
  **CLOSED** by the 2026-04-07 cleanup wave. `/api/workspace/projects`
  POST exists with rate-limit + Zod validation + prompt-injection
  hardening, triggered from the workspace create-project button with
  proper error surfacing.
- **Sandbox preview URL displayed in workspace** — ~~not displayed~~
  **CLOSED in the UI layer** (`PreviewPane` + `WorkspaceBuildProvider`
  context + `previewUrlUpdatedAt` 2-minute staleness check); waiting
  on §NEW-SANDBOX for the actual worker.
- **Kanban UI** — ~~the orchestrator accepts a `kanbanCardId` field but
  no UI surface produces or consumes them~~ **DONE** (commit `39f6ba5`).
  The Build Plan engine is fully wired: `kanban_cards` table with
  milestone→subtask hierarchy, 5-question onboarding via Haiku,
  KanbanBoard with MilestoneRow/SubtaskRow, card state machine
  enforced server-side, BuildButton wired to the existing build API
  with SSE streaming. Orchestrator events carry `kanbanCardId` for
  card-level state tracking. Card states persist to DB on
  committed/failed.
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

## §JARVIS — 3D Project Galaxy & Immersive Workspace (P0 sub-plan)

**Added:** 2026-04-09 — based on design-lab prototype + 12-question product interview
**Depends on:** §7 (WorkspaceShell), kanban CRUD, build pipeline, templates
**New deps:** `@react-three/fiber`, `@react-three/drei`, `three` (already installed)

### Vision

Replace the flat kanban+chat+preview workspace with an immersive 3D
experience. The user's project plan is a **constellation of glowing
nodes** they can orbit, zoom, and interact with. The live app preview
is ghosted behind (35% opacity) — always visible, never blocking.
Chat is a slide-in panel. Skills are hidden intelligence that Meldar
uses on behalf of the user, teaching by example.

**Core metaphor:** "Melding" — the project emerges from particles
coalescing into a constellation. The brand name IS the creation
animation.

### Decisions locked (from interview)

| Decision | Answer |
|---|---|
| Interaction model | Progressive handoff: AI does everything, user can tweak individual task results or add skills when ready. Learn by watching then doing. |
| Entry point | "Melding" animation — particles coalesce into constellation. Masks 15s API call. Two variants to prototype: particles coalescing vs. literal melding (two forms merge). |
| Task zoom-in | Iterate between panel slide-in (A) and camera zoom+morph (B). Prototype both. |
| Learning hooks | Hidden intelligence. Meldar executes skills (design-lab, UX review, etc.) and explains what it did. Routes curious users to skills.sh and marketing mail for deeper learning. |
| Templates | Both paths: templates with thumbnails (default), freeform describe-your-own below. Both trigger the melding animation. |
| Preview layer | Ghost background (35% opacity). Fades more when task selected. Current prototype approach confirmed. |
| Skill library | Hidden. No visible "Skills" panel. Contextual surfacing only — Meldar suggests when relevant. External routing to skills.sh for research. |
| Retention loop | Living project (Meldar suggests improvements after completion) + community showcase. Users keep improving, not just starting new projects. |
| Mobile | Simplified 2D fallback. Desktop is the 3D galaxy. Mobile is clean card list. |
| MVP scope | Full Jarvis for founding members. Galaxy + melding + chat + skill routing + learning hints + achievement toasts. |
| Risk mitigation | Performance (varied hardware) and user confusion (non-technical). Address with: WebGL detection + 2D fallback, progressive disclosure, contextual help at every node. |

### Phased delivery

#### Phase J-1: 3D Foundation (P0, ~3 days)

- [ ] **J-1.1** `ProjectGalaxy` component — production-ready React Three Fiber canvas
  - Milestone clusters as ring+node groups
  - Task nodes: done=green, ready=pulsing peach, active=mauve, locked=dim
  - Connection lines (bezier curves between milestones)
  - OrbitControls (drag orbit, scroll zoom, pinch on touch)
  - Ambient particles (subtle mauve dust motes)
  - Transparent canvas (`alpha: true`) for ghost preview behind
  - Wire to real `KanbanCard[]` data (replace mock fixtures)
- [ ] **J-1.2** WebGL detection + fallback
  - `isWebGLAvailable()` check at mount time
  - If false: render current 2D `FlowGraph` instead
  - If mobile (`navigator.maxTouchPoints > 0` + `screen.width < 1024`): render 2D
  - Reduce particle count on low-DPR screens (`dpr < 1.5` → 30 particles)
- [ ] **J-1.3** Ghost preview layer
  - Preview iframe at `z-index: 0`, opacity controlled by selection state
  - Semi-transparent veil between preview and 3D canvas
  - Opacity: 35% default, 15% when task selected, 50% when chat open
- [ ] **J-1.4** Replace `LeftPane` + `PreviewPane` split with galaxy view
  - `WorkspaceShell` renders `ProjectGalaxy` as the main view
  - Remove the 42%/58% split. Galaxy is 100% of the workspace area.
  - Keep `WorkspaceTopBar` and `WorkspaceBottomBar` as HUD chrome

#### Phase J-2: Melding Animation (P0, ~2 days)

- [ ] **J-2.1** Prototype two emergence variants:
  - **Variant P (Particles):** Scattered particles drift, accelerate, collide, form nodes. Energy burst at each collision. Connections snap into place. Camera pulls back to reveal.
  - **Variant M (Melding):** Two abstract forms approach from left/right. Overlap. Merge. The merged shape splits into constellation nodes. "Meldar is melding your project."
- [ ] **J-2.2** Status text overlay during 15s API call
  - Sequence: "Understanding your idea..." → "Mapping the milestones..." → "Preparing your workspace..." → [melding animation] → Galaxy visible
  - Text uses editorial typography (`tertiary.sm`, peach on cream)
- [ ] **J-2.3** Wire to template-apply + plan-generate API calls
  - Template path: `applyTemplate()` → melding → galaxy
  - Freeform path: `generatePlan()` (Haiku 5-question onboarding replaced by single-prompt plan generation) → melding → galaxy
- [ ] **J-2.4** Template thumbnails
  - Generate generic thumbnails for all templates (Leonardo API, abstract/editorial style)
  - Replace with custom thumbnails for top 3 "working horse" templates over time
  - Store in `public/brand/templates/` or R2

#### Phase J-3: Task Interaction (P0, ~3 days)

- [ ] **J-3.1** Click-to-select — panel slide-in (Version A)
  - Click a node → camera eases toward it
  - Detail panel slides in from left (320px, frosted glass)
  - Shows: task title, what you'll learn, status, "Make this" button, mini chat
  - Click background or press Escape → deselect, panel slides out
- [ ] **J-3.2** Click-to-select — camera zoom+morph (Version B)
  - Click a node → camera flies INTO the node
  - Other nodes fade to 10% opacity
  - Selected node expands: preview zooms to full + chat opens
  - "Back to galaxy" button returns to orbit view
- [ ] **J-3.3** A/B test both with founding members, pick the winner
- [ ] **J-3.4** Build execution from galaxy
  - "Make this" button triggers the existing build pipeline
  - During build: node pulses with progress animation
  - On complete: node transitions from peach to green with celebration particle burst
  - SSE events from build pipeline animate the node in real-time

#### Phase J-4: Chat Integration (P0, ~2 days)

- [ ] **J-4.1** Chat panel in galaxy view
  - Slide-in panel (right side, 360px) with the existing `BuildPanel` + prompt textarea
  - Frosted glass over the galaxy
  - Chat messages stream in real-time (existing SSE infrastructure)
  - "What should Meldar make?" prompt → scoped to selected task or general
- [ ] **J-4.2** Contextual chat scoping
  - If a task is selected: chat is pre-scoped to that task's context
  - If no task selected: chat is project-wide
  - Chat can trigger builds, ask questions, request tweaks
- [ ] **J-4.3** Post-build explanation
  - After a task completes, Meldar explains what it did
  - "I created a weight chart using Chart.js. It reads data from your form and displays a line graph."
  - This IS the learning moment. Hidden skill usage is revealed here.

#### Phase J-5: Skill Routing & Learning (P1, ~3 days)

- [ ] **J-5.1** Skill router in orchestrator
  - Orchestrator detects when a task benefits from a skill (design-lab, UX review, etc.)
  - Executes the skill transparently, includes explanation in chat
  - "I ran a UX review on your form and made 3 improvements: [list]"
- [ ] **J-5.2** "Want to learn how?" prompts
  - After skill execution, optional expandable: "Meldar used a UX review skill. Want to learn how to do this yourself?"
  - Links to skills.sh for the curious
  - Tracked in analytics: which skills generate the most curiosity
- [ ] **J-5.3** Achievement toasts
  - On task completion: "You just learned: Data Visualization" toast
  - Skills accumulate on user profile
  - Not gamified aggressively — editorial, warm, informative

#### Phase J-6: Living Projects & Retention (P1, ~2 days)

- [ ] **J-6.1** Post-completion suggestions
  - When all nodes are green: Meldar suggests improvements
  - "Your tracker works! Want to add a sharing feature? Or a weekly email summary?"
  - Each suggestion spawns a new milestone cluster in the galaxy
  - The galaxy GROWS — the project is never "done"
- [ ] **J-6.2** Community showcase
  - Gallery page: founding member projects with screenshots
  - "See what others made this week"
  - Social proof + inspiration for Day 2 return
- [ ] **J-6.3** Weekly "What you could improve" email
  - Resend-powered email with 1-2 improvement suggestions per active project
  - Deep link back to workspace with the suggestion pre-loaded

### Performance budget

| Metric | Target | Fallback |
|---|---|---|
| Galaxy first paint | < 2s | 2D flow graph if > 3s |
| Interaction latency (orbit/zoom) | < 16ms (60fps) | Reduce particles, disable fog |
| Memory usage | < 100MB GPU | Limit to 50 nodes, disable particles |
| WebGL detection | < 50ms | `isWebGLAvailable()` from drei |
| Mobile detection | Immediate | `matchMedia('(pointer: coarse)')` |
| Bundle size (Three.js) | < 200KB gzipped | Tree-shake via `@react-three/fiber` |

### Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low-end devices can't run 3D | Medium | High | WebGL detection → 2D fallback. Always works. |
| Users confused by 3D navigation | Medium | High | Auto-rotate when idle. "Click a node" hint. Progressive disclosure. Tutorial overlay on first visit. |
| Three.js bundle bloats page load | Low | Medium | Dynamic import (`next/dynamic` with `ssr: false`). Only loads on workspace route. |
| Melding animation feels gimmicky | Low | Medium | A/B test particles vs. melding literal. Kill if metrics don't improve retention. |
| 3D conflicts with editorial design | Low | Low | Same color palette (mauve, peach, cream). Same typography via HTML overlays. The galaxy IS the Swiss grid, just spatial. |

### Files to create/modify

**New files:**
- `features/project-galaxy/ProjectGalaxy.tsx` — main 3D component (from design-lab prototype)
- `features/project-galaxy/MeldingAnimation.tsx` — creation animation
- `features/project-galaxy/useWebGLFallback.ts` — detection + fallback hook
- `features/project-galaxy/index.ts` — barrel export

**Modified files:**
- `widgets/workspace/WorkspaceShell.tsx` — replace split layout with galaxy
- `widgets/workspace/LeftPane.tsx` — refactor into galaxy slide-in panels
- `widgets/workspace/PreviewPane.tsx` — becomes ghost background layer
- `widgets/workspace/FirstTimeWelcome.tsx` — template picker triggers melding
- `features/workspace-build/BuildPanel.tsx` — becomes chat slide-in panel

---

## 2026-04-08/09 — Editorial Architecture rewrite + §JARVIS planning (what shipped)

### Editorial Architecture design language — **DONE**

Full visual rewrite of the landing page + workspace chrome. "Swiss editorial" design language: rigid grids, 1px/2px ink rules, numbered Nº markers, peach as pinpoint accent, no gradient washes.

**Typography system rebuilt:**
- `styled.p/h1-h6/span/em/strong` banned project-wide (enforced in CLAUDE.md)
- `<Text>` and `<Heading>` primitives from `@/shared/ui/typography.tsx`
- Semantic scale: `primary` (titles), `secondary` (body), `tertiary` (labels), `display`, `italic`, `button`
- Legacy `heading.hero/display/section`, `body.lead/base`, `label.upper` tokens removed
- 82 files migrated via automated codemod + manual cleanup

**Landing page (11 sections rewritten):**
- All sections numbered Nº 001–011 in render order, footer colophon Nº 012
- `EditorialEyebrow` + `EditorialPlate` shared components
- 8 Leonardo API illustrations (editorial photography style, 3 regenerated for less AI look)
- Hero section: `100dvh`, no scroll needed to see full hero
- All banned words purged: "build/built" → "make/made" everywhere
- JSON-LD schemas updated: tier names (Time X-Ray / Starter / Concierge), descriptions, pricing

**Workspace chrome rewritten:**
- Dashboard: `ProjectCard` with Nº numbering, ink progress bars, editorial borders
- `StreakBadge`: sharp borders, flame flicker animation
- `ContinueBanner`, `FirstTimeWelcome`, `NewProjectButton`: editorial treatment
- `WorkspaceTopBar`, `StepIndicator`, `EmailVerificationBanner`: ink rules, no gradients
- `TemplatePreviewDrawer`: 2px drawer border, editorial section headers
- All user-facing "build/built" text replaced with "make/made/activity"

**New dependencies:**
- `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three` — for §JARVIS prototype

### §JARVIS sub-plan added to backlog

See §JARVIS section above for full 6-phase delivery plan.

---

## 2026-04-09 — Phase 0 (Money Guardrails) + Phase 0.8 (runBuildForUser) + Phase 1 (§JARVIS UI refactor)

Three sequential phases landed in one wave after running architecture +
security + AI-optimization reviews on the pre-build diff. Pre-launch
hard cutover — no feature flags, no migration shims.

### Phase 0 — Money guardrails (P0, **DONE**)

Prevents a runaway agent or abusive user from draining the Anthropic
budget. Everything funnels through one wrapper with triple ceilings +
full audit log + email alerts.

**Triple spend ceiling** (`apps/web/src/server/lib/spend-ceiling.ts`):
- [x] Global daily ceiling: €30/day across all users (Redis
  `meldar:global:spend:YYYY-MM-DD`)
- [x] Per-user hourly ceiling: €0.80/hour (Redis
  `meldar:user:spend:${userId}:YYYY-MM-DD-HH`)
- [x] Per-user daily ceiling: €2/day (Redis
  `meldar:user:spend-day:${userId}:YYYY-MM-DD`)
- [x] `ANTHROPIC_PAUSED=1` kill switch env var (trips all ceilings open)
- [x] `checkAllSpendCeilings` + `recordGlobalSpend` /
  `recordUserHourlySpend` / `recordUserDailySpend` helpers
- [x] Unconditional `redis.expire` after `incrby` (closes R3 TTL race)

**Guarded Anthropic wrapper**
(`apps/web/src/server/lib/guarded-anthropic.ts`):
- [x] `guardedAnthropicCall()` / `guardedAnthropicCallOrThrow()` — every
  Anthropic call in the codebase goes through this
- [x] `GuardedCallBlockedError` with reason `paused | global_ceiling |
  user_hourly | user_daily`
- [x] Single choke point for ceilings + spend recording + audit log

**AI call audit log** (`packages/db/migrations/0011_ai_call_log.sql`):
- [x] `ai_call_log` table with 12 `AiCallKind` variants: `build | chat |
  improve_prompt | ask_question | generate_plan | discovery_ocr |
  discovery_extract_topics | discovery_extract_text |
  discovery_extract_screenshot | discovery_analyze | discovery_adaptive
  | discovery_insights`
- [x] Status: `ok | error | truncated | aborted | refused`
- [x] Indexes on `(user_id, created_at)`, `(kind, created_at)`,
  `(status, created_at)`
- [x] `recordAiCall()` fire-and-forget helper with try/catch
  (`apps/web/src/server/lib/ai-call-log.ts`)

**All call sites wired through the guard:**
- [x] Build orchestrator (`packages/orchestrator/src/engine.ts`) with
  `GlobalSpendGuard` + `AiCallLogger` dependency injection
- [x] Improve-prompt, ask-question, generate-plan routes
- [x] Discovery: `analyze.ts` (highest cost leak — Sonnet + 4000
  max_tokens), `extract-screenshot.ts`, `extract-topics.ts` (2 calls),
  `ocr.ts`, `adaptive.ts`, `extract-from-text.ts`
- [x] All routes made fail-closed (`critical=true` on rate limit)

**Prompt caching (50-80% cost reduction on repeat builds):**
- [x] `buildUserMessage` split into stable `buildProjectFilesBlock`
  (cacheable) + volatile `buildUserPromptBlock` tail
- [x] `cache_control: { type: 'ephemeral' }` on system prompt + project
  files block
- [x] `usageToCents(model, usage)` in `packages/tokens/src/pricing.ts`
  tracks cache reads (10%) + writes (125%) separately
- [x] Tests verify cached build is significantly cheaper than cold

**Founder alert email + cron:**
- [x] `sendFounderAlertEmail({level, subjectDetail, bodyHtml})` in
  `send-email.ts`, default recipient `gosha.skryuchenkov@gmail.com`
- [x] `/api/cron/spend-alert` cron, warning at €20/day, panic at
  €50/hour. **Schedule: `0 9 * * *` (daily at 09:00 UTC)** — Hobby
  plan only allows daily crons; upgrade to Pro to restore `*/5 * * * *`
  for near-real-time panic alerts. The hour-window panic check still
  runs but only catches bursts in the hour before the cron fires.
  Ceilings themselves are enforced synchronously on every request, so
  this cron is purely for email notification.
- [x] Redis NX dedup locks: 1 warning/day, 1 panic/15min
- [x] `FOUNDER_ALERT_EMAIL` env var override

**New migrations:**
- [x] `0010_add_chat_reason.sql` — adds `'chat'` to
  `token_txn_reason_valid` check constraint
- [x] `0011_ai_call_log.sql` — creates `ai_call_log` table

### Phase 0.8 — runBuildForUser (single choke point, **DONE**)

Consolidated build authorization + token debit + refund logic into one
function. Closes C1 (cross-user card lookup), C3 (race in debit), C4
(missing refund on orchestration failure), M4 (inconsistent error
handling) from the chat security spec in one place. Chat (Phase 3) will
call the same function.

- [x] `apps/web/src/server/build/run-build.ts` —
  `runBuildForUser({projectId, userId, prompt, kanbanCardId, signal,
  source})`
- [x] Joined card-project-user lookup (single query, no TOCTOU)
- [x] Atomic `debitTokens` before `orchestrateBuild`
- [x] `withTokenRefund` wrapper refunds on `!committed` outcome
- [x] `sseStreamFromGenerator` helper moved here from route
- [x] Build route reduced to thin wrapper: auth → rate limit → body
  validation → delegate to `runBuildForUser`
  (`apps/web/src/app/api/workspace/[projectId]/build/route.ts`)

### Phase 1 — §JARVIS UI refactor (**DONE**)

Workspace UI rewritten around hybrid 2D/3D architecture. Glass-card
aesthetic (Apple Vision Pro-inspired) in the light theme — no
cosmic/galaxy styling, just glass. 2D plan view and 3D spatial view
coexist: 3D is the default when WebGL + desktop + no reduced motion; 2D
is the fallback and the explicit toggle for users who prefer it.

**`features/galaxy/` — new slice** (name kept for internal identifier,
user-facing language is "workspace"):
- [x] `model/types.ts` — `GalaxyTask`, `GalaxyMilestone`,
  `GalaxyTaskStatus`
- [x] `model/kanban-to-galaxy.ts` — pure converter from `KanbanCard[]`.
  `failed | needs_rework` → `'failed'` (frontend review fix, was
  incorrectly `'ready'`)
- [x] `lib/use-webgl-fallback.ts` — detects WebGL support, mobile
  (maxTouchPoints + coarse pointer + <1024px), reduced motion
- [x] `ui/GalaxyCanvas.tsx` — R3F `<Canvas>`, hybrid nodes, `<color
  attach="background" args={[C.surface]} />` (fixes WebGL black clear
  on `alpha: false`)
- [x] `ui/GalaxyFallback.tsx` — 2D plan view, dual-mode (controlled via
  props or uncontrolled). NaN fix: `pct = total > 0 ? Math.round((done
  / total) * 100) : 0`
- [x] `ui/GalaxyView.tsx` — `dynamic(import, { ssr: false })` loader
  for `GalaxyCanvas`, wraps in `GalaxyErrorBoundary` with
  `GalaxyFallback` as error fallback
- [x] `ui/GalaxyErrorBoundary.tsx` — class component with strict
  `override` modifiers
- [x] `ui/PreviewThumbnail.tsx` — floating glass thumbnail, `sandbox`
  dropped `allow-same-origin`
- [x] `index.ts` barrel

**`features/workspace/` — renamed from `workspace-build`:**
- [x] Reducer extended with UI actions: `selectTask`, `clearSelection`,
  `openChat`, `closeChat`
- [x] `WorkspaceMode` discriminated union: `plan | taskFocus | building
  | review`
- [x] `deriveWorkspaceMode(state)` pure function — mode is derived, not
  stored (eliminates mode/cards desync)
- [x] `BuildReceipt` gained `cardId` (fixes title collision in mode
  derivation)
- [x] `state.selectedTaskId` + `state.chatOpen` in reducer state
- [x] Tests updated for new `BuildReceipt` shape

**`widgets/workspace/` — simplified:**
- [x] `WorkspaceShell.tsx` rewritten around `GalaxyView`.
  `GalaxySurface` memoizes `kanbanToGalaxy(cards)` and derives
  `fallbackMode` from reducer mode
- [x] `triggerBuildForTask` with response status check + error logging
- [x] `WorkspaceBottomBar.tsx` — `BuildButton`, `BuildComposer`,
  `WhatJustHappenedSlot`, `LastBuildRelativeTime` all deleted
- [x] `[projectId]/page.tsx` — dropped unused `currentFiles` +
  `activeBuildId`

**Deleted (hard cutover, no users yet):**
- [x] `apps/web/src/app/design-lab/` (14 files + page + feedback
  overlay)
- [x] `apps/web/src/features/project-galaxy/` (old slice)
- [x] `LeftPane.tsx`, `PreviewPane.tsx`, `WhatJustHappenedSlot.tsx`,
  `LastBuildRelativeTime.tsx`
- [x] `BuildPanel.tsx`, `BuildComposer.tsx`, `BuildLog.tsx`,
  `build-log-format.ts`, `BuildLog.test.ts`

**Panda textStyles added:** `label.lg`, `label.md`, `label.sm`,
`tertiary.xs`

**Specs saved:**
- [x] `docs/v3/chat-security-spec.md` — 23-step chat pipeline, C1-C4,
  H1-H5, M1-M5 findings (server-side card resolution, no Claude
  tool-use for build triggering)
- [x] `docs/v3/jarvis-workspace-spec.md` — full workspace layout spec,
  5 modes, mode transitions, language changes (milestone → chapter,
  subtask → step, token → energy)
- [x] `CLAUDE.md` — new "Product Stage Rules" section: pre-launch, no
  feature flags, hard cutovers, clean slate beats migration

### Still pending from this wave

- [ ] Phase 2 — Chat MVP (option C with prompt enhancement, real chat).
  Wires into `runBuildForUser`. Tool-use disabled for build
  triggering — builds are server-side card resolution only, per
  chat-security-spec.md
- [ ] Phase 3 — orchestrator cost log + spend dashboard surfaces in
  founder-only UI
- [ ] Run `0010` + `0011` migrations against Neon before deploy

---

## P0 — Positioning & Narrative

### 1. Update landing page to v3 positioning — **DONE** (2026-04-08/09 editorial rewrite)

~~New hero copy, tiers, FAQ, JSON-LD.~~

**What shipped:** Complete editorial architecture rewrite. 11 sections with Swiss
design language, numbered markers, Leonardo illustrations. Tier names: Time X-Ray
(free) / Starter (EUR 9.99/mo) / Concierge (EUR 79 one-time). All JSON-LD updated.
FAQ rewritten (9 questions, banned words removed). Hero is 100dvh.

**Pricing note:** Tier pricing (EUR 9.99/mo Starter vs. original EUR 19/mo Builder)
is TO BE REVISED. Landing page currently shows EUR 9.99. Stripe integration not
yet wired. Reconcile pricing before billing goes live.

### 2. Rename and rebrand learning moments — **MOSTLY DONE**
- ~~No more "lessons," "courses," "modules," "tutorials"~~
- "build/built/builder" → "make/made/concierge" done across all landing + workspace surfaces
- "Steps," "milestones" terminology in active use
- Banned words enforced in CLAUDE.md: build, builder, tutorial, course, lesson, no-code
- **Remaining:** email templates may still have stale copy (check Resend templates)

### 3. Craft the first milestone vocabulary
- "Ship #1," "Prompt Fluent," "Full Stack," "AI Certified Builder"
- Each milestone has: visual badge, unlock conditions, shareable certificate

---

## P0 — Gateway (Discovery Flow) — **NEEDS REFRAMING**

> **Status (2026-04-09):** The v2 discovery flow (`/quiz`, `/start`, `/xray`,
> `features/discovery-flow`, `features/founding-program`) was **ripped** in the
> 2026-04-07 cleanup wave. All routes, APIs, and feature modules are deleted.
> The landing page is now a full editorial experience with email capture via
> `FoundingEmailCapture` in the EarlyAdopter section. The entry funnel is:
> landing page → `/sign-up` → workspace → pick template or describe idea.
>
> §4-6 below are **OBSOLETE as written**. The gateway is now the landing page
> itself + the FirstTimeWelcome in the workspace. §JARVIS's "melding animation"
> replaces the old roadmap preview concept.

### 4. Free tier entry — **REFRAMED**
- ~~Digital Footprint Scan + recommendation~~ (code ripped)
- **New entry:** Landing page (editorial, 11 sections) → email capture or direct sign-up
- Time X-Ray concept lives on as the free tier NAME but the scan flow is gone
- **If we want a discovery flow again:** rebuild from scratch, not from v2 code

### 5. Onboarding style selector — **SUPERSEDED by §JARVIS**
- ~~One-question upfront: "How do you like to learn?"~~
- §JARVIS replaces this with **adaptive progressive handoff**: the UI detects
  user behavior and adjusts. No explicit style selector needed.

### 6. Visible roadmap preview — **SUPERSEDED by §JARVIS**
- ~~Roadmap with locked steps and upgrade CTA~~
- §JARVIS's 3D galaxy IS the roadmap. The "melding animation" reveals it.
  Locked nodes are dim in the constellation. Upgrade triggers TBD.

---

## P0 — Guided Workspace (the heart of the MVP)

### 7. Split-screen workspace shell — **DONE, SUPERSEDED by §JARVIS**
~~Left/right split with chat+kanban left, preview right.~~

**What shipped:** `WorkspaceShell` with `LeftPane` (flow graph + kanban + build
panel) and `PreviewPane` (iframe). Top/bottom bars. Editorial treatment applied
(2026-04-09). **This layout is being replaced by §JARVIS** — the 3D galaxy with
ghost preview background replaces the flat split-screen. The current shell will
serve as the 2D fallback for mobile and WebGL-unsupported devices.

### 8. Step state machine — **DONE** (commit `39f6ba5`)
~~Each of the 8 roadmap steps has states:~~

**What shipped:** Two-level state model. Subtask states (persisted):
`draft → ready → queued → building → built / failed → needs_rework → ready`.
Milestone states (derived, never persisted): `not_started | in_progress |
complete | needs_attention` — computed via pure `deriveMilestoneState()`
function from subtask states. State transitions enforced server-side via
`canTransition()` check on the PATCH endpoint. 9 unit tests on the state
derivation function.

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

### 12. Prompt anatomy side panel — **DONE**
~~When user opens the prompt builder, a side panel shows...~~

**What shipped:** Client-side regex parser (`features/kanban/lib/parse-prompt-anatomy.ts`)
detects Role/Context/Task/Constraints/Format segments in card descriptions.
Expandable section in `CardEditorModal` with score 0-5, present/missing
indicators, matched text snippets. Zero API cost (`useMemo`). 10 tests.

### 13. Prompt improvement widget — **DONE**
~~User clicks "Improve my prompt" button:~~
- ~~Costs 1 token~~
**What shipped:** Haiku-powered rewrite with defensive system prompt (ignores
embedded instructions, no code/URL generation), output length cap 2× input,
Zod validation. Inline Original/Improved view with Accept/Keep buttons in
`CardEditorModal`. Balance check before API call, debit after success (user
only pays for value received). 1 token per successful improvement. 9 tests.

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

### 16. Model routing logic — **DONE** (Haiku/Sonnet, no Opus)
~~Decision tree: ...~~

**What shipped:** Static lookup table in `packages/orchestrator/src/model-routing.ts`.
Simple components (chart, table, form, filter, export, data-input, page,
search, notification, file-upload, import) route to Haiku (~29% cost savings
per session). Complex components (auth, api-connector, dashboard, scheduler,
email-sender, layout) stay on Sonnet. Server-side only — client `model` field
stripped by Zod. Card `taskType` queried from DB in the build route. **No Opus**
— exceeds daily ceiling, needs per-tier ceilings. 21 tests.

### 17. Token accounting system — **DONE** (both ceiling + game economy)
~~Track per-user: ...~~

**What shipped (two-layer architecture):**

**Layer 1 — Daily EUR ceiling (Redis, unchanged):**
`UpstashTokenLedger` with atomic Lua script, EUR 2/day per user, fail-closed.

**Layer 2 — Game economy (Postgres, new):**
- `users.token_balance` with `CHECK (token_balance >= 0)` constraint
- `token_transactions` table for full audit trail
- CTE-based atomic `debitTokens`/`creditTokens` (single SQL statement per
  operation, INSERT conditional on UPDATE success)
- Signup bonus: 200 tokens, recorded in audit trail
- Daily bonus: 15 tokens/day via Redis SETNX (fail-closed, split-brain
  recovery on credit failure)
- Build debit: pre-build, refund on pre-file failures only (post-API
  failures are non-refundable to prevent free-API-call attacks)
- `TokenBalancePill` in workspace top bar (green/amber/red thresholds)
- `withTokenRefund` generator wrapper with `try/finally` (covers client
  abort, errors, natural completion)
- `lifetimeTokensEarned` not incremented on refunds
- Tiered rate-limit: auth routes fail-closed, non-auth fail-open, 503 vs
  429 distinguished via `serviceError` flag

**What's deferred:**
- Monthly allowance reset (Sprint 2)
- Referral bonuses (Sprint 2, needs referral tracking)
- Stripe token-meter integration (requires Private Preview access for
  Billing for LLM Tokens — requested)
- System-wide daily spend cap (Sprint 2, ~EUR 500/day threshold)
- Opus support (needs per-tier ceilings)

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

### 20. Kanban task execution engine — **DONE** (commit `39f6ba5`)
~~Each "build a feature" request becomes a kanban card.~~

**What shipped:** General-purpose Build Plan engine. User describes intent →
5 Haiku-powered clarifying questions → Haiku generates milestone plan with
subtasks from a reusable component vocabulary (17 building block types).
Cards have: title, description, taskType, acceptanceCriteria, explainerText
(AI-generated "What You'll Learn"), tokenCostEstimateMin/Max, dependsOn,
generatedBy (`haiku` / `template` / `user`). BuildButton triggers builds
for ready subtasks via the existing orchestrator + SSE stream. Card states
persist to DB on committed/failed. `verifyProjectOwnership` shared utility,
atomic position assignment, state machine enforced server-side, UUID
validation on all route params. 943 tests across monorepo.

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

### 24. Stripe checkout for subscription tier — **DONE** for the plumbing, **NOT DONE** for trial + entitlement gating
> **Pricing TBD:** Landing page shows Starter at EUR 9.99/mo. Original spec was
> Builder at EUR 19/mo. Reconcile before billing goes live.
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

### 35. Email touchpoints — **DONE**
~~Welcome email, nudges, celebration~~

**What shipped:** Welcome email on register (fire-and-forget), first-build
email on committed event (dedup via `first_build_email_sent_at`), Day 1/7
nudge emails via Vercel Cron (`0 9 * * *`, capped 50/batch, parallel via
`Promise.allSettled`). All user content HTML-escaped. Shared email template
helpers in `src/server/email/send-email.ts`. `vercel.json` updated with
cron entry. 11 tests across register + cron routes.

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

## Launch Readiness Checklist (post 6-feature wave + 5-round review + payment audit, 2026-04-08)

MVP is ready to show first founding members when:

### Auth + infrastructure
- [x] Sign-up, sign-in, sign-out with JWT httpOnly cookie
- [x] Email verification (non-gating, nag banner)
- [x] Password reset flow (forgot + reset UI)
- [x] User can reach `/workspace/:id` after sign-up
- [x] §NEW-SANDBOX — worker code, tests, deploy runbook
- [ ] §NEW-SANDBOX — `wrangler deploy` (blocked: Cloudflare Containers Beta)
- [ ] §NEW-SANDBOX — live preview in iframe (blocked: deploy)
- [ ] Coming-soon page links to `/sign-up`

### Env vars + external services (must set up before first real test)

All code is written but these external services need accounts/credentials
set in both `.env.local` (local dev) and Vercel (production). Check
`apps/web/.env.example` for the full list.

- [ ] **Upstash Redis** — create database at `console.upstash.com`
  (free tier, eu-west-1). Get `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN`. Required for: rate limiting, daily
  spend ceiling, daily bonus dedup.
- [ ] **Neon Postgres** — create database at `neon.tech` (free tier).
  Get `DATABASE_URL`. Run migrations 0000-0008 via `psql`. Required
  for: all data storage.
- [ ] **Anthropic** — get `ANTHROPIC_API_KEY` from
  `console.anthropic.com`. Required for: builds, improve-prompt,
  plan generation, onboarding questions.
- [ ] **R2 (Cloudflare)** — create R2 bucket for content-addressed
  blob storage. Get `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_ENDPOINT`, `R2_BUCKET_NAME`. Required for: file storage during
  builds.
- [ ] **Cloudflare Workers** — resolve Containers Beta enrollment
  (blocked on Claude payments). Then `wrangler deploy` + set
  `CF_SANDBOX_WORKER_URL` + `CF_SANDBOX_HMAC_SECRET` on Vercel.
  Required for: live preview iframe.
- [ ] **Stripe** (future) — `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BUILDER`. Not needed for
  founding-member launch if shipping without a paywall. Request
  Private Preview for Billing for LLM Tokens
  (`docs.stripe.com/billing/token-billing`) for future `@stripe/token-meter`
  integration.
- [ ] **`JWT_SECRET`** — generate with `openssl rand -hex 32`. Set in
  `.env.local` + Vercel. Required for: auth.
- [ ] **`NEXT_PUBLIC_BASE_URL`** — set to `https://meldar.ai` in
  Vercel production, `http://localhost:3000` in `.env.local`.
  Required for: email links.
- [ ] **`CRON_SECRET`** — generate with `openssl rand -hex 16`. Set in
  Vercel. Required for: email touchpoint cron auth.
- [ ] **Set ALL env vars on Vercel** (production + preview scopes) —
  run `vercel env pull apps/web/.env.local` after setting them on
  Vercel to sync locally.
- [ ] **Resend** — already set up (domain verified, API key in
  `.env.local` + Vercel). ✅

**Added by Phase 0 money guardrails (2026-04-09) — all optional, all
have safe defaults, none are required for Phase 0 to function:**

- [ ] `GLOBAL_DAILY_CEILING_CENTS` — default `3000` (€30/day across all
  users). Trip → all Anthropic calls return `GuardedCallBlockedError`
  with `reason: 'global_ceiling'`.
- [ ] `USER_HOURLY_CEILING_CENTS` — default `80` (€0.80/user/hour).
  Trip → `reason: 'user_hourly'`.
- [ ] `USER_DAILY_CEILING_CENTS` — default `200` (€2/user/day). Trip →
  `reason: 'user_daily'`.
- [ ] `ANTHROPIC_PAUSED` — set to `1` as emergency kill switch (all
  ceilings return blocked, reason: `'paused'`). Unset or `0` = normal.
- [ ] `FOUNDER_ALERT_EMAIL` — default `gosha.skryuchenkov@gmail.com`.
  Used by `/api/cron/spend-alert` (every 5 min, already in
  `vercel.json`). Warning at €20/day total, panic at €50/hour.
- [x] `CRON_SECRET` — already set (used by existing cron jobs). The
  spend-alert cron reuses this secret. ✅

### Build Plan engine
- [x] Step state machine with milestone→subtask hierarchy
- [x] Kanban task execution engine — card-driven builds via SSE
- [x] 5-question onboarding: user intent → Haiku Q&A → plan
- [x] AI-generated "What You'll Learn" per card
- [x] Multi-card sequential build queue (dependency-ordered, stops on failure)
- [x] Card editor wired to API (Save/Delete/MarkReady)
- [x] Token balance refresh after builds (`router.refresh()`)
- [ ] Drag-and-drop reorder (Sprint 2)

### Features (6-feature wave)
- [x] Model routing — Haiku/Sonnet static lookup, server-side only (§16)
- [x] Prompt anatomy side panel — client-side parser, score 0-5 (§12)
- [x] Improve-my-prompt — Haiku rewrite, 1 token, balance check before / debit after (§13)
- [x] Template plans — 9 templates with learning highlights, difficulty, time, tags (§19)
- [x] Email touchpoints — welcome, first-build, Day 1/7 nudges via Vercel Cron (§35)
- [x] Token game economy — CTE atomic debit/credit, daily bonus, balance pill (§17)

### Payment integrity (5-round review + payment audit)
- [x] CTE-based atomic debit/credit (single SQL, no phantom records)
- [x] `CHECK (token_balance >= 0)` DB constraint
- [x] `withTokenRefund` try/finally (covers client abort)
- [x] Refund only on pre-file failures (blocks free-API-call attack)
- [x] `'refund'` in CHECK constraint (migration 0008)
- [x] Tiered rate-limit: auth fail-closed, non-auth fail-open, 503 vs 429
- [x] Signup bonus in audit trail
- [ ] System-wide daily spend cap (Sprint 2)
- [ ] Stripe token-meter integration (requires Private Preview)

### UX overhaul (2026-04-08) + Editorial Architecture (2026-04-08/09)
- [x] React Flow node graph with dagre auto-layout (replaces flat kanban list)
- [x] Flow/List view toggle (default: flow)
- [x] FirstTimeWelcome with goal selector + enriched template cards
- [x] Template preview drawer (plan + cost preview before committing)
- [x] Three-phase paywall (token tooltip → nudge banner → pricing drawer)
- [x] First-build celebration overlay with a11y (dialog, focus trap, escape)
- [x] Auto-mark first subtask as ready (server-side in apply-template)
- [x] 9 templates enriched with learning highlights, difficulty, time, cost
- [x] React Flow lazy-loaded (~100KB saved for list-view users)
- [x] Google OAuth (CSRF state, verified_email, authProvider tracking, session invalidation)
- [x] Editorial architecture: full landing page rewrite (11 sections, Swiss design)
- [x] Typography system: `<Text>`/`<Heading>` primitives, 82 files migrated
- [x] 8 Leonardo editorial illustrations (3 regenerated for less-AI look)
- [x] Workspace chrome editorial treatment (dashboard, all workspace components)
- [x] Day 2 return: StreakBadge, ContinueBanner, ProjectCard with progress bars
- [x] Banned words enforced: "build"→"make" across all surfaces + CLAUDE.md
- [ ] Template preview screenshots/mockups → **addressed by §JARVIS J-2.4**
- [ ] Node graph → **superseded by §JARVIS 3D galaxy** (React Flow becomes 2D fallback)
- [ ] Milestone completion celebration + "share with boss" flow
- [ ] §JARVIS implementation (6 phases, see sub-plan above)

### Workspace
- [x] Split-screen: flow graph left, preview right (§7, superseded by §JARVIS)
- [x] Token cost ceiling (EUR 2/day, Redis Lua)
- [x] Editorial treatment on all workspace chrome (2026-04-09)
- [ ] First user signs up → creates project → sees streaming build
  (blocked on R2 setup + Cloudflare deploy for iframe preview)
- [ ] §JARVIS 3D galaxy replaces split-screen (see sub-plan)

### Not started (ship after first users)
- [ ] Billing re-integration / Stripe checkout (§24)
- [ ] Referral system (§21–23)
- [ ] Done-for-me button (§25)
- [ ] Product analytics events (§27)
- [ ] Founder cost monitoring dashboard (§26)
- [ ] All inline explainers copywriting (§29)

---

## What's NOT Done Until It's Done

The old v2 backlog is deprecated. ~~The old landing page copy is outdated.~~ **Landing page is DONE** (editorial architecture, 2026-04-09).

**Remaining blockers before founding-member launch:**
1. **Cloudflare Sandbox deploy** — live preview iframe (blocked on Containers Beta enrollment)
2. **R2 bucket setup** — content-addressed blob storage for builds
3. **Pricing reconciliation** — landing page says EUR 9.99/mo, original spec EUR 19/mo. Decide.
4. **§JARVIS Phase 2 (Chat MVP)** — real chat with prompt enhancement, wires into `runBuildForUser`
5. **Run migrations 0010 + 0011 on Neon** — adds `'chat'` token reason + `ai_call_log` table
6. **Env vars on Vercel** — see checklist above (Upstash, Neon, Anthropic, R2, JWT, etc.)
