# Architecture Draft v1 — Meldar PoC & MVP

**Authors:** Software Architect + Backend Architect
**Date:** 2026-03-30
**Status:** Draft for cross-team review
**Scope:** PoC (prove it works) and MVP (first paying users)

---

## 1. Bounded Contexts

Four bounded contexts, ordered by build priority. Each is a cohesive domain with clear boundaries.

```
┌─────────────────────────────────────────────────────────────┐
│                        MELDAR                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  IDENTITY    │  │  DISCOVERY   │  │  ADVICE /        │  │
│  │              │  │              │  │  CONTENT          │  │
│  │  - Users     │  │  - Quiz      │  │                   │  │
│  │  - Auth      │  │  - Screen    │  │  - Automation     │  │
│  │  - Consent   │  │    Time OCR  │  │    suggestions    │  │
│  │  - Profile   │  │  - Takeout   │  │  - Weekly tips    │  │
│  │  - Tier      │  │    parsing   │  │  - Personal       │  │
│  │              │  │  - Chat      │  │    time audit     │  │
│  │              │  │    discovery │  │  - Concierge      │  │
│  │              │  │  - Pattern   │  │    deliverables   │  │
│  │              │  │    analysis  │  │                   │  │
│  │              │  │  - Time      │  │                   │  │
│  │              │  │    X-Ray     │  │                   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│         │    ┌────────────┴────────────┐       │             │
│         └───►│      BILLING            │◄──────┘             │
│              │                         │                     │
│              │  - Subscriptions        │                     │
│              │  - Usage metering       │                     │
│              │  - Payment processing   │                     │
│              └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Context Boundaries and Ownership

| Context | Core Responsibility | Key Entities | External Dependencies |
|---------|--------------------|--------------|-----------------------|
| **Identity** | Who is this user, what have they consented to, what tier are they on | User, Session, ConsentRecord | Auth provider (Google OAuth) |
| **Discovery** | Find what wastes the user's time — the core product | QuizResult, ScreenTimeAnalysis, ActivitySignal, AutomationOpportunity, DiscoverySession | Anthropic API (Claude Vision + Chat) |
| **Advice/Content** | Turn insights into action — weekly tips, personal audits, concierge deliverables | Tip, TimeAudit, AppSpec | None (content is internally generated) |
| **Billing** | Manage tiers and payments | Subscription, UsageRecord, Invoice | Stripe |

### Key Design Decision: Discovery is the God Context

Discovery is intentionally large. In a 1-2 person team, splitting it further (e.g., "Ingestion" vs "Analysis" vs "Reporting") creates coordination overhead with zero payoff. The unified ActivitySignal format is the internal contract that keeps it cohesive.

**Rule:** Identity, Billing, and Advice/Content are thin wrappers around external services (Auth.js, Stripe, a content CMS or just markdown files). Discovery is where all the custom logic lives.

---

## 2. System Architecture

### Decision: Modular Monolith on Next.js

**Not** microservices. **Not** a pure monolith. A modular monolith with enforced boundaries.

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                   │
│                    (CDN, SSL, DDoS)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Next.js 16 Application                      │
│              (App Router, RSC)                            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │              React Server Components             │     │
│  │              (Landing, Dashboard, Quiz, Reports)  │     │
│  └─────────────────────┬───────────────────────────┘     │
│                        │                                  │
│  ┌─────────────────────▼───────────────────────────┐     │
│  │              API Routes (Route Handlers)          │     │
│  │                                                   │     │
│  │  /api/auth/[...nextauth]    (Identity)            │     │
│  │  /api/subscribe             (existing)            │     │
│  │  /api/quiz/submit           (Discovery)           │     │
│  │  /api/discovery/analyze     (Discovery)           │     │
│  │  /api/discovery/chat        (Discovery)           │     │
│  │  /api/upload/screentime     (Discovery)           │     │
│  │  /api/upload/takeout        (Discovery)           │     │
│  │  /api/insights              (Discovery)           │     │
│  │  /api/billing/checkout      (Billing)             │     │
│  │  /api/billing/webhook       (Billing)             │     │
│  │  /api/user/export           (Identity - GDPR)     │     │
│  │  /api/user/delete           (Identity - GDPR)     │     │
│  │  /api/cron/purge            (Internal)            │     │
│  └─────────────────────┬───────────────────────────┘     │
│                        │                                  │
│  ┌─────────────────────▼───────────────────────────┐     │
│  │              Service Layer (src/server/)          │     │
│  │                                                   │     │
│  │  identity/   → auth, users, consent               │     │
│  │  discovery/  → quiz, ocr, takeout, chat, analysis │     │
│  │  billing/    → stripe, subscriptions              │     │
│  │  content/    → tips, audits                       │     │
│  └─────────────────────┬───────────────────────────┘     │
│                        │                                  │
└────────────────────────┼──────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌──────────────┐
   │ Postgres   │ │ Anthropic  │ │ Stripe       │
   │ (Neon)     │ │ Claude API │ │ (Billing)    │
   │            │ │            │ │              │
   │ EU region  │ │ Vision +   │ │ Checkout +   │
   │ Serverless │ │ Chat       │ │ Webhooks     │
   └────────────┘ └────────────┘ └──────────────┘
        │
        │ (async jobs)
        ▼
   ┌────────────┐
   │ Inngest    │
   │ (or Vercel │
   │  Cron)     │
   │            │
   │ - Purge    │
   │ - Sync     │
   └────────────┘
```

