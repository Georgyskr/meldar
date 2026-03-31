# Auth Architecture Design — Meldar

_Software Architect deliverable, 2026-03-31_

---

## 1. The Google OAuth Contradiction

### The tension

Meldar's entire brand rests on one line: "Big Tech profited from your data for a decade. Take it back." The final CTA literally names Google: "Google made ~$238 from your data last year." Then we hand the user a "Sign in with Google" button. That is a real contradiction, and ignoring it would be worse than addressing it head-on.

### Why offer it anyway

- **98% of Gen Z** has a Google account. Not offering it means losing the majority at the door.
- OAuth does not give Meldar access to the user's Google data. It gives us a verified email and a name. That is a critical distinction.
- Users already signed in with Google on dozens of apps. The friction of NOT having it is higher than the brand risk of having it.

### Resolution: lead with the anti-Google framing, offer Google as pragmatic fallback

**Provider order in the UI:**

1. **Apple Sign In** (lead) — privacy-first, aligns perfectly with "take back your data." Apple is the counter-brand to Google in users' minds.
2. **Discord** (second) — Gen Z's home. No corporate surveillance association.
3. **Google** (third, explicitly reframed)

**The reframe:** When Google is offered, add a one-liner beneath or beside the button:

> "We use Google only to verify your email. Meldar never reads your inbox, contacts, or files. [How this works](/privacy-policy#auth)"

This turns the contradiction into a trust moment. The user sees: "They could have hidden Google as the default, but instead they acknowledge it and limit it." That is stronger than pretending the tension does not exist.

**Scopes:** Request `openid email profile` only. Never request `gmail.readonly`, `contacts`, or any data-access scope. Document this in the privacy policy and make it verifiable.

**Do not:** Put "Continue with Google" as the primary/largest button. It should be visually equal to Apple and Discord, or slightly smaller.

---

## 2. Auth Boundary — Public vs. Protected

### Principle: value before ask

Meldar's funnel is built on showing value before requiring anything. The auth boundary must preserve this. Users should be able to complete the entire discovery funnel anonymously. Auth gates the *persistence* of results and the *delivery* of services, not the exploration.

### Public (no auth required)

| Route | Reason |
|-------|--------|
| `/` (landing page) | Marketing, must be public |
| `/quiz` | Zero-data pain quiz, top of funnel |
| `/discover/*` | All discovery quizzes (overthink, sleep) |
| `/xray` | Screen Time upload + instant results |
| `/xray/[id]` | Shareable X-Ray result (read-only) |
| `/privacy-policy` | Legal |
| `/terms` | Legal |
| `/coming-soon` | Marketing |

### Auth-gated (require sign-in)

| Route | Reason |
|-------|--------|
| `/dashboard` (new) | Personal history, saved X-Rays, active automations |
| `/settings` (new) | Account settings, data export, delete account |
| `/api/billing/checkout` | Payment requires identity |
| `/thank-you` | Post-purchase, tied to user account |

### Soft-gated (prompt to sign in, allow skip for now)

| Route | Reason |
|-------|--------|
| `/xray` (save results) | After seeing results, prompt: "Sign in to save your X-Ray and track changes over time." If they skip, results persist in the anonymous session cookie only. |
| `/api/subscribe` | Currently email-only. Will become: if authenticated, auto-subscribe. If anonymous, keep current email form. |

### API route protection

| Route | Auth | Reason |
|-------|------|--------|
| `POST /api/upload/screentime` | None (rate-limited by IP) | Value-before-ask |
| `POST /api/subscribe` | None (keep current behavior) | Pre-auth funnel |
| `POST /api/billing/checkout` | Required | Payment must be tied to account |
| `POST /api/billing/webhook` | Stripe signature (no user auth) | Webhook, server-to-server |
| `GET/POST /api/auth/*` | Auth.js managed | Auth.js handles internally |

---

## 3. FSD Placement

Auth touches multiple layers. Here is where each piece lives, following FSD's import-downward rule.

### Layer 1: `src/shared/`

```
src/shared/
  config/
    auth.ts              # Provider IDs, route lists (PUBLIC_ROUTES, PROTECTED_ROUTES)
```

