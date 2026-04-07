# Architecture — Final (Iteration 3)

**Authors:** Software Architect + Backend Architect
**Date:** 2026-03-30
**Status:** Final — ready for unified synthesis
**Guiding Principle:** "We wanna be making money." Every decision evaluated through: does this help us charge money sooner?

---

## 1. System Architecture

### Modular Monolith on Next.js — Single Vercel Deployment

```
┌──────────────────────────────────────────────────────────────────┐
│                       Vercel Edge Network                        │
│                       (CDN, SSL, DDoS)                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                   Next.js 16 Application                         │
│                   (App Router, RSC, TypeScript strict)            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Pages (RSC)                                               │   │
│  │  /              Landing (10 sections)                      │   │
│  │  /quiz          Pick Your Pain                             │   │
│  │  /quiz/results  Suggestions + screenshot upsell            │   │
│  │  /xray          Screenshot upload + live analysis          │   │
│  │  /xray/[id]     Shareable Time X-Ray result                │   │
│  │  /xray/[id]/og  Dynamic OG image (Edge, Satori)            │   │
│  │  /login         Magic link (MVP)                           │   │
│  │  /dashboard     Authenticated hub (MVP)                    │   │
│  │  /about         "Built by 12 seniors" story (MVP)          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  API Routes (Route Handlers)                               │   │
│  │                                                            │   │
│  │  POST /api/subscribe              Email capture (Resend)   │   │
│  │  POST /api/quiz/submit            Quiz results → DB        │   │
│  │  POST /api/analyze-screenshot     Claude Vision OCR        │   │
│  │  POST /api/billing/checkout       Stripe Checkout session  │   │
│  │  POST /api/billing/webhook        Stripe event handler     │   │
│  │  GET  /api/xray/[id]              Fetch X-Ray data         │   │
│  │  ─── MVP additions ───                                     │   │
│  │  POST /api/auth/[...nextauth]     Auth.js (magic link)     │   │
│  │  POST /api/discovery/chat         LLM chat (SSE stream)    │   │
│  │  POST /api/upload/takeout         Takeout aggregates       │   │
│  │  GET  /api/insights               User's opportunities     │   │
│  │  PATCH /api/insights/[id]         Accept/dismiss            │   │
│  │  POST /api/billing/checkout       + subscription mode      │   │
│  │  GET  /api/user/export            GDPR data export         │   │
│  │  DELETE /api/user/data            GDPR erasure             │   │
│  │  POST /api/cron/purge             Scheduled cleanup        │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Server Layer (src/server/) — NEVER imported by client     │   │
│  │                                                            │   │
│  │  db/                                                       │   │
│  │    schema.ts          Drizzle schema (all tables)           │   │
│  │    client.ts          Neon serverless connection            │   │
│  │    migrations/        SQL migrations (drizzle-kit)          │   │
│  │  discovery/                                                │   │
│  │    ocr.ts             Claude Vision screenshot extraction   │   │
│  │    insights.ts        Rule-based insight generation (PoC)   │   │
│  │    analysis.ts        Three-pass pattern engine (MVP)       │   │
│  │    chat.ts            Conversational discovery LLM (MVP)    │   │
│  │    takeout.ts         Takeout aggregate processing (MVP)    │   │
│  │  billing/                                                  │   │
│  │    stripe.ts          Checkout session + webhook handler    │   │
│  │  identity/                                                 │   │
│  │    auth.ts            Auth.js config (MVP)                  │   │
│  │  lib/                                                      │   │
│  │    anthropic.ts       Anthropic client singleton            │   │
│  │    rate-limit.ts      Upstash Redis rate limiter            │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
  │ Neon       │ │ Anthropic  │ │ Stripe     │ │ Upstash    │
  │ Postgres   │ │ Claude API │ │            │ │ Redis      │
  │ (Frankfurt)│ │            │ │ Checkout + │ │            │
  │            │ │ Haiku 4.5  │ │ Webhooks   │ │ Rate limit │
  │ Free tier  │ │ Vision     │ │            │ │ Cost track │
  └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### Bounded Contexts

| Context | PoC Scope | MVP Additions | External Services |
|---------|-----------|---------------|-------------------|
| **Discovery** | Quiz scoring, screenshot OCR, rule-based insights, X-Ray result storage | Chat discovery (LLM), Takeout analysis, pattern engine, automation opportunities | Anthropic Claude API |
| **Identity** | Email capture only (Resend as subscriber DB) | Magic link auth (Auth.js + Resend EmailProvider), user profiles, consent records | Resend |
| **Billing** | Stripe Checkout (one-time: Time Audit EUR 29, App Build EUR 49), webhook handler, Founding 50 coupon | Subscriptions (Starter EUR 9/mo, Concierge EUR 199/mo), usage metering | Stripe |
| **Advice/Content** | Manual audit delivery (founder-driven) | Weekly playbook (email), automated Time Audit reports | None (MDX content in repo) |

**Rule:** Discovery is the "god context" — all custom logic lives here. Identity, Billing, and Content are thin wrappers around external services.

---

## 2. Database Design

### Neon Postgres — Frankfurt Region, Serverless

**Connection:** `@neondatabase/serverless` HTTP driver. Works in Vercel Serverless Functions without connection pooling. Scales to zero when idle.

**ORM:** Drizzle ORM with `drizzle-kit` for migrations. Type-safe schema, zero runtime overhead.

### PoC Schema (3 tables)

```sql
-- ==============================================
-- TABLE 1: X-Ray Results
-- The product data. Needed for shareable URLs,
-- OG images, and linking quiz → screenshot → audit.
-- ==============================================