### Why Modular Monolith

| Consideration | Monolith | Microservices | Our Choice |
|---------------|----------|---------------|------------|
| Team size (1-2 devs) | Perfect | Overkill | **Monolith** |
| Deployment complexity | One `git push` | Container orchestration | **Monolith** |
| Cost at 0-100 users | $0 (Vercel free) | $50-200/mo (separate infra) | **Monolith** |
| Latency | One process, no network hops | Inter-service calls add latency | **Monolith** |
| Code sharing | Direct imports | Shared libraries or duplication | **Monolith** |
| Future extraction | Boundaries make it possible | Already done (but premature) | **Monolith with boundaries** |

**The "modular" part matters:** We enforce import boundaries via the FSD layer system already in place. The `src/server/` directory mirrors the bounded contexts. No circular dependencies. If Discovery ever needs its own service, the extraction is clean because the contracts are already defined.

### Server-Side Directory Structure (New)

```
src/
  server/                           # Backend logic (never imported by client components)
    identity/
      auth.ts                       # Auth.js config
      users.ts                      # User CRUD
      consent.ts                    # GDPR consent tracking
    discovery/
      quiz.ts                       # Quiz scoring and suggestion matching
      ocr.ts                        # Screen Time screenshot → Claude Vision
      takeout.ts                    # Google Takeout ZIP parser
      chat.ts                       # Conversational discovery (LLM)
      analysis.ts                   # Three-pass pattern analysis engine
      signals.ts                    # ActivitySignal CRUD
    billing/
      stripe.ts                     # Stripe integration
      subscriptions.ts              # Tier management
    content/
      tips.ts                       # Weekly tip generation
      audit.ts                      # Personal time audit
    db/
      schema.ts                     # Drizzle schema (all tables)
      client.ts                     # Database connection
      migrations/                   # SQL migrations
    jobs/
      purge.ts                      # Data retention enforcement
```

---

## 3. Database Design

### Decision: Postgres on Neon (Serverless)

**Why Neon over alternatives:**

| Option | Free Tier | EU Region | Serverless | Branching | Cost at 1K users |
|--------|-----------|-----------|------------|-----------|------------------|
| **Neon** | 0.5 GB storage, 190 compute hours | Yes (Frankfurt) | Yes (scales to zero) | Yes (preview branches) | ~$19/mo |
| Supabase | 500 MB, unlimited API | Yes | Partial | No | ~$25/mo |
| PlanetScale | Deprecated free tier | Yes | Yes | Yes | ~$39/mo |
| Railway Postgres | 500 MB, $5 credit | Yes | No | No | ~$10/mo |
| Vercel Postgres (Neon under the hood) | 256 MB | Yes | Yes | No | ~$20/mo |