No auth logic here — only static config that other layers consume.

### Layer 2: `src/entities/`

```
src/entities/
  user/
    model/
      types.ts           # User, Session, Account type definitions
    index.ts             # Barrel
```

Domain types for the user entity. No business logic, no hooks, no UI.

### Layer 3: `src/features/`

```
src/features/
  auth/
    ui/
      SignInButton.tsx    # "use client" — renders provider buttons
      SignInCard.tsx      # "use client" — full sign-in UI (3 provider buttons + disclaimer)
      AuthGuard.tsx       # "use client" — wraps protected content, redirects if unauthenticated
      UserMenu.tsx        # "use client" — avatar + dropdown (settings, sign out)
    lib/
      use-session.ts     # Client hook wrapping Auth.js useSession
    index.ts             # Barrel: exports SignInButton, SignInCard, AuthGuard, UserMenu
```

All client-facing auth UI and hooks. These are `"use client"` components because they handle interactive state.

### Layer 4: `src/widgets/`

```
src/widgets/
  header/
    ui/Header.tsx        # Updated: conditionally renders UserMenu (authenticated) or CTA button (anonymous)
```

Header imports from `features/auth` — valid in FSD (widgets import features).

### Server layer: `src/server/`

```
src/server/
  identity/
    auth.ts              # Auth.js v5 configuration (providers, callbacks, adapter)
    session.ts           # getServerSession() helper, getCurrentUser() helper
    adapter.ts           # Drizzle adapter config for Auth.js + Neon
```

This is the server-side auth core. Not an FSD layer — `src/server/` is infrastructure, like `src/server/db/` and `src/server/billing/` already are. API routes and Server Components import from here.

### App layer: `src/app/`

```
src/app/
  api/auth/[...nextauth]/route.ts   # Auth.js catch-all route handler
  sign-in/page.tsx                   # Dedicated sign-in page (renders SignInCard)
  dashboard/page.tsx                 # Protected — user's home
  settings/page.tsx                  # Protected — account settings
```

### Middleware

```
middleware.ts   # Root-level (Next.js convention)
```

A new `middleware.ts` at the project root. Details in section 5.

### New database tables

```
src/server/db/schema.ts   # Extended with: users, accounts, sessions tables (Auth.js schema)
```

Auth.js with the Drizzle adapter requires three tables: `users`, `accounts`, `sessions`. These are added to the existing schema file alongside `xrayResults`, `auditOrders`, and `subscribers`.

```typescript
// New tables in schema.ts

export const users = pgTable('users', {
  id: text('id').primaryKey(),                    // Auth.js-generated ID
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  marketingConsent: boolean('marketing_consent').notNull().default(false),
  marketingConsentAt: timestamp('marketing_consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),                   // 'oauth'
  provider: text('provider').notNull(),           // 'google' | 'apple' | 'discord'
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
})
```

---

## 4. Anonymous-to-Authenticated Transition

### The scenario

A user arrives → takes the quiz → uploads a screenshot → sees their X-Ray → loves it → signs in to save. Their anonymous work must not disappear.

### Implementation

**Step 1: Anonymous session tracking**

Before auth exists, the app already creates `xrayResults` rows with a nanoid. The anonymous user's results are identified by this ID, stored in a cookie or localStorage.

Add a lightweight anonymous session cookie:

```
meldar-anon-id: <nanoid>     # Set on first interaction (quiz or screenshot upload)
```

This cookie holds the anonymous session identifier. It is not an auth session — it is a correlation key.

**Step 2: On sign-in, merge**

In the Auth.js `signIn` callback (or the `jwt`/`session` callback on first sign-in), check for the `meldar-anon-id` cookie:

```typescript
// In src/server/identity/auth.ts callbacks
async signIn({ user, account }) {
  const anonId = cookies().get('meldar-anon-id')?.value

  if (anonId && user.id) {
    // Claim anonymous X-Ray results
    await db
      .update(xrayResults)
      .set({ userId: user.id })
      .where(and(
        eq(xrayResults.anonSessionId, anonId),
        isNull(xrayResults.userId),
      ))

    // Claim subscriber record if email matches
    await db
      .update(subscribers)
      .set({ userId: user.id })
      .where(and(
        eq(subscribers.email, user.email),
        isNull(subscribers.userId),
      ))

    // Clear the anonymous cookie
    cookies().delete('meldar-anon-id')
  }

  return true
}
```

