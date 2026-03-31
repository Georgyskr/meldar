# Security Review: OAuth Authentication for Meldar

**Role:** Security Engineer
**Date:** 2025-03-31
**Scope:** OAuth auth (Google + 2 providers), 3-attempt limit, marketing email capture, Next.js 16 App Router on Vercel

---

## 1. OAuth Security

### What Auth.js Handles Automatically

Auth.js (NextAuth v5) provides significant built-in protections:

- **CSRF protection** — Auth.js generates and validates a CSRF token on every sign-in request. The token is stored in a signed, HttpOnly cookie and must match the form submission. No additional configuration needed.
- **State parameter** — Auth.js generates a cryptographically random `state` value per OAuth flow and validates it on callback. This prevents authorization code injection attacks.
- **Redirect URI validation** — Auth.js only accepts callbacks to its own `/api/auth/callback/:provider` endpoint. The OAuth provider validates the redirect URI against the registered application. No open redirect risk unless misconfigured.

### What We Must Configure

**PKCE (Proof Key for Code Exchange)**

Auth.js supports PKCE but it is provider-dependent. Google supports PKCE but does not require it for confidential (server-side) clients. Nevertheless, enable it:

```ts
// auth.config.ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  checks: ["pkce", "state"], // Explicitly enable both
})
```

PKCE prevents authorization code interception attacks. Even for server-side flows, it adds defense-in-depth against compromised TLS or proxy logging.

**Redirect URI Restrictions at the Provider**

At each OAuth provider's developer console:
- Register only `https://meldar.ai/api/auth/callback/google` (and equivalent for other providers).
- Do NOT register `http://localhost:*` in production credentials. Use separate OAuth apps for dev/staging/prod.
- Avoid wildcard redirect URIs — Google doesn't support them, but some providers do. Never use them.

**Allowed Callback URLs in Auth.js**

```ts
// auth.config.ts
callbacks: {
  async redirect({ url, baseUrl }) {
    // Only allow redirects to our own domain
    if (url.startsWith(baseUrl)) return url
    return baseUrl
  }
}
```

### Attack Vectors to Watch

| Attack | Mitigation | Status |
|--------|-----------|--------|
| Authorization code injection | State parameter (auto) | Handled by Auth.js |
| Code interception | PKCE (configure) | Must enable explicitly |
| Open redirect on callback | Redirect callback validation | Must configure |
| OAuth provider impersonation | TLS + provider cert pinning | Handled by platform |
| Covert redirect | Strict redirect URI matching at provider | Must register exact URIs |

---

## 2. Session Security

### Cookie Configuration

Auth.js sets session cookies with secure defaults in production. Verify these are active:

```ts
// auth.config.ts
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,      // No JS access — prevents XSS session theft
      secure: true,        // HTTPS only — prevents man-in-the-middle
      sameSite: "lax",     // Blocks cross-site POST but allows top-level nav
      path: "/",
      domain: "meldar.ai",
    },
  },
},
```

**Why `SameSite=lax` not `strict`:**
- `strict` would break the OAuth redirect flow — users returning from Google's consent page would lose their session cookie because it's a cross-site navigation.
- `lax` sends cookies on top-level navigations (GET) but blocks them on cross-site POST/PUT, which is sufficient for CSRF protection combined with Auth.js's CSRF token.

### Session Fixation Prevention

Auth.js prevents session fixation by design:
- A new session token is generated after successful authentication. The pre-auth anonymous session (if any) is never promoted — it's replaced entirely.
- Verify this by checking that the `session-token` cookie value changes after login.

### Token Rotation

For JWT strategy (recommended for Vercel/serverless — no session database needed):

```ts
session: {
  strategy: "jwt",
  maxAge: 7 * 24 * 60 * 60, // 7 days
},
jwt: {
  maxAge: 7 * 24 * 60 * 60,
},
callbacks: {
  async jwt({ token, account }) {
    // On initial sign-in, store provider access token
    if (account) {
      token.accessToken = account.access_token
      token.accessTokenExpires = account.expires_at
        ? account.expires_at * 1000
        : Date.now() + 3600 * 1000
    }
    return token
  },
},
```

For database session strategy (if you need server-side revocation):
- Auth.js rotates session tokens on each request when using database sessions.
- This means a stolen token becomes invalid after the legitimate user makes their next request.
- Trade-off: more database writes, but stronger theft detection.