**Neon wins** on: true serverless (scales to zero = $0 when idle), EU region (Frankfurt for GDPR), database branching (preview environments for free), and generous free tier for PoC.

### ORM: Drizzle

Lightweight, type-safe, zero abstraction overhead. Drizzle generates SQL at build time, not runtime. No query builder overhead. Perfect for serverless where cold start matters.

### Schema

```sql
-- ========================================
-- IDENTITY CONTEXT
-- ========================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,                        -- profile picture URL from OAuth
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'concierge'
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth.js required tables (accounts, sessions, verification_tokens)
-- Generated by @auth/drizzle-adapter — not shown here for brevity.

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,        -- 'analytics' | 'data_processing' | 'marketing'
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,                   -- for audit trail
  user_agent TEXT                    -- for audit trail
);

-- ========================================
-- DISCOVERY CONTEXT
-- ========================================

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- nullable: quiz works without signup
  session_id TEXT NOT NULL,          -- anonymous session tracking
  selected_pains TEXT[] NOT NULL,    -- array of pain point IDs
  suggested_automations JSONB NOT NULL,  -- matched suggestions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE screentime_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- nullable pre-signup
  session_id TEXT NOT NULL,
  apps JSONB NOT NULL,               -- [{name, hours, category}]
  total_hours FLOAT NOT NULL,
  top_app TEXT NOT NULL,
  insight TEXT NOT NULL,              -- LLM-generated insight
  raw_image_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'completed' | 'abandoned'
  phase TEXT NOT NULL DEFAULT 'context',   -- 'context' | 'deep_dive' | 'synthesis'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE discovery_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                 -- 'user' | 'assistant'
  content TEXT NOT NULL,
  extracted_signals JSONB,           -- signals parsed from this message
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,              -- 'quiz' | 'screentime' | 'takeout' | 'chat' | 'extension'
  category TEXT NOT NULL,            -- 'email' | 'scheduling' | 'browsing' | 'social_media' | ...
  description TEXT NOT NULL,
  frequency TEXT,                    -- 'daily' | 'weekly' | 'monthly' | 'adhoc'
  estimated_minutes_per_occurrence INT,
  occurrences_per_week FLOAT,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  metadata JSONB,                    -- source-specific, non-PII
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL    -- auto-purge date (7 days default)
);

CREATE TABLE automation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_weekly_minutes_saved INT NOT NULL,
  complexity TEXT NOT NULL,          -- 'simple' | 'moderate' | 'complex'
  data_sources TEXT[] NOT NULL,      -- which sources contributed
  confidence FLOAT NOT NULL,
  signal_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',  -- 'suggested' | 'accepted' | 'dismissed' | 'built'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- BILLING CONTEXT
-- ========================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',     -- 'free' | 'starter' | 'concierge'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled'
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,          -- 'vision_analysis' | 'chat_message' | 'takeout_parse'
  credits_used INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX idx_activity_signals_user ON activity_signals(user_id);
CREATE INDEX idx_activity_signals_expires ON activity_signals(expires_at);
CREATE INDEX idx_quiz_results_session ON quiz_results(session_id);
CREATE INDEX idx_automation_opportunities_user ON automation_opportunities(user_id);
CREATE INDEX idx_discovery_messages_session ON discovery_messages(session_id);
CREATE INDEX idx_usage_records_user_date ON usage_records(user_id, created_at);
```

### Entity Relationship Diagram

```
users 1──────* consent_records
  │
  ├── 1──────* quiz_results
  ├── 1──────* screentime_analyses
  ├── 1──────* discovery_sessions ──1──* discovery_messages
  ├── 1──────* activity_signals
  ├── 1──────* automation_opportunities
  ├── 1──────1 subscriptions
  └── 1──────* usage_records
```

---

## 4. API Design

### Decision: Next.js Route Handlers (REST-ish)