**Step 3: Schema additions for merge**

Add two columns to existing tables:

```typescript
// xrayResults: add
anonSessionId: text('anon_session_id'),  // set during anonymous upload
userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),

// subscribers: add
userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
```

**Step 4: The merge is idempotent**

If the user signs out and signs back in, no duplicate merge happens — `userId` is already set. If they used multiple anonymous sessions, only the one in the current cookie merges. Old unclaimed anonymous sessions can be garbage-collected after 30 days.

### User-facing flow

1. User uploads screenshot → gets X-Ray → sees prompt: "Sign in to save your X-Ray"
2. User clicks "Sign in with Apple" → Apple OAuth → redirect back
3. On return, X-Ray is now saved to their account. Dashboard shows it.
4. If they dismiss the prompt, the X-Ray persists only in the shareable URL (`/xray/[id]`). No data is lost — it is just not linked to an account.

---

## 5. Auth.js v5 + Next.js 16 + App Router

### Library choice

Auth.js v5 (the `next-auth@5` package, often called NextAuth.js v5) is the standard for Next.js App Router authentication. It provides:

- Built-in OAuth provider support (Google, Apple, Discord all first-class)
- Drizzle adapter for database sessions
- Middleware integration
- Server-side session access via `auth()` helper

### Known issues and decisions

#### Server Actions vs. Route Handlers

**Decision: Use the Route Handler approach (`/api/auth/[...nextauth]/route.ts`).**

Auth.js v5 supports both, but the route handler pattern is more stable and better documented. Server Actions for sign-in/sign-out can be used as thin wrappers:

```typescript
// src/features/auth/lib/actions.ts
'use server'
import { signIn, signOut } from '@/server/identity/auth'

export async function signInAction(provider: string) {
  await signIn(provider, { redirectTo: '/dashboard' })
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' })
}
```

#### Middleware vs. per-route protection

**Decision: Use middleware for broad route protection + per-route checks for granular control.**

```typescript
// middleware.ts
import { auth } from '@/server/identity/auth'

const PROTECTED_PREFIXES = ['/dashboard', '/settings']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
}
```

This is lightweight — only runs on protected routes. Public routes are never touched by middleware. Individual API routes (like `/api/billing/checkout`) check auth inline via `const session = await auth()`.

#### Session strategy

**Decision: Database sessions (not JWT).**

Reasons:
- User can "delete everything" (brand promise in Trust section) — database sessions can be revoked server-side.
- Drizzle adapter is already in the stack (Neon + Drizzle).
- JWT sessions cannot be revoked without a blocklist, which defeats the purpose.

#### Next.js 16 specifics

Next.js 16 uses React 19. Auth.js v5 is compatible. The main consideration:

- `cookies()` and `headers()` are async in Next.js 15+. Auth.js v5 handles this internally, but any custom cookie reading (like the `meldar-anon-id` merge) must `await cookies()`.
- The `auth()` export from Auth.js v5 works as both a server-component helper and a middleware wrapper. This is the correct API to use.

#### Rate limiting on auth endpoints

Auth.js manages its own CSRF protection and rate limiting is not built in. Add the existing Upstash rate limiter to the auth route:

```typescript
// 3 sign-in attempts per minute per IP
export const authLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 m'), prefix: 'rl:auth' })
  : null
```

This enforces the 3-attempt limit requirement.

---

## 6. The 3-Provider Decision

### Recommended providers

| Provider | Rationale | Risk |
|----------|-----------|------|
| **Apple** | Privacy-first brand alignment. "Sign in with Apple" is the strongest signal that Meldar respects data. Required for iOS apps if we go native. Hides email by default (Private Relay). | Requires Apple Developer account ($99/yr). Slightly harder to configure. |
| **Discord** | Gen Z's social graph. 196M+ MAU, skewing 16-34. No corporate surveillance association. Signals "we're building for YOU, not your employer." | Not universal outside tech/gaming demographics. Some older users won't have it. |
| **Google** | Pragmatic reach. 98% of target audience has an account. Lowest friction. Necessary for users who don't use Apple or Discord. | Brand tension (addressed in section 1). Must be carefully positioned. |