**Recommendation:** Start with JWT strategy on Vercel (no database session table, lower latency). Move to database sessions only if you need instant session revocation (e.g., "log out all devices" feature).

### Additional Session Hardening

- Set `AUTH_SECRET` to a cryptographically random 32+ byte string. Auth.js uses this to sign JWTs and cookies. Rotate it by supporting `AUTH_SECRET_OLD` during transition.
- Consider setting `AUTH_TRUST_HOST=true` on Vercel (required because Vercel proxies requests).

---

## 3. Attempt Limit Bypass Analysis

The requirement is a "3-attempt limit per user." This needs careful definition because OAuth doesn't have traditional password attempts. The attack surface is:

### 3.1 What Does "3 Attempts" Mean for OAuth?

For passwordless OAuth, there's no wrong-password scenario. The "3-attempt limit" likely means:
- **3 sign-in initiations per time window** — rate-limiting how often someone can start the OAuth flow.
- **3 account creations per IP** — preventing mass account creation.

### 3.2 Bypass Vectors and Mitigations

**Vector 1: Multiple Google Accounts**

An attacker creates multiple Google accounts and signs in with each. Each is a distinct "user," so per-user rate limits don't apply.

*Mitigation:*
- Rate-limit by IP: max 3 new account creations per IP per hour using the existing Upstash rate limiter.
- Track device fingerprint (cookie-based, not browser fingerprinting): generate a `meldar-device` cookie on first visit, rate-limit new signups per device ID.
- For the 3-attempt limit specifically: use IP-based rate limiting on the `/api/auth/signin` route.

```ts
// Extend existing rate-limit.ts
export const authSigninLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      prefix: "rl:auth:signin",
    })
  : null

export const authSignupLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      prefix: "rl:auth:signup",
    })
  : null
```

**Vector 2: Cookie Manipulation**

An attacker clears cookies between attempts to reset any client-side attempt tracking.

*Mitigation:*
- Never rely on client-side cookies for security-critical attempt counting.
- All attempt tracking must be server-side (Upstash Redis, keyed by IP or user ID).
- The existing `checkRateLimit` pattern is correct — keep attempt state server-side only.

**Vector 3: Direct API Access (Bypassing UI)**

An attacker calls `/api/auth/signin/google` directly, bypassing any client-side protections.

*Mitigation:*
- Auth.js handles the OAuth flow server-side — the sign-in route IS the API. Rate-limiting must be applied at the Auth.js event level, not at a UI layer.
- Use Auth.js `signIn` event callback to increment server-side counters:

```ts
events: {
  async signIn({ user, isNewUser }) {
    if (isNewUser) {
      // Increment signup counter (checked in signIn callback)
    }
  },
},
callbacks: {
  async signIn({ user, account }) {
    const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { success } = await checkRateLimit(authSigninLimit, ip)
    if (!success) return false // Blocks the sign-in
    return true
  },
},
```

**Vector 4: IP Rotation (VPN/Proxy)**

An attacker uses different IP addresses to circumvent IP-based rate limits.

*Mitigation:*
- IP-based limits raise the bar but cannot fully prevent determined attackers.
- Layer defenses: IP rate limit + device cookie + email-domain analysis (flag disposable email domains).
- For Meldar's scale (early-stage, collecting signups), IP-based limiting is sufficient. If abuse materializes, add Cloudflare Turnstile (invisible CAPTCHA) to the sign-in flow.

**Vector 5: OAuth Callback Replay**

An attacker intercepts and replays the OAuth callback URL.

*Mitigation:*
- Auth.js `state` parameter prevents this — the state is single-use and time-limited.
- PKCE adds another layer — the code verifier is bound to the original client session.

---

## 4. GDPR for OAuth

### What Google Provides

When a user signs in with Google OAuth, the default scopes (`openid email profile`) provide:
- Email address
- Full name
- Profile picture URL
- Google account ID (sub)

### What You Can Store

Under GDPR (and Finnish implementation of the ePrivacy Directive):

| Data | Lawful Basis | Can Store? |
|------|-------------|-----------|
| Email | Contract performance (Art. 6(1)(b)) — needed to provide the service | Yes |
| Name | Contract performance — personalizing the user's experience | Yes |
| Profile picture | Legitimate interest (Art. 6(1)(f)) — UX personalization | Yes, but user must be able to delete it |
| Google account ID | Contract performance — linking OAuth identity to account | Yes |