CREATE TABLE xray_results (
  id TEXT PRIMARY KEY,                     -- nanoid (12 chars, URL-safe)
  email TEXT,                              -- nullable, captured after X-Ray
  quiz_pains TEXT[],                       -- selected pain point IDs from quiz
  apps JSONB NOT NULL,                     -- [{name: "Instagram", hours: 2.3, category: "social"}]
  total_hours FLOAT NOT NULL,
  top_app TEXT NOT NULL,
  pickups INT,                             -- nullable (iOS only)
  insight TEXT NOT NULL,                   -- rule-based insight text
  suggestions JSONB,                       -- matched automation suggestions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days'
);

CREATE INDEX idx_xray_expires ON xray_results(expires_at);

-- ==============================================
-- TABLE 2: Audit Orders
-- Links Stripe payment to audit delivery status.
-- Stripe is the payment source of truth; this
-- table tracks fulfillment only.
-- ==============================================

CREATE TABLE audit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,                 -- from Stripe webhook
  product TEXT NOT NULL,                   -- 'time_audit' | 'app_build'
  amount_cents INT NOT NULL,               -- 2900 for EUR 29
  currency TEXT NOT NULL DEFAULT 'eur',
  xray_id TEXT REFERENCES xray_results(id),-- link to their X-Ray
  status TEXT NOT NULL DEFAULT 'paid',     -- 'paid' | 'in_progress' | 'delivered'
  delivered_at TIMESTAMPTZ,
  notes TEXT,                              -- founder notes on audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_email ON audit_orders(email);

-- ==============================================
-- TABLE 3: Subscribers
-- Denormalized from Resend for query convenience.
-- Resend remains the email source of truth.
-- ==============================================

CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'landing',  -- 'landing' | 'xray' | 'quiz' | 'checkout'
  xray_id TEXT REFERENCES xray_results(id),-- which X-Ray led to signup
  founding_member BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
```

**Why 3 tables, not 2:**

The subscribers table was initially cut in the cross-review ("Resend is the subscriber DB"). But we need it because:
1. We need to query "how many founding members?" without calling the Resend API.
2. We need to link subscribers to their X-Ray results (which X-Ray converted them).
3. We need the `source` field for conversion analytics ("did they sign up from the landing page, quiz, or X-Ray?").

The table is tiny (one row per subscriber) and duplicates only the email. Resend remains the email delivery system; this table is for analytics and linking.

### MVP Schema (adds 7 tables)

```sql
-- ==============================================
-- IDENTITY (MVP)
-- ==============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  tier TEXT NOT NULL DEFAULT 'free',       -- 'free' | 'starter' | 'concierge'
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth.js adapter tables (accounts, sessions, verification_tokens)
-- Generated by @auth/drizzle-adapter. Schemas defined in src/server/db/schema.ts.

-- ==============================================
-- DISCOVERY (MVP)
-- ==============================================

CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  phase TEXT NOT NULL DEFAULT 'context',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE discovery_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES discovery_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                      -- 'user' | 'assistant'
  content TEXT NOT NULL,
  extracted_signals JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                    -- 'quiz' | 'screentime' | 'takeout' | 'chat'
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT,
  estimated_minutes_per_occurrence INT,
  occurrences_per_week FLOAT,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

CREATE TABLE automation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_weekly_minutes_saved INT NOT NULL,
  complexity TEXT NOT NULL,                -- 'simple' | 'moderate' | 'complex'
  data_sources TEXT[] NOT NULL,
  confidence FLOAT NOT NULL,
  signal_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',-- 'suggested' | 'accepted' | 'dismissed' | 'built'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- BILLING (MVP — extends PoC audit_orders)
-- ==============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'past_due' | 'canceled'
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- MVP INDEXES
-- ==============================================

CREATE INDEX idx_activity_signals_user ON activity_signals(user_id);
CREATE INDEX idx_activity_signals_expires ON activity_signals(expires_at);
CREATE INDEX idx_automation_opportunities_user ON automation_opportunities(user_id);
CREATE INDEX idx_discovery_messages_session ON discovery_messages(session_id);
```

### MVP Migration Path

PoC tables (`xray_results`, `audit_orders`, `subscribers`) survive into MVP. When `users` table is added:
1. Add `user_id UUID REFERENCES users(id)` column to `xray_results` (nullable, backfilled on login).
2. Add `user_id` column to `audit_orders` (nullable, linked when user claims their audit).
3. `subscribers` table merges into `users` via a migration script: for each subscriber, create a user row if one doesn't exist.
4. Authenticated users' X-Ray results get `expires_at` set to NULL (permanent storage).

### Data Retention Policy

| Data | Retention | Mechanism |
|------|-----------|-----------|
| Anonymous X-Ray results | 30 days | `expires_at` column, cron purge |
| Authenticated X-Ray results | Until account deletion | `expires_at = NULL` |
| Audit orders | 6 years | Finnish accounting law (Kirjanpitolaki 2:10) |
| Subscribers | Until unsubscribe/deletion | Manual or GDPR request |
| Chat messages (MVP) | 30 days | Cron purge |
| Activity signals (MVP) | 7 days | `expires_at` column, cron purge |
| Automation opportunities (MVP) | Until user deletes | User-controlled |
| Uploaded screenshots | 0 seconds (in-memory only) | Serverless function lifecycle |

---

## 3. API Design

### Validation Pattern

Every route handler follows this structure:

```typescript
// src/app/api/example/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  // ...
});

export async function POST(request: Request) {
  // 1. Parse + validate
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  // 2. Rate limit check (Upstash)
  // 3. Business logic (call src/server/ functions)
  // 4. Return response

  return NextResponse.json({ data: result });
}
```

### Error Response Format (all endpoints)

```json
{
  "error": {
    "code": "VALIDATION_ERROR | RATE_LIMITED | NOT_FOUND | UNAUTHORIZED | INTERNAL_ERROR",
    "message": "Human-readable message for the UI"
  }
}
```

### PoC Endpoints — Detailed Specs

#### `POST /api/quiz/submit`

```typescript
// Request
{
  sessionId: string,         // client-generated UUID
  selectedPains: string[],   // 1-12 pain point IDs from entities/pain-points
  email?: string             // optional, if captured during quiz
}

// Response
{
  suggestions: Array<{
    id: string,
    title: string,            // "Meal planner"
    description: string,
    matchedPains: string[],
    complexity: "simple" | "moderate" | "complex"
  }>,
  sessionId: string
}
```

Does NOT require auth. Writes to `xray_results` if email is provided (to link quiz → X-Ray later).

#### `POST /api/analyze-screenshot`

```typescript
// Request: FormData with 'screenshot' file
// Max 10 MB, image/* only

// Response
{
  xrayId: string,            // nanoid, used for /xray/[id] URL
  apps: Array<{
    name: string,             // "Instagram" — specific names, not categories
    usageMinutes: number,
    category: string
  }>,
  totalScreenTimeMinutes: number,
  topApp: string,
  pickups: number | null,
  insight: string,            // rule-based insight
  suggestions: Array<{...}>,  // matched automations
  confidence: "high" | "medium" | "low"
}
```

Processing: receive file → client has already compressed (browser-image-compression) → base64 → Claude Haiku Vision (tool_use for structured output) → Zod validate → generate rule-based insights → write to `xray_results` → return response. Image never stored.

#### `POST /api/billing/checkout`

```typescript
// Request
{
  product: "time_audit" | "app_build",
  email: string,              // pre-fill Stripe Checkout
  xrayId?: string             // link purchase to their X-Ray
}

