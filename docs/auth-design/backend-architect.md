# Auth System Design -- Backend Architecture

> Meldar auth: OAuth-only, GDPR-compliant, serverless-first.
> Stack: Next.js 16 + Vercel + Neon (Drizzle) + Upstash Redis.

---

## 1. Auth Library Choice

### Recommendation: Auth.js v5 (NextAuth v5)

| Option | Pros | Cons |
|---|---|---|
| **Auth.js v5** | Free, open-source. First-class Next.js App Router support. Drizzle adapter exists. Full control over DB schema. Edge-compatible. | Breaking changes between betas (stabilised in v5 GA). More DIY than managed services. |
| Clerk | Managed, polished UI components, fast to ship. | ~$25/mo at scale. Vendor lock-in. User data lives on Clerk's servers (GDPR concern for Finnish DPA). Limited schema customisation. |
| Lucia | Lightweight, no magic. Great DX. | **Deprecated** as of 2024. Author recommends rolling your own or using Auth.js. Not an option. |
| Supabase Auth | Good if already on Supabase. | Meldar uses Neon + Drizzle. Adopting Supabase Auth means either migrating DB or running two databases. Unnecessary coupling. |
| Custom (JWT + OAuth libraries) | Maximum control. | Auth is a security-critical surface. Rolling your own means owning every vulnerability. Not worth it at this stage. |

**Decision: Auth.js v5** with the Drizzle adapter (`@auth/drizzle-adapter`).

Rationale:
- Free, no vendor lock-in, user data stays in our Neon database (GDPR: data residency under our control).
- Drizzle adapter maps directly to our existing `getDb()` pattern.
- Supports all three target OAuth providers out of the box.
- Edge-compatible for Vercel serverless/edge runtime.
- Community is large; Auth.js is the de facto standard for Next.js auth.

### Required packages

```bash
pnpm add next-auth@5 @auth/drizzle-adapter
```

---

## 2. OAuth Providers

### Google (required) + Apple + Discord

| Provider | Why |
|---|---|
| **Google** | Mandatory. Gmail is universal. ~90% of signups will come from here. Provides verified email. |
| **Apple** | iPhone users uploading Screen Time screenshots need Apple ID. Required for iOS app (if/when). Strong privacy narrative aligns with Meldar's "your data, your control" brand. Gen Z on iPhone is ~55% in target markets. |
| **Discord** | Gen Z lives on Discord (150M+ MAU, skews 18-28 exactly). Low-friction OAuth. Verified email available. GitHub is dev-only; Twitter/X OAuth is broken/expensive. Discord fits the audience. |

### Auth.js provider config

```typescript
// src/server/auth/config.ts
import Google from "next-auth/providers/google"
import Apple from "next-auth/providers/apple"
import Discord from "next-auth/providers/discord"

export const providers = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        scope: "openid email profile",
        prompt: "consent",     // Always show consent screen (GDPR)
      },
    },
  }),
  Apple({
    clientId: process.env.APPLE_CLIENT_ID!,
    clientSecret: process.env.APPLE_CLIENT_SECRET!,
  }),
  Discord({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  }),
]
```

### Environment variables to add

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
AUTH_SECRET=...              # `npx auth secret` to generate
```

---

## 3. Database Schema

Auth.js v5 with the Drizzle adapter requires specific tables (`users`, `accounts`, `sessions`, `verification_tokens`). We extend these with Meldar-specific columns.

### 3a. Raw SQL (for Neon migration)

```sql
-- ── Auth.js core tables ────────────────────────────────────────────────

CREATE TABLE users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT,
  email         TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image         TEXT,

  -- Meldar extensions
  marketing_consent   BOOLEAN NOT NULL DEFAULT false,
  consent_given_at    TIMESTAMPTZ,
  consent_ip          TEXT,              -- IP at time of consent (GDPR record)
  analysis_attempts   INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL DEFAULT 3,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,     -- 'oauth' | 'oidc' | 'email'
  provider            TEXT NOT NULL,     -- 'google' | 'apple' | 'discord'
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,

  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_token TEXT UNIQUE NOT NULL,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,

  PRIMARY KEY(identifier, token)
);