### Marketing Email — Critical Legal Point

**You CANNOT use OAuth-obtained email for marketing without explicit, separate opt-in.**

Under Finnish law (implementing the ePrivacy Directive, specifically Tietoyhteiskuntakaari 917/2014, Section 200):
- Marketing email requires **prior consent** (opt-in).
- Consent must be **freely given, specific, informed, and unambiguous** (GDPR Art. 4(11)).
- The consent must be **separate** from the terms of service acceptance.
- Pre-checked boxes are NOT valid consent.

**Implementation:**

```
[ ] Send me tips on reclaiming my time (optional)
```

This checkbox must be:
- Unchecked by default
- Clearly labeled as marketing
- Separate from the "Sign in with Google" action
- Recorded with timestamp in your database

The existing `subscribers` table captures email + source. Add a `marketingConsent` boolean + `marketingConsentAt` timestamp column.

### Existing Email Capture Conflict

The current `/api/subscribe` route captures emails for the waitlist. These users gave email specifically for "notify me when ready" — that's a distinct consent from OAuth sign-in.

**Do not merge these consent records.** When a waitlist subscriber later signs in with OAuth:
1. Link their subscriber record to their new user account.
2. Do NOT automatically assume marketing consent carries over — re-confirm if the context differs.
3. The waitlist consent was for "we'll email you when Meldar launches." Post-launch marketing emails need fresh consent.

### Data Minimization

Only request the scopes you need. The default `openid email profile` is fine for now. Do NOT request:
- `https://www.googleapis.com/auth/contacts` (contacts)
- `https://www.googleapis.com/auth/calendar` (calendar)
- Any Google API scope beyond basic profile

If you need Takeout or Chrome extension data later, request those scopes incrementally, with clear explanation to the user, per the "effort escalation funnel" pattern.

---

## 5. The "Take Back Your Data" Contradiction

### The Brand Risk

The landing page says: *"Big Tech profited from your data for a decade. Take it back."*

Then the first thing users do is... sign in with Google. This is not just a messaging problem — it's a security positioning risk.

### What Google Learns from OAuth

When a user signs in to Meldar with Google OAuth:
- Google learns that this user has a Meldar account.
- Google sees the OAuth consent screen interaction (timestamp, IP, device).
- Google can correlate this with their ad profile.
- If the user is logged into Chrome, Google sees the navigation to meldar.ai.

This is the opposite of "taking back your data."

### Security Perspective on Mitigations

1. **Don't make Google the only provider.** Offer at least one privacy-respecting alternative:
   - **Email magic link** — user enters email, receives a sign-in link. No third-party involved. Auth.js supports this via the Email provider with Resend. Given you already use Resend, this is trivial to add.
   - **Apple Sign-In** — Apple relays a private email address, doesn't track sign-ins for ad purposes.
   - Avoid Facebook/Meta — directly contradicts the brand positioning.

2. **Be transparent about the trade-off.** On the sign-in page:
   > "Sign in with Google is the fastest option. Google will know you use Meldar — nothing more. We never share your Meldar data with Google."

3. **Minimize what you request from Google.** Only `openid email profile`. Don't request any Google API access.

4. **Email magic link as the default.** Make magic link the primary/top option, Google secondary. This aligns the UX with the brand message.

### Architectural Recommendation

**Preferred sign-in order (top to bottom on the page):**
1. Email magic link (primary — "No Big Tech involved")
2. Apple Sign-In (private relay email)
3. Google Sign-In (convenience option, clearly labeled)

This turns the contradiction into a differentiator: "Most apps force you through Google. We give you a choice."

---

## 6. API Route Protection

### Route Classification

| Route | Auth Required? | Rationale |
|-------|---------------|-----------|
| `GET /` (landing) | No | Public marketing page |
| `GET /quiz` | No | Top-of-funnel, zero-friction |
| `GET /privacy-policy` | No | Legal requirement to be public |
| `GET /terms` | No | Legal requirement |
| `POST /api/subscribe` | No | Pre-auth email capture |
| `POST /api/upload/screentime` | **Yes** | User data processing — must know who owns the result |
| `POST /api/billing/checkout` | **Yes** | Payment initiation — must associate with user |
| `POST /api/billing/webhook` | No (Stripe signature) | Webhook — authenticated by Stripe signature, not user session |
| `GET /api/auth/*` | No | Auth.js handles its own auth flow |
| `POST /api/auth/*` | No | Auth.js handles its own auth flow |
| Future: `GET /dashboard/*` | **Yes** | User-specific data |
| Future: `GET /api/xray/:id` | **Yes** (owner) | Must verify requesting user owns this X-Ray result |

