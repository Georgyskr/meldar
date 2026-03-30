# MELDAR -- Unified PoC/MVP Plan

**Version:** Final Synthesis (Iteration 4)
**Date:** 2026-03-30
**Synthesized from:** Architecture, AI Pipeline, Frontend & UX, DevOps & Infrastructure, Business & GTM
**Company:** ClickTheRoadFi Oy (Y-tunnus: 3362511-1), Helsinki, Finland
**Domain:** meldar.ai

---

## 1. Executive Summary

**Meldar** helps non-technical people discover what wastes their time, then builds personal apps to fix it. "Your AI. Your app. Nobody else's."

**Target audience:** Gen Z / Gen Alpha (18-28). Use ChatGPT daily. Scared of AI complexity. Want AI for THEIR specific life, not a chatbot.

**What we're building:** A discovery engine that uses Screen Time screenshots (and later Google Takeout) to show users their Time X-Ray -- a "Spotify Wrapped for productivity." The free X-Ray is the demo. The paid Personal Time Audit (EUR 29) and App Build (EUR 49) are the revenue. Subscriptions (Starter EUR 9/mo, Concierge EUR 199/mo) follow in the MVP.

**The "12 IT Seniors" narrative:** "Meldar AI was developed in a single day with the power of 12 IT seniors." This is the marketing hook. The Trust section on the landing page gets a subsection with 12 overlapping avatar circles and "150+ years combined experience." A full `/about` page tells the story in Phase 2.

**Revenue target:**
- Phase 1 (Weeks 1-2): Stripe live, ready to accept EUR 29 payments.
- Phase 2 (Weeks 3-6): First paid Time Audits. Target: EUR 145+ (5 audits).
- Phase 3 (Weeks 7-10): First recurring revenue. Target: EUR 375+/month from 10+ subscribers.

**Guiding principle:** "We wanna be making money." Revenue is PoC-critical, not MVP-deferred.

---

## 2. Three-Phase Timeline

### Phase 1: PoC -- "Discovery + Revenue" (Weeks 1-2)

**Goal:** Prove the discovery engine works AND activate Stripe for day-1 revenue readiness.

- Fix all dead CTA links (route to `/quiz`, not `#early-access`)
- Real Claude Vision screenshot analysis (replace mock)
- Time X-Ray card with shareable URL + dynamic OG image
- Stripe Checkout for one-time payments (Time Audit EUR 29, App Build EUR 49)
- Founding 50 email capture with counter
- Neon Postgres (3 tables), Upstash Redis (rate limiting + cost ceiling)
- Privacy policy and Terms of Service updated
- DPAs signed with all 7 processors

**Exit criteria:**
- 50 email signups
- Stripe Checkout works end-to-end
- Claude Vision >90% accuracy on test screenshots
- Time X-Ray card shareable via link with OG image
- At least 3 social media shares

### Phase 2: Commercial Validation -- "First Revenue" (Weeks 3-6)

**Goal:** Founding 50 filled. First paid Time Audits. Validate willingness to pay.

- Deliver 50 free Time Audits (founder manually)
- Write and send 4 weekly playbook emails
- Create `/audit/[token]` delivery page and `/about` page
- Reddit commenting (weeks 1-4 of 8-week plan)
- TikTok first 6 videos, Twitter/X build-in-public
- GA4 conversion tracking on all funnel steps
- A/B test Founding 50 counter vs no counter

**Exit criteria:**
- 50 founding spots filled
- At least 5 paid Time Audits (EUR 145+ revenue)
- Weekly playbook open rate >40%
- At least 10 social media shares of Time X-Ray cards

### Phase 3: MVP -- "Automate + Scale" (Weeks 7-10)

**Goal:** Automate what was manual. First recurring revenue.

- Magic link auth (Auth.js + Resend)
- User dashboard (X-Ray history, settings)
- Starter subscription (EUR 9/mo) and Concierge (EUR 199/mo) via Stripe Billing
- Google Takeout upload + client-side parsing
- Automated Time X-Ray report (Sonnet 4.6)
- GDPR endpoints (data export, account deletion)
- DPIA documentation

**Exit criteria:**
- 10+ paying subscribers (any tier)
- EUR 375+/month recurring revenue
- Automated Time X-Ray generation (no manual work per user)
- NPS >40 from paying users
- 0 GDPR complaints

---

## 3. Tech Stack (Final)

### Services

| Service | Purpose | PoC Tier | MVP Tier | Cost at 1,000 users |
|---------|---------|----------|----------|---------------------|
| **Vercel** | Hosting, CDN, serverless | Hobby (free) | Pro ($20/mo) | $20/mo |
| **Neon Postgres** | Database (Frankfurt, EU) | Free (512 MB) | Launch ($19/mo) | $19/mo |
| **Anthropic Claude** | Screenshot OCR (Haiku 4.5), narratives (Sonnet 4.6) | Pay-per-use | Pay-per-use | ~$8/mo |
| **Stripe** | Payments, VAT, checkout | Pay-per-use | Pay-per-use | ~$40/mo fees |
| **Resend** | Email (transactional + marketing) | Free (3K/mo) | Free or Growth ($20) | $0-20/mo |
| **Upstash Redis** | Rate limiting + cost tracking | Free (10K cmd/day) | Free or pay-as-you-go | $0-5/mo |
| **Sentry** | Error tracking | Free (5K events/mo) | Free or Team ($26) | $0-26/mo |
| **Better Stack** | Uptime monitoring | Free (5 monitors) | Free | $0 |
| **Google Analytics 4** | Web analytics | Free | Free | $0 |
| **GitHub Actions** | CI/CD | Free (2K min/mo) | Free | $0 |

### Libraries (add to project)

```bash
# PoC dependencies
pnpm add @neondatabase/serverless drizzle-orm stripe @anthropic-ai/sdk @upstash/redis @upstash/ratelimit @sentry/nextjs nanoid browser-image-compression html-to-image

pnpm add -D drizzle-kit
```

### Complete Environment Variables

```bash
# === EXISTING ===
NEXT_PUBLIC_GA_ID=G-5HB6Q8ZVB8            # Client-side, GA measurement ID

# === POC (add these) ===
DATABASE_URL=postgresql://...@...neon.tech/meldar  # Server-side, Neon connection
RESEND_API_KEY=re_xxx                      # Server-side, Resend email
ANTHROPIC_API_KEY=sk-ant-xxx               # Server-side, Claude Vision API
STRIPE_SECRET_KEY=sk_live_xxx              # Server-side, Stripe API
STRIPE_WEBHOOK_SECRET=whsec_xxx            # Server-side, Stripe webhook verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Client-side, Stripe.js
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io   # Server-side, rate limiting
UPSTASH_REDIS_REST_TOKEN=xxx               # Server-side, rate limiting
SENTRY_DSN=https://xxx@sentry.io/yyy       # Client + Server, error tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy  # Client-side

# === MVP (add these) ===
AUTH_SECRET=xxx                            # Server-side, Auth.js session encryption (32+ chars)
SENTRY_AUTH_TOKEN=sntrys_xxx               # CI only, source map uploads
```

---

## 4. System Architecture

### Component Diagram

```
User -> Vercel Edge Network -> Next.js 16 App (App Router, RSC, TypeScript strict)
                                 |-- Static pages (SSG/ISR)
                                 |-- /api/subscribe          -> Resend API
                                 |-- /api/upload/screentime  -> Anthropic API (Haiku 4.5)
                                 |-- /api/billing/checkout   -> Stripe Checkout
                                 |-- /api/billing/webhook    -> Stripe webhook handler
                                 |-- /api/quiz/submit        -> Neon Postgres
                                 '-- Database queries        -> Neon Postgres (Frankfurt)
         |              |              |              |
         v              v              v              v
  Neon Postgres   Anthropic API   Stripe         Upstash Redis
  (Frankfurt)     (Haiku 4.5)    (Checkout +     (Rate limit +
  Free tier       Vision         Webhooks)       Cost tracking)
```

### Bounded Contexts