// Response
{
  checkoutUrl: string         // Stripe-hosted checkout URL
}
```

Creates a Stripe Checkout session with `mode: 'payment'`. Includes `metadata: { product, email, xrayId }` for webhook processing. Uses Stripe Tax for EU VAT.

#### `POST /api/billing/webhook`

```typescript
// Request: raw body (Stripe webhook payload)
// Header: stripe-signature (verified with STRIPE_WEBHOOK_SECRET)

// Handles:
// - checkout.session.completed → create audit_orders row
// - checkout.session.expired → no-op (user didn't complete)
```

Webhook signature verification uses `stripe.webhooks.constructEvent()`. On `checkout.session.completed`:
1. Extract `metadata.product`, `metadata.email`, `metadata.xrayId` from session.
2. Insert row into `audit_orders` with `status: 'paid'`.
3. Send notification email to founder via Resend: "New paid audit: {email}".
4. Send confirmation email to customer: "Your Time Audit is on its way."

#### `GET /api/xray/[id]`

```typescript
// Response
{
  id: string,
  apps: Array<{name, usageMinutes, category}>,
  totalScreenTimeMinutes: number,
  topApp: string,
  pickups: number | null,
  insight: string,
  suggestions: Array<{...}>,
  createdAt: string
}
```

Public endpoint. No auth. Returns 404 if X-Ray has expired (past `expires_at`).

### MVP Endpoints — Key Additions

| Endpoint | Purpose | Auth? | Streaming? |
|----------|---------|:-----:|:----------:|
| `POST /api/auth/[...nextauth]` | Auth.js magic link | No | No |
| `POST /api/discovery/chat` | Conversational discovery | Yes | SSE |
| `POST /api/upload/takeout` | Client-side Takeout aggregates | Yes | No |
| `GET /api/insights` | User's automation opportunities | Yes | No |
| `PATCH /api/insights/[id]` | Accept/dismiss opportunity | Yes | No |
| `POST /api/billing/checkout` | + `mode: 'subscription'` | Yes | No |
| `GET /api/user/export` | GDPR data export (JSON) | Yes | No |
| `DELETE /api/user/data` | GDPR full erasure | Yes | No |
| `POST /api/cron/purge` | Scheduled cleanup (Vercel Cron) | Internal | No |

---

## 4. Auth Strategy

### Phase 1 — PoC: No Auth

Email is the identity anchor. Collected via:
1. Email capture form (existing `POST /api/subscribe`).
2. Pre-filled in Stripe Checkout (from step 1 or entered at checkout).
3. Optionally captured after viewing X-Ray results.

No sessions. No cookies (beyond existing analytics consent). No login flow.

**Identity linking:** When a user provides their email at any touchpoint, we check if a subscriber row exists. If yes, link their X-Ray. If no, create one.

### Phase 2 — MVP: Magic Link via Auth.js v5

```
User enters email → Auth.js sends magic link via Resend → Click link
→ Auth.js creates session (httpOnly cookie, 30-day duration)
→ Redirect to /dashboard (or deep link back to previous page)
```

**Config:** `src/server/identity/auth.ts`

```typescript
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/server/db/client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    EmailProvider({
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await resend.emails.send({
          from: 'Meldar <login@meldar.ai>',
          to: email,
          subject: 'Sign in to Meldar',
          html: `<a href="${url}">Click here to sign in</a>. This link expires in 15 minutes.`,
        });
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: '/login' },
});
```

**Session merging on first login:**
1. On login, check if `subscribers` row exists for this email.
2. If yes, create `users` row from subscriber data. Link existing X-Ray results (`UPDATE xray_results SET user_id = ? WHERE email = ?`).
3. If a Stripe customer exists for this email, link it to the user.

### Phase 3 — Post-MVP: Google OAuth

Added ONLY when Google service connections (Calendar, Gmail) are implemented. At that point, "Sign in with Google to connect your Calendar" is a coherent UX. Until then, Google OAuth contradicts the "take back your data" positioning.

---

## 5. Infrastructure

### Service Stack (Complete)

| Service | Purpose | PoC Tier | MVP Tier | Cost (1000 users) |
|---------|---------|----------|----------|-------------------|
| **Vercel** | Hosting, CDN, serverless functions | Hobby (free) | Pro ($20/mo) | $20/mo |
| **Neon Postgres** | Database (Frankfurt, EU) | Free (512 MB) | Launch ($19/mo) | $19/mo |
| **Anthropic Claude** | Screenshot OCR (Haiku), narratives (Sonnet) | Pay-per-use | Pay-per-use | ~$6/mo (screenshots) + $50/mo (Sonnet narratives) |
| **Stripe** | Payments, VAT, checkout | Pay-per-use | Pay-per-use | ~$40/mo in fees |
| **Resend** | Email (transactional + magic link + marketing) | Free (3K/mo) | Free (3K/mo) | $0 (or $20 if >3K) |
| **Upstash Redis** | Rate limiting + cost tracking | Free (10K cmd/day) | Free | $0 |
| **Sentry** | Error tracking | Free (5K events/mo) | Free | $0 |
| **Better Stack** | Uptime monitoring | Free (5 monitors) | Free | $0 |
| **Total** | | **~$0-5/mo** | **~$40/mo** | **~$135-155/mo** |

### Environment Variables (Complete List)

```bash
# === EXISTING ===
NEXT_PUBLIC_GA_ID=G-5HB6Q8ZVB8          # Client-side, GA measurement ID