### Implementation in Next.js App Router

**Option A: Middleware (Recommended)**

```ts
// middleware.ts
import { auth } from "@/auth"

const PROTECTED_ROUTES = [
  "/api/upload/",
  "/api/billing/checkout",
  "/dashboard",
]

const PUBLIC_API_ROUTES = [
  "/api/auth/",
  "/api/subscribe",
  "/api/billing/webhook",
]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Skip auth routes and public API routes
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return
  }

  // Protect specified routes
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!req.auth) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }
  }
})

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
}
```

**Option B: Per-Route Guards (Fallback)**

For routes that need finer-grained authorization (e.g., "user can only access their own X-Ray"):

```ts
// src/app/api/upload/screentime/route.ts
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    )
  }
  // ... rest of handler, using session.user.id for data ownership
}
```

**Use both:** Middleware as the gate, per-route checks for authorization (ownership verification).

### Critical: Stripe Webhook Must NOT Require Auth

The `/api/billing/webhook` route must remain unauthenticated at the session level. It's authenticated by Stripe's webhook signature verification (`constructEvent`). Adding session auth here would break Stripe webhooks. The current implementation is correct.

---

## 7. Abuse Vectors

### 7.1 Bot Signup

**Attack:** Automated scripts create thousands of accounts via OAuth or magic link.

**Mitigations (layered):**

1. **Rate limiting (already have):** The Upstash rate limiter covers IP-based limits. Extend to auth routes:
   - 3 sign-in initiations per IP per hour
   - 3 new account creations per IP per hour
   - 5 magic link requests per email per hour

2. **Cloudflare Turnstile:** Add invisible CAPTCHA to the sign-in page. Free tier covers Meldar's current scale. Only triggers a challenge for suspicious traffic — legitimate users see nothing.

3. **Email verification:** For magic link, the email itself IS the verification. For OAuth, Google has already verified the email. No additional verification needed.

4. **Disposable email detection:** Block signups from known disposable email domains (mailinator, guerrillamail, etc.). Libraries: `disposable-email-domains` npm package. Apply to magic link only — Google OAuth emails are already non-disposable.

### 7.2 Attempt Farming

**Attack:** An attacker systematically tries to determine if specific email addresses have Meldar accounts (account enumeration).

**Mitigations:**

1. **Consistent responses:** Never reveal whether an account exists.
   - Magic link: "If this email has an account, we've sent a sign-in link." (Same message whether account exists or not.)
   - OAuth: Google handles this — Meldar never sees failed attempts for non-existent Google accounts.

2. **Timing consistency:** Ensure the response time is the same whether the email exists or not. Use `await new Promise(r => setTimeout(r, randomDelay))` if needed.

### 7.3 Data Scraping

**Attack:** Authenticated users scrape other users' X-Ray results by iterating IDs.

**Mitigations:**

1. **Authorization checks:** Every data endpoint must verify `session.user.id === resource.ownerId`. This is the most critical protection.

2. **Unpredictable IDs:** The current `nanoid(12)` for X-Ray IDs provides ~71 bits of entropy — infeasible to brute-force. Keep using nanoid, not sequential integers.

3. **Rate limiting on data endpoints:** 30 requests per minute per authenticated user for X-Ray retrieval. Flags automated scraping without affecting normal use.

4. **No public listing endpoints:** Never expose an endpoint that lists all X-Ray IDs, all users, etc. Only return resources owned by the requesting user.

### 7.4 Screen Time Upload Abuse

**Attack:** Attacker uploads thousands of screenshots to exhaust Claude Vision API credits.

**Mitigations (partially in place):**
- Current: 5 uploads per minute per IP (Upstash). Good start.
- Add: Per-user limit (10 uploads per day per authenticated user).
- Add: Per-user monthly limit based on tier (free: 5/month, starter: 30/month).
- File size limit is already 5MB. Correct.

### 7.5 Stripe Webhook Replay

**Attack:** Replay a captured webhook payload to re-process a payment.

