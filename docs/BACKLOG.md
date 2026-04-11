# Backlog

## Sprint 1: Booking Template MVP (Weeks 1-4)

Ship the first turn-key AI business tool: booking page + admin panel + AI receptionist.
Target: 10 paying service businesses in Helsinki at EUR 29/mo (salons, PTs, tattoo, consulting, tutoring, photography, dog grooming — any business where the owner's hands are busy while clients try to book).
Custom domains promised but handled manually for first 10 users until Sprint 2 automates it.
CEU score: 7.7 PURSUE. Unit economics 8.3, technical 8.2, problem validation 8.1. Break-even at 15-20 customers. Payback 0.8 months.

### Week 1-2: Foundation

**DB changes:**
- [ ] `agent_events` table (id, project_id, user_id, event_type, payload JSONB, created_at). Indexes: (project_id, created_at DESC), (user_id, created_at DESC). Append-only audit trail.
- [ ] `agent_tasks` table (id, project_id, agent_type, status [proposed|approved|rejected|executing|verifying|done|failed|escalated], payload JSONB, result JSONB, proposed_at, approved_at, executed_at, verified_at, auto_approved BOOLEAN DEFAULT false)
- [ ] `project_domains` table (id, project_id, type [subdomain|custom], domain UNIQUE, state, registrar_id, expires_at, created_at, updated_at). Every project gets one free subdomain row on creation.

**Booking template — public face:**
- [ ] Template skeleton: `/templates/booking/public/` — booking form, service list, calendar view, confirmation page
- [ ] Each template ships paired: `plan.ts` generates kanban cards for BOTH public + admin projects
- [ ] Public routes: `/` (booking form), `/book` (time slot picker), `/confirm` (confirmation)

**Booking template — admin panel:**
- [ ] Admin routes: `/admin` (dashboard: stats, recent bookings), `/admin/inbox` (agent proposals pending approval), `/admin/settings` (services, hours, prices, agent config), `/admin/history` (audit trail)
- [ ] Admin reads agent events from central Meldar DB via API proxy (`/api/workspace/[projectId]/agent/events`) with signed JWT. User apps have NO database of their own.
- [ ] Real-time updates via SSE (`EventSource` to `/api/agents/[id]/events`), polling as fallback

**Onboarding:**
- [ ] Sign-up → "What's your business?" one-tap (Hair/Beauty, PT/Wellness, Tattoo/Piercing, Consulting, Other) → Meldar proposes pre-filled booking page → user says "Go" → live in 5 minutes
- [ ] No template picker, no blank canvas. Meldar proposes vertical-specific defaults (3 services with local-market pricing, typical hours), user approves or overrides
- [ ] Each vertical option pre-fills different services/pricing/hours — same template, different config

**Security:**
- [ ] Global auth middleware on `/api/workspace/*` — reject unauthenticated requests before route handler (highest-leverage security fix, stops relying on per-route `verifyToken`)
- [ ] CSRF: `SameSite=Strict` on `meldar-auth` cookie + verify `HttpOnly` and `Secure` flags
- [ ] Per-action authorization gate: agent can ONLY act within its project's scope (e.g., booking agent can only email people who booked)
- [ ] Structured Zod-validated tool output on every agent action — LLM produces typed tool calls, code validates and executes. LLM never gets raw API access.

### Week 2-3: Agent + Managed Services

**Agent runtime (v1 — plain API, not Claude Managed Agents):**
- [ ] Vercel Cron route (`/api/cron/agent-tick`), runs every 1 min
- [ ] Picks `agent_tasks` rows with status `proposed`, calls Haiku with structured output schema
- [ ] Agent NEVER acts autonomously. Every action is a proposal first.
- [ ] Model routing: Haiku default (85% of tasks — confirmations, reminders, data extraction). Sonnet escalation only when Haiku confidence < 0.7 or novel free-text generation > 200 tokens.
- [ ] Per-agent-session spend cap: 15 cents/invocation hard ceiling

**Approval loop (the A-grade flow):**
- [ ] Agent proposes action → shown in admin panel with full preview (exact text, exact recipient)
- [ ] Human approves / rejects / edits
- [ ] System executes (sends email via Resend)
- [ ] System verifies (Resend delivery webhook: delivered / bounced / failed)
- [ ] If verification fails → retry once → if still fails → status `escalated`, red badge in admin: "Needs your attention"
- [ ] After N successful human-approved actions, admin panel offers: "Auto-approve confirmations?" toggle. Graduated autonomy, not assumed.

**Subdomain provisioning:**
- [ ] Wildcard DNS: `*.meldar.ai` CNAME → `cname.vercel-dns.com` (on Cloudflare, already manage meldar.ai zone)
- [ ] On project creation: generate slug (e.g., `elif-studio`), call Vercel API `POST /v10/projects/{projectId}/domains` with `elif-studio.meldar.ai`
- [ ] SSL automatic via Vercel/Let's Encrypt. Zero config.

**Email isolation:**
- [ ] Per-customer Resend sending identity — at minimum, unique `from` address per user (e.g., `elif-studio@send.meldar.ai`) so one user's spam reports don't tank deliverability for all
- [ ] Audit log: every email sent with userId, recipient, timestamp, and the prompt that triggered it

### Week 3-4: Polish + Ship

**Visual feedback (v1 — text + colors only):**
- [ ] Click element in preview iframe → element highlighted → text input slides up: "What do you want to change?"
- [ ] User types "make it pink" → structured modification request → Haiku applies change → iframe hot-reloads
- [ ] No layout changes, no section reordering in v1. Text content and colors only.
- [ ] Undo button persists for 30 seconds after each change

**Teaching (v1 — minimal):**
- [ ] 5-6 contextual micro-copy hints at point of action, shown once per user, then gone forever
- [ ] First hint (minute 3 of onboarding): "You can change anything by clicking on it"
- [ ] Never say "agent", "prompt", "customization", "admin panel". Say "automatic reminder", "tell Meldar what you want", "change anything by clicking it", "your dashboard"

**Distribution mechanics:**
- [ ] "Made with Meldar" badge on every user's public booking page — architectural virality. Do NOT offer badge removal on paid plans.
- [ ] Share flow: copy link button, WhatsApp share, Instagram bio link format
- [ ] Booking page itself IS distribution — every client who visits sees Meldar

**Notifications:**
- [ ] New booking → push/email to business owner: "Maija wants a haircut on Thursday at 14:00"
- [ ] If no booking in 48h → nudge: "Share your link with your next client"

### Pre-First-User Checklist
- [ ] DPIA document (internal, 2-3 pages — show to Finnish DPA if asked. Required before AI agents handle real customer data)
- [ ] "Powered by AI" disclosure on every agent-sent message (EU AI Act, August 2 2026 deadline)
- [ ] Rotate all secrets (DB, Stripe, Anthropic keys exposed in prior conversations)
- [ ] Add GitHub Actions CI: `biome check` + `tsc --noEmit` (add `pnpm build` only if type-check misses build failures)

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