**Why not tRPC:**
- tRPC adds a build dependency and a learning curve for a team that already has Zod + fetch. For 15-20 endpoints, the type-safety win doesn't justify the abstraction.
- If we grow past 30+ endpoints and need a dedicated API consumer (mobile app), we revisit.

**Why not GraphQL:**
- GraphQL solves "multiple consumers with different data needs." We have one consumer (our own frontend). Over-engineering.

**Why REST-ish (not pure REST):**
- We use Route Handlers as RPC-style endpoints. `POST /api/discovery/analyze` is an action, not a resource CRUD. This is fine. Purity doesn't matter at this scale.

### PoC API Surface

```
Phase 1 — PoC (no auth required, session-based)
──────────────────────────────────────────────────

POST /api/subscribe                     ← existing (Resend email capture)
POST /api/quiz/submit                   ← submit quiz selections, get suggestions
  Body: { sessionId, selectedPains: string[] }
  Response: { suggestions: Suggestion[], sessionId }

POST /api/upload/screentime             ← upload screenshot, get analysis
  Body: FormData (screenshot file)
  Response: { apps: App[], totalHours, topApp, insight }

Phase 2 — MVP (auth required)
──────────────────────────────────────────────────

# Auth
GET/POST /api/auth/[...nextauth]        ← Auth.js OAuth (Google sign-in)

# Discovery Chat
POST /api/discovery/chat                ← send message, receive streamed response
  Body: { sessionId?, message }
  Response: ReadableStream (SSE) { reply, extractedSignals[], phase, progress }

GET  /api/discovery/sessions            ← list user's sessions
GET  /api/discovery/sessions/:id        ← session detail with messages

# Insights
GET  /api/insights                      ← user's automation opportunities
PATCH /api/insights/:id                 ← update status (accept/dismiss)

# Upload (authenticated)
POST /api/upload/takeout                ← upload Takeout ZIP for parsing
  Body: FormData (zip file)
  Response: { jobId }

GET  /api/upload/:id/status             ← poll processing status
  Response: { status: 'processing' | 'complete' | 'failed', progress?, result? }

# Billing
POST /api/billing/checkout              ← create Stripe checkout session
  Body: { tier: 'starter' | 'concierge' }
  Response: { checkoutUrl }

POST /api/billing/webhook               ← Stripe webhook handler
  (Stripe signature verification)

GET  /api/billing/portal                ← Stripe customer portal URL

# GDPR
GET  /api/user/export                   ← download all user data as JSON
DELETE /api/user/data                   ← full account and data deletion

# Internal
POST /api/cron/purge                    ← Vercel Cron: hourly data cleanup
```

### Request Validation

Every endpoint uses Zod schemas for request validation. Example:

```typescript
// src/server/discovery/quiz.ts
import { z } from 'zod';

export const quizSubmitSchema = z.object({
  sessionId: z.string().uuid(),
  selectedPains: z.array(z.string()).min(1).max(12),
});
```

### Error Response Format

Consistent across all endpoints:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

HTTP status codes: 400 (validation), 401 (unauthenticated), 403 (wrong tier), 429 (rate limit), 500 (server error).

---

## 5. Auth Strategy

### Decision: Auth.js v5 (NextAuth) with Google OAuth

**Why Auth.js:**
- Native Next.js integration (middleware, server components, route handlers)
- Handles OAuth dance, PKCE, token refresh, session management
- Drizzle adapter for Postgres session storage
- Free, open source, well-maintained

**Why Google OAuth (not email/password):**
- Our target audience (Gen Z, 18-28) expects "Sign in with Google." One click, done.
- No password management, no password reset flow, no bcrypt, no credential stuffing attacks.
- When users later connect Google services (Calendar, Gmail), the OAuth consent is already established.
- Reduces signup friction to absolute minimum.

**Why not Clerk/Auth0/Supabase Auth:**
- Clerk: Excellent DX but $25/mo at 1,000 MAU. We don't need the dashboard, user management UI, or organization features.
- Auth0: Over-featured and expensive for a startup. Machine-to-machine pricing is hostile.
- Supabase Auth: Ties us to Supabase ecosystem. We chose Neon for the database.

### Auth Flow