-- ── Meldar: Usage Tracking ─────────────────────────────────────────────

CREATE TABLE analysis_attempts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xray_id     TEXT REFERENCES xray_results(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'completed',  -- 'completed' | 'failed' | 'in_progress'
  screenshot_hash TEXT,                           -- SHA-256 of uploaded image (dedup)
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_user ON analysis_attempts(user_id);
CREATE INDEX idx_attempts_user_status ON analysis_attempts(user_id, status)
  WHERE status = 'completed';

-- ── Meldar: Anonymous Sessions (pre-auth merge) ────────────────────────

CREATE TABLE anonymous_sessions (
  id          TEXT PRIMARY KEY,           -- nanoid, stored in cookie
  xray_ids    TEXT[] NOT NULL DEFAULT '{}',
  quiz_pains  TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3b. Drizzle Schema (TypeScript)

```typescript
// src/server/db/schema.ts (additions)

import { relations } from 'drizzle-orm'
import {
  boolean, index, integer, pgTable, primaryKey,
  text, timestamp, unique,
} from 'drizzle-orm/pg-core'

// ── Auth.js Tables ─────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:            text('name'),
  email:           text('email').unique(),
  emailVerified:   timestamp('email_verified', { withTimezone: true }),
  image:           text('image'),

  // Meldar extensions
  marketingConsent: boolean('marketing_consent').notNull().default(false),
  consentGivenAt:   timestamp('consent_given_at', { withTimezone: true }),
  consentIp:        text('consent_ip'),
  analysisAttempts: integer('analysis_attempts').notNull().default(0),
  maxAttempts:      integer('max_attempts').notNull().default(3),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id:                text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:            text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken:      text('refresh_token'),
  accessToken:       text('access_token'),
  expiresAt:         integer('expires_at'),
  tokenType:         text('token_type'),
  scope:             text('scope'),
  idToken:           text('id_token'),
  sessionState:      text('session_state'),
}, (table) => [
  unique('provider_unique').on(table.provider, table.providerAccountId),
])

export const sessions = pgTable('sessions', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionToken: text('session_token').unique().notNull(),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires', { withTimezone: true }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token:      text('token').unique().notNull(),
  expires:    timestamp('expires', { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
])

// ── Analysis Attempts ──────────────────────────────────────────────────

export const analysisAttempts = pgTable('analysis_attempts', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  xrayId:         text('xray_id').references(() => xrayResults.id, { onDelete: 'set null' }),
  status:         text('status').notNull().default('completed'),
  screenshotHash: text('screenshot_hash'),
  ipAddress:      text('ip_address'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_attempts_user').on(table.userId),
])

// ── Anonymous Sessions ─────────────────────────────────────────────────

export const anonymousSessions = pgTable('anonymous_sessions', {
  id:        text('id').primaryKey(),      // nanoid from cookie
  xrayIds:   text('xray_ids').array().notNull().default([]),
  quizPains: text('quiz_pains').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

---

## 4. Marketing Consent Flow

### The problem

GDPR (and Finnish DPA) require **affirmative, informed, specific consent** for marketing emails. OAuth sign-in gives us the email, but signing in is NOT consent to marketing. We need a separate, explicit opt-in.

### The solution: Post-OAuth consent interstitial

```
User clicks "Sign in with Google"
  → Google OAuth flow
  → Auth.js creates user record (marketingConsent = false)
  → Redirect to /onboarding (client page)
  → Page shows:
      "Welcome, {name}! One quick thing:"
      [ ] "Send me product updates and tips (1-2 emails/month)"
      [Continue]
  → POST /api/user/consent { consent: true/false }
  → Updates users.marketing_consent, consent_given_at, consent_ip
  → Redirect to /dashboard (or /quiz)
```

### Why not during OAuth?

OAuth consent screens are controlled by the provider (Google, Apple, Discord). We cannot add custom checkboxes to them. The interstitial page after OAuth is the standard GDPR-compliant pattern.

### API route for consent

```typescript
// src/app/api/user/consent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/server/auth'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { consent } = await request.json()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

  const db = getDb()
  await db.update(users)
    .set({
      marketingConsent: !!consent,
      consentGivenAt: consent ? new Date() : null,
      consentIp: consent ? ip : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ success: true })
}
```

### Resend integration

When syncing to Resend for email campaigns, only include users where `marketing_consent = true`. The `consent_given_at` and `consent_ip` columns provide the audit trail the Finnish DPA may request.

```typescript
// When adding to Resend audience:
const consentedUsers = await db.select()
  .from(users)
  .where(eq(users.marketingConsent, true))

for (const user of consentedUsers) {
  await resend.contacts.create({
    email: user.email!,
    audienceId: RESEND_AUDIENCE_ID,
  })
}
```

### Consent withdrawal

Users can withdraw consent at any time (GDPR Article 7(3)). Add a link in every marketing email footer and a toggle in user settings. On withdrawal:

1. Set `marketing_consent = false`, clear `consent_given_at`/`consent_ip`.
2. Remove from Resend audience.
3. Confirm removal via transactional email (transactional emails don't require marketing consent).

---

## 5. Attempt Tracking

### What counts as an "attempt"?

An attempt is counted when the server **successfully processes** a screenshot through the Claude Vision API and returns an X-Ray result. Failed uploads, validation errors, and network timeouts do NOT count.

| Event | Counts as attempt? |
|---|---|
| User uploads valid screenshot, Vision API returns result | Yes |
| Upload fails validation (wrong file type, too large) | No |
| Vision API call fails / times out | No |
| User re-uploads same screenshot (duplicate hash) | No (deduped) |

### Flow

```
POST /api/analyze-screenshot
  → Check auth (session required)
  → Check attempt count:
      SELECT analysis_attempts FROM users WHERE id = ?
      IF >= max_attempts → 402 { code: 'LIMIT_REACHED', remaining: 0 }
  → Hash uploaded image (SHA-256)
  → Check for duplicate:
      SELECT id FROM analysis_attempts WHERE user_id = ? AND screenshot_hash = ?
      IF exists → return cached xray result (no new attempt counted)
  → Process with Claude Vision
  → INSERT into analysis_attempts (user_id, xray_id, screenshot_hash, status)
  → UPDATE users SET analysis_attempts = analysis_attempts + 1
  → Return result with { remaining: max_attempts - analysis_attempts - 1 }
```

### What happens at the limit?

```typescript
// Response when limit reached
{
  error: {
    code: "LIMIT_REACHED",
    message: "You've used all 3 free analyses.",
    remaining: 0,
  },
  upgrade: {
    message: "Get unlimited analyses with a Meldar plan.",
    url: "/pricing",          // Links to tiers section
    plans: ["starter", "concierge"],
  }
}
```

The client shows a soft paywall: "You've used your 3 free X-Rays. Upgrade to keep going." This ties directly into the existing Tiers section (Time X-Ray free tier = 3 attempts, Starter = pay as you go).

### Attempt tracking logic

```typescript
// src/server/auth/attempts.ts
import { eq, and, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { users, analysisAttempts } from '@/server/db/schema'

type AttemptResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0 }

export async function checkAttempts(userId: string): Promise<AttemptResult> {
  const db = getDb()
  const [user] = await db
    .select({ used: users.analysisAttempts, max: users.maxAttempts })
    .from(users)
    .where(eq(users.id, userId))

  if (!user) return { allowed: false, remaining: 0 }

  const remaining = user.max - user.used
  if (remaining <= 0) return { allowed: false, remaining: 0 }

  return { allowed: true, remaining }
}

export async function recordAttempt(
  userId: string,
  xrayId: string | null,
  screenshotHash: string,
  ip: string | null,
) {
  const db = getDb()

  // Check for duplicate (same user, same image)
  const [existing] = await db
    .select({ id: analysisAttempts.id })
    .from(analysisAttempts)
    .where(
      and(
        eq(analysisAttempts.userId, userId),
        eq(analysisAttempts.screenshotHash, screenshotHash),
      ),
    )

  if (existing) return { duplicate: true, attemptId: existing.id }

  // Record new attempt + increment counter atomically
  const attemptId = crypto.randomUUID()
  await db.insert(analysisAttempts).values({
    id: attemptId,
    userId,
    xrayId,
    screenshotHash,
    ipAddress: ip,
    status: 'completed',
  })

  await db.update(users)
    .set({
      analysisAttempts: sql`${users.analysisAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  return { duplicate: false, attemptId }
}
```

---

## 6. Session Strategy

### Recommendation: Database Sessions

| | JWT (stateless) | DB Sessions |
|---|---|---|
| Speed | Faster (no DB lookup per request) | 1 query per request |
| Revocation | Cannot revoke until expiry | Instant revocation (delete row) |
| Size | Token grows with claims | Fixed small cookie (session ID only) |
| Serverless fit | Good (no state needed) | Good (Neon HTTP driver is fast, ~5ms from Vercel edge) |
| Security | Leaked JWT = access until expiry | Leaked session = revoke instantly |
| GDPR "right to erasure" | Must wait for JWT expiry or maintain blocklist | Delete session row = immediate logout |

**Decision: Database sessions.**

Rationale:
1. **GDPR right to erasure** -- when a user deletes their account, we must immediately terminate all sessions. DB sessions make this a `DELETE FROM sessions WHERE user_id = ?`. JWTs would require a revocation list, which is just a worse database session.
2. **3-attempt limit** -- we're reading the DB on every analysis request anyway. One extra session lookup is negligible.
3. **Neon HTTP driver latency** -- Neon's serverless driver over HTTP adds ~5-15ms per query from Vercel's edge. For auth checks that happen on page loads (not on every API call), this is acceptable.
4. **Session cookie is small** -- only a session ID in the cookie, no bloated JWT.

### Auth.js config

```typescript
// src/server/auth/index.ts
import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { getDb } from '@/server/db/client'
import { providers } from './config'
import {
  users, accounts, sessions, verificationTokens,
} from '@/server/db/schema'

const db = getDb()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  session: {
    strategy: 'database',       // DB sessions, not JWT
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    updateAge: 24 * 60 * 60,    // Extend on activity every 24h
  },
  pages: {
    signIn: '/auth/signin',     // Custom sign-in page (branded)
    newUser: '/onboarding',     // Post-signup consent + intro
  },
  callbacks: {
    session({ session, user }) {
      // Expose user ID and attempt info to the client session
      session.user.id = user.id
      return session
    },
  },
})
```

### Route handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/server/auth'

export const { GET, POST } = handlers
```

### Middleware (protect routes)

```typescript
// src/middleware.ts
export { auth as middleware } from '@/server/auth'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/analyze-screenshot',
    '/api/user/:path*',
  ],
}
```

---

## 7. Anonymous Data Merge

### Problem

Users can take the quiz and upload screenshots BEFORE signing in. Their X-Ray results exist in `xray_results` but aren't linked to any user. On first sign-in, we need to merge this anonymous data into their account.

### Solution: Anonymous session cookie + merge on sign-in

#### Step 1: Track anonymous activity

When an unauthenticated user interacts with the quiz or uploads a screenshot, assign them an anonymous session ID (nanoid) stored in a cookie.

```typescript
// src/server/anonymous/session.ts
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'
import { getDb } from '@/server/db/client'
import { anonymousSessions } from '@/server/db/schema'
import { eq, sql } from 'drizzle-orm'

const ANON_COOKIE = 'meldar_anon'
const ANON_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

export async function getOrCreateAnonSession(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(ANON_COOKIE)?.value

  if (existing) return existing

  const id = nanoid(16)
  const db = getDb()
  await db.insert(anonymousSessions).values({ id }).onConflictDoNothing()

  cookieStore.set(ANON_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: ANON_MAX_AGE,
    path: '/',
  })

  return id
}

export async function linkXrayToAnon(anonId: string, xrayId: string) {
  const db = getDb()
  await db.update(anonymousSessions)
    .set({
      xrayIds: sql`array_append(${anonymousSessions.xrayIds}, ${xrayId})`,
    })
    .where(eq(anonymousSessions.id, anonId))
}
```

#### Step 2: Merge on sign-in

Auth.js fires events on sign-in. In the `signIn` event callback, check for the anonymous cookie and merge data.

```typescript
// In Auth.js config, add events:
events: {
  async signIn({ user, isNewUser }) {
    if (!isNewUser) return  // Only merge on first sign-in

    // Read anonymous cookie (via headers, since events don't have cookies() access)
    // Alternative: do this in the signIn callback which has access to request
  },
},
callbacks: {
  async signIn({ user, account }) {
    // Merge happens here because callbacks have request context
    return true  // Allow sign-in, merge handled in redirect
  },
},
```

Because Auth.js event handlers have limited access to cookies in the serverless context, the cleanest approach is to merge on the **first authenticated page load** (the `/onboarding` redirect):

```typescript
// src/app/onboarding/page.tsx (server component)
import { auth } from '@/server/auth'
import { redirect } from 'next/navigation'
import { mergeAnonymousData } from '@/server/anonymous/merge'
import { cookies } from 'next/headers'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  // Merge anonymous data
  const cookieStore = await cookies()
  const anonId = cookieStore.get('meldar_anon')?.value
  if (anonId) {
    await mergeAnonymousData(anonId, session.user.id)
    cookieStore.delete('meldar_anon')
  }

  // Render onboarding UI (marketing consent, etc.)
  return <OnboardingClient user={session.user} />
}
```

#### Step 3: The merge function

```typescript
// src/server/anonymous/merge.ts
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { anonymousSessions, xrayResults } from '@/server/db/schema'