| Context | PoC Scope | MVP Additions | External Services |
|---------|-----------|---------------|-------------------|
| **Discovery** | Quiz scoring, screenshot OCR, rule-based insights, X-Ray result storage | Chat discovery (LLM), Takeout analysis, pattern engine | Anthropic Claude API |
| **Identity** | Email capture only (Resend as subscriber DB) | Magic link auth (Auth.js + Resend EmailProvider), user profiles | Resend |
| **Billing** | Stripe Checkout (one-time: Time Audit EUR 29, App Build EUR 49), webhook handler | Subscriptions (Starter EUR 9/mo, Concierge EUR 199/mo), usage metering | Stripe |
| **Advice** | Manual audit delivery (founder-driven) | Weekly playbook (email), automated reports | None (MDX content) |

**Rule:** Discovery is the "god context" -- all custom logic lives here. Identity, Billing, and Content are thin wrappers around external services.

### Database Schema

**ORM:** Drizzle ORM with `drizzle-kit` for migrations. Type-safe, zero runtime overhead.
**Connection:** `@neondatabase/serverless` HTTP driver. Works in Vercel Serverless Functions without connection pooling.

#### PoC Schema (3 tables)

```sql
-- TABLE 1: X-Ray Results
CREATE TABLE xray_results (
  id TEXT PRIMARY KEY,                     -- nanoid (12 chars, URL-safe)
  email TEXT,                              -- nullable, captured after X-Ray
  quiz_pains TEXT[],                       -- selected pain point IDs from quiz
  apps JSONB NOT NULL,                     -- [{name, usageMinutes, category}]
  total_hours FLOAT NOT NULL,
  top_app TEXT NOT NULL,
  pickups INT,                             -- nullable (iOS only)
  insight TEXT NOT NULL,                   -- rule-based insight text
  suggestions JSONB,                       -- matched automation suggestions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days'
);

CREATE INDEX idx_xray_expires ON xray_results(expires_at);

-- TABLE 2: Audit Orders
CREATE TABLE audit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  product TEXT NOT NULL,                   -- 'time_audit' | 'app_build'
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  xray_id TEXT REFERENCES xray_results(id),
  status TEXT NOT NULL DEFAULT 'paid',     -- 'paid' | 'in_progress' | 'delivered'
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_email ON audit_orders(email);

-- TABLE 3: Subscribers
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'landing',  -- 'landing' | 'xray' | 'quiz' | 'checkout'
  xray_id TEXT REFERENCES xray_results(id),
  founding_member BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
```

**Why 3 tables:** Stripe webhooks need persistence for payment verification. Shareable X-Ray URLs need server-side storage. Founding 50 counter needs a real count.

#### MVP Schema (adds 7 tables)

```sql
-- IDENTITY
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Auth.js adapter tables: accounts, sessions, verification_tokens (generated by @auth/drizzle-adapter)

-- DISCOVERY
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
  role TEXT NOT NULL,
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
  complexity TEXT NOT NULL,
  data_sources TEXT[] NOT NULL,
  confidence FLOAT NOT NULL,
  signal_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BILLING
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**MVP migration path:** PoC tables survive. Add `user_id UUID REFERENCES users(id)` (nullable) to `xray_results` and `audit_orders`. Merge `subscribers` into `users` via migration script.

### Data Retention Policy

| Data | Retention | Mechanism |
|------|-----------|-----------|
| Anonymous X-Ray results | 30 days | `expires_at` column, cron purge |
| Authenticated X-Ray results | Until account deletion | `expires_at = NULL` |
| Audit orders | 6 years | Finnish Kirjanpitolaki 2:10 |
| Subscribers | Until unsubscribe/deletion | Manual or GDPR request |
| Chat messages (MVP) | 30 days | Cron purge |
| Activity signals (MVP) | 7 days | `expires_at` column, cron purge |
| Uploaded screenshots | 0 seconds (in-memory only) | Serverless function lifecycle |

### API Endpoints

#### PoC Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/subscribe` | Email capture (Resend + DB) | No |
| POST | `/api/quiz/submit` | Quiz results -> suggestions | No |
| POST | `/api/upload/screentime` | Claude Vision screenshot analysis | No |
| POST | `/api/billing/checkout` | Create Stripe Checkout session | No |
| POST | `/api/billing/webhook` | Stripe event handler | Stripe signature |
| GET | `/api/xray/[id]` | Fetch X-Ray data for shareable page | No |

#### MVP Additions

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/auth/[...nextauth]` | Auth.js magic link | No |
| POST | `/api/discovery/chat` | LLM chat (SSE stream) | Yes |
| POST | `/api/upload/takeout` | Takeout aggregates | Yes |
| GET | `/api/insights` | User's automation opportunities | Yes |
| PATCH | `/api/insights/[id]` | Accept/dismiss opportunity | Yes |
| GET | `/api/user/export` | GDPR data export (JSON) | Yes |
| DELETE | `/api/user/data` | GDPR full erasure | Yes |
| POST | `/api/cron/purge` | Scheduled cleanup | Internal (Vercel Cron) |

#### Error Response Format (all endpoints)

```json
{
  "error": {
    "code": "VALIDATION_ERROR | RATE_LIMITED | NOT_FOUND | UNAUTHORIZED | INTERNAL_ERROR",
    "message": "Human-readable message for the UI"
  }
}
```

#### Validation Pattern

Every route handler: parse with Zod -> rate limit check (Upstash) -> business logic -> return response. Defined in `src/app/api/example/route.ts`.

### Auth Strategy

| Phase | Approach | Details |
|-------|----------|---------|
| **PoC** | No auth | Email is the identity anchor. Collected via email capture or Stripe Checkout `customer_email`. |
| **MVP** | Magic link (Auth.js v5 + Resend EmailProvider) | `src/server/identity/auth.ts`. Session strategy: JWT, 30-day duration. Login page: `/login`. |
| **Post-MVP** | Google OAuth (deferred) | Added ONLY when Google service connections (Calendar, Gmail) are implemented. Positioning: "take back your data from Google" conflicts with signing in with Google. |

---

## 5. AI Pipeline

### Claude Vision Integration

**Model:** `claude-haiku-4-5-20251001` (Screenshot extraction -- PoC)
**Cost per screenshot:** ~$0.003

#### Data Model

Types in `src/entities/xray-result/model/types.ts` (Zod schemas):

```typescript
// Core types (abbreviated -- see full schemas in 03-ai-pipeline-final.md)
export type AppCategory = "social" | "entertainment" | "productivity" | "communication" |
  "browser" | "health" | "finance" | "education" | "gaming" | "utility";

export type AppUsage = { name: string; usageMinutes: number; category: AppCategory };

export type Insight = {
  headline: string;      // "2.3 hours on Instagram"
  comparison: string;    // "That's 16 hours a week"
  suggestion: string;    // "Want us to build a social scheduler?"
  severity: "low" | "medium" | "high";
};

export type UpsellHook = {
  trigger: string;
  tierTarget: "audit" | "starter" | "app_build" | "concierge";
  message: string;
  urgency: "low" | "medium" | "high";
};