```
Landing Page (no auth)
  │
  ├── Quiz → works without auth (session_id cookie)
  ├── Screen Time upload → works without auth (session_id cookie)
  │
  └── "See your full Time X-Ray" / "Save your results"
       │
       ▼
  Google OAuth (Auth.js)
       │
       ▼
  Dashboard (authenticated)
       │
       ├── Discovery Chat
       ├── Google Takeout upload
       ├── Saved insights
       └── Billing
```

**Critical UX decision:** The quiz and Screen Time analysis work WITHOUT authentication. Users see value before signing up. The auth wall appears when they want to:
1. Save their results
2. Access the conversational discovery
3. Upload Google Takeout
4. Subscribe to a paid tier

**Session merging:** When an anonymous user signs up, we merge their `session_id` quiz results and screentime analyses into their new `user_id`. This is a one-time migration on first login.

### PoC Auth: Even Simpler

For PoC (proving the discovery engine works), we may skip OAuth entirely and use a magic link flow via Resend. This reduces the auth surface to zero third-party OAuth dependencies while still gating paid features.

**PoC flow:**
1. User enters email → we send a magic link via Resend (already integrated)
2. Click link → authenticated session (JWT in httpOnly cookie)
3. No password, no OAuth, no Google consent screens

**MVP upgrades to full Auth.js** when Google service connections become available.

---

## 6. Infrastructure Decisions

### Deployment: Vercel (stay put)

The landing page is already on Vercel. No reason to move. Vercel's serverless model fits perfectly:

| Need | Vercel Feature | Alternative Considered |
|------|---------------|----------------------|
| Frontend hosting | Edge Network + SSR | N/A (already here) |
| API routes | Serverless Functions (up to 60s) | Separate Express server |
| Background jobs | Vercel Cron + Inngest | BullMQ + Redis (requires separate infra) |
| File uploads | Vercel Blob | S3 (overkill for temp staging) |
| Domain + SSL | Automatic | Cloudflare (unnecessary layer) |
| Preview deployments | Automatic per branch | Manual staging environments |

**When we'd leave Vercel:** If we need WebSocket connections (real-time chat), long-running jobs (>60s), or the cost becomes prohibitive (>$100/mo for compute). None of these apply at PoC/MVP scale.

### Background Jobs: Inngest vs Vercel Cron

| Need | Solution | Rationale |
|------|----------|-----------|
| Hourly data purge | **Vercel Cron** | Simple, no external dependency, runs on schedule |
| Takeout ZIP parsing (may exceed 60s) | **Inngest** | Retries, step functions, handles long-running work |
| LLM analysis after upload | **Inngest** | Can chain steps: parse → analyze → notify |
| Weekly tip emails | **Vercel Cron** | Simple batch operation |

**PoC shortcut:** Start with Vercel Cron only. Add Inngest only when we hit the 60s function timeout with Takeout parsing.

### File Storage: Vercel Blob

Temporary staging for uploaded files. All uploads get a signed URL with 1-hour TTL. After processing, the blob is deleted. No persistent file storage needed.

### LLM: Anthropic Claude API

| Use Case | Model | Est. Cost/Call | Justification |
|----------|-------|----------------|---------------|
| Screen Time OCR | Claude Haiku 4.5 | ~$0.002 | Fast, cheap, vision-capable |
| Chat discovery | Claude Sonnet 4.6 | ~$0.01-0.05 | Good reasoning, reasonable speed |
| Insight enrichment (Pass 3) | Claude Sonnet 4.6 | ~$0.02-0.05 | Quality presentation matters |
| Takeout analysis | Claude Haiku 4.5 | ~$0.005 | Structured extraction, speed matters |

**Total LLM cost per full discovery journey:** ~$0.10-0.15 per user.

### Monitoring & Observability

| Layer | Tool | Cost |
|-------|------|------|
| Uptime + performance | Vercel Analytics (built-in) | Free |
| Structured logging | Pino (stdout → Vercel logs) | Free |
| Error tracking | Sentry (free tier: 5K events/mo) | Free |
| LLM cost tracking | Custom `usage_records` table | Free |