export async function mergeAnonymousData(anonId: string, userId: string) {
  const db = getDb()

  // 1. Get anonymous session
  const [anonSession] = await db
    .select()
    .from(anonymousSessions)
    .where(eq(anonymousSessions.id, anonId))

  if (!anonSession) return

  // 2. Link X-Ray results to user
  for (const xrayId of anonSession.xrayIds) {
    await db.update(xrayResults)
      .set({ email: null })  // email column now superseded by user FK
      .where(eq(xrayResults.id, xrayId))
    // Note: xray_results needs a user_id column added (see migration plan)
  }

  // 3. Clean up anonymous session
  await db.delete(anonymousSessions)
    .where(eq(anonymousSessions.id, anonId))
}
```

### Data flow diagram

```
Anonymous user:
  Quiz → xray_results row (no user_id)
  Screenshot → xray_results row (no user_id)
  Cookie: meldar_anon = "abc123"
  anonymous_sessions: { id: "abc123", xray_ids: ["xr_001", "xr_002"] }

User signs in with Google:
  → Auth.js creates users row
  → Redirect to /onboarding
  → Server reads meldar_anon cookie
  → mergeAnonymousData("abc123", "user_456"):
      xray_results.xr_001.user_id = "user_456"
      xray_results.xr_002.user_id = "user_456"
      DELETE anonymous_sessions WHERE id = "abc123"
  → Delete meldar_anon cookie
  → User sees onboarding (marketing consent)