# === POC (add these) ===
RESEND_API_KEY=re_xxx                    # Server-side, Resend email
DATABASE_URL=postgresql://...@...neon.tech/meldar  # Server-side, Neon connection
ANTHROPIC_API_KEY=sk-ant-xxx             # Server-side, Claude Vision API
STRIPE_SECRET_KEY=sk_live_xxx            # Server-side, Stripe API
STRIPE_WEBHOOK_SECRET=whsec_xxx          # Server-side, Stripe webhook verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Client-side, Stripe.js (if needed)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io   # Server-side, rate limiting
UPSTASH_REDIS_REST_TOKEN=xxx             # Server-side, rate limiting
SENTRY_DSN=https://xxx@sentry.io/yyy     # Client + Server, error tracking

# === MVP (add these) ===
AUTH_SECRET=xxx                          # Server-side, Auth.js session encryption (32+ chars)
ENCRYPTION_KEY=xxx                       # Server-side, AES-256 for sensitive DB fields (32 bytes hex)
SENTRY_AUTH_TOKEN=sntrys_xxx             # CI only, source map uploads
```

All secrets stored in Vercel dashboard (production + preview). `.env.local` for local dev. `.env.example` committed to git with placeholder values.

### File Structure (New Server-Side Additions)

```
src/
  server/                                # NEW: all server-side logic
    db/
      schema.ts                          # Drizzle schema (PoC: 3 tables)
      client.ts                          # Neon serverless connection
      migrations/                        # drizzle-kit generated
    discovery/
      ocr.ts                            # Claude Vision screenshot → structured data
      insights.ts                        # Rule-based insight generation
      quiz-matcher.ts                    # Quiz pain → suggestion matching
    billing/
      stripe.ts                          # createCheckoutSession, handleWebhook
    identity/
      auth.ts                            # Auth.js config (MVP)
    lib/
      anthropic.ts                       # Anthropic client singleton
      rate-limit.ts                      # Upstash rate limiter
  app/
    api/
      analyze-screenshot/route.ts        # MODIFY: replace mock with real OCR
      subscribe/route.ts                 # MODIFY: also write to subscribers table
      quiz/submit/route.ts              # NEW: quiz results endpoint
      billing/checkout/route.ts         # NEW: Stripe Checkout
      billing/webhook/route.ts          # NEW: Stripe webhook
      xray/[id]/route.ts               # NEW: fetch X-Ray data
    xray/
      page.tsx                           # NEW: screenshot upload page
      [id]/
        page.tsx                         # NEW: shareable X-Ray result
        og/route.tsx                     # NEW: dynamic OG image
    quiz/
      results/page.tsx                   # NEW: quiz results + upsell