**No Datadog, no Grafana, no ELK stack.** At PoC/MVP scale, Vercel logs + Sentry is sufficient. We add observability tooling when we have problems to observe.

---

## 7. Architectural Decision Records (ADRs)

### ADR-001: Monolith over Microservices

**Status:** Accepted
**Context:** 1-2 person team, 4-week build timeline, zero existing backend infrastructure.
**Decision:** Single Next.js application with modular internal structure. All bounded contexts live in `src/server/` with enforced import boundaries.
**Consequences:**
- (+) Single deployment, single repo, zero inter-service latency
- (+) $0 infrastructure cost on Vercel free tier
- (+) Shared type definitions across frontend and backend
- (-) Cannot independently scale Discovery if it becomes compute-heavy
- (-) One bad deploy takes down everything
**Reversibility:** High. The modular structure means any context can be extracted to a separate service by moving the directory and adding an HTTP/gRPC interface.

### ADR-002: Neon Postgres over Supabase or DynamoDB

**Status:** Accepted
**Context:** Need a relational database with EU hosting, serverless scaling, and low cost.
**Decision:** Neon Postgres (Frankfurt region) with Drizzle ORM.
**Alternatives rejected:**
- Supabase: Adds auth/storage/realtime features we don't need. Higher baseline cost.
- DynamoDB: Wrong data model. Our queries are relational (joins between signals, opportunities, users).
- SQLite (Turso): Interesting but immature ecosystem. Drizzle support is less battle-tested.
**Consequences:**
- (+) True serverless — scales to zero, $0 when idle
- (+) EU region for GDPR
- (+) Database branching for preview environments
- (+) Standard Postgres — easy to migrate elsewhere later
- (-) Neon is a startup. Vendor risk exists (mitigated by standard Postgres compatibility).

### ADR-003: Auth.js over Clerk over Custom Auth

**Status:** Accepted
**Context:** Need authentication with Google OAuth support, minimal cost, Next.js integration.
**Decision:** Auth.js v5 with Google provider. PoC may start with magic links (Resend) and upgrade to full OAuth for MVP.
**Consequences:**
- (+) Free, open source, no per-MAU pricing
- (+) Native Next.js middleware integration
- (+) Drizzle adapter for Postgres
- (-) More manual setup than Clerk
- (-) No pre-built user management dashboard (we build our own or skip it)

### ADR-004: Inngest for Async Jobs over BullMQ/Redis

**Status:** Accepted (for MVP; PoC uses Vercel Cron only)
**Context:** Need async job processing for Takeout parsing, data purge, and email notifications.
**Decision:** Inngest for durable, retryable background jobs.
**Alternatives rejected:**
- BullMQ + Redis: Requires separate Redis infrastructure ($$$).
- Vercel Cron alone: Limited to scheduled tasks, no event-driven jobs, no retries.
- Trigger.dev: Good but less mature than Inngest. Smaller community.
**Consequences:**
- (+) Serverless-native, works on Vercel out of the box
- (+) Built-in retries, step functions, event-driven
- (+) Free tier: 5,000 runs/month (plenty for MVP)
- (-) Another third-party dependency
- (-) Vendor-specific API (less portable than BullMQ)

### ADR-005: Pre-Auth Discovery (Quiz + Screenshot Without Login)

**Status:** Accepted
**Context:** Core product bet — users must see value before signing up. Gen Z abandons anything that demands an account upfront.
**Decision:** Quiz and Screen Time analysis work without authentication, using anonymous `session_id` cookies. Results merge into authenticated accounts on signup.
**Consequences:**
- (+) Dramatically lower signup friction
- (+) Users experience the "aha moment" before any commitment
- (+) Anonymous usage data helps validate the discovery engine before users sign up
- (-) Slightly more complex data model (nullable `user_id` on quiz_results, screentime_analyses)
- (-) Session merge logic needed on first login
- (-) Potential for orphaned anonymous data (mitigated by TTL-based purge)

### ADR-006: REST-ish Route Handlers over tRPC/GraphQL