### Why not the others

| Provider | Verdict | Reason |
|----------|---------|--------|
| **GitHub** | No | Target audience is non-technical. "I failed at AI tools before" — GitHub signals developer culture, which is exactly the intimidation we want to avoid. |
| **Twitter/X** | No | Brand toxicity risk. Elon Musk association. Platform stability concerns. Users increasingly abandoning it. |
| **Microsoft** | No | Corporate. Wrong vibe for Gen Z. Adds complexity without reaching a new segment. |
| **Email magic link** | Consider for v2 | Good privacy story, but adds email deliverability complexity and is slower than OAuth. Could be added later as a 4th option for users who refuse all OAuth. |

### UI ordering

```
[  Sign in with Apple  ]     ← Primary position, matches brand
[  Sign in with Discord ]    ← Gen Z home
[  Sign in with Google  ]    ← Pragmatic fallback
```

All three buttons are visually equal weight. No "or" dividers. No "recommended" labels.

---

## 7. Marketing Email Flow

### The constraint

GDPR (Finnish DPA jurisdiction) requires explicit, freely-given consent for marketing emails. Signing in with OAuth is not consent. The email we get from the OAuth provider is for account communication only (password resets, receipts, security alerts). Marketing requires a separate opt-in.

### Recommended flow: welcome interstitial (not during callback)

**Why not during the OAuth callback?** The callback is a redirect — there is no UI to show. You cannot present a checkbox during `signIn()`. Bundling consent into the callback would also fail the GDPR "freely given" test — consent cannot be a condition of account creation.

**Why not in settings?** Nobody will find it. Zero opt-in rate.

**The flow:**

1. User clicks "Sign in with Apple" → OAuth flow → redirect back to app
2. Auth.js `signIn` callback detects this is a **first-time user** (new row in `users` table)
3. Redirect to `/welcome` (instead of `/dashboard`) via the callback:

```typescript
async redirect({ url, baseUrl, account }) {
  // First sign-in: go to welcome page
  if (isNewUser) return `${baseUrl}/welcome`
  // Returning user: go to dashboard
  return `${baseUrl}/dashboard`
}
```

4. `/welcome` page shows:

```
Welcome to Meldar, [name].

Your account is set up. Here's what you can do:

[ ] Send me weekly tips and product updates
    (We'll email [email]. Unsubscribe anytime.)

[Go to my dashboard →]
```

The checkbox is unchecked by default (GDPR requirement). Clicking "Go to my dashboard" works regardless of checkbox state. This is clearly freely-given consent.

5. Consent is saved via a Server Action:

```typescript
'use server'
async function saveMarketingConsent(consent: boolean) {
  const session = await auth()
  if (!session?.user?.id) return
  await db.update(users).set({
    marketingConsent: consent,
    marketingConsentAt: consent ? new Date() : null,
  }).where(eq(users.id, session.user.id))
}
```

### Existing subscriber merge

When a user signs in and they already exist in the `subscribers` table (from the landing page email capture), link the records:

- Set `subscribers.userId` to the authenticated user's ID
- If they already subscribed via the landing page, pre-check the marketing consent box on the welcome page and explain: "You already signed up for updates at meldar.ai"
- If they explicitly uncheck it, respect that and update both `users.marketingConsent` and remove from Resend audience

### Re-consent

Marketing consent is also available in `/settings` for users who skipped it initially.

---

## 8. Architecture Decision Record

### ADR-001: OAuth Authentication with Auth.js v5

**Status:** Proposed

**Date:** 2026-03-31

**Context:**

Meldar is transitioning from an anonymous-first landing page with email capture to a product with user accounts. Users need persistent identity to:
- Save and revisit X-Ray results over time
- Purchase and track paid services (Time Audit, App Build)
- Manage automations and personal apps (future)
- Exercise data rights (export, delete — GDPR requirement)

