# Backlog

## Sprint 1: Booking Template MVP (Weeks 1-4)

Ship the first turn-key AI business tool: booking page + admin panel + AI receptionist.
Target: 10 paying service businesses in Helsinki at EUR 29/mo (salons, PTs, tattoo, consulting, tutoring, photography, dog grooming — any business where the owner's hands are busy while clients try to book).
Custom domains promised but handled manually for first 10 users until Sprint 2 automates it.
CEU score: 7.7 PURSUE. Unit economics 8.3, technical 8.2, problem validation 8.1. Break-even at 15-20 customers. Payback 0.8 months.

### Week 1-2: Foundation

**DB changes:**
- [x] `agent_events` table — done, schema + types + test in agent-tables.test.ts
- [x] `agent_tasks` table — done, schema + types + test, status state machine + agent type enums
- [x] `project_domains` table — done, schema + types + test, domain lifecycle state machine

**Booking template — public face:**
- [x] BookingPage, ServiceCard, BookingForm, BookingConfirmation — done in `features/booking/`. Service selection → form → confirmation flow. MeldarBadge included.
- [x] Template plan already exists in orchestrator (`booking-page` with 4 milestones).
- [ ] Each template ships paired: `plan.ts` generates kanban cards for BOTH public + admin projects — needs wiring

**Booking template — admin panel:**
- [x] AdminDashboard (overview + stats + recent bookings), ApprovalInbox (propose/approve/reject cards), BookingsList (table), SettingsPanel (services, hours, business name) — done in `features/booking-admin/`.
- [x] API routes done: `agent/tasks` (GET/POST), `agent/events` (GET JSON + SSE), `agent/auto-approve` (GET/POST).
- [x] SSE streaming for real-time events — done in agent events route.
- [ ] Admin panel page wiring — need actual `/admin` route pages that compose these components

**Onboarding:**
- [x] Onboarding page + flow — done, `(authed)/onboarding/page.tsx` + `OnboardingFlow.tsx`. Two steps: vertical cards grid → "Go — make this mine" → loading → redirect to workspace.
- [x] 5 vertical cards (Hair/Beauty, PT/Wellness, Tattoo/Piercing, Consulting, Other) with icons, responsive grid (2col mobile, 3col desktop).
- [x] Each vertical pre-fills different services/pricing/hours from `BOOKING_VERTICALS` entity. Optional business name input.

**Security:**
- [x] Global auth middleware on `/api/workspace/*` — done, `middleware.ts` rejects unauthenticated before route handler. 5 tests.
- [x] CSRF: cookie flags verified — `httpOnly: true`, `secure` in prod, `sameSite: 'lax'` (lax > strict because strict breaks Google OAuth redirect). All 5 cookie-setting locations consistent.
- [x] Per-action authorization gate — done, agent-task-service enforces project scope on all operations. 20 tests.
- [x] Structured Zod-validated tool output — done, booking-confirmation executor uses typed BookingConfirmationPayload schema.

### Week 2-3: Agent + Managed Services

**Agent runtime (v1 — plain API, not Claude Managed Agents):**
- [x] Vercel Cron route (`/api/cron/agent-tick`) — done, 11 tests. Processes approved tasks, dispatches to executors.
- [x] Agent task service — done, 20 tests. State machine: propose/approve/reject/execute/complete/escalate.
- [x] Booking confirmation executor — done, sends branded confirmation email via Resend.
- [x] Per-invocation spend cap: 15 cents hard ceiling — done, enforced in cron route.
- [ ] Agent NEVER acts autonomously. Every action is a proposal first. (UI enforcement needed — see approval loop)
- [ ] Model routing: Haiku default. Sonnet escalation on low confidence. (Deferred until Haiku integration)

**Approval loop (the A-grade flow):**
- [x] Agent tasks API route — done, GET (pending tasks) + POST (approve/reject) with full auth + project ownership. 18 tests.
- [x] Agent events API route — done, GET (JSON) + GET (SSE stream). 12 tests.
- [x] System executes via cron route → booking confirmation executor → Resend email. 11 tests.
- [x] Human approves / rejects / edits — done, ApprovalInbox component with full email preview + Approve/Reject buttons.
- [x] Resend delivery webhook — done, `/api/webhooks/resend` with svix signature verification. delivered→done, bounced→failed, failed→escalated. 15 tests. Needs `RESEND_WEBHOOK_SECRET` env var.
- [x] Graduated autonomy API — done, `GET/POST /api/workspace/[projectId]/agent/auto-approve`. Checks: 10+ successful approvals with zero rejections before eligible. UI toggle still needed (NEEDS_HUMAN for placement decision).

**Subdomain provisioning:**
- [x] Slug generation + collision handling — done, `generateSlug()` + `provisionSubdomain()` with 5-retry collision resolution. 17 tests.
- [x] Integrated into project creation + onboarding routes — both return `subdomain` in response.
- [ ] Re-add ALL cron jobs to vercel.json — removed to deploy on Hobby plan. Needs Vercel Pro ($20/mo) or external cron (e.g., cron-job.org, Upstash QStash). Routes: `/api/cron/agent-tick` (every 1min), `/api/cron/purge` (daily 3am), `/api/cron/email-touchpoints` (daily 9am), `/api/cron/spend-alert` (daily 9am).
- [ ] Wildcard DNS: `*.meldar.ai` CNAME → `cname.vercel-dns.com` — needs Cloudflare config (manual, one-time)
- [ ] SSL automatic via Vercel/Let's Encrypt. Zero config. (Works once wildcard DNS is set)

**Email isolation:**
- [x] Per-customer email isolation — done, `sendIsolatedEmail()` in `server/agents/email-sender.ts`. Each user gets `{slug}@send.meldar.ai` as sender. Needs Resend domain verification for `send.meldar.ai` (NEEDS_HUMAN).
- [x] Audit log — done, `logEmailSent()` in `server/agents/email-audit.ts`. Logs to agent_events table with recipient, subject, resendId, taskId.

### Week 3-4: Polish + Ship

**Visual feedback (v1 — text + colors only):**
- [x] VisualFeedbackPanel component — done, 4-step state machine (idle → selecting → describing → submitting). Bottom-anchored input panel. 4 tests.
- [x] ModificationRequest type (elementSelector, elementDescription, instruction) — done.
- [ ] Iframe click-to-select integration — **NEEDS BROWSER TESTING**. The panel exists but iframe element selection (postMessage bridge) needs real browser testing.
- [ ] Undo button — deferred to post-browser-testing iteration

**Teaching (v1 — minimal):**
- [x] 6 contextual hints — done, `TeachingHint` component + `useHintDismissal` hook (localStorage, shown once per user). 6 tests including forbidden-word check.
- [x] First hint: "You can change anything by clicking on it" — included.
- [x] Forbidden words enforced by test — no "agent", "prompt", "customization", "admin panel" in any hint text.

**Distribution mechanics:**
- [x] "Made with Meldar" badge — done, `MeldarBadge` component in shared/ui. Fixed position bottom-right, brand gradient, links to meldar.ai/?ref=badge.
- [x] Share flow — done, `SharePanel` component with copy link (clipboard), WhatsApp share, Instagram tooltip. 7 tests. 44px tap targets, aria-labels.
- [x] Booking page IS distribution — badge + share flow ensure every visitor sees Meldar.

**Notifications:**
- [x] New booking → email to business owner — done, `sendBookingNotification()` in send-email.ts
- [x] No booking 48h nudge — done, `sendBookingNudge()` with share link copy in send-email.ts

### Pre-First-User Checklist
- [ ] DPIA document (internal, 2-3 pages — show to Finnish DPA if asked. Required before AI agents handle real customer data)
- [x] "Powered by AI" disclosure — done, booking-confirmation executor includes "Powered by AI" in email footer.
- [ ] Rotate all secrets (DB, Stripe, Anthropic keys exposed in prior conversations)
- [x] Add GitHub Actions CI — done, `.github/workflows/ci.yml`: biome check + typecheck + storage tests + web tests. Cancels in-progress runs.

---

## Sprint 2: Custom Domains + Lead Research (Weeks 5-8)

Unlock after 10 paying users on subdomains. Custom domains are the upgrade trigger.

### Custom Domain Provisioning (3-4 Claude Code days)

**Registrar: Gandi** (best EU/ccTLD coverage, clean REST API, GDPR-compliant WHOIS, ICANN-accredited).

**Legal structure:** Meldar acts as reseller/agent. User is the legal registrant in WHOIS. Domain Services Agreement: Meldar purchases and manages on user's behalf, user owns domain, Meldar has no ownership claim, transfer-out flow available from day 1.

**Domain search UX:**
- [ ] Rules-based name generation (normalize business name → combine with type/city → cross with TLD list). Runs in <10ms, costs nothing. No LLM.
- [ ] TLD priority: .fi first (country, local trust), then .com (universal), then ONE industry TLD (.hair, .salon, .beauty). Never suggest .io/.dev/.xyz.
- [ ] Parallel availability check: 10 domains via Gandi API `Promise.all` (~300ms wall-clock, free)
- [ ] Hard price ceiling: registrar price > EUR 100 → blocked, link user to buy directly

**Pricing:** Tiered flat markup:
- .com/.net/.org: EUR 15/yr (registrar ~EUR 10)
- Country TLDs (.fi, .de, .fr): EUR 30/yr (registrar ~EUR 18)
- Premium TLDs (.ai, .io): EUR 95/yr (registrar ~EUR 60)

**Provisioning pipeline:**
- [ ] `POST /api/workspace/[projectId]/domain/search` → Gandi availability check
- [ ] `POST /api/workspace/[projectId]/domain/purchase` → Gandi register (user as registrant) → create `project_domains` row (state: `registering`)
- [ ] Gandi webhook or poll until registration completes → state: `registered`
- [ ] Set DNS: A record `76.76.21.21` (Vercel anycast) + CNAME `www` → `cname.vercel-dns.com`
- [ ] Set email DNS: SPF (`include:send.resend.com`), DKIM (3 CNAMEs from Resend API), DMARC (`v=DMARC1; p=none; rua=mailto:dmarc@meldar.ai`)
- [ ] Vercel API: `POST /v10/projects/{projectId}/domains` → auto-SSL via Let's Encrypt
- [ ] Resend API: `POST /domains` → verify → `booking@elifstudio.fi` active
- [ ] Cron polls every 2 min until DNS + SSL + email all verified → state: `active`
- [ ] User sees progress stepper: Purchased → DNS configuring → SSL provisioning → Live

**Renewal automation:**
- [ ] Daily cron checks `expires_at`. Warnings at 30, 7, 3 days via email.
- [ ] Auto-renew via Gandi API 3 days before expiry.
- [ ] Failed payment → retry 3x over 5 days → let expire → fallback to subdomain + `notifications@meldar.ai`

**Email warm-up:** Throttle new domains: 50 emails/day week 1, ramp to 200 by week 4. Start with transactional only (high engagement builds reputation). Auto-pause if complaint rate > 0.1%.

**Security:**
- [ ] Registrar API creds in secrets manager, rotated quarterly
- [ ] Domain purchase: server-side only, rate-limited (3/user/day), requires email re-verification
- [ ] EPP/auth codes delivered only to verified registrant email, never stored in DB
- [ ] Audit log on every DNS change, purchase, transfer
- [ ] AUP in ToS + ability to suspend single domain's DNS without affecting others

### Lead Research Template (EUR 49/mo)

- [ ] Lead research template: public tool (paste URL → get competitor analysis)
- [ ] Lead research template: admin panel (research history, saved leads, export)
- [ ] Research agent: fire-and-forget web search via Haiku, structured Zod output
- [ ] Pricing page: EUR 29 booking / EUR 49 research / EUR 149 outbound (coming soon)

---

## Sprint 3: Scale + Distribution (Weeks 9-12)

- [ ] ProductHunt launch with founding member testimonials + shareable Data Receipt cards
- [ ] LinkedIn build-in-public content (one post per customer story)
- [ ] Weekly summary email: "3 bookings, EUR 135 revenue this week" (Monday morning)
- [ ] Day-2 retention nudge: "Your AI receptionist handled 2 bookings while you slept"
- [ ] Day-7 suggestion: "Most bookings are haircuts. Want to add a combo?" (one-tap)
- [ ] Explicit "Put this online" deploy button with cost preview (re-enable `withVercelDeploy`)

---

## Future: Templates

- [ ] **Portfolio / personal site** — hero, about, projects grid, contact form
- [ ] **Outbound email dashboard** — EUR 149/mo. **Deferred:** GDPR consent management needed for EU outreach.
- [ ] **Invoice / simple CRM** — track clients, send invoices, mark paid
- [ ] **Internal dashboard** — Google Sheets/Notion → charts + KPIs
- [ ] **Telegram bot** — FAQ, booking, notifications for small business
- [ ] **Social media scheduler** — compose, preview, schedule. Twitter/X + LinkedIn.
- [ ] **LinkedIn outreach agent** — **Deferred:** LinkedIn ToS prohibits automation.
- [ ] **Email agent** — inbox triage, auto-categorize, draft replies. Needs Gmail/Outlook OAuth.

## Future: Teaching Layer

- [ ] **Prompt transparency** — show the prompt that created each component (raw + AI-enhanced)
- [ ] **Prompt improver** — AI suggests improvements before building, show the diff
- [ ] **"Why this exists" explainers** — one-line explainer on hover/tap for every generated element
- [ ] **Claude skills teaching** — contextual "did you know" tips when relevant
- [ ] **External AI tool guidance** — "use Stitch for this" suggestions embedded in workflow

## Future: Managed Services

- [ ] **Managed Telegram bots** — programmatic BotFather provisioning
- [ ] **AI service proxy** — LeonardoAI, Stitch behind Meldar's keys. Requires commercial agreements.

## Future: Platform Play

- [ ] **Open template system** — third parties build verticals (restaurant, gym, real estate). "Shopify for AI business tools."
- [ ] **Template marketplace** — creators publish, users subscribe, Meldar takes cut

## Future: Infrastructure

- [ ] Add Sentry error monitoring
- [ ] Add CSP header to next.config.ts
- [ ] Validate EUR 29/49/149 pricing against real usage data
- [ ] Founding 50 visible counter + deadline for urgency
- [ ] Claude Managed Agents migration (v2 agent runtime) — evaluate when agent volume justifies $0.08/session-hour
- [ ] Semi-automate customer onboarding (setup takes 15min/user — breaks at ~100 users without automation)

## Workspace (existing, lower priority)

- [ ] Unified toast adoption — migrate remaining inline errors in auth forms to `toast.error()`
- [ ] OG image: Bricolage Grotesque font

## Done

### Accessibility (cleared 2026-04-11)
- [x] ~~role="alert"~~ — toast system
- [x] ~~aria-live~~ — ArtifactPane + OnboardingChat
- [x] ~~Focus management~~ — auto-focus on build complete
- [x] ~~Footer contrast~~ — white/60 (~7.6:1)
- [x] ~~Touch targets~~ — 44x44px on all small buttons

### Technical Debt (cleared 2026-04-11)
- [x] ~~getDb() caching~~ — module singleton
- [x] ~~Sort apps by usageMinutes~~ — 3 files
- [x] ~~Tighten Zod schemas~~ — subscribe, xray, analyze
- [x] ~~Server-validate foundingMember~~ — DB count check
- [x] ~~Unsubscribe links~~ — all emails
- [x] ~~GA4 conversion events~~ — TrackedEmailCapture

### Pre-Launch (cleared earlier)
- [x] ~~Upstash Redis~~ — rate limiting
- [x] ~~Resend domain~~ — verified
- [x] ~~Purchase confirmation email~~ — webhook
- [x] ~~Founder notification email~~ — webhook