**Status:** Accepted
**Context:** 15-20 API endpoints, single frontend consumer, small team.
**Decision:** Next.js Route Handlers with Zod validation. No tRPC, no GraphQL.
**Consequences:**
- (+) Zero additional abstraction. Engineers understand fetch + Zod immediately.
- (+) Route Handlers can return streaming responses (SSE) for chat.
- (+) Fewer dependencies.
- (-) No automatic type inference across client/server boundary (manual type sharing via shared Zod schemas).
- (-) If we add a mobile client, we need to document the API (OpenAPI or similar).

### ADR-007: Process-and-Discard Privacy Architecture

**Status:** Accepted
**Context:** GDPR compliance, Finnish DPA jurisdiction, "data never leaves your device" marketing promise for Takeout parsing.
**Decision:** Raw data is ephemeral (max 1-hour retention). Only derived insights (ActivitySignals, AutomationOpportunities) are persisted. LLM prompts/responses are never stored.
**Consequences:**
- (+) GDPR compliance is structural, not bolted on
- (+) Smaller data footprint = lower storage cost
- (+) Strong privacy marketing angle
- (-) Cannot retroactively re-analyze raw data if the algorithm improves
- (-) Debugging data quality issues is harder without raw data
**Mitigation:** For debugging, we log signal metadata (counts, categories, confidence scores) without raw content. This is sufficient to diagnose pipeline issues.

---

## 8. PoC vs MVP Boundary

### PoC — "Does the discovery engine work?" (2 weeks)

**Goal:** Prove that the effort escalation funnel (quiz → screenshot → insights) produces valuable, personalized automation suggestions.

**In scope:**
- Pick Your Pain quiz with real suggestion matching (upgraded from current static quiz)
- Screen Time screenshot OCR via Claude Vision (replace current mock data)
- Combined result: "Based on your quiz + screenshot, here are your top 3 automation opportunities"
- Email capture (existing, via Resend)
- No authentication — everything runs on anonymous sessions
- No database — results stored in-memory or localStorage (client-side)
- No billing

**Not in scope:** Chat discovery, Takeout parsing, Chrome extension, auth, payments, dashboards.

**Success metrics:**
- 50+ people complete quiz + screenshot upload
- >60% say the suggestions are "relevant" or "very relevant" (feedback survey)
- >20% share their Time X-Ray results (screenshot or link)

**Infrastructure:** Current Vercel deployment + Anthropic API key. No new services.

**Cost:** ~$0 infrastructure + ~$5-10 in Claude API calls for 50-100 users.

### MVP — "Will people pay for this?" (4 additional weeks)

**Goal:** First paying users. The full discovery pipeline with saved results, conversational discovery, and a payment gate.

**In scope (additive on top of PoC):**
- **Auth:** Auth.js with Google OAuth (or magic links for speed)
- **Database:** Neon Postgres with full schema
- **Conversational Discovery:** Chat-based discovery with LLM (Claude Sonnet)
- **Google Takeout upload:** Client-side parsing with server-side analysis
- **Time X-Ray report:** Full personalized report with data from all sources
- **Insights dashboard:** Ranked automation opportunities with accept/dismiss
- **Billing:** Stripe Checkout for Starter tier ($X/month)
- **GDPR endpoints:** Export + erasure
- **Data retention:** Automated purge jobs
- **Session merging:** Anonymous PoC results linked to authenticated accounts

**Not in scope:** Chrome extension, Apple Health, Meta/Instagram data, Concierge tier (manual, handled via email), weekly tips automation.

**Success metrics:**
- 10+ paying subscribers within 30 days of MVP launch
- <5 min from landing to seeing first automation suggestion
- 0 GDPR complaints

**Infrastructure adds:** Neon Postgres, Stripe, Inngest (if needed for Takeout), Sentry.

**Cost:** ~$0-25/mo at <100 users (all free tiers).

### The Sharp Line