```

---

## 8. Migration Plan

### Phase 1: Schema additions (non-breaking)

Add new tables alongside existing ones. No existing functionality breaks.

```bash
# 1. Add Auth.js tables + analysis_attempts + anonymous_sessions
pnpm drizzle-kit generate   # Generate migration from updated schema.ts
pnpm drizzle-kit push        # Apply to Neon

# 2. Add user_id column to xray_results (nullable, for migration)
ALTER TABLE xray_results ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_xray_user ON xray_results(user_id);
```

### Phase 2: Add Auth.js (non-breaking)

1. Install `next-auth@5` and `@auth/drizzle-adapter`.
2. Create `src/server/auth/index.ts` (config above).
3. Create `src/app/api/auth/[...nextauth]/route.ts`.
4. Create sign-in page at `src/app/auth/signin/page.tsx`.
5. Create onboarding page at `src/app/onboarding/page.tsx`.
6. Add middleware for protected routes.
7. Deploy. Auth works but nothing requires it yet.

### Phase 3: Gate screenshot analysis (breaking for anonymous users)

1. Update `POST /api/analyze-screenshot` to require auth session.
2. Add attempt checking + recording logic.
3. Update `ScreenTimeUpload` component to show sign-in prompt if unauthenticated.
4. Add anonymous session tracking to quiz flow.
5. Deploy.

### Phase 4: Migrate subscribers to users (data migration)

The existing `subscribers` table serves a different purpose than `users`. Subscribers opted in for email updates; users have OAuth accounts. The migration:

```sql
-- For each subscriber, check if a user with same email exists
-- If yes: set marketing_consent = true on the user (they already opted in)
-- If no: keep in subscribers table (they're email-only subscribers, no OAuth account)

UPDATE users u
SET marketing_consent = true,
    consent_given_at = s.created_at,
    consent_ip = NULL  -- historical, no IP recorded
FROM subscribers s
WHERE u.email = s.email;
```

**Do NOT delete the `subscribers` table.** It continues to serve landing page email capture for users who haven't signed in. The two systems coexist:

- `subscribers` = email-only list from landing page forms (pre-auth)
- `users` = authenticated accounts with OAuth

When a subscriber later signs in with OAuth and the email matches, their `marketing_consent` is pre-set to `true` (they already opted in via the subscribe form).

```typescript
// In Auth.js signIn callback: check if email exists in subscribers
callbacks: {
  async signIn({ user }) {
    if (user.email) {
      const db = getDb()
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.email, user.email))

      if (subscriber) {
        // Pre-set marketing consent (they already opted in)
        await db.update(users)
          .set({
            marketingConsent: true,
            consentGivenAt: subscriber.createdAt,
          })
          .where(eq(users.email, user.email))
      }
    }
    return true
  },
},
```

### Phase 5: Cleanup

1. Add `user_id` foreign key to `audit_orders` (link purchases to accounts).
2. Consider removing `email` column from `xray_results` (superseded by `user_id` join).
3. Add account deletion flow (GDPR right to erasure): delete user + cascade sessions/accounts/attempts.

---

## Appendix: TypeScript Interfaces

```typescript
// src/server/auth/types.ts
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}