export type ScreenTimeExtraction = {
  apps: AppUsage[];
  totalScreenTimeMinutes: number;
  pickups: number | null;
  firstAppOpenTime: string | null;
  date: string | null;
  platform: "ios" | "android" | "unknown";
  confidence: "high" | "medium" | "low";
};
```

#### System Prompt

Stored in `src/server/discovery/prompts.ts`. ~500 tokens, qualifies for Anthropic prompt caching.

Key rules:
- Extract EVERY visible app with usage time
- App names EXACTLY as displayed
- Convert all times to minutes
- Categorize into 10 categories
- Detect platform (iOS/Android/unknown)
- Set confidence level
- Return `{ error: "not_screen_time" }` or `{ error: "unreadable" }` for invalid images
- NEVER hallucinate app names or times

#### Structured Output via Tool Use

Uses Claude's `tool_use` (function calling) to enforce JSON schema. The model is forced to call `extract_screen_time` tool -- no regex parsing. Implementation in `src/server/discovery/ocr.ts`.

#### Image Preprocessing (client-side)

**Locked decision:** Client-side compression. No `sharp` server-side.

| Constraint | Value | Reason |
|-----------|-------|--------|
| Max file size (after compression) | 2 MB | Reduce upload time + API cost |
| Max dimensions | 1568px longest edge | Claude Vision optimal resolution |
| Format | JPEG at 85% quality | Smallest for text-heavy screenshots |
| Original file size limit | 10 MB (before compression) | Reject oversized originals |

Using `browser-image-compression` in a Web Worker (non-blocking).

#### API Route

File: `src/app/api/upload/screentime/route.ts`

Flow: receive FormData -> validate (type, size) -> check rate limit (Upstash) -> check cost cap (Upstash) -> Buffer to base64 -> Claude Vision API call (~2-4 sec) -> Zod validate -> generate rule-based insights (zero AI cost) -> generate upsell hooks (zero AI cost) -> map to pain points (zero AI cost) -> track usage (Upstash) -> DISCARD image (GC) -> return JSON.

**Privacy guarantee:** Image never written to disk, database, or blob storage. Serverless function memory is freed after response.

### Rule-Based Insight Generation (PoC)

File: `src/server/discovery/insights.ts`. Zero AI cost. 4 rules:

1. **Top app insight** (always): "2.3 hours on Instagram -- that's 16 hours a week"
2. **Total screen time** (if >4h): "7.4 hours -- more than a full work day"
3. **Social media dominance** (if >2h social): "Most people underestimate this by half"
4. **Pickup frequency** (if >60): "87 pickups -- once every 11 minutes while you're awake"

### Upsell Hook Generation (PoC)

File: `src/server/discovery/upsells.ts`. Zero AI cost. Maps data to paid tier CTAs:

- High screen time (>5h) -> Time Audit EUR 29
- Dominant social app (>2h) -> App Build EUR 49
- Email app detected (>30min) -> App Build EUR 49
- Many apps (>=5) -> Starter EUR 9/mo
- High pickups (>80) -> Time Audit EUR 29

### Pain Point Mapping

File: `src/server/discovery/suggestions.ts`. Dictionary lookup from detected app names to existing `painLibrary` in `src/entities/pain-points/model/data.ts`.

### Cost Per Operation

| Task | Model | Cost/call | Phase |
|------|-------|-----------|-------|
| Screenshot extraction (OCR) | Haiku 4.5 | $0.003 | PoC |
| Rule-based insights | None (code) | $0 | PoC |
| Upsell hooks | None (code) | $0 | PoC |
| Pain point mapping | None (code) | $0 | PoC |
| Automated Time Audit narrative | Sonnet 4.6 | ~$0.02 | MVP |
| Takeout insight generation | Sonnet 4.6 | ~$0.01 | MVP |
| **Opus 4.6** | **Never used** | N/A | Never |

### Rate Limiting & Cost Controls

**Rate limits (Upstash Redis, `src/middleware.ts`):**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/upload/screentime` | 5 requests per IP | 1 minute |
| `POST /api/subscribe` | 3 requests per IP | 1 hour |
| `POST /api/quiz/submit` | 10 requests per IP | 1 minute |
| `POST /api/billing/webhook` | No limit | -- (never rate-limit Stripe) |

**Cost caps (Upstash Redis key: `usage:daily:YYYY-MM-DD`):**

| Threshold | Daily spend | Action |
|-----------|-----------|--------|
| Normal | < $50 | Serve normally |
| Soft cap | $50 - $500 | Alert founder. Keep serving. |
| Hard cap | > $500 (~167K screenshots) | Show queue UI: "Enter email, we'll send your X-Ray." |

### Error Handling Matrix

| Error | HTTP Status | User Message |
|-------|-------------|-------------|
| No file uploaded | 400 | "No file uploaded" |
| Invalid file type | 400 | "File must be JPEG, PNG, or WebP" |
| File too large | 400 | "File must be under 2 MB" |
| Not a Screen Time screenshot | 422 | "That doesn't look like a Screen Time screenshot..." |
| Image unreadable | 422 | "We couldn't read that image. Try a clearer screenshot." |
| Claude API rate limited | 503 | "We're processing a lot of requests. Try again." |
| Daily cost cap exceeded | 503 | "High demand. Enter your email and we'll send your X-Ray." |
| IP rate limited | 429 | "Too many requests. Try again in a few minutes." |

---

## 6. Frontend & UX

### Routes Per Phase

#### Phase 1: PoC (Weeks 1-2)

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing page (10 sections, CTA fixes, Founding 50) | Exists, needs CTA overhaul |
| `/quiz` | Pick Your Pain quiz + inline results | Exists, needs polish |
| `/xray` | Screenshot upload + inline X-Ray result | New |
| `/xray/[id]` | Shareable Time X-Ray result (server-rendered) | New |
| `/xray/[id]/og` | Dynamic OG image for social sharing (edge) | New |
| `/privacy-policy` | Privacy policy | Exists, needs updates |
| `/terms` | Terms of service | Exists, needs updates |

#### Phase 2: Commercial Validation (Weeks 3-6)

| Route | Purpose |
|-------|---------|
| `/audit/[token]` | Paid Time Audit delivery page (signed JWT) |
| `/about` | "Built by 12 seniors" story |

#### Phase 3: MVP (Weeks 7-10)

| Route | Purpose |
|-------|---------|
| `/login` | Magic link login |
| `/dashboard` | User hub: latest X-Ray, weekly tip, stats |
| `/dashboard/xrays` | Past Time X-Ray results |
| `/dashboard/advice` | "12 seniors" tips feed (MDX) |
| `/dashboard/settings` | Email, notifications, data deletion (GDPR) |
| `/takeout` | Google Takeout upload + client-side parsing |

### User Journey (PoC + Commercial Validation)

```
Landing page
  |
  +---> [Hero: "Join Founding 50"] -> Resend subscriber
  |
  +---> [Mid-page CTA: "See what eats your time"]
          |
          v
        /quiz -- Pick 2-5 pain points (15 sec)
          |
          v
        Quiz Results (inline) -- "~12 hrs/week recoverable"
          |
          +---> [CTA: "Get your real numbers -- 30 seconds"]
                  |
                  v
                /xray -- Screenshot upload
                  |
                  v
                Processing (3-5 sec, multi-step indicator)
                  |
                  v
                Time X-Ray result (inline, saved to DB)
                  |
                  +---> [Share button] --> /xray/[id]
                  +---> [CTA: "Personal Time Audit -- EUR 29"] -> Stripe Checkout
                  +---> [CTA: "Join Founding 50 and get it free"] -> Email capture
                  +---> [CTA: "Upload another screenshot"] -> New analysis
```

### Viral Loop

```
User creates X-Ray
  --> Shares /xray/[id] to social/DM
  --> Friend sees OG card preview (dynamic image)
  --> Friend clicks --> lands on /xray/[id]
  --> "Get your own X-Ray" CTA at bottom
  --> Friend enters /quiz --> creates their own X-Ray
  --> Loop repeats
```

### CTA Strategy (Blocker #1 Fix)

**Current problem:** All CTAs link to `#early-access` which scrolls to Hero email form. Disorienting, low-context, revenue-blocking.

**New CTA mapping:**

| Section | Current CTA | New CTA | Target |
|---------|-------------|---------|--------|
| Hero | Email form | "Join Founding 50 -- Claim your spot" | Inline email (Resend) |
| Problem | None | "See what eats your time" | `/quiz` |
| How It Works | None | "Try it free" | `/quiz` |
| Data Receipt | None | "Get your own X-Ray" | `/quiz` |
| Trust | None | None (trust-building only) | N/A |
| Skills | None | "Get this built -- EUR 49" | Stripe Checkout |
| Early Adopter | Email form | Founding 50 email capture with counter | Inline email (Resend) |
| Tiers | All `#early-access` | Free: `/quiz`, Starter: Stripe, Concierge: `mailto:` | Mixed |
| FAQ | None | None | N/A |
| Final CTA | Email form | "Get your free Time X-Ray" | `/quiz` + email |

**Hierarchy principle:** Mid-page CTAs route to `/quiz` (funnel entry). The funnel delivers value THEN presents the revenue ask. Only Skills and Tiers link directly to Stripe because users reading those sections are already price-aware.

### Time X-Ray Card Design

**"Spotify Wrapped meets a lab report"** -- 440px max-width, optimized for mobile screenshot.

```
+--------------------------------------------+
|  [gradient bar: #623153 -> #FFB876]        |
|  YOUR TIME X-RAY              meldar.ai    |
+--------------------------------------------+
|  Total screen time       7.4 hrs/day       |
|  ----------------------------------------- |
|  1. Instagram                      2.3h    |
|  2. Safari                         1.8h    |
|  3. Mail                           1.2h    |
|  ----------------------------------------- |
|  Daily pickups           87                |
|  Recoverable time        ~2.1 hrs/day      |
|                                            |
|  "You check your phone 87 times a day.     |
|   Instagram alone is 16 hrs/week --        |
|   almost a part-time job."                 |
+--------------------------------------------+
|  [Share]  [Save as Image]  [Copy link]     |
+--------------------------------------------+
```