The product currently has no authentication. Users interact anonymously (quiz, screenshot upload) or provide an email address for subscriptions and purchases.

**Decision:**

Implement OAuth-only authentication using Auth.js v5 with three providers: Apple Sign In, Discord, and Google. No password-based authentication.

**Rationale:**

1. **OAuth-only (no passwords):**
   - Eliminates password storage liability (GDPR data minimization)
   - No password reset flow to build and maintain
   - Target audience (Gen Z, 18-28) expects social sign-in
   - Reduces sign-up friction from ~60 seconds (email + password + verify) to ~5 seconds

2. **Auth.js v5 (not Clerk, not Supabase Auth, not custom):**
   - Open source, no vendor lock-in, no per-MAU pricing
   - First-class Next.js App Router + React 19 support
   - Drizzle adapter available (matches existing ORM)
   - Self-hosted — user data stays in our Neon database (aligns with "your data, nobody else's")
   - Clerk would be easier but adds a third-party that sees every user's auth data — contradicts positioning

3. **Apple + Discord + Google (not GitHub, not Twitter/X):**
   - Apple: privacy brand alignment, iOS requirement if native app follows
   - Discord: Gen Z reach, no surveillance association
   - Google: pragmatic coverage, 98% of target audience
   - GitHub excluded: signals developer culture, intimidates target audience
   - Twitter/X excluded: brand toxicity, platform instability

4. **Database sessions (not JWT):**
   - Revocable (supports "delete everything" brand promise)
   - Simpler mental model (session = row in database)
   - Auth.js Drizzle adapter handles session lifecycle automatically

**Alternatives Considered:**

| Alternative | Why rejected |
|------------|-------------|
| **Clerk** | Managed auth service. Easier to implement. Rejected because: (a) user auth data lives on Clerk's servers, contradicting "your data, nobody else's," (b) per-MAU pricing becomes expensive at scale, (c) vendor lock-in for a core capability. |
| **Supabase Auth** | Good OSS option. Rejected because: (a) would require migrating from Neon to Supabase for DB or running two databases, (b) less flexible than Auth.js for custom callback logic (anonymous merge). |
| **Custom OAuth implementation** | Full control. Rejected because: (a) significant security surface area to maintain, (b) Auth.js handles CSRF, PKCE, token rotation, (c) no business value in reimplementing OAuth. |
| **Magic link (email)** | Good privacy story. Rejected as primary method because: (a) email deliverability is unreliable, (b) slower UX (open email, click link), (c) adds Resend dependency to auth flow. May be added as v2 option. |
| **Passkeys / WebAuthn** | Future-proof, passwordless. Rejected for v1 because: (a) browser support still uneven, (b) user education overhead for Gen Z audience, (c) Auth.js passkey support is experimental. Strong candidate for v2. |

**Trade-offs:**

| Gain | Cost |
|------|------|
| Zero password liability | Users without Apple/Discord/Google accounts cannot sign up (mitigated: ~99% coverage) |
| 5-second sign-up | Dependency on three OAuth providers' uptime |
| Self-hosted auth data | More infrastructure to maintain vs. managed service (Clerk) |
| Brand-aligned provider ordering | Apple Developer account requirement ($99/yr) |
| Revocable database sessions | Slightly higher DB load vs. stateless JWT (negligible at current scale) |

**Consequences:**

- Must implement anonymous-to-authenticated session merge (section 4)
- Must add `users`, `accounts`, `sessions` tables to Neon database
- Must create Apple Developer account and configure Sign in with Apple
- Must create Discord application in Discord Developer Portal
- Must update privacy policy to document OAuth data handling
- Must build welcome interstitial for GDPR-compliant marketing consent
- Must add middleware for route protection
- Header component must be updated for authenticated state (UserMenu)

**Implementation order:**

1. Database schema migration (add auth tables)
2. Auth.js v5 configuration with Google provider (fastest to test)
3. Middleware + route protection
4. Sign-in page UI
5. Anonymous session merge logic
6. Apple Sign In provider
7. Discord provider
8. Welcome interstitial (marketing consent)
9. Dashboard + settings pages
10. Header update (UserMenu)