| Feature | PoC | MVP |
|---------|:---:|:---:|
| Quiz | Yes | Yes |
| Screen Time OCR (real, not mock) | Yes | Yes |
| Email capture | Yes (existing) | Yes |
| Auth (Google/magic link) | No | Yes |
| Database | No | Yes |
| Discovery Chat | No | Yes |
| Takeout parsing | No | Yes |
| Time X-Ray report | Basic | Full |
| Insights dashboard | No | Yes |
| Billing (Stripe) | No | Yes |
| GDPR endpoints | No | Yes |
| Data purge | N/A | Yes |
| Chrome extension | No | No (post-MVP) |
| Concierge tier | No | Manual (email) |

---

## 9. Cost Estimate

### At 0 Users (Development)

| Service | Cost |
|---------|------|
| Vercel (Hobby) | $0 |
| Neon Postgres (Free) | $0 |
| Anthropic API | $0 (no calls) |
| Stripe | $0 (no transactions) |
| Inngest (Free) | $0 |
| Resend (Free: 3K emails/mo) | $0 |
| Sentry (Free: 5K events/mo) | $0 |
| Domain (meldar.ai) | ~$15/yr (already paid) |
| **Total** | **~$0/mo** |

### At 100 Users (Early MVP)

| Service | Usage | Cost |
|---------|-------|------|
| Vercel (Pro) | ~10K function invocations | $20/mo |
| Neon Postgres | ~50 MB storage, light compute | $0 (free tier) |
| Anthropic API | ~100 full discoveries @ $0.15 | $15/mo |
| Stripe | ~10 transactions @ 2.9% + $0.30 | ~$5/mo in fees |
| Inngest | ~500 job runs | $0 (free tier) |
| Resend | ~300 emails | $0 (free tier) |
| Sentry | ~1K events | $0 (free tier) |
| **Total** | | **~$40/mo** |

### At 1,000 Users (Growing)

| Service | Usage | Cost |
|---------|-------|------|
| Vercel (Pro) | ~100K function invocations | $20/mo (generous included) |
| Neon Postgres (Launch) | ~500 MB storage, moderate compute | $19/mo |
| Anthropic API | ~1,000 discoveries @ $0.15 | $150/mo |
| Stripe | ~100 transactions | ~$50/mo in fees |
| Inngest (Pro) | ~5K job runs | $0-25/mo |
| Resend | ~3K emails | $0 (free tier) |
| Sentry (Team) | ~10K events | $26/mo |
| Vercel Blob | ~10 GB temp storage | ~$3/mo |
| **Total** | | **~$290/mo** |

### Cost Sanity Check

At 1,000 users, if 10% pay $9.99/mo (Starter tier):
- Revenue: 100 x $9.99 = **$999/mo**
- Cost: **$290/mo**
- Gross margin: **~71%**

At 5% conversion: $500/mo revenue vs $290/mo cost. Still viable. The biggest variable cost is Claude API — if we can reduce the average discovery cost from $0.15 to $0.08 (more Haiku, less Sonnet), 1,000-user costs drop to ~$220/mo.

---

## Open Questions for Cross-Team Review

1. **For AI Team:** Is Claude Haiku 4.5 sufficient for Screen Time OCR across dark mode, non-English, various iOS versions? Or do we need Sonnet for accuracy?

2. **For Frontend Team:** The "session merging" pattern (anonymous → authenticated) — how does this interact with the existing FSD architecture? Do we need a `session` entity in `entities/`?

3. **For DevOps/Infra Team:** Vercel function timeout is 60s on Pro. Google Takeout ZIPs can be 2GB. Do we need Inngest from day 1, or can we limit accepted ZIP size for MVP (e.g., 500MB)?

4. **For Business Team:** What's the Starter tier price? $4.99, $9.99, $14.99? This affects the cost model significantly. Also: do we gate Screen Time OCR behind auth, or keep it free to maximize top-of-funnel?

5. **For all:** The "client-side Takeout parsing" promise from the discovery docs — is this still the plan? Server-side parsing is simpler to build but contradicts the "data never leaves your device" messaging. Hybrid approach: parse client-side, send only derived signals to server?

---

*This is iteration 1. Bring your objections.*