// Attempt check result
type AttemptCheck =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0 }

// Consent request body
interface ConsentRequest {
  consent: boolean
}

// Analysis response (extended with attempt info)
interface AnalysisResponse {
  apps: { name: string; hours: number; category: string }[]
  totalHours: number
  topApp: string
  pickups: number | null
  insight: string
  remaining: number  // attempts remaining after this one
}

// Limit reached response
interface LimitReachedResponse {
  error: {
    code: 'LIMIT_REACHED'
    message: string
    remaining: 0
  }
  upgrade: {
    message: string
    url: string
    plans: string[]
  }
}
```

---

## Summary of Decisions

| Decision | Choice | Key reason |
|---|---|---|
| Auth library | Auth.js v5 | Free, Drizzle adapter, GDPR data residency |
| Providers | Google + Apple + Discord | Audience fit (Gen Z, iPhone users) |
| Session strategy | Database sessions | Instant revocation, GDPR erasure |
| Marketing consent | Post-OAuth interstitial page | GDPR requires separate, explicit consent |
| Attempt limit | 3 successful analyses per user | Ties into freemium tier, soft paywall |
| Attempt counting | Only successful Vision API calls | Fair to users, deduped by screenshot hash |
| Anonymous merge | Cookie-based anon session + merge on first auth | Preserves pre-auth X-Ray data |
| Subscriber migration | Coexist, sync consent on OAuth match | Non-breaking, preserves email list |