**Current mitigation:** The `constructEvent` function validates the Stripe signature with a timestamp, rejecting replays older than Stripe's tolerance window (default 300 seconds). The current implementation is correct.

**Improvement:** Add idempotency — the `onConflictDoNothing()` on `auditOrders` insert (keyed by `stripeCheckoutSessionId`) already handles this. A replayed webhook would attempt to insert a duplicate session ID and silently no-op. Well done.

---

## 8. Secrets Management

### Current Secrets Inventory

| Secret | Location | Scope |
|--------|----------|-------|
| `RESEND_API_KEY` | Vercel env var | Server-side only |
| `NEXT_PUBLIC_GA_ID` | Vercel env var | Client-side (public, not truly secret) |
| `UPSTASH_REDIS_REST_URL` | Vercel env var | Server-side only |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel env var | Server-side only |
| `STRIPE_WEBHOOK_SECRET` | Vercel env var | Server-side only |

### New Secrets for Auth

| Secret | Where to Store | Notes |
|--------|---------------|-------|
| `AUTH_SECRET` | Vercel env var (server-side) | Auth.js signing key. 32+ random bytes, `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | Vercel env var (server-side) | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Vercel env var (server-side) | Google OAuth app client secret |
| `AUTH_TRUST_HOST` | Vercel env var | Set to `true` for Vercel deployments |
| Provider 2 client ID/secret | Vercel env var (server-side) | Apple/other provider credentials |
| Provider 3 client ID/secret | Vercel env var (server-side) | Third provider credentials |

### Vercel Environment Variable Best Practices

1. **Scope by environment:** Set different OAuth credentials for Production, Preview, and Development in Vercel's env var settings. Never use production OAuth credentials in preview deployments — preview URLs are different domains and OAuth redirect validation will fail anyway.

2. **Never prefix with `NEXT_PUBLIC_`:** OAuth secrets must never be exposed to the client bundle. `GOOGLE_CLIENT_ID` is semi-public (it appears in the OAuth consent URL), but `GOOGLE_CLIENT_SECRET` and `AUTH_SECRET` must NEVER be prefixed with `NEXT_PUBLIC_`.

3. **Sensitive flag:** Mark `AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, and all provider secrets as "Sensitive" in Vercel, which hides them from logs and the dashboard after initial entry.

### Rotation Policy

| Secret | Rotation Frequency | How |
|--------|-------------------|-----|
| `AUTH_SECRET` | Annually or on suspected compromise | Auth.js supports `AUTH_SECRET` + `AUTH_SECRET_OLD` for zero-downtime rotation. Set old secret in `AUTH_SECRET_OLD`, new in `AUTH_SECRET`. Remove old after 24 hours (max session age). |
| `GOOGLE_CLIENT_SECRET` | Only on compromise | Regenerate in Google Cloud Console. Update Vercel env var. Redeploy. |
| `RESEND_API_KEY` | Only on compromise | Regenerate in Resend dashboard. |
| `STRIPE_WEBHOOK_SECRET` | Only on compromise | Regenerate in Stripe dashboard. Update Vercel env var. |
| `UPSTASH_REDIS_REST_TOKEN` | Only on compromise | Regenerate in Upstash console. |

### `.env` File Handling

- `.env.local` should be in `.gitignore` (verify this).
- Never commit `.env` files with real credentials.
- For local development, use a `.env.local` with development-only OAuth app credentials (separate Google Cloud project for dev).

---

## Summary: Priority Actions

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | Enable PKCE on all OAuth providers | Config change |
| **P0** | Implement `signIn` callback with rate limiting (3/hr/IP) | ~2 hours |
| **P0** | Add auth middleware for protected routes | ~2 hours |
| **P0** | Separate marketing consent checkbox (GDPR) | ~1 hour |
| **P1** | Add email magic link as primary sign-in method | ~3 hours |
| **P1** | Add per-user rate limits on screentime upload | ~1 hour |
| **P1** | Add `marketingConsent` + `marketingConsentAt` to schema | ~30 min |
| **P1** | Verify `.env.local` in `.gitignore` | 5 min |
| **P2** | Add Cloudflare Turnstile to sign-in flow | ~2 hours |
| **P2** | Add disposable email domain blocking for magic link | ~1 hour |
| **P2** | Add authorization (ownership) checks on data endpoints | ~2 hours |
| **P2** | Implement `AUTH_SECRET` rotation procedure | Document |