**Visual treatment:** Cream background (#faf9f6), gradient bar (#623153 -> #FFB876), Bricolage Grotesque for stat numbers, Inter 300 for body, rounded corners, subtle shadow.

**Data display:** Specific app names, not categories. "2.3 hours on Instagram" is shareable. "2.3 hours on social media" is not.

**Three rendering paths:**

| Purpose | Technology |
|---------|-----------|
| On-page display | HTML/CSS via RSC (`XRayCard.tsx`) |
| "Save as image" button | `html-to-image` library (dynamic import) |
| OG image for link previews | `next/og` ImageResponse (edge, 1200x630) |

### Below-Card Content

1. AI insight paragraph (rule-based for PoC)
2. "What Meldar would build for you" -- 2-3 automation suggestions
3. Revenue upsell block (Time Audit EUR 29 + Founding 50)
4. Trust strip: "Your screenshot was processed in ~3 seconds and deleted immediately."

### Sharing Mechanics

**Method 1 -- Link sharing (primary):**
- URL: `https://meldar.ai/xray/[id]`
- Dynamic OG meta tags with unique description per user
- Web Share API on mobile, "Copy link" fallback on desktop

**Method 2 -- Save as image (Phase 2):**
- `html-to-image` renders card to PNG
- `meldar.ai` watermark in footer

**Method 3 -- Screenshot-friendly design (passive):**
- Card at 440px fits cleanly within phone screenshot frame

### Screenshot Upload UX

**Step 1: Upload zone** -- Platform toggle (auto-detect via userAgent), privacy message always visible, min 200px height. Client-side compression before upload.

**Step 2: Processing indicator** -- Multi-step progress (not a spinner): "Detecting apps" -> "Extracting usage hours" -> "Generating your X-Ray". Timed client-side.

**Step 3: Result + deletion confirmation** -- Banner: "Screenshot deleted. Only the extracted data remains below." Auto-dismiss after 5s.

### "12 Seniors" Placement

**Trust section** (`TrustSection.tsx`): Subsection at the bottom:
```
Built in a single day by 12 senior engineers.
Refined every day since.
[12 overlapping avatar circles]
Combined experience: 150+ years
[Read our story -->]
```

**Footer** (`Footer.tsx`): One line: "Built by 12 senior engineers in Helsinki."

**/about page** (Phase 2): Full story with team details and build process.

### Founding 50 Email Capture

Enhanced component replacing generic email capture:
```
Join the Founding 50
[email input] [Claim your spot]
27 of 50 spots remaining
What you get:
+ Free Time Audit (EUR 29 value)
+ Weekly automation playbook
+ Founding pricing locked forever
```

Counter: Server-side query from Neon `subscribers` table (RSC). When count hits 50, copy changes to "Join the waitlist."

### Component Architecture (FSD)

```
src/
  entities/
    pain-points/                  # EXISTS
    xray-result/                  # NEW (PoC)
      model/types.ts              #   Zod schemas + types
      ui/XRayCard.tsx             #   Shareable card (RSC)
      ui/XRayCardActions.tsx      #   Share / Save / Copy (client)

  features/
    screenshot-upload/            # NEW (PoC)
      ui/UploadZone.tsx
      ui/ProcessingSteps.tsx
      ui/DeletionBanner.tsx
      lib/use-upload.ts
      lib/compress-image.ts
    sharing/                      # NEW (PoC)
      ui/ShareActions.tsx
      lib/use-share.ts
      lib/render-card-image.ts
    billing/                      # NEW (PoC)
      ui/PurchaseButton.tsx
      ui/FoundingCounter.tsx      # RSC
      ui/PricingCard.tsx
      lib/use-checkout.ts
    founding-program/             # NEW (PoC)
      ui/FoundingEmailCapture.tsx
    auth/                         # NEW (MVP)
      ui/LoginForm.tsx
      ui/AuthGuard.tsx

  widgets/
    landing/                      # EXISTS -- modify CTAs
    dashboard/                    # NEW (MVP)
```

### Performance Budget

| Metric | Target |
|--------|--------|
| LCP | <2.5s on 4G |
| FID / INP | <200ms |
| CLS | <0.1 |
| JS bundle (initial route) | <100KB gzip |

### Session Management

**PoC:** Anonymous `session_id` cookie. Quiz results and X-Ray analyses stored with `session_id`. No auth.

**MVP:** On magic link login, server queries all records matching current `session_id`, updates `user_id` on all matching records, redirects to `/dashboard`. Silent merge -- no "merging..." screen.

---

## 7. DevOps & Infrastructure

### Deployment Architecture

Single Next.js 16 application on Vercel. No separate backend service.

**Vercel Hobby limits (sufficient for PoC):**
- Bandwidth: 100 GB/month (~50K page views)
- Serverless execution: 100 GB-hours/month
- Serverless timeout: 60 seconds
- Build minutes: 6,000/month

**Upgrade to Vercel Pro ($20/mo) when:** Team collaboration needed, log retention > 1 hour needed, or serverless Cron with < 1-day intervals needed (typically MVP, Week 7).

### File Storage

**Decision: No file storage.** In-memory processing only. No Vercel Blob. Screenshots processed entirely in serverless function memory (~500KB-3MB), base64 encoded, sent to Claude Vision, JSON response returned, buffer garbage collected. Image never written to disk.

**Google Takeout (MVP):** Parsed client-side using JSZip. Only aggregated signals sent to server. Raw ZIP never touches our servers.

### CI/CD Pipeline

**GitHub Actions + Vercel Auto-Deploy.**

File: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm biome check .
      - run: pnpm panda codegen
      - run: pnpm build
```

| Check | Tool | Time |
|-------|------|------|
| Lint + format | `pnpm biome check .` | ~3 sec |
| CSS codegen | `pnpm panda codegen` | ~5 sec |
| Type-check + build | `pnpm build` | ~60 sec |
| Preview deploy | Vercel (automatic) | ~90 sec |

On merge to `main`: Vercel auto-deploys to production.

**MVP additions:** `pnpm drizzle-kit check`, `pnpm audit --audit-level high`, Playwright smoke test.

### Monitoring & Alerting

| Layer | Tool | Setup Time |
|-------|------|------------|
| Error tracking | Sentry | 30 min |
| Uptime | Better Stack | 15 min |
| Web Vitals | Vercel Analytics | 0 min |
| Serverless logs | Vercel Logs | 0 min |
| AI spend | Self-tracked (Upstash Redis) | 30 min |
| Payment events | Stripe Dashboard | 0 min |

**Critical alerts (email):**
- Site down: 2 consecutive failed checks (Better Stack)
- High error rate: >10 errors/hour (Sentry)
- Webhook failures: 3+ consecutive non-200 (Stripe)
- AI budget: daily spend > $25 (Upstash check)
- Deploy failure: build fails on main (Vercel)

### Environment Management

| Environment | Branch | URL | Database | Stripe |
|-------------|--------|-----|----------|--------|
| Production | `main` | meldar.ai | Neon `main` branch | Live keys |
| Preview | PR branches | `*.vercel.app` | Neon `preview` branch | Test keys |
| Local dev | Any | localhost:3000 | Neon `dev` branch | Test keys |

**No dedicated staging.** Vercel preview deployments serve as per-PR staging.

### Security

**Already in place (`next.config.ts`):** X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS, X-DNS-Prefetch-Control.

**To add (PoC):**

Content Security Policy:
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://js.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
connect-src 'self' https://api.anthropic.com https://*.sentry.io https://www.google-analytics.com https://api.stripe.com https://*.upstash.io;
frame-src https://js.stripe.com;
```

**Stripe webhook signature verification:** `stripe.webhooks.constructEvent()` in every webhook handler.

**Input validation (Zod)** on all API routes.

**MVP additions:** Nonce-based CSP, CSRF protection (Auth.js built-in), `pnpm audit` in CI, `gitleaks` for secrets scanning.

### Backup & Disaster Recovery

| Scenario | Action | Time |
|----------|--------|------|
| Bad deploy | Vercel instant rollback | < 2 min |
| Database corruption | Neon point-in-time restore (7 days) | < 30 min |
| API key compromised | Rotate in Vercel Dashboard, redeploy | < 15 min |

### Key Rotation Policy

Quarterly rotation: RESEND_API_KEY, ANTHROPIC_API_KEY, UPSTASH tokens.
On suspected compromise: Immediate rotation of all keys.
Stripe: Roll keys via dashboard (old key valid 24 hours during transition).

---

## 8. Business & Go-to-Market

### Pricing

| Tier | Price | Billing | What they get | Phase |
|------|-------|---------|---------------|-------|
| **Time X-Ray** | Free | -- | Unlimited screenshots + quiz + shareable card | PoC |
| **Personal Time Audit** | EUR 29 | One-time | Human-reviewed analysis, 1-page PDF, delivered within 72 hours | PoC |
| **App Build** | EUR 49 | One-time | Founder builds one automation, user owns it, 30 days email support | CV |
| **Starter** | EUR 9/month | Subscription | Weekly playbook + deeper analysis + priority features | MVP |
| **Concierge** | EUR 199/month | Subscription | Unlimited builds + weekly check-ins + priority support | MVP |

### Founding 50 Pricing

| Tier | Regular | Founding 50 | Stripe implementation | Lock-in |
|------|---------|-------------|----------------------|---------|
| Personal Time Audit | EUR 29 | **Free** | 100% off coupon | First 50 |
| Starter | EUR 9/mo | **EUR 4/mo** | 55% off forever coupon | Locked forever |
| App Build | EUR 49 | **EUR 19** | 61% off coupon | First 5 apps |
| Concierge | EUR 199/mo | **EUR 99/mo** | 50% off coupon | 12 months |

**Stripe coupon codes:**
- `FOUNDING50_AUDIT` -- 100% off, max 50 redemptions
- `FOUNDING50_STARTER` -- 55% off forever, max 50 redemptions
- `FOUNDING50_BUILD` -- 61% off, max 250 redemptions
- `FOUNDING50_CONCIERGE` -- 50% off for 12 months, max 50 redemptions

### VAT/ALV Compliance

- Finnish VAT (ALV): 25.5%
- EU OSS: Required once cross-border B2C digital services exceed EUR 10,000/year
- **Action before first transaction:** Register for EU OSS via vero.fi (MyTax portal)
- **Stripe Tax:** Enable in Stripe Dashboard. Automatically calculates VAT per buyer country.
- Prices shown to users: inclusive of VAT

### Payment Architecture (PoC -- No Auth)

```
User clicks "Get your Time Audit" (EUR 29)
  -> POST /api/billing/checkout { product: "time-audit", email }
  -> Stripe Checkout Session created with customer_email pre-filled
  -> User redirected to Stripe-hosted checkout
  -> User pays (Stripe handles PCI, 3D Secure, EU card rules)
  -> Stripe redirects to /thank-you
  -> Stripe fires webhook to POST /api/billing/webhook
  -> Webhook handler: verify signature, write audit_orders row, send confirmation email
  -> Done. No user account needed.
```

### Founding 50 Program

**What founding members get:**
1. Free Personal Time Audit (1-page PDF, 72-hour delivery)
2. Weekly Automation Playbook (every Tuesday, starting Day 3)
3. Shape the Product (welcome survey + monthly vote)
4. Founding pricing locked forever
5. Direct line to the founder (email replies)

**Intake flow:**
1. User signs up (email capture)
2. Welcome email: "You're member #N of 50" + intake form link (Tally) + first playbook
3. User fills 5-question intake form
4. Founder analyzes and writes personalized report (1-2 hours)
5. Founder sends report via email

### "8+ Years Dev Advice" Angle

Delivered as async content:
1. Monthly AMA email thread (founder answers, best go into playbook)
2. Build Log blog posts on `/about` (decisions, code, tradeoffs)
3. "Launch Checklist" resource (given to founding members, later as lead magnet)

### Reddit Strategy

**Philosophy:** 90/10 value-to-promotion. 4-8 weeks genuine participation before any promotional post.

**Target subreddits:** r/productivity (2.4M+), r/ChatGPT (5M+), r/nocode (300K+), r/SideProject (200K+), r/smallbusiness (500K+), r/college + r/GradSchool (1M+), r/Entrepreneur (2M+).

**Content calendar:**
- Weeks 1-2: Listen and comment only. 20 min/day.
- Weeks 3-4: First value posts. No Meldar mention.
- Weeks 5-6: "Download your Google data" tutorial. Meldar in profile only.
- Weeks 7-8: First project post. Transparent about being the founder.

**Rules:** No link for first 4 weeks. No marketing language. Every post provides standalone value. Transparent about being founder when posting about Meldar.

### Other Channels

| Channel | Priority | When |
|---------|----------|------|
| TikTok | HIGH | Week 1+ (3 videos/week) |
| Twitter/X | HIGH | Week 1+ (build-in-public) |
| Instagram Reels | MEDIUM | Week 2+ (cross-post TikTok) |
| YouTube Shorts | MEDIUM | Week 2+ (cross-post TikTok) |
| Hacker News | MEDIUM | MVP launch ("Show HN") |
| Product Hunt | MEDIUM | MVP launch (one-shot) |
| LinkedIn | LOW | Week 4+ (1 post/week, repurposed) |
| Discord | DEFER | After 100+ engaged email subscribers |

### Competitive Positioning

```
                    DISCOVERS what to automate    USER must know what to build
  Builds the fix   MELDAR                        Lovable, Bolt.new, Replit
  Suggests only    Screen Time (Apple)            ChatGPT, Claude
  Connects apps    (nobody)                       Zapier, Make
```

**One-liner:** "Let us show you what's eating your week -- then fix it."

**Positioning advantage (No Google OAuth):** "We're the only AI product that never asks for your Google password."

---

## 9. Legal & Compliance

### Privacy Policy Updates Required

Add to `src/app/privacy-policy/page.tsx`:

**1. Third-party processors:**

| Processor | What they process | Data location |
|-----------|-------------------|---------------|
| Stripe | Payment data | EU + US (DPF) |
| Anthropic | Screenshot image tokens (in-transit, not stored) | US (SCCs/DPF) |
| Vercel | Application hosting | EU + US |
| Resend | Email delivery | US (DPF) |
| Neon | Database storage | EU (Frankfurt) |
| Upstash | Rate limiting data (IP counters) | EU (Frankfurt) |
| Google | Analytics data (anonymized) | US (DPF) |

**2. Screenshot processing:**
> "Your screenshot is processed in server memory for approximately 3-5 seconds, then permanently discarded. It is never written to disk, database, or any storage system."

**3. AI processing:**
> "Meldar uses Anthropic's Claude AI. We send only the minimum data needed. Anthropic does not retain your data or use it for model training."

**4. Payment data:**
> "Payments are processed by Stripe. We never see or store your credit card number. Transaction records retained 6 years per Finnish accounting law."

**5. Data retention table** (as specified in Section 4 data retention policy).

### Terms of Service Updates Required

Add to `src/app/terms/page.tsx`:

1. **AI Processing Disclosure** -- AI may contain errors; verify before acting
2. **File Processing and Retention** -- Screenshots never stored; derived data retained 30 days
3. **Payment Terms** -- Stripe, EUR, VAT included, 14-day refund per EU Consumer Rights Directive
4. **Right of Withdrawal waiver** -- Checkbox: "I agree delivery begins immediately"
5. **Beta/Early Access Disclaimer** -- Features may change; founding pricing honored
6. **No SLA** -- Best-effort availability

### DPA Checklist (Complete Before PoC Launch)

| Processor | Action |
|-----------|--------|
| Stripe | Verify auto-acceptance |
| Anthropic | **Sign DPA before first API call** |
| Vercel | Accept in dashboard |
| Resend | Accept on website |
| Neon | Accept on website |
| Upstash | Accept on website |
| Google (GA4) | Already covered via Google Ads terms |

### DPIA

Conduct lightweight DPIA before MVP launch. For PoC (50 users, anonymous data, 30-day auto-delete), risk is lower. Document the risk assessment. Strongest mitigation: privacy by architecture.

---

## 10. Cost Model

### Monthly Cost by Phase

| Service | PoC (0-50 users) | CV (50-200) | MVP (200-1,000) | At 1,000 users |
|---------|:-----------------:|:-----------:|:---------------:|:--------------:|
| Vercel | $0 | $0 | $20 | $20 |
| Neon | $0 | $0 | $0 | $19 |
| Anthropic | $0.15 | $0.90 | $3-15 | $8 |
| Stripe fees | $0-5 | $5-15 | Variable | ~$40 |
| Resend | $0 | $0-20 | $0-20 | $0-20 |
| Upstash | $0 | $0 | $0-5 | $5 |
| Sentry | $0 | $0 | $0-26 | $0-26 |
| Better Stack | $0 | $0 | $0 | $0 |
| **Total infra** | **~$0-5** | **~$6-36** | **~$23-86** | **~EUR 105-135** |

### Unit Economics

| Item | Value |
|------|-------|
| Cost per free X-Ray (Haiku) | $0.003 |
| Free X-Rays to equal 1 Time Audit (EUR 29) | 9,667 |
| Free X-Rays to equal 1 Concierge month (EUR 199) | 66,333 |

**The AI cost is a rounding error.** Zero economic reason to gate free screenshots.

### Break-Even Analysis

Infrastructure break-even at MVP: **1 Concierge subscriber (EUR 199)** or **12 Starter subscribers (EUR 108)** covers all monthly costs.

At 1,000 users with 5% conversion: 50 paying users at blended EUR 15/mo = EUR 750/mo revenue vs ~EUR 135/mo cost = **~80% gross margin**.

### Revenue Projections (Conservative)

| Phase | Duration | Paying users | Revenue |
|-------|----------|-------------|---------|
| PoC (weeks 1-2) | 2 weeks | 0 (founding = free) | EUR 0 |
| CV (weeks 3-6) | 4 weeks | 5-10 (paid audits) | EUR 145-290 |
| MVP (weeks 7-10) | 4 weeks | 15-25 | EUR 135-375/month recurring |

**Concierge is the revenue lever:** 10 Concierge users at EUR 199/mo = EUR 1,990/mo > 220 Starter users.

### Founder Time Cost

At 50 paying users:
- Weekly playbook: 3-4 hrs/week
- Time Audits: ~10/month x 2 hrs = 20 hrs/month
- App Builds: ~5/month x 3-4 hrs = 15-20 hrs/month
- Support: ~10 hrs/month
- **Total: ~55-70 hours/month** (sustainable as full-time solo founder up to ~50 paying users)

---

## 11. Risk Register

### Top 10 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|:----------:|:------:|------------|
| 1 | **Nobody pays after free trial** | Medium | Critical | Validate with Founding 50 intake form answers. If <20% fill the form, pivot before MVP. |
| 2 | **Stripe webhook fails silently (lost payment)** | Medium | Critical | Log every event. Sentry alert on errors. Idempotent handler with unique constraint. Stripe retries 3 days. |
| 3 | **GDPR complaint before privacy policy updated / DPAs signed** | Low | High | Privacy policy + DPA signatures are Phase 1 launch blockers. No Stripe or OCR goes live without them. |
| 4 | **Claude Vision OCR accuracy < 90%** | Low | High | Week 4 accuracy benchmark on 50 real screenshots. Switch to Sonnet if needed ($0.010 vs $0.003). |
| 5 | **Founding 50 doesn't fill** | Medium | High | Iterate CTA copy weekly. Add urgency: "Only until [date]." Shift to paid acquisition if organic fails by Week 4. |
| 6 | **Claude API outage during viral moment** | Low | High | Circuit breaker with 5-min cooldown. "Email us your screenshot" fallback with manual processing promise. |
| 7 | **Users screenshot the wrong screen** | High | Low | Inline visual guide with platform-specific examples. |
| 8 | **Churn after first month** | High | High | Weekly playbook creates recurring touchpoint. Monthly "Shape the Product" vote. Lock founding pricing. |
| 9 | **Founder overwhelmed by manual audit delivery** | High | Medium | Track audit queue length. Architecture should support automated delivery by MVP. |
| 10 | **Bad deploy breaks Stripe checkout** | Medium | Critical | Vercel instant rollback (<2 min). Preview deploy testing before merge. CI type-check. |

### Additional Risks by Domain

**Technical:** Vercel Hobby timeout on webhook + email send (write DB first, email second). Neon cold start adds 300-500ms (acceptable). Stripe email mismatch (pre-fill, reconcile manually).

**GTM:** Reddit account flagged (4-week no-link warmup). TikTok doesn't gain traction (test 3 pillars, double down on winner). Low share rate on X-Ray cards (A/B test designs).

**Compliance:** Anthropic changes data retention policy (verify quarterly). Stripe Tax miscalculates VAT (monitor quarterly). Missing DPA (checklist, all 7 signed before launch).

---

## 12. Week-by-Week Execution Plan

### Phase 1: PoC (Weeks 1-2) -- Day-by-Day

#### Week 1 -- Revenue Infrastructure + Core Funnel

| Day | Deliverable | Owner | Blocked By |
|-----|-------------|-------|------------|
| **D1 AM** | Create Neon Postgres project (Frankfurt), `main` + `preview` branches | DevOps | -- |
| **D1 AM** | Add `DATABASE_URL` to Vercel (prod + preview) | DevOps | Neon project |
| **D1 AM** | Install drizzle-orm + @neondatabase/serverless, create schema.ts + client.ts | Architecture | DATABASE_URL |
| **D1 AM** | Run `drizzle-kit push` -- create 3 tables | Architecture | Schema file |
| **D1 PM** | Create Stripe account, add products + founding coupons | Business | -- |
| **D1 PM** | Add Stripe env vars to Vercel | DevOps | Stripe account |
| **D1 PM** | Create `/api/billing/checkout` route | Architecture | Stripe keys + schema |
| **D1 PM** | Create `/api/billing/webhook` route | Architecture | Stripe keys + schema |
| **D1** | Fix all dead CTA links (TiersSection, PainQuiz, HeroSection) | Frontend | Nothing |
| **D1** | Create `entities/xray-result/model/types.ts` with Zod schemas | AI Pipeline | Nothing |
| **D2 AM** | Create Upstash Redis instance, add env vars | DevOps | -- |
| **D2 AM** | Implement rate limiting middleware (`src/middleware.ts`) | DevOps | Upstash Redis |
| **D2 AM** | Implement AI cost ceiling in upload route | AI Pipeline | Upstash Redis |
| **D2 PM** | Implement `src/server/discovery/ocr.ts` -- Claude Vision extraction | AI Pipeline | ANTHROPIC_API_KEY |
| **D2 PM** | Implement `src/server/discovery/prompts.ts` | AI Pipeline | Nothing |
| **D2 PM** | Implement `src/app/api/upload/screentime/route.ts` -- replace mock | AI Pipeline | ocr.ts |
| **D2** | Create `features/billing/` slice (PurchaseButton, use-checkout) | Frontend | Checkout API |
| **D2** | Create `features/founding-program/` slice (FoundingEmailCapture, FoundingCounter) | Frontend | Neon DB |
| **D2** | Update HeroSection + EarlyAdopterSection with Founding 50 messaging | Frontend | FoundingEmailCapture |
| **D2** | Add CSP header to `next.config.ts` | DevOps | -- |
| **D2** | Create `.env.example` with all variable placeholders | DevOps | -- |
| **D2** | Set up GitHub Actions CI workflow | DevOps | -- |
| **D3** | Create `/xray` page (UploadZone, ProcessingSteps, DeletionBanner) | Frontend | AI pipeline |
| **D3** | Create `features/screenshot-upload/` with client-side compression | Frontend | Nothing |
| **D3** | Implement `src/server/discovery/insights.ts` (rule-based) | AI Pipeline | types.ts |
| **D3** | Quiz submit endpoint + DB write | Architecture | Pain point data |
| **D3** | X-Ray data endpoint (`/api/xray/[id]`) | Architecture | DB schema |
| **D4** | Create `entities/xray-result/ui/` (XRayCard, XRayCardActions) | Frontend | Zod schema |
| **D4** | Create `/xray/[id]` shareable result page with OG meta tags | Frontend | XRayCard |
| **D4** | Implement `src/server/discovery/upsells.ts` | AI Pipeline | Pricing (locked) |
| **D4** | Implement `src/server/discovery/suggestions.ts` | AI Pipeline | painLibrary |
| **D5** | Implement `src/server/billing/usage.ts` (Upstash cost tracking) | AI Pipeline | Upstash Redis |
| **D5** | Sentry setup + env vars | DevOps | -- |
| **D5** | End-to-end testing: landing -> quiz -> upload -> X-Ray -> share -> purchase | All | All above |
| **D5** | EU OSS registration via vero.fi | Business | ClickTheRoadFi MyTax access |
| **D5** | Sign Anthropic DPA | Business | Anthropic account |

#### Week 2 -- Polish + Virality + Revenue Completion

| Day | Deliverable | Owner | Blocked By |
|-----|-------------|-------|------------|
| **D1** | Create `/xray/[id]/og/route.tsx` dynamic OG image | Frontend | XRayCard |
| **D1** | Create `features/sharing/` slice (ShareActions, use-share) | Frontend | OG route |
| **D2** | Add upsell block to X-Ray result page | Frontend | Billing feature |
| **D2** | Add CTA buttons to ProblemSection, HowItWorksSection, DataReceiptSection, SkillCardsSection | Frontend | Nothing |
| **D3** | Add "12 seniors" subsection to TrustSection + footer line | Frontend | Avatar images |
| **D3** | Update PainQuiz results to link to `/xray` | Frontend | Nothing |
| **D3** | Better Stack setup: 3 monitors | DevOps | -- |
| **D3** | Sign remaining DPAs (Neon, Vercel, Upstash) | Business | Accounts |
| **D3** | Migrate `/api/subscribe` to write to `subscribers` table | Architecture | Database |
| **D4** | Update `privacy-policy/page.tsx` with AI + payment disclosures | Frontend + Legal | Legal copy |
| **D4** | Update `terms/page.tsx` with payment terms + AI disclaimer | Frontend + Legal | Legal copy |
| **D5** | Validate with 20+ real screenshots (iOS + Android, light + dark mode) | AI Pipeline | Real screenshots |
| **D5** | Mobile QA pass: test entire funnel on iPhone Safari + Android Chrome | Frontend | All above |
| **D5** | Performance audit: Lighthouse, bundle size, LCP verification | Frontend | All above |
| **D5** | Verify preview deployment with test Stripe + preview DB | DevOps | All above |

### Phase 2: Commercial Validation (Weeks 3-6) -- Week-by-Week

| Week | Key Deliverables |
|------|-----------------|
| **W3** | Start distributing. First playbook email Day 3 post-signup. Reddit commenting begins. Create `/audit/[token]` delivery page. Implement "Save as image" (html-to-image). Monitor Sentry for errors. Implement cron purge for expired X-Rays. Add `founding_member` tracking query. |
| **W4** | Deliver free Time Audits (~10-15/week). Create `/about` page. AI accuracy validation: 50 real screenshots. Add GA4 event tracking on all CTAs and funnel steps. Review Anthropic API spend. |
| **W5** | First "Shape the Product" vote. A/B test Founding 50 counter. TikTok first 3 videos. Reddit first value posts. First quarterly env var backup. |
| **W6** | Founding 50 full (target). Switch to paid Time Audit (EUR 29). First paid revenue. Iterate upsell messaging. Sitemap update. Assess Vercel Pro timing. Prepare MVP schema migration plan. |

### Phase 3: MVP (Weeks 7-10) -- Week-by-Week

| Week | Key Deliverables |
|------|-----------------|
| **W7** | Upgrade to Vercel Pro. Auth.js setup (magic link) + users table migration. Session merging (subscriber -> user, link existing X-Rays). Auth middleware for protected routes. `/login` page. `features/auth/` slice. `/dashboard/layout.tsx`. Add drizzle-kit check + pnpm audit to CI. |
| **W8** | Dashboard pages (overview, xrays, settings). Session merge UX banner. Discovery chat API (SSE). Activity signals + automation opportunities tables. Google Takeout upload + client-side parser. Implement `/api/user/delete`. Per-table retention cron. Stripe subscription support. |
| **W9** | `/dashboard/advice` with MDX content. Three-pass pattern analysis engine. Insights endpoints. Sonnet-based Takeout insight generation. Multi-source X-Ray. GDPR data export endpoint. QStash for async Takeout. Playwright smoke tests in CI. |
| **W10** | GDPR: data export UI, "Delete everything" in settings. Full mobile QA on all new pages. Accuracy evaluation (AI vs founder audits). Cost optimization (prompt caching, token analysis). Security audit (all routes). Load test (50 concurrent uploads). Runbook documentation. DPIA documentation. Concierge tier setup. Product Hunt preparation. |

---

## 13. Launch Checklist

Everything that MUST be true before PoC goes live with payments:

### Infrastructure
- [ ] Neon Postgres project created (Frankfurt region)
- [ ] Drizzle schema deployed (3 tables)
- [ ] All environment variables set in Vercel dashboard (production + preview)
- [ ] Sentry configured and verified
- [ ] Better Stack monitor on meldar.ai
- [ ] `.env.example` updated in repo
- [ ] GitHub Actions CI workflow passing
- [ ] CSP header added to `next.config.ts`

### Payments
- [ ] Stripe account configured (products, prices, Founding 50 coupons)
- [ ] Stripe Tax enabled for EU VAT
- [ ] EU OSS registered via vero.fi
- [ ] Stripe webhook endpoint deployed and tested (with Stripe CLI)
- [ ] 14-day withdrawal waiver checkbox in checkout flow

### AI Pipeline
- [ ] Claude Vision integration working (>90% accuracy on test screenshots)
- [ ] Rate limiting active (Upstash Redis)
- [ ] Cost ceiling implemented ($50/day soft cap)
- [ ] Error handling for all scenarios (not screenshot, unreadable, rate limited, etc.)

### Legal
- [ ] Privacy policy updated (add Anthropic, Stripe, Neon, Upstash, Vercel as processors)
- [ ] Terms of service updated (AI processing disclosure, payment terms, beta disclaimer)
- [ ] DPAs signed: Anthropic, Stripe, Vercel, Resend, Neon, Upstash

### Frontend
- [ ] Dead CTA links fixed (route to `/quiz`, not `#early-access`)
- [ ] `/xray` page with upload, processing, result display
- [ ] `/xray/[id]` shareable page with dynamic OG image
- [ ] Founding 50 counter on landing page
- [ ] Stripe Checkout button working on X-Ray result page
- [ ] Mobile QA passed (iPhone Safari + Android Chrome)
- [ ] Lighthouse mobile score >90

---

## 14. Consensus Decisions Log

All locked decisions from the swarm process with rationale:

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Stripe is PoC-critical** | Founder directive: "We wanna be making money." Revenue Day 1. |
| 2 | **Neon Postgres in PoC (3 tables)** | Stripe webhooks need persistence. Shareable URLs need storage. Founding 50 needs a counter. Cost: $0 (free tier). |
| 3 | **No auth in PoC** | Email + Stripe customer ID is sufficient. Zero friction for users. |
| 4 | **Magic link via Auth.js + Resend (MVP)** | Resend already integrated. Zero friction for Gen Z (no password). No new vendor. |
| 5 | **No Google OAuth** | "Take back your data from Google" while signing in with Google is contradictory. Magic link reinforces positioning. Deferred to post-MVP when Google service connections justify it. |
| 6 | **Screenshots in-memory only** | GDPR compliance by architecture, not policy. Serverless function lifecycle enforces deletion. |
| 7 | **Haiku 4.5 at $0.003/screenshot** | Structured extraction from high-contrast UI. Haiku is sufficient. Screen Time UIs are designed to be readable. |
| 8 | **Unlimited free screenshots** | At $0.003/call, even 10K free X-Rays cost $30 -- covered by a single Time Audit sale. The free X-Ray is the demo, not the product. |
| 9 | **CTAs route to /quiz** | Mid-page CTAs enter the funnel (quiz -> screenshot -> X-Ray -> payment). Only Skills and Tiers link directly to Stripe. |
| 10 | **"12 seniors" in Trust subsection + /about** | Trust section subsection for PoC. Full `/about` page for Phase 2. Not a separate landing section -- would break narrative flow. |
| 11 | **Upstash Redis for rate limiting + cost tracking** | Same vendor. HTTP-based (works in serverless). Free tier covers PoC/CV. Three use cases: rate limiting, cost ceiling, session counters. |
| 12 | **Three-phase timeline** | PoC (2w) -> Commercial Validation (4w) -> MVP (4w). Revenue in Phase 1, validation in Phase 2, scale in Phase 3. |
| 13 | **Client-side image compression** | Eliminates sharp (5-8 MB native dependency). Eliminates 200-400ms cold start. Canvas API / browser-image-compression. |
| 14 | **Modular monolith on Next.js** | 1-2 person team. Zero inter-service latency. $0 on free tiers. Any context extractable later. |
| 15 | **Drizzle ORM + Neon serverless driver** | Type-safe, zero runtime overhead. HTTP driver works in Vercel without connection pooling. |
| 16 | **REST-ish Route Handlers (no tRPC, no GraphQL)** | 15-20 endpoints, single consumer, small team. SSE streaming support for chat. Zero abstraction overhead. |
| 17 | **Vercel Hobby -> Pro upgrade path** | Free for PoC/CV. $20/mo at MVP when team features and cron flexibility needed. |
| 18 | **No file storage (no Vercel Blob)** | Screenshots processed in memory. Google Takeout parsed client-side. Zero storage cost. Privacy guarantee. |
| 19 | **QStash for async jobs (MVP only)** | Same vendor as Upstash Redis. HTTP-based. Simpler than Inngest. PoC has no async jobs. |

---

## File Structure (Complete)

```
src/
  app/
    layout.tsx                              # Root layout (fonts, metadata)
    page.tsx                                # Landing page (10 sections)
    quiz/page.tsx                           # Pick Your Pain quiz
    xray/                                   # NEW (PoC)
      page.tsx                              #   Screenshot upload page
      [id]/
        page.tsx                            #   Shareable X-Ray result
        og/route.tsx                        #   Dynamic OG image (edge)
    api/
      subscribe/route.ts                    # MODIFY: also write to subscribers table
      quiz/submit/route.ts                  # NEW: quiz results endpoint
      upload/screentime/route.ts            # NEW: replace mock with real OCR
      billing/
        checkout/route.ts                   # NEW: Stripe Checkout
        webhook/route.ts                    # NEW: Stripe webhook
      xray/[id]/route.ts                    # NEW: fetch X-Ray data
      auth/[...nextauth]/route.ts           # NEW (MVP): Auth.js
      discovery/chat/route.ts               # NEW (MVP): LLM chat (SSE)
      upload/takeout/route.ts               # NEW (MVP): Takeout aggregates
      insights/route.ts                     # NEW (MVP): automation opportunities
      insights/[id]/route.ts                # NEW (MVP): accept/dismiss
      user/export/route.ts                  # NEW (MVP): GDPR export
      user/data/route.ts                    # NEW (MVP): GDPR erasure
      cron/purge/route.ts                   # NEW (MVP): scheduled cleanup
    audit/[token]/page.tsx                  # NEW (Phase 2): paid audit delivery
    about/page.tsx                          # NEW (Phase 2): "12 seniors" story
    thank-you/page.tsx                      # NEW (PoC): post-payment
    login/page.tsx                          # NEW (MVP): magic link
    dashboard/                              # NEW (MVP)
      layout.tsx                            #   Auth guard
      page.tsx                              #   Overview
      xrays/page.tsx                        #   X-Ray history
      advice/page.tsx                       #   Tips feed
      settings/page.tsx                     #   Account settings
    takeout/page.tsx                        # NEW (MVP): Google Takeout
    privacy-policy/page.tsx                 # MODIFY: add processor disclosures
    terms/page.tsx                          # MODIFY: add payment + AI terms

  entities/
    pain-points/                            # EXISTS
    xray-result/                            # NEW (PoC)
      index.ts
      model/types.ts                        #   Zod schemas + TypeScript types
      ui/XRayCard.tsx                       #   Shareable card (RSC)
      ui/XRayCardActions.tsx                #   Share / Save / Copy (client)

  features/
    cookie-consent/                         # EXISTS
    analytics/                              # EXISTS
    quiz/                                   # EXISTS -- modify CTAs
    screenshot-upload/                      # NEW (PoC)
      ui/UploadZone.tsx
      ui/ProcessingSteps.tsx
      ui/DeletionBanner.tsx
      lib/use-upload.ts
      lib/compress-image.ts
    sharing/                                # NEW (PoC)
      ui/ShareActions.tsx
      lib/use-share.ts
      lib/render-card-image.ts
    billing/                                # NEW (PoC)
      ui/PurchaseButton.tsx
      ui/FoundingCounter.tsx
      ui/PricingCard.tsx
      lib/use-checkout.ts
    founding-program/                       # NEW (PoC)
      ui/FoundingEmailCapture.tsx
    auth/                                   # NEW (MVP)
      ui/LoginForm.tsx
      ui/AuthGuard.tsx
      lib/use-session.ts

  widgets/
    header/                                 # EXISTS -- modify (MVP: user avatar)
    footer/                                 # EXISTS -- add "12 seniors" line
    landing/                                # EXISTS -- modify all CTAs
    dashboard/                              # NEW (MVP)
      DashboardNav.tsx
      OverviewCards.tsx
      XRayHistory.tsx
      AdviceFeed.tsx

  shared/
    config/seo.ts                           # EXISTS
    config/stripe.ts                        # NEW: Stripe price IDs
    ui/EmailCapture.tsx                     # EXISTS
    ui/JsonLd.tsx                           # EXISTS
    ui/button.tsx                           # EXISTS
    ui/Toast.tsx                            # NEW: auto-dismiss banner
    ui/StepIndicator.tsx                    # NEW: multi-step progress
    lib/session.ts                          # NEW: session_id cookie
    lib/generate-id.ts                      # NEW: nanoid for X-Ray URLs

  server/                                   # NEW: all server-side logic
    db/
      schema.ts                             #   Drizzle schema (PoC: 3 tables)
      client.ts                             #   Neon serverless connection
      migrations/                           #   drizzle-kit generated
    discovery/
      ocr.ts                                #   Claude Vision extraction
      prompts.ts                            #   System prompt
      insights.ts                           #   Rule-based insight generation
      upsells.ts                            #   Upsell hook generation
      suggestions.ts                        #   Pain point mapping
      quiz-matcher.ts                       #   Quiz pain -> suggestion matching
      chat.ts                               #   LLM chat (MVP)
      analysis.ts                           #   Three-pass pattern engine (MVP)
      takeout.ts                            #   Takeout processing (MVP)
    billing/
      stripe.ts                             #   Checkout + webhook helpers
      usage.ts                              #   Upstash cost tracking
    identity/
      auth.ts                               #   Auth.js config (MVP)
    lib/
      anthropic.ts                          #   Anthropic client singleton
      rate-limit.ts                         #   Upstash rate limiter
```

---

## Stripe Product Configuration

Create in Stripe Dashboard before PoC launch:

| Product | Price | Type | Notes |
|---------|-------|------|-------|
| Personal Time Audit | EUR 29.00 | One-time | |
| App Build | EUR 49.00 | One-time | |
| Starter Plan | EUR 9.00/month | Recurring | Cancel anytime |
| Concierge Plan | EUR 199.00/month | Recurring | Cancel anytime |

Coupon codes:
- `FOUNDING50_AUDIT`: 100% off, max 50 redemptions
- `FOUNDING50_STARTER`: 55% off forever, max 50 redemptions
- `FOUNDING50_BUILD`: 61% off, max 250 redemptions (50 x 5 apps)
- `FOUNDING50_CONCIERGE`: 50% off for 12 months, max 50 redemptions

## GA4 Conversion Events

| Event | Trigger |
|-------|---------|
| `signup` | Email submitted via EmailCapture |
| `quiz_complete` | Quiz submitted |
| `screenshot_upload` | Screenshot uploaded |
| `xray_created` | Time X-Ray generated |
| `xray_shared` | Share button clicked |
| `checkout_initiated` | Stripe Checkout Session created |
| `purchase` | Stripe `checkout.session.completed` |

## Email Sequences (Resend)

**Welcome (Founding 50):** "You're member #N of 50" + intake form + first playbook. From: gosha.skryuchenkov@gmail.com.

**Welcome (Post-Founding):** "Founding spots are full" + weekly playbook + Time Audit CTA (EUR 29).

**Weekly Playbook:** Every Tuesday 9:00 AM EET. Problem, tool, steps, time saved, soft-sell.

**Payment Confirmation:** "Your Time Audit is on its way. I'll have your personalized report within 72 hours."

---

*This document is the single source of truth for building Meldar from PoC to MVP. Start with Day 1, Week 1.*