```

---

## 6. Architectural Decision Records (Final)

### ADR-001: Modular Monolith

**Decision:** Single Next.js application on Vercel. All bounded contexts in `src/server/`.
**Rationale:** 1-2 person team. Zero inter-service latency. $0 infrastructure on free tiers. FSD layer system enforces boundaries.
**Reversibility:** High. Any context can be extracted to a standalone service by moving the directory and adding an HTTP interface.

### ADR-002: Neon Postgres + Drizzle

**Decision:** Neon serverless Postgres (Frankfurt) with Drizzle ORM.
**Rationale:** True serverless (scales to zero = $0 idle). EU region for GDPR. Database branching for PR previews. Standard Postgres — zero lock-in.
**Rejected:** Supabase (adds unneeded features + higher cost), Vercel Postgres (smaller free tier, same Neon underneath), DynamoDB (wrong data model for relational queries).

### ADR-003: Magic Link Auth (MVP), No Auth (PoC)

**Decision:** PoC uses email as identity (no login). MVP uses Auth.js v5 with Resend EmailProvider (magic link). Google OAuth deferred to post-MVP.
**Rationale:** "Take back your data from Google" while signing in with Google is contradictory. Magic link uses Resend (already integrated). Zero friction for Gen Z (no password to remember).
**Rejected:** Google OAuth (positioning conflict), Clerk (unnecessary cost and dependency), email+password (friction, security surface area).

### ADR-004: Upstash QStash for Async Jobs (MVP)

**Decision:** PoC has no async jobs (everything synchronous). MVP uses Upstash QStash for Takeout processing and scheduled purge.
**Rationale:** Same vendor as Upstash Redis (rate limiting). Simpler than Inngest. HTTP-based, works natively with Vercel serverless.
**Rejected:** Inngest (heavier, separate vendor), BullMQ (requires Redis infrastructure), Vercel Cron alone (no event-driven jobs, no retries).

### ADR-005: Database in PoC

**Decision:** PoC includes Neon Postgres with 3 tables (xray_results, audit_orders, subscribers).
**Rationale:** Stripe webhooks need a landing zone. Shareable X-Ray URLs need persistent data. Founding 50 tracking needs a counter. Cost: $0 (Neon free tier).
**Previous position:** "No DB for PoC." Overridden by revenue-first directive and cross-team alignment.

### ADR-006: REST-ish Route Handlers

**Decision:** Next.js Route Handlers with Zod validation. No tRPC, no GraphQL.
**Rationale:** 15-20 endpoints, single consumer (our frontend), small team. Route Handlers support SSE streaming for chat. Zero additional abstraction.
**Future consideration:** If we add a mobile client, document the API with OpenAPI.

### ADR-007: Process-and-Discard Privacy

**Decision:** Screenshots processed in serverless function memory (~3-5 seconds), never written to disk, database, or blob storage. Only derived insights persist.
**Rationale:** GDPR compliance is structural, not policy-based. The serverless function lifecycle enforces deletion — the function's memory is freed when the response completes.
**Privacy claim:** "Processed in server memory (~3-5 sec), never written to disk/DB/storage."

### ADR-008: Stripe in PoC (Revenue Before Features)

**Decision:** Stripe Checkout for one-time payments is PoC-critical infrastructure, not an MVP feature.
**Rationale:** Founder directive: "We wanna be making money." A working payment flow with manually-delivered service is more valuable than a perfect product with no revenue.
**Implementation:** `mode: 'payment'` for PoC (one-time). `mode: 'subscription'` added in MVP. Same webhook handler, same table.

### ADR-009: Client-Side Image Compression

**Decision:** Image compression done in the browser (browser-image-compression library) before upload. No server-side `sharp`.
**Rationale:** Eliminates 5-8 MB native dependency from serverless bundle. Eliminates 200-400ms cold start penalty. Client-side resize to max 1568px edge is sufficient for Claude Vision. Zero server cost.
**Rejected:** `sharp` server-side (native binary, bundle bloat, cold start latency).

---

## 7. Three-Phase Deliverables (Architecture Cluster)

### Phase 1: PoC Technical Build (Weeks 1-2)

| Week | Deliverable | Files | Dependencies |
|------|-------------|-------|-------------|
| **W1 Day 1** | Neon Postgres setup + Drizzle schema (3 tables) | `src/server/db/schema.ts`, `src/server/db/client.ts`, `drizzle.config.ts` | Neon account created |
| **W1 Day 1** | Stripe Checkout endpoint | `src/app/api/billing/checkout/route.ts`, `src/server/billing/stripe.ts` | Stripe account + products created (business team) |
| **W1 Day 1** | Stripe webhook endpoint | `src/app/api/billing/webhook/route.ts` | Stripe webhook secret configured in Vercel |
| **W1 Day 2** | Upstash Redis rate limiter | `src/server/lib/rate-limit.ts` | Upstash account (ops team) |
| **W1 Day 2** | Anthropic client singleton | `src/server/lib/anthropic.ts` | API key in Vercel env vars |
| **W1 Day 2** | Replace mock OCR with real Claude Vision | `src/app/api/analyze-screenshot/route.ts`, `src/server/discovery/ocr.ts` | AI team's prompt + Zod schema |
| **W1 Day 3** | Quiz submit endpoint + DB write | `src/app/api/quiz/submit/route.ts`, `src/server/discovery/quiz-matcher.ts` | Pain point data (entities/pain-points) |
| **W1 Day 3** | X-Ray data endpoint | `src/app/api/xray/[id]/route.ts` | DB schema deployed |
| **W1 Day 4** | Rule-based insight generation | `src/server/discovery/insights.ts` | OCR output schema from AI team |
| **W1 Day 5** | Sentry + env vars + `.env.example` | Config files | Sentry project created (ops team) |
| **W2** | Integration testing, edge cases, webhook testing with Stripe CLI | -- | All above |

**Architecture team delivers to other clusters:**
- Database connection + schema → Frontend needs this for X-Ray pages
- API route contracts (request/response types) → Frontend needs these for fetch calls
- Stripe webhook flow → Business team needs this to verify payment → delivery pipeline

**Architecture team needs from other clusters:**
- AI team: Claude Vision prompt, Zod schema for `ScreenTimeAnalysis`, Anthropic SDK integration pattern
- Frontend team: client-side image compression implementation (before it reaches our API)
- Business team: Stripe product IDs, coupon codes, pricing configuration
- Ops team: Neon project URL, Upstash credentials, Sentry DSN

### Phase 2: Commercial Validation (Weeks 3-6)

Architecture team's role during validation is support, not feature development:

| Task | When | Purpose |
|------|------|---------|
| Monitor Sentry errors | Ongoing | Catch production bugs |
| Monitor Neon query performance | Weekly | Ensure DB isn't a bottleneck |
| Monitor Anthropic API costs | Weekly | Track cost per user |
| Fix webhook failures | As needed | Revenue-critical |
| Add cron-triggered purge for expired X-Rays | Week 3 | Data retention compliance |
| Add `founding_member` tracking query | Week 3 | "23 of 50 spots remaining" counter |
| Prepare MVP schema migration plan | Week 5-6 | Ready for Phase 3 |

### Phase 3: MVP Build (Weeks 7-10)

| Week | Deliverable | Files |
|------|-------------|-------|
| **W7** | Auth.js setup (magic link) + users table migration | `src/server/identity/auth.ts`, schema migration |
| **W7** | Session merging (subscriber → user, link existing X-Rays) | Migration script |
| **W7** | Auth middleware for protected routes | `src/middleware.ts` |
| **W8** | Discovery chat API (SSE streaming) | `src/app/api/discovery/chat/route.ts`, `src/server/discovery/chat.ts` |
| **W8** | Activity signals + automation opportunities tables | Schema migration |
| **W8** | Takeout aggregate processing endpoint | `src/app/api/upload/takeout/route.ts`, `src/server/discovery/takeout.ts` |
| **W9** | Three-pass pattern analysis engine | `src/server/discovery/analysis.ts` |
| **W9** | Insights endpoints (GET, PATCH) | `src/app/api/insights/route.ts`, `src/app/api/insights/[id]/route.ts` |
| **W9** | Stripe subscriptions (mode: subscription) | Update `src/server/billing/stripe.ts` |
| **W10** | GDPR endpoints (export + erasure) | `src/app/api/user/export/route.ts`, `src/app/api/user/data/route.ts` |
| **W10** | Vercel Cron purge job (chat messages, signals) | `src/app/api/cron/purge/route.ts`, `vercel.json` cron config |
| **W10** | Upstash QStash for async Takeout processing | Integration |

---

## 8. Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Vercel Hobby function timeout (10s) on Stripe webhook + email send | Medium | High (lost payment) | Webhook handler does DB write first (fast), email send second. If email fails, payment is still recorded. Upgrade to Pro ($20/mo) if timeout persists. |
| Neon cold start adds 300-500ms to first DB query | Medium | Low | Neon has connection warming. For PoC traffic, cold starts are infrequent. |
| Claude Vision OCR accuracy on non-English / dark mode screenshots | Medium | Medium | Rule-based insight generation works even with partial data. `confidence: "low"` triggers "try again" UX, not a hard failure. |
| Stripe Checkout email differs from signup email (identity mismatch) | Medium | Low | Pre-fill Checkout with captured email. Store both emails in `audit_orders`. Reconcile manually during PoC. |
| Orphaned anonymous X-Ray data accumulates | Low | Low | 30-day TTL + hourly cron purge. Free tier storage (512 MB) fits ~500K X-Ray rows. |
| Founder overwhelmed by manual audit delivery | High | Medium | Not an architecture risk — but architecture should track audit queue length. Add a simple admin query: `SELECT count(*) FROM audit_orders WHERE status = 'paid'`. |
| GDPR complaint before privacy policy is updated | Low | High | Privacy policy updates are a Phase 1 launch blocker. No Stripe or OCR goes live without updated privacy policy and DPA signatures. |

---

## 9. Cost Model (Revenue-Aware)

### Unit Economics

| Item | Cost | Offset |
|------|------|--------|
| 1 free X-Ray (Haiku OCR) | $0.003 | -- |
| Free X-Rays to equal 1 Time Audit sale (EUR 29) | 9,667 | Revenue covers ~10K free X-Rays |
| Free X-Rays to equal 1 App Build sale (EUR 49) | 16,333 | Revenue covers ~16K free X-Rays |
| Free X-Rays to equal 1 Concierge month (EUR 199) | 66,333 | Revenue covers ~66K free X-Rays |

**The AI cost is a rounding error.** There is zero economic reason to gate free screenshots.

### Monthly Costs by Phase

| Service | PoC (0-50 users) | Validation (50-100) | MVP (100-1000) |
|---------|:----------------:|:-------------------:|:--------------:|
| Vercel | $0 | $0 | $20 |
| Neon | $0 | $0 | $19 |
| Anthropic | $0.15 | $0.30 | $6 (Haiku) + $50 (Sonnet) |
| Stripe fees | $0-5 | $5-15 | $40 |
| Resend | $0 | $0 | $0-20 |
| Upstash | $0 | $0 | $0 |
| Sentry | $0 | $0 | $0 |
| Better Stack | $0 | $0 | $0 |
| **Total infra** | **$0-5** | **$5-15** | **$135-155** |

### Break-Even

- Infrastructure break-even at MVP: 1 Concierge subscriber (EUR 199) or 15 Starter subscribers (EUR 135) covers all costs.
- At 1000 users with 5% conversion, 50 paying users at blended EUR 15/mo = EUR 750/mo revenue vs ~EUR 150/mo cost = **80% gross margin**.

---

## 10. Launch Blockers Checklist

These items MUST be complete before the PoC goes live with payments:

- [ ] Neon Postgres project created (Frankfurt region)
- [ ] Drizzle schema deployed (3 tables)
- [ ] Stripe account configured (products, prices, Founding 50 coupon)
- [ ] Stripe Tax enabled for EU VAT
- [ ] EU OSS registered via vero.fi
- [ ] Stripe webhook endpoint deployed and tested (with Stripe CLI)
- [ ] Privacy policy updated (add Anthropic, Stripe, Neon as processors)
- [ ] Terms of service updated (AI processing disclosure, payment terms, beta disclaimer)
- [ ] DPAs signed: Anthropic, Stripe, Vercel, Resend
- [ ] 14-day withdrawal waiver checkbox in checkout flow
- [ ] All environment variables set in Vercel dashboard
- [ ] Sentry configured and verified
- [ ] Better Stack monitor on meldar.ai
- [ ] `.env.example` updated in repo
- [ ] Dead CTA links fixed (route to /quiz, not #early-access)

---

*Final architecture section. Ready for Iteration 4 synthesis.*
